"""
Translation orchestrator — batch translation with glossary, progress, and quality check.
"""
from typing import Optional, List
import asyncio
import logging
from dataclasses import dataclass
from gmi_client import gmi
from services.chunker import chunk_sections_for_translation
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class TranslationProgress:
    total: int
    completed: int
    failed: int
    status: str  # 'running' | 'done' | 'error'


class TranslationOrchestrator:
    def __init__(self):
        self.progress: dict[str, TranslationProgress] = {}

    async def translate_document(
        self,
        doc_id: str,
        sections: List[dict],
        source_lang: str,
        target_lang: str,
        glossary: Optional[dict[str, str]] = None,
    ) -> dict:
        """Translate all sections of a document. Returns translated sections + metadata."""
        chunked = chunk_sections_for_translation(sections)
        total = len(chunked)
        sem = asyncio.Semaphore(settings.max_concurrent_translations)

        self.progress[doc_id] = TranslationProgress(
            total=total, completed=0, failed=0, status="running"
        )

        results: List[dict] = []

        async def translate_one(idx: int, item: dict) -> dict:
            async with sem:
                try:
                    result = await gmi.translate(
                        item["content"], source_lang, target_lang, glossary
                    )
                    self.progress[doc_id].completed += 1
                    return {
                        **item,
                        "translated_content": result["translated_text"],
                        "model": result["model"],
                        "tokens_input": result["tokens_input"],
                        "tokens_output": result["tokens_output"],
                        "latency_ms": result["latency_ms"],
                        "status": "success",
                    }
                except Exception as e:
                    logger.error(f"Translation chunk {idx} failed: {e}")
                    self.progress[doc_id].failed += 1
                    return {**item, "translated_content": None, "status": "error", "error": str(e)}

        tasks = [translate_one(i, item) for i, item in enumerate(chunked)]
        results = await asyncio.gather(*tasks)

        # Reassemble sections
        translated_sections = _reassemble_sections(results)
        total_tokens_input = sum(r.get("tokens_input", 0) for r in results)
        total_tokens_output = sum(r.get("tokens_output", 0) for r in results)
        failed = sum(1 for r in results if r["status"] == "error")

        self.progress[doc_id].status = "done"

        return {
            "translated_sections": translated_sections,
            "chunk_results": results,
            "total_chunks": total,
            "failed_chunks": failed,
            "tokens_input": total_tokens_input,
            "tokens_output": total_tokens_output,
        }

    def get_progress(self, doc_id: str) -> Optional[TranslationProgress]:
        return self.progress.get(doc_id)


def _reassemble_sections(chunk_results: List[dict]) -> List[dict]:
    """Reassemble translated chunks back into sections, preserving duplicate headings."""
    ordered: List[dict] = []
    lookup: dict[str, List[dict]] = {}
    seen_headings: dict[str, int] = {}
    for r in chunk_results:
        heading = r["heading"]
        if heading not in seen_headings:
            seen_headings[heading] = 0
            lookup[heading] = []
            ordered.append(heading)
        seen_headings[heading] += 1

    for r in chunk_results:
        heading = r["heading"]
        chunks_list = lookup[heading]
        if not chunks_list or chunks_list[0]["level"] == r["level"]:
            chunks_list.append(r)
        else:
            # Different level — treat as separate section with an indexed key
            key = f"{heading}___{seen_headings[heading]}"
            lookup[key] = [r]
            ordered.append(key)

    result = []
    for key in ordered:
        chunks_list = lookup[key]
        display_heading = key.split("___")[0] if "___" in key else key
        content = "\n\n".join(
            c.get("translated_content", c.get("content", ""))
            for c in sorted(chunks_list, key=lambda x: x["chunk_index"])
        )
        result.append({
            "heading": display_heading,
            "level": chunks_list[0]["level"],
            "content": content,
        })
    return result


# Singleton
translator = TranslationOrchestrator()
