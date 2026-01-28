#!/usr/bin/env python3
"""
Drug Discovery Pipeline - Integrated NVIDIA NIMs + Local AI Workflow
Combines NVIDIA BioNeMo services with Docker Model Runner for comprehensive
drug discovery analysis.

Pipeline Stages:
1. Target Analysis (UniProt, ChEMBL, PubMed)
2. Structure Prediction (ESMFold via NVIDIA)
3. Molecule Generation (MolMIM via NVIDIA)
4. Property Analysis (Local AI)
5. Report Generation (Nemotron)

Usage:
    python -m crowelm.pipelines.drug_discovery --target P15056  # BRAF kinase
    python -m crowelm.pipelines.drug_discovery --sequence "MVLSPAD..." --generate-ligands
"""

import asyncio
import aiohttp
import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from crowelm.nims import NVIDIANIMs, NVIDIAConfig
from crowelm.agents import BiotechAgent, BiotechConfig


@dataclass
class PipelineConfig:
    """Configuration for drug discovery pipeline"""
    nvidia_api_key: str = ""
    local_model_url: str = "http://localhost:12434/v1"
    local_model: str = "crowelogic/crowelogic:v1.0"
    output_dir: str = "./pipeline_results"

    def __post_init__(self):
        if not self.nvidia_api_key:
            self.nvidia_api_key = os.environ.get("NVIDIA_API_KEY", "")


