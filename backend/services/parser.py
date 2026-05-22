"""
Multi-format document parser. Extracts text preserving section hierarchy.
"""
import io
import logging
from typing import Optional, List
from pathlib import Path

logger = logging.getLogger(__name__)


async def parse_document(file_path: str, file_type: str) -> dict:
    """Parse a document and return structured content."""
    parsers = {
        "pdf": _parse_pdf,
        "docx": _parse_docx,
        "md": _parse_markdown,
        "txt": _parse_txt,
    }
    parser = parsers.get(file_type.lower())
    if not parser:
        raise ValueError(f"Unsupported file type: {file_type}")

    text = await parser(file_path)
    sections = _extract_sections(text)
    word_count = len(text.split())

    return {
        "full_text": text,
        "sections": sections,
        "word_count": word_count,
        "section_count": len(sections),
    }


async def _parse_pdf(file_path: str) -> str:
    from PyPDF2 import PdfReader

    text_parts = []
    with open(file_path, "rb") as f:
        reader = PdfReader(f)
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)


async def _parse_docx(file_path: str) -> str:
    from docx import Document

    doc = Document(file_path)
    parts = []
    for para in doc.paragraphs:
        if para.style.name.startswith("Heading"):
            level = para.paragraph_format.outline_level + 1 if para.paragraph_format.outline_level is not None else 1
            prefix = "#" * min(level, 6)
            parts.append(f"\n{prefix} {para.text}\n")
        elif para.text.strip():
            parts.append(para.text)
    return "\n\n".join(parts)


async def _parse_markdown(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


async def _parse_txt(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def _extract_sections(text: str) -> List[dict]:
    """Split text into sections based on markdown headings."""
    import re

    lines = text.split("\n")
    sections = []
    current_heading = "Introduction"
    current_content: List[str] = []
    current_level = 1

    heading_pattern = re.compile(r"^(#{1,6})\s+(.+)$")

    for line in lines:
        match = heading_pattern.match(line.strip())
        if match:
            if current_content:
                sections.append({
                    "heading": current_heading,
                    "content": "\n".join(current_content).strip(),
                    "level": current_level,
                })
            current_level = len(match.group(1))
            current_heading = match.group(2)
            current_content = []
        else:
            current_content.append(line)

    if current_heading or current_content:
        sections.append({
            "heading": current_heading,
            "content": "\n".join(current_content).strip(),
            "level": current_level,
        })

    return [s for s in sections if s["content"].strip()]
