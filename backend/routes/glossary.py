"""Glossary management routes."""
from __future__ import annotations

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from services.glossary_service import (
    get_glossary_dict, add_glossary_entry, list_glossary_entries,
    delete_glossary_entry, auto_extract_glossary,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/glossary", tags=["glossary"])


class GlossaryCreate(BaseModel):
    source_term: str
    target_term: str
    source_lang: str = "zh"
    target_lang: str = "en"
    project: str = "default"
    category: Optional[str] = None


class AutoExtractRequest(BaseModel):
    text: str
    source_lang: str = "zh"
    target_lang: str = "en"


@router.get("")
async def list_glossary(
    project: str = "default",
    source_lang: str = "zh",
    target_lang: str = "en",
    db: Session = Depends(get_db),
):
    entries = list_glossary_entries(db, project, source_lang, target_lang)
    return [
        {
            "id": e.id,
            "source_term": e.source_term,
            "target_term": e.target_term,
            "category": e.category,
            "project": e.project,
        }
        for e in entries
    ]


@router.post("")
async def create_glossary_entry(req: GlossaryCreate, db: Session = Depends(get_db)):
    entry = add_glossary_entry(
        db, req.source_term, req.target_term,
        req.source_lang, req.target_lang, req.project, req.category,
    )
    return {
        "id": entry.id,
        "source_term": entry.source_term,
        "target_term": entry.target_term,
        "category": entry.category,
    }


@router.delete("/{entry_id}")
async def remove_glossary_entry(entry_id: str, db: Session = Depends(get_db)):
    delete_glossary_entry(db, entry_id)
    return {"deleted": entry_id}


@router.post("/auto-extract")
async def auto_extract(req: AutoExtractRequest):
    """Use LLM to auto-extract domain terminology from a text sample."""
    terms = await auto_extract_glossary(req.text, req.source_lang, req.target_lang)
    return {"terms": terms, "count": len(terms)}