class DrugDiscoveryPipeline:
    """
    Integrated Drug Discovery Pipeline

    Combines:
    - NVIDIA NIMs for molecular AI (ESMFold, MolMIM, Nemotron)
    - Local CroweLM for domain-specific analysis
    - Public databases (UniProt, ChEMBL, PubMed)
    """

    def __init__(self, config: Optional[PipelineConfig] = None):
        self.config = config or PipelineConfig()
        self.nvidia_nims: Optional[NVIDIANIMs] = None
        self.biotech_agent: Optional[BiotechAgent] = None

    async def __aenter__(self):
        nvidia_config = NVIDIAConfig(api_key=self.config.nvidia_api_key)
        self.nvidia_nims = NVIDIANIMs(nvidia_config)
        await self.nvidia_nims._ensure_session()

        biotech_config = BiotechConfig(
            model_url=self.config.local_model_url,
            model_name=self.config.local_model
        )
        self.biotech_agent = BiotechAgent(biotech_config)
        await self.biotech_agent._ensure_session()

        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.nvidia_nims:
            await self.nvidia_nims.close()
        if self.biotech_agent:
            await self.biotech_agent.close()

    async def run_full_pipeline(
        self,
        target_id: str,
        generate_ligands: bool = True,
        num_ligands: int = 10
    ) -> Dict[str, Any]:
        """
        Run full drug discovery pipeline for a target.

        Args:
            target_id: UniProt accession ID
            generate_ligands: Whether to generate novel ligands
            num_ligands: Number of ligands to generate

        Returns:
            Comprehensive pipeline results
        """
        print("\n" + "=" * 70)
        print("  DRUG DISCOVERY PIPELINE")
        print("  NVIDIA BioNeMo + CroweLM Integration")
        print("=" * 70 + "\n")

        results = {
            "target_id": target_id,
            "timestamp": datetime.now().isoformat(),
            "stages": {},
        }

        # Stage 1: Target Analysis
        print("[STAGE 1] TARGET ANALYSIS")
        print("-" * 70)

        target_data = await self._analyze_target(target_id)
        results["stages"]["target_analysis"] = target_data
        print(f"  [OK] Gene: {target_data.get('uniprot', {}).get('gene', 'Unknown')}")
        print(f"  [OK] Protein: {target_data.get('uniprot', {}).get('protein_name', 'Unknown')[:50]}")

        # Stage 2: Structure Prediction
        sequence = target_data.get("uniprot", {}).get("sequence")
        if sequence and len(sequence) <= 400:
            print("\n[STAGE 2] STRUCTURE PREDICTION (NVIDIA ESMFold)")
            print("-" * 70)

            structure = await self.nvidia_nims.predict_structure_esmfold(sequence)
            results["stages"]["structure_prediction"] = {
                "method": "ESMFold (NVIDIA NIM)",
                "success": "error" not in structure,
                "pdb_generated": bool(structure.get("pdbs")),
            }
            if structure.get("pdbs"):
                pdb_path = self._save_pdb(target_id, structure["pdbs"][0])
                results["stages"]["structure_prediction"]["pdb_file"] = pdb_path
                print(f"  [OK] Structure saved: {pdb_path}")
        else:
            print("\n  [SKIP] Structure prediction (sequence too long or unavailable)")
            results["stages"]["structure_prediction"] = {"skipped": True}

        # Stage 3: Molecule Generation
        if generate_ligands:
            print("\n[STAGE 3] LIGAND GENERATION (NVIDIA MolMIM)")
            print("-" * 70)

            ligands = await self.nvidia_nims.generate_molecules(
                num_molecules=num_ligands,
                algorithm="CMA-ES",
                property_name="QED",
                smi="CC(=O)Oc1ccccc1C(=O)O",
                iterations=10,
                particles=30
            )
            results["stages"]["ligand_generation"] = {
                "method": "MolMIM (NVIDIA NIM)",
                "seed": "Aspirin (CC(=O)Oc1ccccc1C(=O)O)",
                "molecules": ligands.get("molecules", []),
                "property_optimized": "QED"
            }
            print(f"  [OK] Generated {len(ligands.get('molecules', []))} novel molecules")

        # Stage 4: AI Analysis
        print("\n[STAGE 4] AI DRUGGABILITY ANALYSIS")
        print("-" * 70)

        gene_name = target_data.get("uniprot", {}).get("gene", target_id)
        science_context = await self.nvidia_nims.science_chat(
            f"Provide a brief druggability assessment for {gene_name}. "
            f"Include: target class, known modulators, development considerations."
        )
        results["stages"]["ai_analysis"] = {
            "nvidia_assessment": science_context,
        }
        print(f"  [OK] NVIDIA Nemotron analysis complete")

        # Stage 5: Generate Report
        print("\n[STAGE 5] REPORT GENERATION")
        print("-" * 70)

        report = self._generate_report(results)
        results["report"] = report

        output_path = self._save_results(target_id, results)
        print(f"  [OK] Full report saved: {output_path}")

        print("\n" + "=" * 70)
        print("  PIPELINE COMPLETE")
        print("=" * 70 + "\n")

        return results

    async def _analyze_target(self, target_id: str) -> Dict:
        """Analyze target using biotech agent"""
        data = {}

        data["uniprot"] = await self.biotech_agent.fetch_uniprot(target_id)

        if data["uniprot"].get("sequence_length"):
            session = await self.biotech_agent._ensure_session()
            try:
                async with session.get(
                    f"https://rest.uniprot.org/uniprotkb/{target_id}.fasta"
                ) as resp:
                    if resp.status == 200:
                        fasta = await resp.text()
                        lines = fasta.strip().split('\n')
                        sequence = ''.join(lines[1:])
                        data["uniprot"]["sequence"] = sequence
            except:
                pass

        data["chembl"] = await self.biotech_agent.fetch_chembl_target(target_id)

        gene = data["uniprot"].get("gene", target_id)
        data["literature"] = await self.biotech_agent.search_pubmed(
            f"{gene} drug target", max_results=5
        )

        return data

    def _save_pdb(self, target_id: str, pdb_content: str) -> str:
        """Save PDB structure to file"""
        os.makedirs(self.config.output_dir, exist_ok=True)
        pdb_path = os.path.join(self.config.output_dir, f"{target_id}_predicted.pdb")
        with open(pdb_path, 'w') as f:
            f.write(pdb_content)
        return pdb_path

    def _generate_report(self, results: Dict) -> str:
        """Generate summary report"""
        target = results.get("target_id", "Unknown")
        stages = results.get("stages", {})

        report_lines = [
            f"# Drug Discovery Report: {target}",
            f"Generated: {results.get('timestamp', 'N/A')}",
            "",
            "## Target Information",
        ]

        uniprot = stages.get("target_analysis", {}).get("uniprot", {})
        report_lines.extend([
            f"- **Gene**: {uniprot.get('gene', 'N/A')}",
            f"- **Protein**: {uniprot.get('protein_name', 'N/A')}",
            f"- **Organism**: {uniprot.get('organism', 'N/A')}",
            f"- **Length**: {uniprot.get('sequence_length', 'N/A')} residues",
            "",
        ])

        struct = stages.get("structure_prediction", {})
        if struct.get("pdb_generated"):
            report_lines.extend([
                "## Structure Prediction",
                f"- **Method**: ESMFold (NVIDIA NIM)",
                f"- **PDB File**: {struct.get('pdb_file', 'N/A')}",
                "",
            ])

        ligands = stages.get("ligand_generation", {})
        if ligands.get("molecules"):
            report_lines.extend([
                "## Generated Ligands",
                f"- **Method**: MolMIM (NVIDIA NIM)",
                f"- **Seed**: {ligands.get('seed', 'N/A')}",
                f"- **Property Optimized**: {ligands.get('property_optimized', 'QED')}",
                "",
                "| Rank | SMILES | QED Score |",
                "|------|--------|-----------|",
            ])
            for i, mol in enumerate(ligands["molecules"][:10], 1):
                smiles = mol.get("sample", "N/A")[:40]
                score = mol.get("score", 0)
                report_lines.append(f"| {i} | {smiles} | {score:.3f} |")
            report_lines.append("")

        ai = stages.get("ai_analysis", {})
        if ai.get("nvidia_assessment"):
            report_lines.extend([
                "## AI Druggability Assessment",
                "",
                ai["nvidia_assessment"][:2000],
                "",
            ])

        return "\n".join(report_lines)

    def _save_results(self, target_id: str, results: Dict) -> str:
        """Save full results to JSON"""
        os.makedirs(self.config.output_dir, exist_ok=True)
        output_path = os.path.join(
            self.config.output_dir,
            f"{target_id}_pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        return output_path


async def run_sequence_pipeline(sequence: str, generate_ligands: bool = True):
    """Run pipeline starting from a protein sequence"""
    print("\n" + "=" * 70)
    print("  SEQUENCE-BASED DRUG DISCOVERY")
    print("=" * 70 + "\n")

    async with DrugDiscoveryPipeline() as pipeline:
        print(">>> Predicting structure with ESMFold...")
        structure = await pipeline.nvidia_nims.predict_structure_esmfold(sequence)

        if structure.get("pdbs"):
            print(f"  [OK] Structure predicted")

            if generate_ligands:
                print("\n>>> Generating candidate ligands...")
                ligands = await pipeline.nvidia_nims.generate_molecules(
                    num_molecules=10,
                    property_name="QED",
                    smi="c1ccccc1"
                )
                if ligands.get("molecules"):
                    print(f"  [OK] Generated {len(ligands['molecules'])} molecules")
                    for i, mol in enumerate(ligands["molecules"][:5], 1):
                        print(f"    [{i}] {mol.get('sample', 'N/A')[:40]} (QED: {mol.get('score', 0):.3f})")

            print("\n>>> Getting AI analysis...")
            analysis = await pipeline.nvidia_nims.science_chat(
                f"Analyze this protein sequence and suggest potential therapeutic applications: {sequence[:100]}..."
            )
            print(f"\n{analysis[:500]}...")


async def main():
    import argparse

    parser = argparse.ArgumentParser(description="Drug Discovery Pipeline")
    parser.add_argument("--target", help="UniProt accession ID")
    parser.add_argument("--sequence", help="Protein sequence")
    parser.add_argument("--generate-ligands", action="store_true", default=True)
    parser.add_argument("--num-ligands", type=int, default=10)
    parser.add_argument("--output", default="./pipeline_results")

    args = parser.parse_args()

    config = PipelineConfig(output_dir=args.output)

    if args.sequence:
        await run_sequence_pipeline(args.sequence, args.generate_ligands)
    elif args.target:
        async with DrugDiscoveryPipeline(config) as pipeline:
            results = await pipeline.run_full_pipeline(
                target_id=args.target,
                generate_ligands=args.generate_ligands,
                num_ligands=args.num_ligands
            )
            print("\n" + results.get("report", "No report generated"))
    else:
        print("Running demo with BRAF kinase (P15056)...")
        async with DrugDiscoveryPipeline(config) as pipeline:
            results = await pipeline.run_full_pipeline(
                target_id="P15056",
                generate_ligands=True,
                num_ligands=10
            )


if __name__ == "__main__":
    asyncio.run(main())
