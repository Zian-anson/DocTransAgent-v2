"""
Semantic chunking — structure-aware splitting for translation and embedding.
"""
from typing import Optional, List
import re
from config import get_settings

settings = get_settings()


def chunk_for_translation(text: str, max_words: Optional[int] = None) -> List[str]:
    """Split text into ~N-word chunks for LLM translation, respecting paragraph boundaries."""
    limit = max_words or settings.chunk_size
    paragraphs = _split_paragraphs(text)
    chunks: List[str] = []
    current: List[str] = []
    current_len = 0

    for para in paragraphs:
        para_words = len(para.split())
        if current_len + para_words > limit and current:
            chunks.append("\n\n".join(current))
            current = [para]
            current_len = para_words
        else:
            current.append(para)
            current_len += para_words

    if current:
        chunks.append("\n\n".join(current))

    return chunks or [text]


def chunk_for_embedding(text: str, max_words: Optional[int] = None, overlap: Optional[int] = None) -> List[str]:
    """Split text into overlapping chunks for vector embedding."""
    limit = max_words or settings.chunk_size
    overlap_words = overlap or settings.chunk_overlap
    paragraphs = _split_paragraphs(text)
    chunks: List[str] = []
    current: List[str] = []
    current_len = 0
    overlap_buffer: List[str] = []

    for para in paragraphs:
        para_words = len(para.split())
        if current_len + para_words > limit and current:
            chunks.append("\n\n".join(current))
            # Keep last N paragraphs as overlap
            overlap_len = 0
            overlap_buffer = []
            for p in reversed(current):
                pw = len(p.split())
                if overlap_len + pw > overlap_words:
                    break
                overlap_buffer.insert(0, p)
                overlap_len += pw
            current = list(overlap_buffer)
            current_len = overlap_len

        current.append(para)
        current_len += para_words

    if current:
        chunks.append("\n\n".join(current))

    return chunks or [text]


def chunk_sections_for_translation(sections: List[dict]) -> List[dict]:
    """For each section, chunk its content for translation. Returns enriched list."""
    result = []
    for section in sections:
        chunks = chunk_for_translation(section["content"])
        for i, chunk in enumerate(chunks):
            result.append({
                "heading": section["heading"],
                "level": section["level"],
                "chunk_index": i,
                "content": chunk,
                "is_first_chunk": i == 0,
                "is_last_chunk": i == len(chunks) - 1,
            })
    return result


def _split_paragraphs(text: str) -> List[str]:
    """Split text into paragraphs, handling various line break patterns."""
    # Normalize line breaks
    text = re.sub(r"\r\n|\r", "\n", text)
    # Split on double newlines (true paragraph breaks)
    paragraphs = re.split(r"\n\s*\n", text)
    return [p.strip() for p in paragraphs if p.strip()]
