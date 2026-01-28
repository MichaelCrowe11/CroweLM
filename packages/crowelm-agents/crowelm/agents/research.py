#!/usr/bin/env python3
"""
Research Agent - Automated Research Pipeline
Uses Docker Model Runner + MCP Servers for AI-powered research

Features:
- ArXiv paper search and analysis
- Web search (Brave, Exa, Tavily when configured)
- Memory persistence
- Document summarization

Usage:
    python -m crowelm.agents.research "research query"
    python -m crowelm.agents.research --topic "biotech drug discovery"
"""

import asyncio
import aiohttp
import json
import argparse
import re
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ResearchConfig:
    """Configuration for research agent"""
    model_url: str = "http://localhost:12434/v1"
    model_name: str = "crowelogic/crowelogic:v1.0"
    temperature: float = 0.3
    max_tokens: int = 4096


class ResearchAgent:
    """
    AI Research Agent using Docker Model Runner and MCP integrations.

    Capabilities:
    - Search ArXiv for scientific papers
    - Web search for current information
    - Document analysis and summarization
    - Knowledge graph memory
    """

    SYSTEM_PROMPT = """You are a research assistant specialized in biotech, pharmaceutical, and scientific research.

Your capabilities:
1. Analyze scientific papers and extract key findings
2. Synthesize information from multiple sources
3. Identify research trends and gaps
4. Provide actionable research recommendations

When analyzing research:
- Extract methodology, results, and conclusions
- Identify limitations and future directions
- Connect findings to broader research context
- Cite sources properly

Be precise, analytical, and evidence-based in your responses."""

    def __init__(self, config: Optional[ResearchConfig] = None):
        self.config = config or ResearchConfig()
        self._session: Optional[aiohttp.ClientSession] = None

    async def _ensure_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
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

    async def search_arxiv(self, query: str, max_results: int = 5) -> List[Dict]:
        """Search ArXiv for papers"""
        session = await self._ensure_session()

        params = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": max_results,
            "sortBy": "relevance",
            "sortOrder": "descending"
        }

        try:
            async with session.get(
                "http://export.arxiv.org/api/query",
                params=params
            ) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    papers = self._parse_arxiv_response(text)
                    return papers
                return []
        except Exception as e:
            print(f"ArXiv search error: {e}")
            return []

    def _parse_arxiv_response(self, xml_text: str) -> List[Dict]:
        """Parse ArXiv XML response"""
        papers = []
        entries = re.findall(r'<entry>(.*?)</entry>', xml_text, re.DOTALL)

        for entry in entries:
            paper = {}

            title_match = re.search(r'<title>(.*?)</title>', entry, re.DOTALL)
            if title_match:
                paper["title"] = title_match.group(1).strip().replace('\n', ' ')

            id_match = re.search(r'<id>(.*?)</id>', entry)
            if id_match:
                paper["arxiv_id"] = id_match.group(1).split('/')[-1]
                paper["url"] = id_match.group(1)

            summary_match = re.search(r'<summary>(.*?)</summary>', entry, re.DOTALL)
            if summary_match:
                paper["abstract"] = summary_match.group(1).strip().replace('\n', ' ')

            authors = re.findall(r'<name>(.*?)</name>', entry)
            paper["authors"] = authors[:5]

            published_match = re.search(r'<published>(.*?)</published>', entry)
            if published_match:
                paper["published"] = published_match.group(1)[:10]

            if paper.get("title"):
                papers.append(paper)

        return papers

    async def analyze_paper(self, paper: Dict) -> Dict:
        """Analyze a scientific paper"""
        prompt = f"""Analyze this scientific paper:

Title: {paper.get('title', 'Unknown')}
Authors: {', '.join(paper.get('authors', [])[:3])}
Published: {paper.get('published', 'Unknown')}

Abstract:
{paper.get('abstract', 'No abstract available')}

Provide:
1. Key Findings (2-3 bullet points)
2. Methodology Summary (1-2 sentences)
3. Relevance to Drug Discovery (1-2 sentences)
4. Limitations or Gaps
5. Research Score (1-10) for potential impact"""

        analysis = await self._llm_query(prompt)

        return {
            "paper": paper,
            "analysis": analysis,
            "analyzed_at": datetime.now().isoformat()
        }

    async def research_topic(self, topic: str) -> Dict:
        """Comprehensive research on a topic"""
        print(f"\n{'=' * 60}")
        print(f"  RESEARCHING: {topic}")
        print(f"{'=' * 60}\n")

        results = {
            "topic": topic,
            "timestamp": datetime.now().isoformat(),
            "papers": [],
            "summary": "",
        }

        # Step 1: Search ArXiv
        print(">>> Searching ArXiv...")
        papers = await self.search_arxiv(topic, max_results=5)
        print(f"  Found {len(papers)} papers")

        # Step 2: Analyze papers
        print(">>> Analyzing papers...")
        for i, paper in enumerate(papers[:3]):
            print(f"  [{i+1}/3] {paper.get('title', 'Unknown')[:50]}...")
            analysis = await self.analyze_paper(paper)
            results["papers"].append(analysis)

        # Step 3: Synthesize findings
        print(">>> Synthesizing research...")

        synthesis_prompt = f"""Based on these research papers about "{topic}":

{json.dumps([p['analysis'] for p in results['papers']], indent=2)[:3000]}

Provide a comprehensive research synthesis:
1. Current State of Research (3-4 sentences)
2. Key Trends and Emerging Directions
3. Research Gaps and Opportunities
4. Recommendations for Further Investigation
5. Overall Assessment of Field Maturity"""

        results["summary"] = await self._llm_query(synthesis_prompt)

        print("\n" + "=" * 60)
        print("  RESEARCH COMPLETE")
        print("=" * 60)

        return results

    async def interactive_session(self):
        """Run interactive research session"""
        print("\n" + "=" * 60)
        print("  Research Agent - Interactive Mode")
        print("  Powered by Docker Model Runner")
        print("=" * 60)
        print("\nCommands:")
        print("  research <topic>  - Research a topic")
        print("  search <query>    - Search ArXiv")
        print("  ask <question>    - Ask a question")
        print("  quit              - Exit")
        print("=" * 60 + "\n")

        while True:
            try:
                user_input = input("\nResearch> ").strip()

                if not user_input:
                    continue

                if user_input.lower() == "quit":
                    print("Exiting...")
                    break

                elif user_input.lower().startswith("research "):
                    topic = user_input[9:].strip()
                    results = await self.research_topic(topic)
                    print("\n" + results["summary"])

                elif user_input.lower().startswith("search "):
                    query = user_input[7:].strip()
                    papers = await self.search_arxiv(query)
                    for i, paper in enumerate(papers):
                        print(f"\n[{i+1}] {paper.get('title', 'Unknown')}")
                        print(f"    Authors: {', '.join(paper.get('authors', [])[:2])}")
                        print(f"    ArXiv: {paper.get('arxiv_id', 'N/A')}")

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
    parser = argparse.ArgumentParser(description="AI Research Agent")
    parser.add_argument("query", nargs="?", help="Research query")
    parser.add_argument("--topic", help="Research topic for comprehensive analysis")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive mode")
    parser.add_argument("--model", default="crowelogic/crowelogic:v1.0", help="Model to use")

    args = parser.parse_args()

    config = ResearchConfig(model_name=args.model)

    async with ResearchAgent(config) as agent:
        if args.interactive:
            await agent.interactive_session()
        elif args.topic:
            results = await agent.research_topic(args.topic)
            print("\n" + "=" * 60)
            print("SYNTHESIS")
            print("=" * 60)
            print(results["summary"])
        elif args.query:
            papers = await agent.search_arxiv(args.query)
            for paper in papers:
                print(f"\n{paper.get('title')}")
                print(f"  ArXiv: {paper.get('arxiv_id')}")
                print(f"  Authors: {', '.join(paper.get('authors', [])[:3])}")
        else:
            await agent.interactive_session()


if __name__ == "__main__":
    asyncio.run(main())
