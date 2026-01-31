"""
CroweLM Visualization Module

Provides scientific visualization capabilities for drug discovery pipelines:
- 2D molecule rendering (RDKit)
- Interactive 3D structure viewers (py3Dmol)
- Property distribution charts (Matplotlib)

Install visualization dependencies:
    pip install crowelm-pipelines[viz]
    # or
    pipx inject crowelm-pipelines rdkit py3Dmol matplotlib Pillow

Usage:
    from crowelm.pipelines.visualization import MoleculeVisualizer, StructureVisualizer, ChartGenerator

    if VIZ_AVAILABLE:
        viz = MoleculeVisualizer()
        img = viz.smiles_to_image("CCO")
"""

from typing import Optional, Type

# Visualization availability flag
VIZ_AVAILABLE = False
RDKIT_AVAILABLE = False
PY3DMOL_AVAILABLE = False
MATPLOTLIB_AVAILABLE = False

# Placeholder types for when dependencies are not available
MoleculeVisualizer: Optional[Type] = None
StructureVisualizer: Optional[Type] = None
ChartGenerator: Optional[Type] = None

# Try importing RDKit-based molecule visualization
try:
    from .molecules import MoleculeVisualizer
    RDKIT_AVAILABLE = True
except ImportError as e:
    import warnings
    warnings.warn(
        f"RDKit not available. Install with: pip install rdkit. Error: {e}",
        ImportWarning
    )

# Try importing py3Dmol-based structure visualization
try:
    from .structures import StructureVisualizer
    PY3DMOL_AVAILABLE = True
except ImportError as e:
    import warnings
    warnings.warn(
        f"py3Dmol not available. Install with: pip install py3Dmol. Error: {e}",
        ImportWarning
    )

# Try importing matplotlib-based chart generation
try:
    from .charts import ChartGenerator
    MATPLOTLIB_AVAILABLE = True
except ImportError as e:
    import warnings
    warnings.warn(
        f"Matplotlib not available. Install with: pip install matplotlib. Error: {e}",
        ImportWarning
    )

# Set overall availability flag
VIZ_AVAILABLE = RDKIT_AVAILABLE or PY3DMOL_AVAILABLE or MATPLOTLIB_AVAILABLE


def check_visualization_dependencies() -> dict:
    """
    Check which visualization dependencies are available.

    Returns:
        Dictionary with availability status for each dependency.
    """
    return {
        "viz_available": VIZ_AVAILABLE,
        "rdkit": RDKIT_AVAILABLE,
        "py3dmol": PY3DMOL_AVAILABLE,
        "matplotlib": MATPLOTLIB_AVAILABLE,
        "molecule_visualizer": MoleculeVisualizer is not None,
        "structure_visualizer": StructureVisualizer is not None,
        "chart_generator": ChartGenerator is not None,
    }


def get_installation_instructions() -> str:
    """
    Get installation instructions for missing dependencies.

    Returns:
        String with installation instructions.
    """
    missing = []

    if not RDKIT_AVAILABLE:
        missing.append("rdkit>=2023.9.1")
    if not PY3DMOL_AVAILABLE:
        missing.append("py3Dmol>=2.0.0")
    if not MATPLOTLIB_AVAILABLE:
        missing.append("matplotlib>=3.7.0")

    if not missing:
        return "All visualization dependencies are installed."

    deps = " ".join(missing)
    return f"""
Missing visualization dependencies: {', '.join(missing)}

Install with:
    pip install {deps}

Or install all visualization dependencies:
    pip install crowelm-pipelines[viz]
"""


__all__ = [
    "VIZ_AVAILABLE",
    "RDKIT_AVAILABLE",
    "PY3DMOL_AVAILABLE",
    "MATPLOTLIB_AVAILABLE",
    "MoleculeVisualizer",
    "StructureVisualizer",
    "ChartGenerator",
    "check_visualization_dependencies",
    "get_installation_instructions",
]
