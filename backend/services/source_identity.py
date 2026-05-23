"""
Source identity bridge — promotes existing Document records into the knowledge graph.

This is the strangler-fig adapter: it connects the old Document upload flow to
the new Source/Ingestion layer without modifying either side.
"""
import hashlib
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from models import Document, GraphNode, GraphEdge, SourceImport

logger = logging.getLogger(__name__)

NODE_DOCUMENT = "document"
NODE_HEADING = "heading"
EDGE_CONTAINS = "contains"


def _utcnow():
    return datetime.now(timezone.utc)


def _doc_stable_key(doc: Document) -> str:
    content_hash = hashlib.sha256(
        (doc.parsed_content or doc.original_filename).encode("utf-8")
    ).hexdigest()[:16]
    return f"doc:{doc.id}@{content_hash}"


def _section_stable_key(doc: Document, idx: int, heading: str) -> str:
    return f"doc:{doc.id}#section-{idx}"


def index_document_to_graph(db: Session, doc_id: str) -> dict:
    """Promote an existing Document into the knowledge graph.

    Creates:
      - 1 NOTE (document) node
      - N HEADING nodes (one per section)
      - CONTAINS edges from document to each heading
      - 1 SourceImport record (source_type = "document")

    Idempotent: re-running updates labels/edges, does not duplicate.

    Returns a summary dict.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise ValueError(f"Document not found: {doc_id}")

    now = _utcnow()
    stable_key = _doc_stable_key(doc)

    # Upsert document NOTE node
    doc_node = db.query(GraphNode).filter(GraphNode.stable_key == stable_key).first()
    if doc_node:
        doc_node.label = doc.original_filename
        doc_node.content_snippet = (doc.parsed_content or "")[:500]
        doc_node.metadata_ = {
            "doc_id": doc.id,
            "file_type": doc.file_type,
            "source_lang": doc.source_lang,
            "target_lang": doc.target_lang,
            "status": doc.status.value if doc.status else None,
            "word_count": doc.word_count,
        }
        doc_node.updated_at = now
    else:
        doc_node = GraphNode(
            id=str(uuid.uuid4()),
            node_type=NODE_DOCUMENT,
            stable_key=stable_key,
            label=doc.original_filename,
            doc_id=doc.id,
            content_snippet=(doc.parsed_content or "")[:500],
            metadata_={
                "doc_id": doc.id,
                "file_type": doc.file_type,
                "source_lang": doc.source_lang,
                "target_lang": doc.target_lang,
                "status": doc.status.value if doc.status else None,
                "word_count": doc.word_count,
            },
            created_at=now,
            updated_at=now,
        )
        db.add(doc_node)
        db.flush()

    node_count = 1

    # Sections → HEADING nodes
    sections = doc.sections or []
    for idx, section in enumerate(sections):
        heading_text = section.get("heading", f"Section {idx+1}")
        sk = _section_stable_key(doc, idx, heading_text)

        heading_node = db.query(GraphNode).filter(GraphNode.stable_key == sk).first()
        if heading_node:
            heading_node.label = heading_text
            heading_node.content_snippet = section.get("content", "")[:500]
            heading_node.metadata_ = {"level": section.get("level", 1), "section_index": idx}
            heading_node.updated_at = now
        else:
            heading_node = GraphNode(
                id=str(uuid.uuid4()),
                node_type=NODE_HEADING,
                stable_key=sk,
                label=heading_text,
                doc_id=doc.id,
                content_snippet=section.get("content", "")[:500],
                metadata_={"level": section.get("level", 1), "section_index": idx},
                created_at=now,
                updated_at=now,
            )
            db.add(heading_node)
            db.flush()

        node_count += 1

        # Edge: document --contains--> heading
        existing_edge = (
            db.query(GraphEdge)
            .filter(
                GraphEdge.source_id == doc_node.id,
                GraphEdge.target_id == heading_node.id,
                GraphEdge.relation == EDGE_CONTAINS,
            )
            .first()
        )
        if not existing_edge:
            db.add(GraphEdge(
                id=str(uuid.uuid4()),
                source_id=doc_node.id,
                target_id=heading_node.id,
                relation=EDGE_CONTAINS,
                weight=1.0,
                created_at=now,
            ))

    # Create SourceImport record
    source_import = SourceImport(
        id=str(uuid.uuid4()),
        source_type="document",
        source_path=doc.original_filename,
        status="completed",
        imported_count=node_count,
        metadata_={"doc_id": doc.id, "bridge": "source_identity"},
        created_at=now,
        completed_at=now,
    )
    db.add(source_import)
    db.commit()

    logger.info("Indexed document %s to graph: %d nodes", doc_id, node_count)

    return {
        "doc_id": doc.id,
        "filename": doc.original_filename,
        "nodes_created": node_count,
        "import_id": source_import.id,
    }
