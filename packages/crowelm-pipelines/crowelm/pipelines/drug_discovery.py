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
6. Visualization Generation (Optional - requires viz dependencies)

Usage:
    python -m crowelm.pipelines.drug_discovery --target P15056  # BRAF kinase
    python -m crowelm.pipelines.drug_discovery --target P15056 --render  # With visualizations
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

# Visualization imports with graceful fallback
try:
    from crowelm.pipelines.visualization import (
        VIZ_AVAILABLE,
        RDKIT_AVAILABLE,
        PY3DMOL_AVAILABLE,
        MATPLOTLIB_AVAILABLE,
        MoleculeVisualizer,
        StructureVisualizer,
        ChartGenerator,
        get_installation_instructions,
    )
except ImportError:
    VIZ_AVAILABLE = False
    RDKIT_AVAILABLE = False
    PY3DMOL_AVAILABLE = False
    MATPLOTLIB_AVAILABLE = False
    MoleculeVisualizer = None
    StructureVisualizer = None
    ChartGenerator = None

    def get_installation_instructions():
        return "Install visualization dependencies: pip install crowelm-pipelines[viz]"


@dataclass
class PipelineConfig:
    """Configuration for drug discovery pipeline"""
    nvidia_api_key: str = ""
    local_model_url: str = "http://localhost:12434/v1"
    local_model: str = "crowelogic/crowelogic:v1.0"
    output_dir: str = "./pipeline_results"
    render_images: bool = False  # Generate visualizations (requires viz dependencies)

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
        num_ligands: int = 10,
        render_images: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """
        Run full drug discovery pipeline for a target.

        Args:
            target_id: UniProt accession ID
            generate_ligands: Whether to generate novel ligands
            num_ligands: Number of ligands to generate
            render_images: Generate visualizations (default: use config setting)

        Returns:
            Comprehensive pipeline results
        """
        # Use config setting if not explicitly specified
        if render_images is None:
            render_images = self.config.render_images
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

        # Stage 6: Generate Visualizations (optional)
        if render_images:
            print("\n[STAGE 6] VISUALIZATION GENERATION")
            print("-" * 70)

            if not VIZ_AVAILABLE:
                print(f"  [SKIP] Visualization dependencies not installed")
                print(f"  {get_installation_instructions()}")
                results["stages"]["visualization"] = {"skipped": True, "reason": "dependencies_missing"}
            else:
                viz_results = await self._generate_visualizations(target_id, results)
                results["stages"]["visualization"] = viz_results
                if viz_results.get("files"):
                    print(f"  [OK] Generated {len(viz_results['files'])} visualization files")
                    for file_type, file_path in viz_results["files"].items():
                        print(f"       - {file_type}: {file_path}")
        else:
            results["stages"]["visualization"] = {"skipped": True, "reason": "not_requested"}

        print("\n" + "=" * 70)
        print("  PIPELINE COMPLETE")
        print("=" * 70 + "\n")

        return results

    async def _generate_visualizations(
        self,
        target_id: str,
        results: Dict,
    ) -> Dict[str, Any]:
        """
        Generate visualization files for pipeline results.

        Args:
            target_id: Target identifier for filenames.
            results: Pipeline results dictionary.

        Returns:
            Dictionary with visualization status and file paths.
        """
        viz_results = {
            "success": True,
            "files": {},
            "errors": [],
        }

        output_dir = Path(self.config.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        stages = results.get("stages", {})

        # 1. Generate 3D structure viewer (if PDB was generated)
        if PY3DMOL_AVAILABLE and StructureVisualizer:
            struct_data = stages.get("structure_prediction", {})
            pdb_file = struct_data.get("pdb_file")

            if pdb_file and Path(pdb_file).exists():
                try:
                    viz = StructureVisualizer()
                    html_path = output_dir / f"{target_id}_structure_viewer.html"
                    saved_path = viz.save_html_from_file(
                        pdb_file,
                        html_path,
                        style="cartoon",
                        title=f"Structure: {target_id}",
                    )
                    viz_results["files"]["structure_viewer"] = saved_path
                except Exception as e:
                    viz_results["errors"].append(f"Structure viewer: {e}")

        # 2. Generate molecule grid image (if ligands were generated)
        if RDKIT_AVAILABLE and MoleculeVisualizer:
            ligand_data = stages.get("ligand_generation", {})
            molecules = ligand_data.get("molecules", [])

            if molecules:
                try:
                    viz = MoleculeVisualizer()

                    # Top 5 molecules grid
                    sorted_mols = sorted(
                        molecules, key=lambda x: x.get("score", 0), reverse=True
                    )[:5]
                    smiles_list = [mol.get("sample", "") for mol in sorted_mols]
                    legends = [
                        f"#{i+1} (QED: {mol.get('score', 0):.3f})"
                        for i, mol in enumerate(sorted_mols)
                    ]

                    top5_path = output_dir / f"{target_id}_top5_molecules.png"
                    viz.save_grid_png(
                        smiles_list,
                        top5_path,
                        legends=legends,
                        cols=min(5, len(smiles_list)),
                        mol_size=(250, 250),
                    )
                    viz_results["files"]["top5_molecules"] = str(top5_path)

                    # Full molecule grid
                    all_smiles = [mol.get("sample", "") for mol in molecules[:20]]
                    all_legends = [
                        f"QED: {mol.get('score', 0):.2f}"
                        for mol in molecules[:20]
                    ]
                    grid_path = output_dir / f"{target_id}_molecules_grid.png"
                    viz.save_grid_png(
                        all_smiles,
                        grid_path,
                        legends=all_legends,
                        cols=4,
                        mol_size=(200, 200),
                    )
                    viz_results["files"]["molecules_grid"] = str(grid_path)

                except Exception as e:
                    viz_results["errors"].append(f"Molecule images: {e}")

        # 3. Generate property charts (if matplotlib available)
        if MATPLOTLIB_AVAILABLE and ChartGenerator:
            ligand_data = stages.get("ligand_generation", {})
            molecules = ligand_data.get("molecules", [])

            if molecules:
                try:
                    chart_gen = ChartGenerator()

                    # QED distribution histogram
                    qed_bytes = chart_gen.qed_distribution(molecules)
                    qed_path = output_dir / f"{target_id}_qed_distribution.png"
                    chart_gen.save_png(qed_bytes, qed_path)
                    viz_results["files"]["qed_distribution"] = str(qed_path)

                    # Pipeline summary chart
                    summary_bytes = chart_gen.pipeline_summary(results)
                    summary_path = output_dir / f"{target_id}_pipeline_summary.png"
                    chart_gen.save_png(summary_bytes, summary_path)
                    viz_results["files"]["pipeline_summary"] = str(summary_path)

                except Exception as e:
                    viz_results["errors"].append(f"Charts: {e}")

        if viz_results["errors"]:
            viz_results["success"] = False

        return viz_results

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

        # Add visualization section if images were generated
        viz = stages.get("visualization", {})
        if viz.get("files"):
            report_lines.extend([
                "## Visualizations",
                "",
            ])
            for viz_type, file_path in viz["files"].items():
                viz_name = viz_type.replace("_", " ").title()
                report_lines.append(f"- **{viz_name}**: [{file_path}]({file_path})")
            report_lines.append("")

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


async def _main_async():
    import argparse

    parser = argparse.ArgumentParser(
        description="Drug Discovery Pipeline - NVIDIA NIMs + CroweLM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  crowelm-pipeline --target P15056                    # Run pipeline for BRAF kinase
  crowelm-pipeline --target P15056 --render           # Include visualizations
  crowelm-pipeline --sequence "MVLSPAD..." --render   # From protein sequence

Visualization Dependencies:
  pip install crowelm-pipelines[viz]
  # Installs: rdkit, py3Dmol, matplotlib, Pillow
        """
    )
    parser.add_argument("--target", help="UniProt accession ID (e.g., P15056)")
    parser.add_argument("--sequence", help="Protein sequence (amino acids)")
    parser.add_argument("--generate-ligands", action="store_true", default=True,
                        help="Generate novel ligands with MolMIM (default: True)")
    parser.add_argument("--no-ligands", action="store_true",
                        help="Skip ligand generation")
    parser.add_argument("--num-ligands", type=int, default=10,
                        help="Number of ligands to generate (default: 10)")
    parser.add_argument("--output", default="./pipeline_results",
                        help="Output directory (default: ./pipeline_results)")
    parser.add_argument("--render", action="store_true",
                        help="Generate visualization images (requires viz dependencies)")
    parser.add_argument("--no-render", action="store_true",
                        help="Skip visualization generation (default)")

    args = parser.parse_args()

    # Determine if we should generate ligands and render images
    generate_ligands = args.generate_ligands and not args.no_ligands
    render_images = args.render and not args.no_render

    config = PipelineConfig(output_dir=args.output, render_images=render_images)

    if args.sequence:
        await run_sequence_pipeline(args.sequence, generate_ligands)
    elif args.target:
        async with DrugDiscoveryPipeline(config) as pipeline:
            results = await pipeline.run_full_pipeline(
                target_id=args.target,
                generate_ligands=generate_ligands,
                num_ligands=args.num_ligands,
                render_images=render_images,
            )
            print("\n" + results.get("report", "No report generated"))
    else:
        print("Running demo with BRAF kinase (P15056)...")
        async with DrugDiscoveryPipeline(config) as pipeline:
            results = await pipeline.run_full_pipeline(
                target_id="P15056",
                generate_ligands=True,
                num_ligands=10,
                render_images=render_images,
            )


def main():
    """Sync entry point for crowelm-pipeline command."""
    asyncio.run(_main_async())


def visualize_command():
    """
    Standalone visualization command for molecules and structures.

    Usage:
        crowelm-visualize --smiles "CCO" --output ethanol.png
        crowelm-visualize --pdb protein.pdb --output structure.html
        crowelm-visualize --results pipeline_results.json --output ./viz/
    """
    import argparse

    parser = argparse.ArgumentParser(
        description="CroweLM Visualization - Generate molecule and structure images",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  crowelm-visualize --smiles "CCO" --output ethanol.png         # 2D molecule image
  crowelm-visualize --pdb protein.pdb --output viewer.html      # Interactive 3D viewer
  crowelm-visualize --pdb protein.pdb --style surface           # With surface
  crowelm-visualize --results results.json --output ./viz/      # From pipeline results

Available styles for --style:
  cartoon (default), stick, sphere, surface, ribbon, line
        """
    )
    parser.add_argument("--smiles", help="SMILES string for 2D molecule image")
    parser.add_argument("--pdb", help="PDB file path for 3D structure viewer")
    parser.add_argument("--results", help="Pipeline results JSON file")
    parser.add_argument("--output", "-o", required=True,
                        help="Output file path or directory")
    parser.add_argument("--style", default="cartoon",
                        choices=["cartoon", "stick", "sphere", "surface", "ribbon", "line"],
                        help="3D visualization style (default: cartoon)")
    parser.add_argument("--size", type=int, nargs=2, default=[400, 400],
                        metavar=("WIDTH", "HEIGHT"),
                        help="Image size in pixels (default: 400 400)")
    parser.add_argument("--open-browser", action="store_true",
                        help="Open 3D viewer in default browser")

    args = parser.parse_args()

    if not VIZ_AVAILABLE:
        print("Error: Visualization dependencies not installed.")
        print(get_installation_instructions())
        sys.exit(1)

    output_path = Path(args.output)

    # Handle SMILES visualization
    if args.smiles:
        if not RDKIT_AVAILABLE:
            print("Error: RDKit not installed. Run: pip install rdkit")
            sys.exit(1)

        viz = MoleculeVisualizer()
        try:
            saved_path = viz.save_png(
                args.smiles,
                output_path,
                size=tuple(args.size),
            )
            print(f"Saved molecule image: {saved_path}")
        except ValueError as e:
            print(f"Error: {e}")
            sys.exit(1)

    # Handle PDB visualization
    elif args.pdb:
        if not PY3DMOL_AVAILABLE:
            print("Error: py3Dmol not installed. Run: pip install py3Dmol")
            sys.exit(1)

        pdb_path = Path(args.pdb)
        if not pdb_path.exists():
            print(f"Error: PDB file not found: {pdb_path}")
            sys.exit(1)

        viz = StructureVisualizer()

        if args.open_browser:
            with open(pdb_path) as f:
                pdb_content = f.read()
            temp_path = viz.open_in_browser(pdb_content, style=args.style)
            print(f"Opened in browser: {temp_path}")
        else:
            saved_path = viz.save_html_from_file(
                pdb_path,
                output_path,
                style=args.style,
                title=pdb_path.stem,
            )
            print(f"Saved structure viewer: {saved_path}")

    # Handle pipeline results visualization
    elif args.results:
        results_path = Path(args.results)
        if not results_path.exists():
            print(f"Error: Results file not found: {results_path}")
            sys.exit(1)

        with open(results_path) as f:
            results = json.load(f)

        output_dir = output_path if output_path.is_dir() or not output_path.suffix else output_path.parent
        output_dir.mkdir(parents=True, exist_ok=True)

        target_id = results.get("target_id", "unknown")
        print(f"Generating visualizations for {target_id}...")

        # Create a temporary pipeline to generate visualizations
        config = PipelineConfig(output_dir=str(output_dir), render_images=True)

        # Update PDB path if it exists
        stages = results.get("stages", {})
        struct = stages.get("structure_prediction", {})
        pdb_file = struct.get("pdb_file")

        if pdb_file and Path(pdb_file).exists() and PY3DMOL_AVAILABLE:
            viz = StructureVisualizer()
            html_path = output_dir / f"{target_id}_structure_viewer.html"
            saved_path = viz.save_html_from_file(pdb_file, html_path, style=args.style)
            print(f"  Created: {saved_path}")

        if RDKIT_AVAILABLE:
            ligands = stages.get("ligand_generation", {}).get("molecules", [])
            if ligands:
                viz = MoleculeVisualizer()
                smiles_list = [mol.get("sample", "") for mol in ligands[:10]]
                legends = [f"QED: {mol.get('score', 0):.2f}" for mol in ligands[:10]]
                grid_path = output_dir / f"{target_id}_molecules_grid.png"
                viz.save_grid_png(smiles_list, grid_path, legends=legends, cols=5)
                print(f"  Created: {grid_path}")

        if MATPLOTLIB_AVAILABLE:
            ligands = stages.get("ligand_generation", {}).get("molecules", [])
            if ligands:
                chart_gen = ChartGenerator()
                qed_bytes = chart_gen.qed_distribution(ligands)
                qed_path = output_dir / f"{target_id}_qed_distribution.png"
                chart_gen.save_png(qed_bytes, qed_path)
                print(f"  Created: {qed_path}")

        print(f"Done! Visualizations saved to: {output_dir}")

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
