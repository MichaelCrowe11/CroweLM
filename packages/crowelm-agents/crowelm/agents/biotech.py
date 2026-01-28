#!/usr/bin/env python3
"""
Biotech Research Agent - Specialized for Drug Discovery & Life Sciences
Uses Docker Model Runner with CroweLM models for domain expertise

Features:
- Drug target analysis
- Molecular property prediction
- Literature synthesis
- Clinical trial research
- Gene/protein analysis

Usage:
    python -m crowelm.agents.biotech --analyze "BRAF protein druggability"
    python -m crowelm.agents.biotech --target P15056
    python -m crowelm.agents.biotech -i  # Interactive mode
"""

import asyncio
import aiohttp
import json
import argparse
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime


@dataclass
class BiotechConfig:
    """Configuration for biotech agent"""
    model_url: str = "http://localhost:12434/v1"
    model_name: str = "crowelogic/crowelogic:v1.0"
    temperature: float = 0.2
    max_tokens: int = 4096


class BiotechAgent:
    """
    Specialized AI Agent for Biotechnology and Drug Discovery.

    Capabilities:
    - Drug target validation and druggability assessment
    - Protein structure and function analysis
    - Molecular property prediction
    - Clinical development insights
    - Literature mining and synthesis
    """

    SYSTEM_PROMPT = """You are CroweLM Biotech, an elite AI assistant specialized in biotechnology,
pharmaceutical research, and drug discovery.

## YOUR EXPERTISE

1. **DRUG DISCOVERY**
   - Target identification and validation
   - Druggability assessment
   - Lead optimization
   - ADMET property prediction
   - Structure-activity relationships (SAR)

2. **MOLECULAR BIOLOGY**
   - Protein structure and function
   - Gene expression analysis
   - Pathway analysis
   - Protein-protein interactions
   - Post-translational modifications

3. **CLINICAL DEVELOPMENT**
   - Clinical trial design
   - Biomarker development
   - Patient stratification
   - Regulatory considerations
   - Competitive landscape analysis

4. **THERAPEUTIC MODALITIES**
   - Small molecules
   - Biologics (antibodies, proteins)
   - Gene therapy
   - Cell therapy
   - RNA therapeutics (ASO, siRNA, mRNA)
   - PROTACs and molecular glues

## ANALYSIS FRAMEWORK

When analyzing a drug target:
1. **Target Profile**: Function, localization, expression
2. **Disease Relevance**: Genetic evidence, pathway role
3. **Druggability**: Structural tractability, existing modulators
4. **Competitive Landscape**: Approved drugs, clinical candidates
5. **Development Strategy**: Recommended modality, risks

## OUTPUT FORMAT

Use structured, quantitative outputs:
- Cite specific evidence (UniProt, ChEMBL, literature)
- Provide confidence scores where appropriate
- Include actionable recommendations
- Highlight key risks and mitigation strategies

Created by Michael Crowe | CroweLM"""

    # Database API endpoints
    UNIPROT_API = "https://rest.uniprot.org/uniprotkb"
    CHEMBL_API = "https://www.ebi.ac.uk/chembl/api/data"
    PUBMED_API = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

    def __init__(self, config: Optional[BiotechConfig] = None):
        self.config = config or BiotechConfig()
        self._session: Optional[aiohttp.ClientSession] = None

    async def _ensure_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=60)
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

    async def __aenter__(self):
        await self._ensure_session()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def _llm_query(self, prompt: str, system: str = None) -> str:
        """Query the LLM via Docker Model Runner"""
        session = await self._ensure_session()

        payload = {
            "model": self.config.model_name,
            "messages": [
                {"role": "system", "content": system or self.SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }

        try:
            async with session.post(
                f"{self.config.model_url}/chat/completions",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    return f"Error: {resp.status}"
        except Exception as e:
            return f"Error: {str(e)}"

    async def fetch_uniprot(self, accession: str) -> Dict:
        """Fetch protein data from UniProt"""
        session = await self._ensure_session()
        try:
            async with session.get(
                f"{self.UNIPROT_API}/{accession}.json"
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return {
                        "accession": data.get("primaryAccession"),
                        "gene": data.get("genes", [{}])[0].get("geneName", {}).get("value"),
                        "protein_name": data.get("proteinDescription", {}).get("recommendedName", {}).get("fullName", {}).get("value"),
                        "function": self._extract_function(data),
                        "subcellular_location": self._extract_location(data),
                        "sequence_length": data.get("sequence", {}).get("length"),
                        "organism": data.get("organism", {}).get("scientificName"),
                    }
                return {"error": f"UniProt error: {resp.status}"}
        except Exception as e:
            return {"error": str(e)}

    def _extract_function(self, data: Dict) -> str:
        """Extract function from UniProt data"""
        comments = data.get("comments", [])
        for c in comments:
            if c.get("commentType") == "FUNCTION":
                texts = c.get("texts", [])
                if texts:
                    return texts[0].get("value", "")
        return ""

    def _extract_location(self, data: Dict) -> List[str]:
        """Extract subcellular locations"""
        locations = []
        comments = data.get("comments", [])
        for c in comments:
            if c.get("commentType") == "SUBCELLULAR LOCATION":
                for loc in c.get("subcellularLocations", []):
                    loc_data = loc.get("location", {})
                    if loc_data.get("value"):
                        locations.append(loc_data["value"])
        return locations

    async def fetch_chembl_target(self, uniprot_id: str) -> Dict:
        """Fetch ChEMBL target data"""
        session = await self._ensure_session()
        try:
            async with session.get(
                f"{self.CHEMBL_API}/target.json",
                params={"target_components__accession": uniprot_id}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    targets = data.get("targets", [])
                    if targets:
                        t = targets[0]
                        return {
                            "chembl_id": t.get("target_chembl_id"),
                            "pref_name": t.get("pref_name"),
                            "target_type": t.get("target_type"),
                            "organism": t.get("organism"),
                        }
                return {"found": False}
        except Exception as e:
            return {"error": str(e)}

    async def search_pubmed(self, query: str, max_results: int = 5) -> List[Dict]:
        """Search PubMed for relevant publications"""
        session = await self._ensure_session()
        try:
            # Search
            async with session.get(
                f"{self.PUBMED_API}/esearch.fcgi",
                params={
                    "db": "pubmed",
                    "term": query,
                    "retmax": max_results,
                    "retmode": "json"
                }
            ) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()
                ids = data.get("esearchresult", {}).get("idlist", [])

            if not ids:
                return []

            # Fetch summaries
            async with session.get(
                f"{self.PUBMED_API}/esummary.fcgi",
                params={
                    "db": "pubmed",
                    "id": ",".join(ids),
                    "retmode": "json"
                }
            ) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()
                result = data.get("result", {})

                papers = []
                for pid in ids:
                    if pid in result:
                        p = result[pid]
                        papers.append({
                            "pmid": pid,
                            "title": p.get("title"),
                            "authors": [a.get("name") for a in p.get("authors", [])[:3]],
                            "journal": p.get("source"),
                            "pubdate": p.get("pubdate"),
                        })
                return papers

        except Exception as e:
            return []

    async def analyze_target(self, target_id: str) -> Dict:
        """Comprehensive drug target analysis"""
        print(f"\n{'=' * 60}")
        print(f"  BIOTECH ANALYSIS: {target_id}")
        print(f"{'=' * 60}\n")

        results = {
            "target": target_id,
            "timestamp": datetime.now().isoformat(),
            "data": {},
            "analysis": "",
        }

        # Fetch UniProt data
        print(">>> Fetching UniProt data...")
        uniprot_data = await self.fetch_uniprot(target_id)
        results["data"]["uniprot"] = uniprot_data
        if uniprot_data.get("gene"):
            print(f"  Gene: {uniprot_data['gene']}")
            print(f"  Protein: {uniprot_data.get('protein_name', 'N/A')}")

        # Fetch ChEMBL data
        print(">>> Fetching ChEMBL data...")
        chembl_data = await self.fetch_chembl_target(target_id)
        results["data"]["chembl"] = chembl_data
        if chembl_data.get("chembl_id"):
            print(f"  ChEMBL ID: {chembl_data['chembl_id']}")

        # Search literature
        gene_name = uniprot_data.get("gene", target_id)
        print(f">>> Searching PubMed for '{gene_name} drug target'...")
        papers = await self.search_pubmed(f"{gene_name} drug target", max_results=3)
        results["data"]["literature"] = papers
        print(f"  Found {len(papers)} relevant papers")

        # AI Analysis
        print(f">>> Running AI analysis...")
        context = f"""
TARGET: {target_id}

UNIPROT DATA:
{json.dumps(uniprot_data, indent=2)}

CHEMBL DATA:
{json.dumps(chembl_data, indent=2)}

RECENT LITERATURE:
{json.dumps(papers, indent=2)}
"""

        prompt = f"""Perform a comprehensive druggability analysis for this target:

{context}

Provide:
1. TARGET PROFILE
   - Biological function
   - Disease relevance
   - Expression pattern

2. DRUGGABILITY ASSESSMENT
   - Structural tractability (score 1-10)
   - Existing modulators
   - Target class considerations

3. COMPETITIVE LANDSCAPE
   - Known drugs/compounds
   - Clinical development status

4. DEVELOPMENT STRATEGY
   - Recommended modality
   - Key challenges
   - Risk assessment

5. OVERALL DRUGGABILITY SCORE (0-1) with confidence level"""

        results["analysis"] = await self._llm_query(prompt)

        print("\n" + "=" * 60)
        print("  ANALYSIS COMPLETE")
        print("=" * 60)

        return results

    async def predict_properties(self, smiles: str) -> Dict:
        """Predict molecular properties"""
        prompt = f"""Analyze this molecule and predict its drug-like properties:

SMILES: {smiles}

Provide predictions for:
1. Molecular Weight
2. LogP (lipophilicity)
3. H-bond donors/acceptors
4. Rotatable bonds
5. TPSA (topological polar surface area)
6. Lipinski Rule of 5 compliance
7. Predicted solubility class
8. Predicted permeability
9. Drug-likeness score
10. Key structural alerts (if any)

Format as a structured report with confidence levels."""

        analysis = await self._llm_query(prompt)
        return {"smiles": smiles, "analysis": analysis}

    async def interactive_session(self):
        """Run interactive biotech research session"""
        print("\n" + "=" * 60)
        print("  CroweLM Biotech Agent")
        print("  Specialized for Drug Discovery & Life Sciences")
        print("=" * 60)
        print("\nCommands:")
        print("  target <UniProt ID>   - Analyze drug target")
        print("  molecule <SMILES>     - Predict molecular properties")
        print("  search <query>        - Search PubMed")
        print("  ask <question>        - Ask biotech question")
        print("  quit                  - Exit")
        print("=" * 60 + "\n")

        while True:
            try:
                user_input = input("\nBiotech> ").strip()

                if not user_input:
                    continue

                if user_input.lower() == "quit":
                    print("Exiting...")
                    break

                elif user_input.lower().startswith("target "):
                    target_id = user_input[7:].strip()
                    results = await self.analyze_target(target_id)
                    print("\n" + results["analysis"])

                elif user_input.lower().startswith("molecule "):
                    smiles = user_input[9:].strip()
                    results = await self.predict_properties(smiles)
                    print("\n" + results["analysis"])

                elif user_input.lower().startswith("search "):
                    query = user_input[7:].strip()
                    papers = await self.search_pubmed(query, max_results=5)
                    for i, paper in enumerate(papers):
                        print(f"\n[{i+1}] {paper.get('title')}")
                        print(f"    Authors: {', '.join(paper.get('authors', []))}")
                        print(f"    Journal: {paper.get('journal')} ({paper.get('pubdate')})")
                        print(f"    PMID: {paper.get('pmid')}")

                elif user_input.lower().startswith("ask "):
                    question = user_input[4:].strip()
                    response = await self._llm_query(question)
                    print(f"\n{response}")

                else:
                    response = await self._llm_query(user_input)
                    print(f"\n{response}")

            except KeyboardInterrupt:
                print("\nExiting...")
                break
            except Exception as e:
                print(f"Error: {e}")


async def main():
    parser = argparse.ArgumentParser(description="CroweLM Biotech Agent")
    parser.add_argument("--target", help="UniProt ID for target analysis")
    parser.add_argument("--molecule", help="SMILES for property prediction")
    parser.add_argument("--analyze", help="Free-form analysis query")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive mode")
    parser.add_argument("--model", default="crowelogic/crowelogic:v1.0", help="Model to use")

    args = parser.parse_args()

    config = BiotechConfig(model_name=args.model)

    async with BiotechAgent(config) as agent:
        if args.interactive:
            await agent.interactive_session()
        elif args.target:
            results = await agent.analyze_target(args.target)
            print("\n" + results["analysis"])
        elif args.molecule:
            results = await agent.predict_properties(args.molecule)
            print("\n" + results["analysis"])
        elif args.analyze:
            response = await agent._llm_query(args.analyze)
            print(f"\n{response}")
        else:
            await agent.interactive_session()


if __name__ == "__main__":
    asyncio.run(main())
