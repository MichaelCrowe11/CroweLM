#!/usr/bin/env python3
"""
MLX LoRA Fine-tuning Script for Apple Silicon
Fine-tune LLMs using MLX on M-series Macs

Usage:
    source ~/mlx-env/bin/activate
    python -m crowelm.training.mlx_lora --model Qwen/Qwen2.5-7B-Instruct --data ~/crowelm-unified-dataset/crowe_integrated
"""

import argparse
import json
import os
from pathlib import Path
from typing import Dict, Any, Optional


def create_lora_config(
    model_name: str,
    output_dir: str,
    data_path: str,
    epochs: int = 2,
    batch_size: int = 4,
    learning_rate: float = 1e-4,
    lora_rank: int = 64,
    lora_alpha: int = 128,
) -> Dict[str, Any]:
    """
    Create LoRA training configuration.

    Args:
        model_name: HuggingFace model name
        output_dir: Directory for checkpoints
        data_path: Path to training data
        epochs: Number of training epochs
        batch_size: Training batch size
        learning_rate: Learning rate
        lora_rank: LoRA rank parameter
        lora_alpha: LoRA alpha parameter

    Returns:
        Configuration dictionary
    """
    return {
        "model": model_name,
        "train_data": data_path,
        "output_dir": output_dir,
        "lora": {
            "rank": lora_rank,
            "alpha": lora_alpha,
            "dropout": 0.05,
            "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
        },
        "training": {
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": learning_rate,
            "warmup_steps": 100,
            "weight_decay": 0.01,
            "grad_accumulation_steps": 4,
            "max_seq_length": 2048,
        },
        "save": {
            "save_steps": 500,
            "save_total_limit": 3,
        }
    }


def prepare_crowelm_data(data_dir: str, output_file: str) -> int:
    """
    Convert CroweLM dataset to MLX training format.

    Args:
        data_dir: Directory containing JSONL training files
        output_file: Output path for processed data

    Returns:
        Number of samples processed
    """
    print(f"Preparing data from {data_dir}...")

    samples = []
    data_path = Path(data_dir)

    for jsonl_file in data_path.glob("**/*.jsonl"):
        print(f"  Processing: {jsonl_file.name}")
        try:
            with open(jsonl_file) as f:
                for line in f:
                    try:
                        item = json.loads(line.strip())
                        if "messages" in item:
                            samples.append(item)
                        elif "instruction" in item and "output" in item:
                            samples.append({
                                "messages": [
                                    {"role": "user", "content": item["instruction"]},
                                    {"role": "assistant", "content": item["output"]}
                                ]
                            })
                        elif "prompt" in item and "response" in item:
                            samples.append({
                                "messages": [
                                    {"role": "user", "content": item["prompt"]},
                                    {"role": "assistant", "content": item["response"]}
                                ]
                            })
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            print(f"    Error reading {jsonl_file}: {e}")

    print(f"Writing {len(samples)} samples to {output_file}")
    with open(output_file, "w") as f:
        for sample in samples:
            f.write(json.dumps(sample) + "\n")

    return len(samples)


def run_lora_training(config: Dict[str, Any]) -> bool:
    """
    Run LoRA training with MLX.

    Args:
        config: Training configuration dictionary

    Returns:
        True if training completed successfully
    """
    try:
        from mlx_lm import lora
    except ImportError:
        print("Error: mlx-lm not installed. Run: pip install mlx-lm")
        return False

    print("\n" + "=" * 60)
    print("  MLX LoRA Fine-tuning")
    print("=" * 60)
    print(f"  Model: {config['model']}")
    print(f"  Data: {config['train_data']}")
    print(f"  Output: {config['output_dir']}")
    print(f"  LoRA Rank: {config['lora']['rank']}")
    print(f"  Epochs: {config['training']['epochs']}")
    print("=" * 60 + "\n")

    os.makedirs(config['output_dir'], exist_ok=True)
    config_path = os.path.join(config['output_dir'], "config.json")
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

    cmd = f"""
    python -m mlx_lm.lora \\
        --model {config['model']} \\
        --train \\
        --data {config['train_data']} \\
        --batch-size {config['training']['batch_size']} \\
        --lora-layers {config['lora']['rank']} \\
        --iters {config['training']['epochs'] * 1000} \\
        --learning-rate {config['training']['learning_rate']} \\
        --adapter-path {config['output_dir']}/adapters
    """
    print(f"Running: {cmd.strip()}")
    os.system(cmd)

    return True


def export_to_gguf(adapter_path: str, output_path: str, model_name: str) -> None:
    """
    Export LoRA adapters to merged GGUF model.

    Args:
        adapter_path: Path to LoRA adapters
        output_path: Output directory for GGUF file
        model_name: Base model name
    """
    print(f"\nExporting to GGUF: {output_path}")

    cmd = f"""
    python -m mlx_lm.fuse \\
        --model {model_name} \\
        --adapter-path {adapter_path} \\
        --save-path {output_path}/merged

    # Convert to GGUF (requires llama.cpp)
    python -m llama_cpp.convert_hf_to_gguf \\
        {output_path}/merged \\
        --outfile {output_path}/model.gguf \\
        --outtype q4_k_m
    """
    print(f"Running export commands...")
    os.system(cmd)


async def main():
    parser = argparse.ArgumentParser(description="MLX LoRA Fine-tuning for Apple Silicon")
    parser.add_argument("--model", default="Qwen/Qwen2.5-7B-Instruct", help="Base model name")
    parser.add_argument("--data", required=True, help="Path to training data directory")
    parser.add_argument("--output", default="./checkpoints", help="Output directory")
    parser.add_argument("--epochs", type=int, default=2, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--lora-rank", type=int, default=64, help="LoRA rank")
    parser.add_argument("--prepare-only", action="store_true", help="Only prepare data, don't train")
    parser.add_argument("--export", action="store_true", help="Export to GGUF after training")

    args = parser.parse_args()

    prepared_data = os.path.join(args.output, "train.jsonl")
    os.makedirs(args.output, exist_ok=True)

    n_samples = prepare_crowelm_data(args.data, prepared_data)
    print(f"\nPrepared {n_samples} training samples")

    if args.prepare_only:
        print("Data preparation complete. Use --train to start training.")
        return

    if n_samples == 0:
        print("No training samples found. Check your data directory.")
        return

    config = create_lora_config(
        model_name=args.model,
        output_dir=args.output,
        data_path=prepared_data,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        lora_rank=args.lora_rank,
    )

    success = run_lora_training(config)

    if success and args.export:
        adapter_path = os.path.join(args.output, "adapters")
        export_to_gguf(adapter_path, args.output, args.model)

    print("\n" + "=" * 60)
    print("  Training Complete!")
    print("=" * 60)
    print(f"  Checkpoints: {args.output}")
    print(f"  To use with Docker Model Runner:")
    print(f"    docker model package --gguf {args.output}/model.gguf crowelogic/crowelm:v2")
    print("=" * 60)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
