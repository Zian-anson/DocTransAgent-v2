"""Obsidian import routes + document-to-graph bridge."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from pathlib import Path

from database import get_db
from services.obsidian_importer import import_obsidian_vault, get_imports, get_import_by_id
from services.source_identity import index_document_to_graph

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sources", tags=["sources"])


class ObsidianImportRequest(BaseModel):
    vault_path: str
    source_lang: str = "zh"
    target_lang: str = "en"


@router.post("/obsidian/import")
async def obsidian_import(req: ObsidianImportRequest, db: Session = Depends(get_db)):
    """Import an Obsidian vault. Idempotent via stable_key."""

    if not req.vault_path.strip():
        raise HTTPException(400, "vault_path is required")

    vault = Path(req.vault_path)
    if not vault.exists():
        raise HTTPException(400, f"Vault path does not exist: {req.vault_path}")
    if not vault.is_dir():
        raise HTTPException(400, f"Vault path is not a directory: {req.vault_path}")

    try:
        result = import_obsidian_vault(db, req.vault_path, req.source_lang, req.target_lang)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error("Import failed: %s", e)
        raise HTTPException(500, f"Import failed: {e}")

    return {
        "import_id": result.id,
        "status": result.status,
        "imported_count": result.imported_count,
        "source_path": result.source_path,
        "error_message": result.error_message,
        "created_at": result.created_at.isoformat() if result.created_at else None,
        "completed_at": result.completed_at.isoformat() if result.completed_at else None,
    }


@router.get("/imports")
async def list_imports(db: Session = Depends(get_db)):
    """List recent import jobs."""
    imports = get_imports(db)
    return {
        "imports": [
            {
                "id": si.id,
                "source_type": si.source_type,
                "source_path": si.source_path,
                "status": si.status,
                "imported_count": si.imported_count,
                "error_message": si.error_message,
                "created_at": si.created_at.isoformat() if si.created_at else None,
                "completed_at": si.completed_at.isoformat() if si.completed_at else None,
            }
            for si in imports
        ]
    }


@router.get("/imports/{import_id}")
async def get_import_status(import_id: str, db: Session = Depends(get_db)):
    """Get a single import job by ID."""
    si = get_import_by_id(db, import_id)
    if not si:
        raise HTTPException(404, "Import not found")
    return {
        "id": si.id,
        "source_type": si.source_type,
        "source_path": si.source_path,
        "status": si.status,
        "imported_count": si.imported_count,
        "error_message": si.error_message,
        "created_at": si.created_at.isoformat() if si.created_at else None,
        "completed_at": si.completed_at.isoformat() if si.completed_at else None,
    }


@router.post("/documents/{doc_id}")
async def promote_document_to_graph(doc_id: str, db: Session = Depends(get_db)):
    """Promote an existing uploaded document into the knowledge graph.

    Creates graph nodes for the document and its sections.
    Idempotent — safe to call multiple times.
    """
    try:
        result = index_document_to_graph(db, doc_id)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        logger.error("Document promotion failed for %s: %s", doc_id, e)
        raise HTTPException(500, f"Promotion failed: {e}")

    return result
