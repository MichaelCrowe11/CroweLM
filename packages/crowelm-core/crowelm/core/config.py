"""
CroweLM Configuration - Shared configuration classes for all CroweLM packages.
"""

import os
from dataclasses import dataclass, field
from typing import Optional, Dict, Any


@dataclass
class ModelConfig:
    """Configuration for LLM model endpoints."""

    url: str = "http://localhost:12434/v1"
    model_name: str = "crowelogic/crowelogic:v1.0"
    temperature: float = 0.2
    max_tokens: int = 4096
    timeout: int = 60

    @classmethod
    def from_env(cls) -> "ModelConfig":
        """Create config from environment variables."""
        return cls(
            url=os.environ.get("CROWELM_MODEL_URL", "http://localhost:12434/v1"),
            model_name=os.environ.get("CROWELM_MODEL_NAME", "crowelogic/crowelogic:v1.0"),
            temperature=float(os.environ.get("CROWELM_TEMPERATURE", "0.2")),
            max_tokens=int(os.environ.get("CROWELM_MAX_TOKENS", "4096")),
            timeout=int(os.environ.get("CROWELM_TIMEOUT", "60")),
        )


@dataclass
class NVIDIAConfig:
    """Configuration for NVIDIA NIMs integration."""

    api_key: str = field(default_factory=lambda: os.environ.get("NVIDIA_API_KEY", ""))
    biology_url: str = "https://health.api.nvidia.com/v1"
    llm_url: str = "https://integrate.api.nvidia.com/v1"
    timeout: int = 300

    @classmethod
    def from_env(cls) -> "NVIDIAConfig":
        """Create config from environment variables."""
        return cls(
            api_key=os.environ.get("NVIDIA_API_KEY", ""),
            biology_url=os.environ.get("NVIDIA_BIOLOGY_URL", "https://health.api.nvidia.com/v1"),
            llm_url=os.environ.get("NVIDIA_LLM_URL", "https://integrate.api.nvidia.com/v1"),
            timeout=int(os.environ.get("NVIDIA_TIMEOUT", "300")),
        )


@dataclass
class CroweLMConfig:
    """Master configuration for CroweLM platform."""

    model: ModelConfig = field(default_factory=ModelConfig)
    nvidia: NVIDIAConfig = field(default_factory=NVIDIAConfig)
    output_dir: str = "./output"
    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> "CroweLMConfig":
        """Create master config from environment variables."""
        return cls(
            model=ModelConfig.from_env(),
            nvidia=NVIDIAConfig.from_env(),
            output_dir=os.environ.get("CROWELM_OUTPUT_DIR", "./output"),
            log_level=os.environ.get("CROWELM_LOG_LEVEL", "INFO"),
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        return {
            "model": {
                "url": self.model.url,
                "model_name": self.model.model_name,
                "temperature": self.model.temperature,
                "max_tokens": self.model.max_tokens,
            },
            "nvidia": {
                "biology_url": self.nvidia.biology_url,
                "llm_url": self.nvidia.llm_url,
            },
            "output_dir": self.output_dir,
            "log_level": self.log_level,
        }
