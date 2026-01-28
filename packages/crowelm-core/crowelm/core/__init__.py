"""
CroweLM Core - Shared utilities and configuration for CroweLM platform.
"""

from .config import CroweLMConfig, ModelConfig
from .version import __version__

__all__ = ["CroweLMConfig", "ModelConfig", "__version__"]
