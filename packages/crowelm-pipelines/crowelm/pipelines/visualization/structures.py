"""
Protein Structure Visualization Module

Provides interactive 3D structure visualization using py3Dmol:
- Render PDB structures with multiple styles
- Highlight binding sites and residues
- Show ligand docking poses
- Generate self-contained HTML viewers

Requires: py3Dmol>=2.0.0
"""

import webbrowser
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import py3Dmol


class StructureVisualizer:
    """
    Interactive 3D Protein Structure Visualization using py3Dmol.

    Generates self-contained HTML viewers that can be opened in any browser.
    """

    # Color schemes for different visualization purposes
    COLOR_SCHEMES = {
        "default": "spectrum",
        "chain": "chain",
        "secondary": "ssPyMOL",
        "hydrophobicity": "ssJmol",
        "bfactor": "b",
    }

    # Style presets
    STYLE_PRESETS = {
        "cartoon": {"cartoon": {"color": "spectrum"}},
        "stick": {"stick": {}},
        "sphere": {"sphere": {}},
        "surface": {"cartoon": {"color": "spectrum"}},
        "ribbon": {"cartoon": {"style": "trace", "color": "spectrum"}},
        "line": {"line": {}},
    }

    def __init__(
        self,
        width: int = 800,
        height: int = 600,
        background_color: str = "white",
    ):
        """
        Initialize the structure visualizer.

        Args:
            width: Default viewer width in pixels.
            height: Default viewer height in pixels.
            background_color: Default background color.
        """
        self.width = width
        self.height = height
        self.background_color = background_color

    def create_viewer(
        self,
        width: Optional[int] = None,
        height: Optional[int] = None,
    ) -> py3Dmol.view:
        """
        Create a new py3Dmol viewer.

        Args:
            width: Viewer width.
            height: Viewer height.

        Returns:
            py3Dmol view object.
        """
        return py3Dmol.view(
            width=width or self.width,
            height=height or self.height,
        )

    def render_pdb(
        self,
        pdb_string: str,
        style: str = "cartoon",
        color_scheme: str = "default",
        show_surface: bool = False,
        surface_opacity: float = 0.7,
        width: Optional[int] = None,
        height: Optional[int] = None,
    ) -> str:
        """
        Render a PDB structure as an interactive HTML viewer.

        Args:
            pdb_string: PDB file content as string.
            style: Visualization style (cartoon, stick, sphere, surface, ribbon, line).
            color_scheme: Color scheme (default, chain, secondary, hydrophobicity, bfactor).
            show_surface: Whether to add a molecular surface.
            surface_opacity: Surface transparency (0-1).
            width: Viewer width.
            height: Viewer height.

        Returns:
            Self-contained HTML string with interactive 3D viewer.
        """
        viewer = self.create_viewer(width, height)
        viewer.addModel(pdb_string, "pdb")

        # Apply style
        style_dict = self.STYLE_PRESETS.get(style, self.STYLE_PRESETS["cartoon"]).copy()

        # Update color scheme
        color = self.COLOR_SCHEMES.get(color_scheme, "spectrum")
        for key in style_dict:
            if isinstance(style_dict[key], dict):
                style_dict[key]["color"] = color

        viewer.setStyle(style_dict)

        # Add surface if requested
        if show_surface:
            viewer.addSurface(
                py3Dmol.VDW,
                {"opacity": surface_opacity, "color": "white"},
            )

        viewer.setBackgroundColor(self.background_color)
        viewer.zoomTo()

        return self._viewer_to_html(viewer)

    def render_pdb_file(
        self,
        pdb_path: Union[str, Path],
        style: str = "cartoon",
        **kwargs,
    ) -> str:
        """
        Render a PDB file as an interactive HTML viewer.

        Args:
            pdb_path: Path to PDB file.
            style: Visualization style.
            **kwargs: Additional arguments for render_pdb.

        Returns:
            Self-contained HTML string.
        """
        pdb_path = Path(pdb_path)
        with open(pdb_path, "r") as f:
            pdb_string = f.read()
        return self.render_pdb(pdb_string, style, **kwargs)

    def show_binding_site(
        self,
        pdb_string: str,
        residues: List[int],
        chain: str = "A",
        highlight_color: str = "red",
        context_style: str = "cartoon",
        site_style: str = "stick",
        show_surface: bool = True,
        width: Optional[int] = None,
        height: Optional[int] = None,
    ) -> str:
        """
        Highlight a binding site in the structure.

        Args:
            pdb_string: PDB file content.
            residues: List of residue numbers in the binding site.
            chain: Chain identifier.
            highlight_color: Color for binding site residues.
            context_style: Style for the rest of the protein.
            site_style: Style for binding site residues.
            show_surface: Show surface around binding site.
            width: Viewer width.
            height: Viewer height.

        Returns:
            HTML string with binding site highlighted.
        """
        viewer = self.create_viewer(width, height)
        viewer.addModel(pdb_string, "pdb")

        # Style for the whole protein
        context_style_dict = self.STYLE_PRESETS.get(
            context_style, self.STYLE_PRESETS["cartoon"]
        ).copy()
        viewer.setStyle(context_style_dict)

        # Highlight binding site residues
        site_style_dict = self.STYLE_PRESETS.get(
            site_style, self.STYLE_PRESETS["stick"]
        ).copy()
        for key in site_style_dict:
            if isinstance(site_style_dict[key], dict):
                site_style_dict[key]["color"] = highlight_color

        residue_selector = {"resi": residues, "chain": chain}
        viewer.addStyle(residue_selector, site_style_dict)

        # Add surface around binding site
        if show_surface:
            viewer.addSurface(
                py3Dmol.VDW,
                {"opacity": 0.5, "color": highlight_color},
                residue_selector,
            )

        viewer.setBackgroundColor(self.background_color)
        viewer.zoomTo(residue_selector)

        return self._viewer_to_html(viewer)

    def dock_view(
        self,
        protein_pdb: str,
        ligand_sdf: Optional[str] = None,
        ligand_pdb: Optional[str] = None,
        ligand_smiles: Optional[str] = None,
        protein_style: str = "cartoon",
        ligand_style: str = "stick",
        ligand_color: str = "green",
        show_protein_surface: bool = True,
        surface_opacity: float = 0.5,
        width: Optional[int] = None,
        height: Optional[int] = None,
    ) -> str:
        """
        Visualize a protein-ligand docking pose.

        Args:
            protein_pdb: Protein PDB content.
            ligand_sdf: Ligand SDF file content (preferred).
            ligand_pdb: Ligand PDB file content (alternative).
            ligand_smiles: Ligand SMILES (will be converted to 3D).
            protein_style: Style for protein.
            ligand_style: Style for ligand.
            ligand_color: Color for ligand.
            show_protein_surface: Show protein surface.
            surface_opacity: Surface transparency.
            width: Viewer width.
            height: Viewer height.

        Returns:
            HTML string with docking visualization.
        """
        viewer = self.create_viewer(width, height)

        # Add protein
        viewer.addModel(protein_pdb, "pdb")
        protein_style_dict = self.STYLE_PRESETS.get(
            protein_style, self.STYLE_PRESETS["cartoon"]
        )
        viewer.setStyle({"model": 0}, protein_style_dict)

        if show_protein_surface:
            viewer.addSurface(
                py3Dmol.VDW,
                {"opacity": surface_opacity, "color": "white"},
                {"model": 0},
            )

        # Add ligand
        if ligand_sdf:
            viewer.addModel(ligand_sdf, "sdf")
        elif ligand_pdb:
            viewer.addModel(ligand_pdb, "pdb")
        elif ligand_smiles:
            # Use RDKit to generate 3D coordinates
            try:
                from rdkit import Chem
                from rdkit.Chem import AllChem

                mol = Chem.MolFromSmiles(ligand_smiles)
                if mol:
                    mol = Chem.AddHs(mol)
                    AllChem.EmbedMolecule(mol, randomSeed=42)
                    AllChem.MMFFOptimizeMolecule(mol)
                    mol_block = Chem.MolToMolBlock(mol)
                    viewer.addModel(mol_block, "sdf")
            except ImportError:
                raise ValueError(
                    "RDKit is required to convert SMILES to 3D. "
                    "Provide ligand_sdf or ligand_pdb instead."
                )

        # Style ligand
        ligand_style_dict = self.STYLE_PRESETS.get(
            ligand_style, self.STYLE_PRESETS["stick"]
        ).copy()
        for key in ligand_style_dict:
            if isinstance(ligand_style_dict[key], dict):
                ligand_style_dict[key]["color"] = ligand_color

        viewer.setStyle({"model": 1}, ligand_style_dict)

        viewer.setBackgroundColor(self.background_color)
        viewer.zoomTo()

        return self._viewer_to_html(viewer)

    def multi_pose_view(
        self,
        protein_pdb: str,
        ligand_poses: List[str],
        pose_format: str = "sdf",
        colors: Optional[List[str]] = None,
        width: Optional[int] = None,
        height: Optional[int] = None,
    ) -> str:
        """
        Visualize multiple docking poses.

        Args:
            protein_pdb: Protein PDB content.
            ligand_poses: List of ligand pose contents.
            pose_format: Format of pose files (sdf, pdb).
            colors: Colors for each pose.
            width: Viewer width.
            height: Viewer height.

        Returns:
            HTML string with multiple poses.
        """
        default_colors = [
            "green", "blue", "red", "orange", "purple",
            "cyan", "magenta", "yellow", "lime", "pink",
        ]
        colors = colors or default_colors

        viewer = self.create_viewer(width, height)

        # Add protein
        viewer.addModel(protein_pdb, "pdb")
        viewer.setStyle({"model": 0}, {"cartoon": {"color": "spectrum"}})
        viewer.addSurface(
            py3Dmol.VDW,
            {"opacity": 0.3, "color": "white"},
            {"model": 0},
        )

        # Add each pose with different color
        for i, pose in enumerate(ligand_poses):
            viewer.addModel(pose, pose_format)
            color = colors[i % len(colors)]
            viewer.setStyle(
                {"model": i + 1},
                {"stick": {"color": color}},
            )

        viewer.setBackgroundColor(self.background_color)
        viewer.zoomTo()

        return self._viewer_to_html(viewer)

    def save_html(
        self,
        pdb_string: str,
        filepath: Union[str, Path],
        style: str = "cartoon",
        title: Optional[str] = None,
        **kwargs,
    ) -> str:
        """
        Save structure visualization to HTML file.

        Args:
            pdb_string: PDB file content.
            filepath: Output file path.
            style: Visualization style.
            title: HTML page title.
            **kwargs: Additional arguments for render_pdb.

        Returns:
            Path to saved file.
        """
        html_content = self.render_pdb(pdb_string, style, **kwargs)

        # Wrap in full HTML page
        title = title or "CroweLM Structure Viewer"
        full_html = self._wrap_in_html_page(html_content, title)

        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)

        with open(filepath, "w") as f:
            f.write(full_html)

        return str(filepath)

    def save_html_from_file(
        self,
        pdb_path: Union[str, Path],
        output_path: Union[str, Path],
        **kwargs,
    ) -> str:
        """
        Load PDB file and save as HTML viewer.

        Args:
            pdb_path: Input PDB file path.
            output_path: Output HTML file path.
            **kwargs: Additional arguments.

        Returns:
            Path to saved file.
        """
        pdb_path = Path(pdb_path)
        with open(pdb_path, "r") as f:
            pdb_string = f.read()

        title = kwargs.pop("title", pdb_path.stem)
        return self.save_html(pdb_string, output_path, title=title, **kwargs)

    def open_in_browser(
        self,
        pdb_string: str,
        style: str = "cartoon",
        **kwargs,
    ) -> str:
        """
        Open structure in default web browser.

        Args:
            pdb_string: PDB file content.
            style: Visualization style.
            **kwargs: Additional arguments.

        Returns:
            Path to temporary HTML file.
        """
        import tempfile

        html_content = self.render_pdb(pdb_string, style, **kwargs)
        full_html = self._wrap_in_html_page(html_content, "CroweLM Structure Viewer")

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".html", delete=False
        ) as f:
            f.write(full_html)
            temp_path = f.name

        webbrowser.open(f"file://{temp_path}")
        return temp_path

    def _viewer_to_html(self, viewer: py3Dmol.view) -> str:
        """
        Convert py3Dmol viewer to embeddable HTML.

        Args:
            viewer: py3Dmol view object.

        Returns:
            HTML string for embedding.
        """
        # Get the HTML representation
        html = viewer._make_html()
        return html

    def _wrap_in_html_page(self, viewer_html: str, title: str) -> str:
        """
        Wrap viewer HTML in a complete HTML page.

        Args:
            viewer_html: Viewer HTML content.
            title: Page title.

        Returns:
            Complete HTML page.
        """
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 900px;
            margin: 0 auto;
        }}
        h1 {{
            color: #333;
            margin-bottom: 20px;
        }}
        .viewer-container {{
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 20px;
            margin-bottom: 20px;
        }}
        .controls {{
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
        }}
        .footer {{
            text-align: center;
            color: #999;
            font-size: 12px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>{title}</h1>
        <div class="viewer-container">
            {viewer_html}
            <div class="controls">
                <strong>Controls:</strong> Left-click + drag to rotate |
                Scroll to zoom | Right-click + drag to translate
            </div>
        </div>
        <div class="footer">
            Generated by CroweLM Visualization
        </div>
    </div>
</body>
</html>"""


def create_structure_viewer(
    pdb_path: Union[str, Path],
    output_path: Union[str, Path],
    style: str = "cartoon",
) -> str:
    """
    Convenience function to create HTML viewer from PDB file.

    Args:
        pdb_path: Input PDB file.
        output_path: Output HTML file.
        style: Visualization style.

    Returns:
        Path to saved HTML file.
    """
    viz = StructureVisualizer()
    return viz.save_html_from_file(pdb_path, output_path, style=style)
