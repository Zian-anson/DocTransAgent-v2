"""
GMI Cloud Mock Client — demo fallback when API is unavailable.
Returns realistic responses so the demo always works.
Activated when GMI_API_KEY starts with "mock-" or is empty.
"""
import asyncio
from typing import AsyncGenerator


class MockGMIClient:
    """Mock GMI Cloud client for demo mode. All methods mirror gmi_client.GMIClient."""

    def __init__(self):
        self.models = {
            "translate": "gemini-2.5-flash (mock)",
            "qa": "deepseek-v3 (mock)",
            "structure": "glm-4 (mock)",
            "embed": "qwen3-embedding-8b (mock)",
        }

    async def translate(self, text: str, source_lang: str, target_lang: str, glossary=None) -> dict:
        await asyncio.sleep(0.3)
        return {
            "translated_text": f"[MOCK TRANSLATION {source_lang}→{target_lang}]\n\n{text}",
            "model": self.models["translate"],
            "tokens_input": len(text.split()),
            "tokens_output": len(text.split()) * 2,
            "latency_ms": 312,
        }

    async def ask_with_context(self, question: str, contexts: list[str], history=None) -> dict:
        await asyncio.sleep(0.5)
        return {
            "answer": (
                "[MOCK RAG ANSWER via DeepSeek V3]\n\n"
                "Based on the provided documents, here is the analysis:\n\n"
                "The documents cover key aspects of overseas expansion including "
                "product specifications, brand strategy, and compliance requirements. "
                "[Source 1] provides technical details, [Source 2] outlines the brand "
                "positioning, while [Source 3] covers regulatory compliance.\n\n"
                "Key findings: The product meets EU certification requirements "
                "(CE, RoHS, REACH) as documented in [Source 1]. The brand strategy "
                "[Source 2] targets Southeast Asia and Europe as priority markets."
            ),
            "model": self.models["qa"],
            "tokens_input": 450,
            "tokens_output": 180,
            "latency_ms": 523,
        }

    async def ask_stream(self, question: str, contexts: list[str], history=None) -> AsyncGenerator[str, None]:
        words = (
            "Based on the provided documents [Source 1], [Source 2], and [Source 3], "
            "I can confirm the following: The product has obtained CE, FCC, RoHS, "
            "and REACH certifications [Source 1]. For EU market entry, GDPR compliance "
            "is additionally required [Source 3]. The brand strategy recommends "
            "starting with Southeast Asia before expanding to Europe [Source 2]. "
            "All technical specifications align with international standards."
        ).split()
        for word in words:
            yield word + " "
            await asyncio.sleep(0.03)

    async def analyze_structure(self, text: str) -> dict:
        await asyncio.sleep(0.2)
        return {
            "document_type": "technical",
            "key_terms": ["麒麟芯片", "HarmonyOS", "CE认证", "GDPR", "防水等级"],
            "summary": "A technical product manual covering specifications, installation, and compliance.",
        }

    async def embed(self, texts: list[str]) -> list[list[float]]:
        await asyncio.sleep(0.1)
        import random
        random.seed(42)
        return [[random.random() for _ in range(1024)] for _ in texts]

    async def embed_single(self, text: str) -> list[float]:
        results = await self.embed([text])
        return results[0]

    async def extract_glossary(self, text: str, source_lang: str, target_lang: str) -> list[dict]:
        await asyncio.sleep(0.3)
        return [
            {"source": "智能屏", "target": "SmartScreen", "category": "产品"},
            {"source": "麒麟芯片", "target": "Kirin Chip", "category": "硬件"},
            {"source": "无界连接", "target": "Connect Beyond Boundaries", "category": "品牌"},
            {"source": "数据保护影响评估", "target": "Data Protection Impact Assessment", "category": "合规"},
        ]

    async def check_translation_quality(self, source: str, translated: str, source_lang: str, target_lang: str) -> dict:
        await asyncio.sleep(0.2)
        return {"score": 92, "issues": [], "suggestions": ["Minor terminology improvements possible"]}
