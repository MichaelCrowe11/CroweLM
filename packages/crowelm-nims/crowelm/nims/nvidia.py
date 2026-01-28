#!/usr/bin/env python3
"""
NVIDIA NIMs Integration - Enterprise Molecular AI Services
Connects to NVIDIA BioNeMo NIMs for drug discovery workflows

Services Available:
- ESMFold: Protein structure prediction
- DiffDock: Molecular docking
- MolMIM: Molecule generation
- AlphaFold2: Structure prediction
- ProteinMPNN: Protein design

Usage:
    python -m crowelm.nims.nvidia --test
    python -m crowelm.nims.nvidia --structure MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSH
    python -m crowelm.nims.nvidia --dock protein.pdb "CCO"
"""

import asyncio
import aiohttp
import json
import os
import base64
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime


@dataclass
class NVIDIAConfig:
    """Configuration for NVIDIA NIMs"""
    api_key: str = ""
    biology_url: str = "https://health.api.nvidia.com/v1"
    llm_url: str = "https://integrate.api.nvidia.com/v1"
    timeout: int = 300

    def __post_init__(self):
        if not self.api_key:
            self.api_key = os.environ.get("NVIDIA_API_KEY", "")


class NVIDIANIMs:
    """
    Client for NVIDIA NIMs (AI Microservices)

    Enterprise molecular AI services:
    - ESMFold: Fast protein structure prediction
    - DiffDock: State-of-the-art molecular docking
    - MolMIM: De novo molecule generation
    - ProteinMPNN: Inverse protein folding
    """

    ENDPOINTS = {
        "esmfold": "nvidia/esmfold",
        "diffdock": "nvidia/diffdock",
        "molmim": "nvidia/molmim",
        "alphafold2": "nvidia/alphafold2",
        "proteinmpnn": "nvidia/proteinmpnn",
        "esm2": "nvidia/esm2-650m",
        "chat": "nvidia/llama-3.3-nemotron-super-49b-v1",
        "chat_fast": "nvidia/nemotron-mini-4b-instruct",
    }

    def __init__(self, config: Optional[NVIDIAConfig] = None):
        self.config = config or NVIDIAConfig()
        self._session: Optional[aiohttp.ClientSession] = None

        if not self.config.api_key:
            raise ValueError("NVIDIA_API_KEY environment variable not set")

    async def _ensure_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=self.config.timeout)
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json",
                }
            )
        return self._session

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

    async def __aenter__(self):
        await self._ensure_session()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def _call_nim(self, endpoint: str, payload: Dict) -> Dict:
        """Call a NVIDIA NIM biology endpoint"""
        session = await self._ensure_session()
        url = f"{self.config.biology_url}/biology/{endpoint}"

        try:
            async with session.post(url, json=payload) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    error_text = await resp.text()
                    return {"error": f"NVIDIA NIM error ({resp.status}): {error_text}"}
        except Exception as e:
            return {"error": str(e)}

    async def _call_chat(self, messages: List[Dict], model: str = None) -> str:
        """Call NVIDIA chat endpoint (LLMs)"""
        session = await self._ensure_session()
        model = model or self.ENDPOINTS["chat"]

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 4096,
        }

        try:
            async with session.post(
                f"{self.config.llm_url}/chat/completions",
                json=payload
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    return f"Error: {resp.status}"
        except Exception as e:
            return f"Error: {str(e)}"

    async def predict_structure_esmfold(self, sequence: str) -> Dict:
        """
        Predict protein structure using ESMFold.

        Args:
            sequence: Amino acid sequence (1-letter codes)

        Returns:
            Dict with PDB structure and confidence metrics
        """
        print(f">>> Running ESMFold structure prediction...")
        print(f"  Sequence length: {len(sequence)} residues")

        payload = {"sequence": sequence}
        result = await self._call_nim("nvidia/esmfold", payload)

        if "error" not in result:
            print(f"  [OK] Structure predicted")
            if "pdbs" in result:
                print(f"  Generated {len(result.get('pdbs', []))} structure(s)")

        return result

    async def predict_docking(
        self,
        protein_pdb: str,
        ligand_smiles: str,
        num_poses: int = 10
    ) -> Dict:
        """
        Predict protein-ligand binding using DiffDock.

        Args:
            protein_pdb: PDB structure content
            ligand_smiles: SMILES string of ligand
            num_poses: Number of poses to generate

        Returns:
            Docked poses with confidence scores
        """
        print(f">>> Running DiffDock molecular docking...")
        print(f"  Ligand: {ligand_smiles[:30]}...")
        print(f"  Poses: {num_poses}")

        protein_b64 = base64.b64encode(protein_pdb.encode()).decode()

        payload = {
            "protein": protein_b64,
            "ligand": ligand_smiles,
            "num_poses": num_poses,
        }

        result = await self._call_nim("diffdock/predict", payload)

        if "error" not in result:
            n_poses = len(result.get("poses", []))
            print(f"  [OK] Generated {n_poses} docked poses")

        return result

    async def generate_molecules(
        self,
        num_molecules: int = 10,
        algorithm: str = "CMA-ES",
        property_name: str = "QED",
        min_similarity: float = 0.0,
        particles: int = 30,
        iterations: int = 10,
        smi: Optional[str] = None
    ) -> Dict:
        """
        Generate novel molecules using MolMIM.

        Args:
            num_molecules: Number of molecules to generate
            algorithm: Optimization algorithm (CMA-ES, etc.)
            property_name: Target property (QED, etc.)
            smi: Optional seed SMILES molecule

        Returns:
            Generated SMILES with properties
        """
        print(f">>> Generating {num_molecules} molecules with MolMIM...")
        print(f"  Algorithm: {algorithm}")
        print(f"  Target property: {property_name}")

        payload = {
            "algorithm": algorithm,
            "num_molecules": num_molecules,
            "property_name": property_name,
            "min_similarity": min_similarity,
            "particles": particles,
            "iterations": iterations,
        }

        if smi:
            payload["smi"] = smi
            print(f"  Seed molecule: {smi[:30]}...")

        result = await self._call_nim("nvidia/molmim/generate", payload)

        if "error" not in result:
            molecules_str = result.get("molecules", "[]")
            if isinstance(molecules_str, str):
                try:
                    molecules = json.loads(molecules_str)
                    result["molecules"] = molecules
                except:
                    pass
            n_mols = len(result.get("molecules", []))
            print(f"  [OK] Generated {n_mols} molecules")

        return result

    async def get_embeddings(self, sequences: List[str]) -> Dict:
        """
        Get protein embeddings using ESM2.

        Args:
            sequences: List of amino acid sequences

        Returns:
            Embedding vectors
        """
        print(f">>> Computing ESM2 embeddings for {len(sequences)} sequences...")

        payload = {"sequences": sequences}
        result = await self._call_nim("esm2/embeddings", payload)

        if "error" not in result:
            print(f"  [OK] Computed embeddings")

        return result

    async def design_protein(
        self,
        pdb_structure: str,
        num_sequences: int = 8,
        temperature: float = 0.1
    ) -> Dict:
        """
        Design protein sequences for a structure using ProteinMPNN.

        Args:
            pdb_structure: PDB structure content
            num_sequences: Number of sequences to generate
            temperature: Sampling temperature

        Returns:
            Designed sequences with scores
        """
        print(f">>> Designing proteins with ProteinMPNN...")
        print(f"  Sequences to generate: {num_sequences}")

        pdb_b64 = base64.b64encode(pdb_structure.encode()).decode()

        payload = {
            "pdb": pdb_b64,
            "num_seq_per_target": num_sequences,
            "sampling_temp": temperature,
        }

        result = await self._call_nim("proteinmpnn/predict", payload)

        if "error" not in result:
            n_seqs = len(result.get("sequences", []))
            print(f"  [OK] Designed {n_seqs} sequences")

        return result

    async def science_chat(self, question: str) -> str:
        """
        Chat with NVIDIA Nemotron for scientific questions.

        Args:
            question: Scientific question

        Returns:
            AI response
        """
        messages = [
            {
                "role": "system",
                "content": "You are an expert scientist specializing in drug discovery, "
                           "molecular biology, and computational chemistry. Provide detailed, "
                           "accurate scientific information."
            },
            {"role": "user", "content": question}
        ]

        return await self._call_chat(messages)

    async def health_check(self) -> Dict[str, Any]:
        """Check health of NVIDIA NIM services"""
        session = await self._ensure_session()

        results = {
            "llm_api": False,
            "biology_api": False,
            "available_services": []
        }

        try:
            async with session.get(f"{self.config.llm_url}/models") as resp:
                results["llm_api"] = resp.status == 200
        except:
            pass

        try:
            async with session.post(
                f"{self.config.biology_url}/biology/nvidia/molmim/generate",
                json={"smi": "CCO", "num_molecules": 1, "algorithm": "CMA-ES",
                      "property_name": "QED", "iterations": 1, "particles": 5}
            ) as resp:
                if resp.status == 200:
                    results["biology_api"] = True
                    results["available_services"].append("molmim")
        except:
            pass

        try:
            async with session.post(
                f"{self.config.biology_url}/biology/nvidia/esmfold",
                json={"sequence": "MVLSPA"}
            ) as resp:
                if resp.status == 200:
                    results["available_services"].append("esmfold")
        except:
            pass

        return results


async def test_nvidia_nims():
    """Test NVIDIA NIMs integration"""
    print("\n" + "=" * 60)
    print("  NVIDIA NIMs Integration Test")
    print("  Enterprise Molecular AI Services")
    print("=" * 60 + "\n")

    async with NVIDIANIMs() as nims:
        print(">>> Checking API access...")
        health = await nims.health_check()
        print(f"  LLM API (integrate.api): {'[OK]' if health.get('llm_api') else '[X]'}")
        print(f"  Biology API (health.api): {'[OK]' if health.get('biology_api') else '[X]'}")
        print(f"  Available services: {', '.join(health.get('available_services', [])) or 'None'}")

        if not health.get("biology_api") and not health.get("llm_api"):
            print("\n  [WARN] API access failed. Check NVIDIA_API_KEY.")
            return

        if health.get("llm_api"):
            print("\n>>> Testing Nemotron chat...")
            response = await nims.science_chat(
                "What are the key considerations for drugging a GPCR target? (brief answer)"
            )
            print(f"  Response: {response[:300]}...")

        if "molmim" in health.get("available_services", []):
            print("\n>>> Testing MolMIM molecule generation...")
            mols = await nims.generate_molecules(
                num_molecules=5,
                property_name="QED",
                iterations=5,
                smi="CC(=O)Oc1ccccc1C(=O)O"
            )
            if "error" not in mols:
                for i, mol in enumerate(mols.get("molecules", [])[:5]):
                    if isinstance(mol, dict):
                        print(f"  [{i+1}] {mol.get('sample', 'N/A')[:40]} (QED: {mol.get('score', 'N/A'):.3f})")
                    else:
                        print(f"  [{i+1}] {str(mol)[:50]}")
            else:
                print(f"  Error: {mols.get('error')}")

        if "esmfold" in health.get("available_services", []):
            print("\n>>> Testing ESMFold structure prediction...")
            result = await nims.predict_structure_esmfold("MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSH")
            if "error" not in result:
                pdbs = result.get("pdbs", [])
                if pdbs:
                    pdb_lines = pdbs[0].split('\n')
                    atom_count = sum(1 for l in pdb_lines if l.startswith("ATOM"))
                    print(f"  PDB atoms: {atom_count}")
            else:
                print(f"  Error: {result.get('error')}")

        print("\n" + "=" * 60)
        print("  Test Complete!")
        print("=" * 60)


async def main():
    import argparse

    parser = argparse.ArgumentParser(description="NVIDIA NIMs Integration")
    parser.add_argument("--test", action="store_true", help="Run integration test")
    parser.add_argument("--structure", help="Predict structure for sequence")
    parser.add_argument("--generate", type=int, help="Generate N molecules")
    parser.add_argument("--chat", help="Ask scientific question")

    args = parser.parse_args()

    if args.test:
        await test_nvidia_nims()
    elif args.structure:
        async with NVIDIANIMs() as nims:
            result = await nims.predict_structure_esmfold(args.structure)
            print(json.dumps(result, indent=2))
    elif args.generate:
        async with NVIDIANIMs() as nims:
            result = await nims.generate_molecules(num_molecules=args.generate)
            print(json.dumps(result, indent=2))
    elif args.chat:
        async with NVIDIANIMs() as nims:
            response = await nims.science_chat(args.chat)
            print(response)
    else:
        await test_nvidia_nims()


if __name__ == "__main__":
    asyncio.run(main())
