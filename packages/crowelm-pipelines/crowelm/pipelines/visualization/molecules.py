"""
Molecule Visualization Module

Provides 2D molecule rendering using RDKit:
- SMILES to PNG image conversion
- Molecule grid views
- Substructure highlighting
- Scaffold comparison

Requires: rdkit>=2023.9.1, Pillow>=10.0.0
"""

import io
from pathlib import Path
from typing import List, Optional, Tuple, Union

from rdkit import Chem
from rdkit.Chem import AllChem, Draw
from rdkit.Chem.Draw import rdMolDraw2D


class MoleculeVisualizer:
    """
    2D Molecule Visualization using RDKit.

    Converts SMILES strings to high-quality 2D structure images.
    """

    def __init__(
        self,
        default_size: Tuple[int, int] = (300, 300),
        default_font_size: int = 12,
    ):
        """
        Initialize the molecule visualizer.

        Args:
            default_size: Default image size (width, height) in pixels.
            default_font_size: Default font size for atom labels.
        """
        self.default_size = default_size
        self.default_font_size = default_font_size

    def smiles_to_mol(self, smiles: str) -> Optional[Chem.Mol]:
        """
        Convert SMILES string to RDKit Mol object.

        Args:
            smiles: SMILES string representation of molecule.

        Returns:
            RDKit Mol object or None if parsing fails.
        """
        mol = Chem.MolFromSmiles(smiles)
        if mol is not None:
            AllChem.Compute2DCoords(mol)
        return mol

    def smiles_to_image(
        self,
        smiles: str,
        size: Optional[Tuple[int, int]] = None,
        highlight_atoms: Optional[List[int]] = None,
        highlight_bonds: Optional[List[int]] = None,
    ) -> bytes:
        """
        Convert SMILES to PNG image bytes.

        Args:
            smiles: SMILES string representation of molecule.
            size: Image size (width, height) in pixels.
            highlight_atoms: List of atom indices to highlight.
            highlight_bonds: List of bond indices to highlight.

        Returns:
            PNG image as bytes.

        Raises:
            ValueError: If SMILES cannot be parsed.
        """
        mol = self.smiles_to_mol(smiles)
        if mol is None:
            raise ValueError(f"Invalid SMILES: {smiles}")

        size = size or self.default_size

        drawer = rdMolDraw2D.MolDraw2DCairo(size[0], size[1])
        drawer.drawOptions().addStereoAnnotation = True
        drawer.drawOptions().addAtomIndices = False

        if highlight_atoms or highlight_bonds:
            drawer.DrawMolecule(
                mol,
                highlightAtoms=highlight_atoms or [],
                highlightBonds=highlight_bonds or [],
            )
        else:
            drawer.DrawMolecule(mol)

        drawer.FinishDrawing()
        return drawer.GetDrawingText()

    def molecule_grid(
        self,
        smiles_list: List[str],
        legends: Optional[List[str]] = None,
        cols: int = 4,
        mol_size: Tuple[int, int] = (200, 200),
        max_molecules: int = 50,
    ) -> bytes:
        """
        Create a grid image of multiple molecules.

        Args:
            smiles_list: List of SMILES strings.
            legends: Optional labels for each molecule.
            cols: Number of columns in the grid.
            mol_size: Size of each molecule cell.
            max_molecules: Maximum number of molecules to display.

        Returns:
            PNG image as bytes.
        """
        # Limit molecules
        smiles_list = smiles_list[:max_molecules]

        # Convert to mol objects
        mols = []
        valid_legends = []
        for i, smi in enumerate(smiles_list):
            mol = self.smiles_to_mol(smi)
            if mol is not None:
                mols.append(mol)
                if legends and i < len(legends):
                    valid_legends.append(legends[i])
                else:
                    valid_legends.append("")

        if not mols:
            raise ValueError("No valid molecules to display")

        # Calculate grid dimensions
        rows = (len(mols) + cols - 1) // cols
        grid_size = (cols * mol_size[0], rows * mol_size[1])

        # Create grid image
        img = Draw.MolsToGridImage(
            mols,
            molsPerRow=cols,
            subImgSize=mol_size,
            legends=valid_legends if legends else None,
            returnPNG=True,
        )

        return img

    def highlight_substructure(
        self,
        smiles: str,
        pattern: str,
        size: Optional[Tuple[int, int]] = None,
        highlight_color: Tuple[float, float, float] = (1.0, 0.8, 0.8),
    ) -> bytes:
        """
        Highlight a substructure pattern in a molecule.

        Args:
            smiles: SMILES of the molecule.
            pattern: SMARTS or SMILES pattern to highlight.
            size: Image size.
            highlight_color: RGB color for highlighting (0-1 scale).

        Returns:
            PNG image as bytes with highlighted substructure.

        Raises:
            ValueError: If molecule or pattern is invalid.
        """
        mol = self.smiles_to_mol(smiles)
        if mol is None:
            raise ValueError(f"Invalid molecule SMILES: {smiles}")

        # Try SMARTS first, then SMILES
        pattern_mol = Chem.MolFromSmarts(pattern)
        if pattern_mol is None:
            pattern_mol = Chem.MolFromSmiles(pattern)
        if pattern_mol is None:
            raise ValueError(f"Invalid pattern: {pattern}")

        # Find matching atoms
        matches = mol.GetSubstructMatches(pattern_mol)
        if not matches:
            # No match, return regular image
            return self.smiles_to_image(smiles, size)

        # Flatten all matching atom indices
        highlight_atoms = list(set(atom for match in matches for atom in match))

        # Find bonds within highlighted atoms
        highlight_bonds = []
        for bond in mol.GetBonds():
            if (
                bond.GetBeginAtomIdx() in highlight_atoms
                and bond.GetEndAtomIdx() in highlight_atoms
            ):
                highlight_bonds.append(bond.GetIdx())

        size = size or self.default_size

        drawer = rdMolDraw2D.MolDraw2DCairo(size[0], size[1])
        drawer.drawOptions().addStereoAnnotation = True

        # Set highlight colors
        atom_colors = {idx: highlight_color for idx in highlight_atoms}
        bond_colors = {idx: highlight_color for idx in highlight_bonds}

        drawer.DrawMolecule(
            mol,
            highlightAtoms=highlight_atoms,
            highlightBonds=highlight_bonds,
            highlightAtomColors=atom_colors,
            highlightBondColors=bond_colors,
        )

        drawer.FinishDrawing()
        return drawer.GetDrawingText()

    def compare_scaffolds(
        self,
        smiles_list: List[str],
        reference_smiles: str,
        cols: int = 4,
        mol_size: Tuple[int, int] = (200, 200),
    ) -> bytes:
        """
        Compare molecules by highlighting common scaffold.

        Args:
            smiles_list: List of SMILES to compare.
            reference_smiles: Reference scaffold SMILES.
            cols: Number of columns in grid.
            mol_size: Size of each molecule cell.

        Returns:
            PNG grid image with scaffolds highlighted.
        """
        from rdkit.Chem.Scaffolds import MurckoScaffold

        ref_mol = self.smiles_to_mol(reference_smiles)
        if ref_mol is None:
            raise ValueError(f"Invalid reference SMILES: {reference_smiles}")

        mols = []
        highlight_atoms_list = []
        highlight_bonds_list = []

        for smi in smiles_list:
            mol = self.smiles_to_mol(smi)
            if mol is None:
                continue

            # Find scaffold match
            matches = mol.GetSubstructMatches(ref_mol)
            if matches:
                atoms = list(matches[0])
                bonds = []
                for bond in mol.GetBonds():
                    if (
                        bond.GetBeginAtomIdx() in atoms
                        and bond.GetEndAtomIdx() in atoms
                    ):
                        bonds.append(bond.GetIdx())
            else:
                atoms = []
                bonds = []

            mols.append(mol)
            highlight_atoms_list.append(atoms)
            highlight_bonds_list.append(bonds)

        if not mols:
            raise ValueError("No valid molecules to compare")

        # Create grid with highlights
        img = Draw.MolsToGridImage(
            mols,
            molsPerRow=cols,
            subImgSize=mol_size,
            highlightAtomLists=highlight_atoms_list,
            highlightBondLists=highlight_bonds_list,
            returnPNG=True,
        )

        return img

    def save_png(
        self,
        smiles: str,
        filepath: Union[str, Path],
        size: Optional[Tuple[int, int]] = None,
    ) -> str:
        """
        Save molecule image to PNG file.

        Args:
            smiles: SMILES string.
            filepath: Output file path.
            size: Image size.

        Returns:
            Path to saved file.
        """
        img_bytes = self.smiles_to_image(smiles, size)
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)

        with open(filepath, "wb") as f:
            f.write(img_bytes)

        return str(filepath)

    def save_grid_png(
        self,
        smiles_list: List[str],
        filepath: Union[str, Path],
        legends: Optional[List[str]] = None,
        cols: int = 4,
        mol_size: Tuple[int, int] = (200, 200),
    ) -> str:
        """
        Save molecule grid to PNG file.

        Args:
            smiles_list: List of SMILES strings.
            filepath: Output file path.
            legends: Optional labels for molecules.
            cols: Number of columns.
            mol_size: Size of each molecule.

        Returns:
            Path to saved file.
        """
        img_bytes = self.molecule_grid(smiles_list, legends, cols, mol_size)
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)

        with open(filepath, "wb") as f:
            f.write(img_bytes)

        return str(filepath)

    def smiles_to_svg(
        self,
        smiles: str,
        size: Optional[Tuple[int, int]] = None,
    ) -> str:
        """
        Convert SMILES to SVG string.

        Args:
            smiles: SMILES string.
            size: Image size.

        Returns:
            SVG string.
        """
        mol = self.smiles_to_mol(smiles)
        if mol is None:
            raise ValueError(f"Invalid SMILES: {smiles}")

        size = size or self.default_size

        drawer = rdMolDraw2D.MolDraw2DSVG(size[0], size[1])
        drawer.drawOptions().addStereoAnnotation = True
        drawer.DrawMolecule(mol)
        drawer.FinishDrawing()

        return drawer.GetDrawingText()

    def get_molecule_properties(self, smiles: str) -> dict:
        """
        Calculate basic molecular properties.

        Args:
            smiles: SMILES string.

        Returns:
            Dictionary of molecular properties.
        """
        from rdkit.Chem import Descriptors, Lipinski

        mol = self.smiles_to_mol(smiles)
        if mol is None:
            raise ValueError(f"Invalid SMILES: {smiles}")

        return {
            "smiles": smiles,
            "molecular_weight": Descriptors.MolWt(mol),
            "logp": Descriptors.MolLogP(mol),
            "hbd": Lipinski.NumHDonors(mol),
            "hba": Lipinski.NumHAcceptors(mol),
            "tpsa": Descriptors.TPSA(mol),
            "rotatable_bonds": Lipinski.NumRotatableBonds(mol),
            "num_atoms": mol.GetNumAtoms(),
            "num_heavy_atoms": mol.GetNumHeavyAtoms(),
            "num_rings": Lipinski.RingCount(mol),
            "num_aromatic_rings": Lipinski.NumAromaticRings(mol),
        }


def create_top_molecules_image(
    molecules: List[dict],
    output_path: Union[str, Path],
    top_n: int = 5,
    score_key: str = "score",
    smiles_key: str = "sample",
) -> str:
    """
    Create grid image of top-ranked molecules.

    Args:
        molecules: List of molecule dictionaries with SMILES and scores.
        output_path: Output file path.
        top_n: Number of top molecules to include.
        score_key: Key for score in molecule dict.
        smiles_key: Key for SMILES in molecule dict.

    Returns:
        Path to saved image.
    """
    # Sort by score descending
    sorted_mols = sorted(
        molecules, key=lambda x: x.get(score_key, 0), reverse=True
    )[:top_n]

    smiles_list = [mol.get(smiles_key, "") for mol in sorted_mols]
    legends = [
        f"#{i+1} (QED: {mol.get(score_key, 0):.3f})"
        for i, mol in enumerate(sorted_mols)
    ]

    viz = MoleculeVisualizer()
    return viz.save_grid_png(
        smiles_list,
        output_path,
        legends=legends,
        cols=min(top_n, 5),
        mol_size=(250, 250),
    )
