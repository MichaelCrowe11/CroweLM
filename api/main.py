"""
CroweLM API Server
FastAPI endpoints for the CroweLM Biotech AI Platform
"""

import os
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="CroweLM API",
    description="Biotech AI Platform for Drug Discovery",
    version="0.1.0",
)


class ChatRequest(BaseModel):
    message: str
    model: str = "crowelogic/crowelogic:v1.0"


class ChatResponse(BaseModel):
    response: str
    model: str


class TargetRequest(BaseModel):
    target_id: str


class TargetResponse(BaseModel):
    target_id: str
    gene: Optional[str] = None
    protein_name: Optional[str] = None
    druggability_score: Optional[float] = None
    analysis: Optional[str] = None


class MoleculeRequest(BaseModel):
    num_molecules: int = 10
    seed_smiles: Optional[str] = None


class MoleculeResponse(BaseModel):
    molecules: List[dict]


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "0.1.0"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "CroweLM API",
        "version": "0.1.0",
        "description": "Biotech AI Platform for Drug Discovery",
        "endpoints": {
            "/health": "Health check",
            "/chat": "Chat with biotech agent",
            "/target/{id}": "Analyze drug target",
            "/molecules/generate": "Generate novel molecules",
        }
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with the biotech agent"""
    try:
        from crowelm.agents import BiotechAgent, BiotechConfig

        config = BiotechConfig(model_name=request.model)
        async with BiotechAgent(config) as agent:
            response = await agent._llm_query(request.message)
            return ChatResponse(response=response, model=request.model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/target/{target_id}", response_model=TargetResponse)
async def analyze_target(target_id: str):
    """Analyze a drug target by UniProt ID"""
    try:
        from crowelm.agents import BiotechAgent

        async with BiotechAgent() as agent:
            # Fetch UniProt data
            uniprot_data = await agent.fetch_uniprot(target_id)

            return TargetResponse(
                target_id=target_id,
                gene=uniprot_data.get("gene"),
                protein_name=uniprot_data.get("protein_name"),
                druggability_score=0.75,  # Placeholder
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/molecules/generate", response_model=MoleculeResponse)
async def generate_molecules(request: MoleculeRequest):
    """Generate novel molecules using NVIDIA MolMIM"""
    try:
        from crowelm.nims import NVIDIANIMs

        async with NVIDIANIMs() as nims:
            result = await nims.generate_molecules(
                num_molecules=request.num_molecules,
                smi=request.seed_smiles,
            )
            return MoleculeResponse(molecules=result.get("molecules", []))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
