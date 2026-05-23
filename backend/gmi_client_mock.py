"""
GMI Cloud Mock Client — demo fallback when API is unavailable.
Returns realistic responses so the demo always works.
Activated when GMI_API_KEY starts with "mock-" or is empty.
"""
import asyncio
import re
from typing import AsyncGenerator


def _is_chinese_text(text: str) -> bool:
    """Heuristic: True if text has a significant proportion of CJK characters."""
    cjk = sum(1 for ch in text if "一" <= ch <= "鿿")
    return cjk > len(text) * 0.15 and len(text) > 10


def _extract_keywords(text: str, max_terms: int = 5) -> list[str]:
    """Extract plausible keywords from input text so the mock appears responsive."""
    if _is_chinese_text(text):
        # Split on Chinese/ASCII punctuation to get rough phrase boundaries
        segments = re.split(r"[，。、！？：；""''（）《》【】…—～\s,.\!?;:()\[\]\"']+", text)
        candidates = []
        for seg in segments:
            cjk_only = re.sub(r"[^一-鿿]", "", seg)
            if len(cjk_only) < 2:
                continue
            # Take the longest 2-to-4-char n-gram from this segment
            for length in (min(4, len(cjk_only)), 3, 2):
                if length <= len(cjk_only):
                    candidates.append(cjk_only[:length])
                    break
        if not candidates:
            # Fallback: take any CJK run
            cjk_runs = re.findall(r"[一-鿿]{2,4}", text)
            candidates = cjk_runs
    else:
        # Extract capitalized/long words that look like terms
        candidates = re.findall(r"\b[A-Z][A-Za-z]{3,}(?:\s+[A-Z][A-Za-z]{2,})?\b", text)
        if len(candidates) < max_terms:
            candidates += re.findall(r"\b[a-z]{5,}\b", text, re.IGNORECASE)
    # Deduplicate and pick top terms
    seen = set()
    result = []
    for w in candidates:
        low = w.lower()
        if low not in seen:
            seen.add(low)
            result.append(w.strip())
        if len(result) >= max_terms:
            break
    return result


def _extract_phrases_from_contexts(contexts: list[str], max_terms: int = 6) -> list[str]:
    """Pull representative words or short phrases from context strings."""
    combined = " ".join(contexts)
    words = re.findall(r"\b[A-Z][a-zA-Z]{3,}(?:\s+[A-Z][a-zA-Z]{2,})?\b", combined)
    if len(words) < max_terms:
        words += re.findall(r"[A-Z]{2,}(?:\s+[A-Z]{2,})*", combined)
    stopwords = {"this", "that", "these", "those", "which", "with", "from",
                 "have", "been", "were", "they", "them", "their", "also",
                 "about", "into", "other", "some", "such", "each", "over"}
    seen = set()
    result = []
    for w in words:
        low = w.lower()
        if low not in seen and len(w) > 2 and low not in stopwords:
            seen.add(low)
            result.append(w.strip())
        if len(result) >= max_terms:
            break
    return result


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
        terms = _extract_phrases_from_contexts(contexts) if contexts else []
        if not terms:
            terms = ["Document Analysis", "Topic Overview", "Key Findings"]

        source_refs = " ".join(f"[Source {i+1}]" for i in range(min(len(contexts), 4)))
        term_str = ", ".join(terms[:4])
        return {
            "answer": (
                f"[MOCK RAG ANSWER via DeepSeek V3]\n\n"
                f"Based on the provided documents ({source_refs}), here is the analysis:\n\n"
                f"The documents cover key aspects including {term_str}. "
                f"[Source 1] provides details on {terms[0] if len(terms) > 0 else 'the topic'}, "
                f"[Source 2] outlines {terms[1] if len(terms) > 1 else 'relevant context'}, "
                f"while [Source 3] covers {terms[2] if len(terms) > 2 else 'additional details'}.\n\n"
                f"Key findings: The content indicates requirements related to {terms[0] if terms else 'the subject'} "
                f"as documented in the sources. References to {term_str} suggest these are priority areas."
            ),
            "model": self.models["qa"],
            "tokens_input": 450,
            "tokens_output": 180,
            "latency_ms": 523,
        }

    async def ask_stream(self, question: str, contexts: list[str], history=None) -> AsyncGenerator[str, None]:
        terms = _extract_phrases_from_contexts(contexts) if contexts else []
        if not terms:
            terms = ["Document Analysis", "Topic Overview", "Key Findings", "Requirements"]

        source_refs = " ".join(f"[Source {i+1}]" for i in range(min(len(contexts), 4)))
        word_list = (
            f"Based on the provided documents {source_refs}, "
            f"I can confirm the following: "
            f"The content covers {terms[0] if len(terms) > 0 else 'key aspects'} "
            f"as documented in [Source 1]. "
            f"For {terms[1] if len(terms) > 1 else 'additional context'}, "
            f"[Source 2] provides relevant information. "
            f"References to {terms[2] if len(terms) > 2 else 'supporting details'} "
            f"in [Source 3] indicate these are significant considerations. "
            f"All technical details align with the documented {terms[3] if len(terms) > 3 else 'standards'}."
        ).split()
        for word in word_list:
            yield word + " "
            await asyncio.sleep(0.03)

    async def analyze_structure(self, text: str) -> dict:
        await asyncio.sleep(0.2)
        keywords = _extract_keywords(text[:500])
        if not keywords:
            keywords = ["document", "overview", "section", "content", "summary"]

        # Guess document_type from keywords
        doc_type = "general"
        doc_lower = text[:500].lower()
        if any(w in doc_lower for w in ("specification", "technical", "manual", "hardware", "spec")):
            doc_type = "technical"
        elif any(w in doc_lower for w in ("contract", "agreement", "legal", "terms", "clause")):
            doc_type = "legal"
        elif any(w in doc_lower for w in ("marketing", "brand", "campaign", "product launch")):
            doc_type = "marketing"
        elif any(w in doc_lower for w in ("research", "study", "analysis", "report", "finding")):
            doc_type = "research"

        summary_words = " ".join(keywords[:4])
        return {
            "document_type": doc_type,
            "key_terms": keywords,
            "summary": f"[MOCK] Document analysis based on key terms: {summary_words}. "
                       f"Covers specifications, structure, and relevant details.",
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
        keywords = _extract_keywords(text[:800], max_terms=8)
        if not keywords:
            keywords = ["document", "product", "service", "feature"]

        categories = ["Product", "Hardware", "Brand", "Compliance", "Technical", "Feature", "Specification", "General"]
        entries = []
        for i, term in enumerate(keywords[:6]):
            if _is_chinese_text(text):
                target = f"[MOCK] EN: {term}"
            else:
                target = f"[MOCK] ZH: {term}"
            entries.append({
                "source": term,
                "target": target,
                "category": categories[i % len(categories)],
            })
        return entries

    async def check_translation_quality(self, source: str, translated: str, source_lang: str, target_lang: str) -> dict:
        await asyncio.sleep(0.2)
        return {"score": 92, "issues": [], "suggestions": ["Minor terminology improvements possible"]}
