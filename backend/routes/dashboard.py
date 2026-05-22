"""Dashboard routes — usage stats, cost tracking, ROI."""
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Document, UsageLog, GlossaryEntry, DocStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Aggregate dashboard statistics."""
    # Document stats
    total_docs = db.query(Document).count()
    indexed_docs = db.query(Document).filter(Document.status == DocStatus.INDEXED).count()
    translated_docs = db.query(Document).filter(
        Document.status.in_([DocStatus.TRANSLATED, DocStatus.INDEXED])
    ).count()
    total_words = db.query(func.sum(Document.word_count)).scalar() or 0

    # Glossary stats
    total_terms = db.query(GlossaryEntry).count()

    # Usage stats
    total_tokens = db.query(
        func.sum(UsageLog.tokens_input + UsageLog.tokens_output)
    ).scalar() or 0

    translation_usage = (
        db.query(UsageLog)
        .filter(UsageLog.operation == "translation")
        .all()
    )
    translation_tokens = sum(u.tokens_input + u.tokens_output for u in translation_usage)

    embedding_usage = (
        db.query(UsageLog)
        .filter(UsageLog.operation == "embedding")
        .all()
    )
    embedding_tokens = sum(u.tokens_input for u in embedding_usage)

    # Cost estimates (rough rates)
    translation_cost = translation_tokens / 1000 * 0.002  # ~$2/M tokens
    embedding_cost = embedding_tokens / 1000 * 0.0001  # ~$0.1/M tokens
    total_estimated_cost = translation_cost + embedding_cost

    # Human translation cost comparison ($0.08/word industry average)
    human_translation_cost = total_words * 0.08

    return {
        "documents": {
            "total": total_docs,
            "translated": translated_docs,
            "indexed": indexed_docs,
            "total_words": total_words,
        },
        "glossary": {
            "total_terms": total_terms,
        },
        "usage": {
            "total_tokens": total_tokens,
            "translation_tokens": translation_tokens,
            "embedding_tokens": embedding_tokens,
            "total_estimated_cost_usd": round(total_estimated_cost, 4),
        },
        "roi": {
            "ai_translation_cost_usd": round(total_estimated_cost, 4),
            "human_translation_estimate_usd": round(human_translation_cost, 2),
            "savings_usd": round(human_translation_cost - total_estimated_cost, 2),
        },
    }
