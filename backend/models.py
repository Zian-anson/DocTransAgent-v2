import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Float, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.orm import DeclarativeBase, relationship
import enum


class Base(DeclarativeBase):
    pass


class DocStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PARSING = "parsing"
    PARSED = "parsed"
    TRANSLATING = "translating"
    TRANSLATED = "translated"
    INDEXING = "indexing"
    INDEXED = "indexed"
    ERROR = "error"


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=False)
    file_size = Column(Integer, default=0)
    source_lang = Column(String(10), default="zh")
    target_lang = Column(String(10), default="en")
    status = Column(SAEnum(DocStatus), default=DocStatus.UPLOADED)
    parsed_content = Column(Text, nullable=True)
    translated_content = Column(Text, nullable=True)
    sections = Column(JSON, nullable=True)  # [{heading, content, level}]
    translated_sections = Column(JSON, nullable=True)
    chunk_count = Column(Integer, default=0)
    word_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    translation_jobs = relationship("TranslationJob", back_populates="document", cascade="all, delete-orphan")


class TranslationJob(Base):
    __tablename__ = "translation_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    model_used = Column(String(50), nullable=False)
    source_lang = Column(String(10), nullable=False)
    target_lang = Column(String(10), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    source_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=True)
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)
    latency_ms = Column(Float, default=0)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="translation_jobs")


class GlossaryEntry(Base):
    __tablename__ = "glossary_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project = Column(String(100), default="default")
    source_term = Column(String(500), nullable=False)
    target_term = Column(String(500), nullable=False)
    source_lang = Column(String(10), default="zh")
    target_lang = Column(String(10), default="en")
    category = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class TranslationMemory(Base):
    """Cache translated segments to skip redundant API calls."""
    __tablename__ = "translation_memory"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_hash = Column(String(64), nullable=False, unique=True, index=True)
    source_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=False)
    source_lang = Column(String(10), nullable=False)
    target_lang = Column(String(10), nullable=False)
    hit_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UsageLog(Base):
    __tablename__ = "usage_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_name = Column(String(50), nullable=False)
    operation = Column(String(50), nullable=False)
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)
    latency_ms = Column(Float, default=0)
    estimated_cost_usd = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════
# Source / Ingestion Boundary — GraphRAG data models
# ═══════════════════════════════════════════════════════════════════


class SourceImport(Base):
    """Tracks an import job: Obsidian vault, folder, or future sources."""

    __tablename__ = "source_imports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_type = Column(String(50), nullable=False, default="obsidian")
    source_path = Column(String(1000), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    imported_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class GraphNode(Base):
    """A node in the knowledge graph: note, tag, heading, alias, etc."""

    __tablename__ = "graph_nodes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    node_type = Column(String(50), nullable=False)
    stable_key = Column(String(500), nullable=False, index=True)
    label = Column(String(500), nullable=False)
    doc_id = Column(String(36), ForeignKey("documents.id"), nullable=True)
    content_snippet = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GraphEdge(Base):
    """A directed, typed edge between two graph nodes."""

    __tablename__ = "graph_edges"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String(36), ForeignKey("graph_nodes.id"), nullable=False)
    target_id = Column(String(36), ForeignKey("graph_nodes.id"), nullable=False)
    relation = Column(String(50), nullable=False)
    weight = Column(Float, default=1.0)
    metadata_ = Column("metadata", JSON, nullable=True)
    source_import_id = Column(String(36), ForeignKey("source_imports.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
