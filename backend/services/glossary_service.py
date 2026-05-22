"""
Terminology glossary — CRUD + auto-extraction from documents.
"""
from typing import Optional, List
import logging
from sqlalchemy.orm import Session
from models import GlossaryEntry
from gmi_client import gmi

logger = logging.getLogger(__name__)


def get_glossary_dict(
    db: Session, project: str = "default", source_lang: str = "zh", target_lang: str = "en"
) -> dict[str, str]:
    """Get glossary as {source_term: target_term} dict for translation injection."""
    entries = (
        db.query(GlossaryEntry)
        .filter(
            GlossaryEntry.project == project,
            GlossaryEntry.source_lang == source_lang,
            GlossaryEntry.target_lang == target_lang,
        )
        .all()
    )
    return {e.source_term: e.target_term for e in entries}


def add_glossary_entry(
    db: Session,
    source_term: str,
    target_term: str,
    source_lang: str = "zh",
    target_lang: str = "en",
    project: str = "default",
    category: Optional[str] = None,
) -> GlossaryEntry:
    entry = GlossaryEntry(
        project=project,
        source_term=source_term,
        target_term=target_term,
        source_lang=source_lang,
        target_lang=target_lang,
        category=category,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def list_glossary_entries(
    db: Session, project: str = "default", source_lang: str = "zh", target_lang: str = "en"
) -> List[GlossaryEntry]:
    return (
        db.query(GlossaryEntry)
        .filter(
            GlossaryEntry.project == project,
            GlossaryEntry.source_lang == source_lang,
            GlossaryEntry.target_lang == target_lang,
        )
        .order_by(GlossaryEntry.category, GlossaryEntry.source_term)
        .all()
    )


def delete_glossary_entry(db: Session, entry_id: str):
    entry = db.query(GlossaryEntry).filter(GlossaryEntry.id == entry_id).first()
    if entry:
        db.delete(entry)
        db.commit()


async def auto_extract_glossary(text: str, source_lang: str = "zh", target_lang: str = "en") -> List[dict]:
    """Use LLM to auto-extract domain terms from document text."""
    return await gmi.extract_glossary(text, source_lang, target_lang)
