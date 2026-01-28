# CroweLM

**Biotech AI Platform for Drug Discovery**

CroweLM is an integrated AI platform combining NVIDIA BioNeMo NIMs with local LLMs for comprehensive drug discovery workflows. Built for researchers, scientists, and biotech professionals.

## Features

- **Drug Target Analysis** - Automated UniProt, ChEMBL, and PubMed data integration
- **Protein Structure Prediction** - ESMFold via NVIDIA NIMs
- **Molecule Generation** - MolMIM for de novo drug design
- **AI-Powered Research** - Specialized biotech and research agents
- **MLX Training** - LoRA fine-tuning on Apple Silicon

## Installation

```bash
# Install all components
pip install crowelm

# Or install specific packages
pip install crowelm-agents    # Biotech & research agents
pip install crowelm-nims      # NVIDIA NIMs integration
pip install crowelm-pipelines # Drug discovery workflows
pip install crowelm-training  # MLX fine-tuning (Apple Silicon)
```

## Quick Start

### Using the Biotech Agent

```python
import asyncio
from crowelm.agents import BiotechAgent

async def main():
    async with BiotechAgent() as agent:
        # Analyze a drug target
        results = await agent.analyze_target("P15056")  # BRAF kinase
        print(results["analysis"])

asyncio.run(main())
```

### Running the Drug Discovery Pipeline

```python
import asyncio
from crowelm.pipelines import DrugDiscoveryPipeline

async def main():
    async with DrugDiscoveryPipeline() as pipeline:
        results = await pipeline.run_full_pipeline(
            target_id="P15056",
            generate_ligands=True,
            num_ligands=10
        )
        print(results["report"])

asyncio.run(main())
```

### Using NVIDIA NIMs Directly

```python
import asyncio
from crowelm.nims import NVIDIANIMs

async def main():
    async with NVIDIANIMs() as nims:
        # Predict protein structure
        structure = await nims.predict_structure_esmfold("MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFL")

        # Generate novel molecules
        molecules = await nims.generate_molecules(num_molecules=10, property_name="QED")

        # Ask scientific questions
        answer = await nims.science_chat("What is protein folding?")

asyncio.run(main())
```

## CLI Usage

```bash
# Run biotech agent interactively
python -m crowelm.agents.biotech -i

# Analyze a drug target
python -m crowelm.agents.biotech --target P15056

# Run research agent
python -m crowelm.agents.research --topic "CRISPR drug discovery"

# Test NVIDIA NIMs
python -m crowelm.nims.nvidia --test

# Run drug discovery pipeline
python -m crowelm.pipelines.drug_discovery --target P15056
```

## Docker

```bash
# Pull the agent runtime
docker pull crowelogic/crowelm-agents:latest

# Run interactively
docker run -it --rm \
  -e NVIDIA_API_KEY=$NVIDIA_API_KEY \
  crowelogic/crowelm-agents:latest

# Run a specific analysis
docker run --rm \
  -e NVIDIA_API_KEY=$NVIDIA_API_KEY \
  crowelogic/crowelm-agents:latest \
  python -m crowelm.agents.biotech --target P15056
```

## npm CLI

```bash
# Install globally
npm install -g @crowe-logic/crowelm-cli

# Check system status
crowelm status

# Run agents
crowelm agent research --topic "drug discovery"
crowelm nvidia pipeline P15056
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NVIDIA_API_KEY` | NVIDIA API key for NIMs | For NVIDIA features |
| `CROWELM_MODEL_URL` | Local model endpoint | No (default: localhost:12434) |
| `CROWELM_MODEL_NAME` | Model to use | No (default: crowelogic/crowelogic:v1.0) |

## Packages

| Package | Description |
|---------|-------------|
| `crowelm` | Meta-package installing all components |
| `crowelm-core` | Shared configuration and utilities |
| `crowelm-agents` | Biotech and research AI agents |
| `crowelm-nims` | NVIDIA BioNeMo NIMs integration |
| `crowelm-pipelines` | Drug discovery workflow pipelines |
| `crowelm-training` | MLX LoRA fine-tuning for Apple Silicon |

## Requirements

- Python 3.10+
- NVIDIA API key (for NIMs features)
- Docker (optional, for containerized deployment)
- Apple Silicon Mac (for MLX training)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

**Michael Crowe** - [Crowe Logic](https://crowelogic.com)

---

*CroweLM - Accelerating Drug Discovery with AI*
