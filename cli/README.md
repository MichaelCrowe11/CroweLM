# @crowe-logic/crowelm-cli

Command-line interface for the CroweLM Biotech AI Platform.

## Installation

```bash
npm install -g @crowe-logic/crowelm-cli
```

## Prerequisites

- Python 3.10+ with CroweLM packages installed
- Docker (for model runner and containerized services)
- NVIDIA API key (for NIMs features)

## Usage

```bash
# Check system status
crowelm status

# Run biotech agent interactively
crowelm agent biotech -i

# Analyze a drug target
crowelm agent biotech --target P15056

# Run research agent
crowelm agent research --topic "CRISPR drug discovery"

# Test NVIDIA NIMs
crowelm nvidia test

# Predict protein structure
crowelm nvidia structure MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFL

# Generate molecules
crowelm nvidia generate 10

# Run full drug discovery pipeline
crowelm nvidia pipeline P15056

# Manage Docker services
crowelm docker up
crowelm docker logs crowelm-agents
crowelm docker down
```

## Commands

| Command | Description |
|---------|-------------|
| `status` | Show overall system status |
| `models` | Manage AI models (list, run, chat) |
| `agent` | Run AI agents (biotech, research) |
| `nvidia` | NVIDIA BioNeMo NIMs integration |
| `docker` | Manage Docker services |
| `train` | Training utilities (MLX) |
| `api` | Quick API calls |
| `version` | Show version information |
| `help` | Show help |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NVIDIA_API_KEY` | NVIDIA API key for NIMs |
| `CROWELM_MODEL_URL` | Local model endpoint |
| `CROWELM_MODEL_NAME` | Model to use |

## License

MIT
