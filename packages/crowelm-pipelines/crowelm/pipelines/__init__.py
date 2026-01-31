"""
CroweLM Pipelines - Drug discovery workflow pipelines.

Includes:
- DrugDiscoveryPipeline: End-to-end drug discovery workflow
- Visualization: Optional 2D/3D molecule and structure rendering

Visualization requires optional dependencies:
    pip install crowelm-pipelines[viz]
"""

from .drug_discovery import DrugDiscoveryPipeline, PipelineConfig

# Visualization exports with graceful fallback
try:
    from .visualization import (
        VIZ_AVAILABLE,
        MoleculeVisualizer,
        StructureVisualizer,
        ChartGenerator,
        check_visualization_dependencies,
    )
except ImportError:
    VIZ_AVAILABLE = False
    MoleculeVisualizer = None
    StructureVisualizer = None
    ChartGenerator = None

    def check_visualization_dependencies():
        return {"viz_available": False}

__all__ = [
    "DrugDiscoveryPipeline",
    "PipelineConfig",
    "VIZ_AVAILABLE",
    "MoleculeVisualizer",
    "StructureVisualizer",
    "ChartGenerator",
    "check_visualization_dependencies",
]
