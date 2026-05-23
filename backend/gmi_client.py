"""
GMI Cloud Inference Engine — unified multi-model routing client.
All LLM/embedding calls flow through this single module.
OpenAI-compatible SDK. Sponsor integration showcase.
"""
import time
import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI
import json
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class GMIClient:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.gmi_api_key,
            base_url=settings.gmi_base_url,
            timeout=120.0,
            max_retries=2,
        )
        self.models = {
            "translate": settings.llm_translate,
            "qa": settings.llm_qa,
            "structure": settings.llm_structure,
            "embed": settings.llm_embed,
        }

    # ── Translation ─────────────────────────────────────────────
    async def translate(
        self, text: str, source_lang: str, target_lang: str, glossary: dict[str, str] | None = None
    ) -> dict:
        """Translate a single text chunk with glossary injection."""
        glossary_block = _format_glossary(glossary, source_lang, target_lang)

        system_msg = (
            f"You are an expert professional translator for {source_lang} → {target_lang}. "
            "Preserve all formatting, Markdown, HTML tags, placeholders, and line breaks exactly. "
            "Maintain the original tone and register (formal/casual/technical)."
        )
        if glossary_block:
            system_msg += f"\n\nSTRICT TERMINOLOGY MAP — use these exact translations:\n{glossary_block}"

        t0 = time.monotonic()
        resp = await self.client.chat.completions.create(
            model=self.models["translate"],
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": f"Translate this {source_lang} text to {target_lang}:\n\n{text}"},
            ],
            temperature=0.15,
            max_tokens=4096,
        )
        elapsed = (time.monotonic() - t0) * 1000
        choice = resp.choices[0]
        return {
            "translated_text": choice.message.content,
            "model": self.models["translate"],
            "tokens_input": resp.usage.prompt_tokens if resp.usage else 0,
            "tokens_output": resp.usage.completion_tokens if resp.usage else 0,
            "latency_ms": round(elapsed, 1),
        }

    # ── Structured QA (RAG) ─────────────────────────────────────
    async def ask_with_context(
        self, question: str, contexts: list[str], history: list[dict] | None = None
    ) -> dict:
        """DeepSeek V3 RAG QA with source citation requirement."""
        ctx_text = "\n\n---\n\n".join(
            f"[Source {i+1}] {c}" for i, c in enumerate(contexts)
        )
        system_msg = (
            "You are an expert assistant for overseas business expansion. "
            "Answer the user's question using ONLY the document contexts provided below. "
            "Always cite sources in your answer as [Source N]. "
            "If the contexts do not contain enough information, say so clearly. "
            "Be concise but comprehensive."
        )
        messages = [{"role": "system", "content": system_msg}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": f"Contexts:\n{ctx_text}\n\nQuestion: {question}"})

        t0 = time.monotonic()
        resp = await self.client.chat.completions.create(
            model=self.models["qa"],
            messages=messages,
            temperature=0.3,
            max_tokens=2048,
        )
        elapsed = (time.monotonic() - t0) * 1000
        choice = resp.choices[0]
        return {
            "answer": choice.message.content,
            "model": self.models["qa"],
            "tokens_input": resp.usage.prompt_tokens if resp.usage else 0,
            "tokens_output": resp.usage.completion_tokens if resp.usage else 0,
            "latency_ms": round(elapsed, 1),
        }

    # ── Streaming QA ────────────────────────────────────────────
    async def ask_stream(
        self, question: str, contexts: list[str], history: list[dict] | None = None
    ) -> AsyncGenerator[str, None]:
        ctx_text = "\n\n---\n\n".join(
            f"[Source {i+1}] {c}" for i, c in enumerate(contexts)
        )
        system_msg = (
            "You are an expert assistant for overseas business expansion. "
            "Answer using ONLY the provided document contexts. Cite sources as [Source N]. "
            "If unsure, say so."
        )
        messages = [{"role": "system", "content": system_msg}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": f"Contexts:\n{ctx_text}\n\nQuestion: {question}"})

        stream = await self.client.chat.completions.create(
            model=self.models["qa"],
            messages=messages,
            temperature=0.3,
            max_tokens=2048,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    # ── Document Structure Analysis ─────────────────────────────
    async def analyze_structure(self, text: str) -> dict:
        """GLM-4 analyzes document structure: identify sections, key terms, doc type."""
        resp = await self.client.chat.completions.create(
            model=self.models["structure"],
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a document structure analyzer. Extract from the document: "
                        "1. document_type: 'technical' | 'marketing' | 'legal' | 'hr' | 'general'\n"
                        "2. key_terms: 5-10 important domain-specific terms that should be in a glossary\n"
                        "3. summary: one-sentence summary\n"
                        "Output as JSON only, no markdown."
                    ),
                },
                {"role": "user", "content": text[:8000]},
            ],
            temperature=0.1,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content)

    # ── Embedding ───────────────────────────────────────────────
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings via GMI Cloud Qwen3-Embedding-8B."""
        resp = await self.client.embeddings.create(
            model=self.models["embed"],
            input=texts,
        )
        return [d.embedding for d in resp.data]

    async def embed_single(self, text: str) -> list[float]:
        results = await self.embed([text])
        return results[0]

    # ── Glossary Auto-Extraction ─────────────────────────────────
    async def extract_glossary(self, text: str, source_lang: str, target_lang: str) -> list[dict]:
        """Auto-extract domain terminology from document text."""
        resp = await self.client.chat.completions.create(
            model=self.models["structure"],
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Extract 10-20 domain-specific terms, brand names, product names, "
                        "and technical jargon from the text. For each term, provide the "
                        f"best {target_lang} translation. Output as JSON array: "
                        '[{{"source": "...", "target": "...", "category": "..."}}]'
                    ),
                },
                {"role": "user", "content": text[:8000]},
            ],
            temperature=0.1,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        if isinstance(data, dict):
            for key in ("terms", "entries", "glossary", "items"):
                if key in data and isinstance(data[key], list):
                    return data[key]
            return [data] if data else []
        return data if isinstance(data, list) else []

    # ── Translation Quality Check ───────────────────────────────
    async def check_translation_quality(
        self, source: str, translated: str, source_lang: str, target_lang: str
    ) -> dict:
        """Self-evaluate translation quality."""
        resp = await self.client.chat.completions.create(
            model=self.models["structure"],
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Evaluate this translation. Output JSON: "
                        '{"score": 1-100, "issues": ["list of problems"], "suggestions": ["improvements"]}'
                    ),
                },
                {
                    "role": "user",
                    "content": f"Source ({source_lang}):\n{source[:2000]}\n\nTranslation ({target_lang}):\n{translated[:2000]}",
                },
            ],
            temperature=0.1,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content)


def _format_glossary(glossary: dict[str, str] | None, src: str, tgt: str) -> str:
    if not glossary:
        return ""
    lines = [f'  "{k}" → "{v}"' for k, v in list(glossary.items())[:30]]
    return "\n".join(lines)


def _should_use_mock() -> bool:
    """Use mock mode when no real API key is configured."""
    key = settings.gmi_api_key
    return not key or key.startswith("mock-") or key == "your-gmi-api-key-here"


# Singleton — auto-selects real or mock client
if _should_use_mock():
    logger.warning("GMI_API_KEY not configured — using MOCK mode for demo")
    from gmi_client_mock import MockGMIClient

    gmi = MockGMIClient()
    gmi.is_mock = True
else:
    gmi = GMIClient()
    gmi.is_mock = False
