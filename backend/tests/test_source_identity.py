"""Tests for source_identity — Document-to-graph bridge."""
import pytest
from datetime import datetime, timezone


@pytest.fixture
def parsed_doc(test_db):
    """Create a Document with sections but no graph nodes yet."""
    from models import Document, DocStatus

    doc = Document(
        id="bridge-doc-001",
        filename="bridge001.txt",
        original_filename="Test Document.md",
        file_type="md",
        file_size=512,
        source_lang="zh",
        target_lang="en",
        status=DocStatus.PARSED,
        parsed_content="# Intro\n\nContent here.\n\n## Details\n\nMore content.",
        sections=[
            {"heading": "Introduction", "content": "Content here.", "level": 1},
            {"heading": "Details", "content": "More content.", "level": 2},
        ],
        word_count=100,
    )
    test_db.add(doc)
    test_db.commit()
    return doc


@pytest.fixture
def doc_without_sections(test_db):
    """Create a Document with no parsed sections."""
    from models import Document, DocStatus

    doc = Document(
        id="bridge-doc-002",
        filename="bridge002.txt",
        original_filename="Empty.md",
        file_type="md",
        file_size=100,
        source_lang="zh",
        target_lang="en",
        status=DocStatus.UPLOADED,
        parsed_content=None,
        sections=None,
        word_count=0,
    )
    test_db.add(doc)
    test_db.commit()
    return doc


class TestIndexDocumentToGraph:
    def test_creates_nodes_and_edges(self, test_db, parsed_doc):
        from services.source_identity import index_document_to_graph
        from models import GraphNode, GraphEdge, SourceImport

        result = index_document_to_graph(test_db, parsed_doc.id)

        assert result["doc_id"] == parsed_doc.id
        assert result["nodes_created"] == 3  # 1 doc + 2 headings
        assert result["import_id"] is not None

        # Verify nodes
        nodes = test_db.query(GraphNode).all()
        doc_nodes = [n for n in nodes if n.node_type == "document"]
        heading_nodes = [n for n in nodes if n.node_type == "heading"]
        assert len(doc_nodes) == 1
        assert len(heading_nodes) == 2
        assert doc_nodes[0].label == "Test Document.md"
        assert doc_nodes[0].doc_id == parsed_doc.id

        # Verify edges
        edges = test_db.query(GraphEdge).all()
        assert len(edges) == 2  # doc → each heading

        # Verify SourceImport
        imports = test_db.query(SourceImport).all()
        assert len(imports) == 1
        assert imports[0].source_type == "document"
        assert imports[0].status == "completed"

    def test_idempotent(self, test_db, parsed_doc):
        from services.source_identity import index_document_to_graph
        from models import GraphNode

        r1 = index_document_to_graph(test_db, parsed_doc.id)
        r2 = index_document_to_graph(test_db, parsed_doc.id)

        # Same node count
        doc_nodes = test_db.query(GraphNode).filter(GraphNode.node_type == "document").all()
        assert len(doc_nodes) == 1

    def test_doc_without_sections(self, test_db, doc_without_sections):
        from services.source_identity import index_document_to_graph
        from models import GraphNode

        result = index_document_to_graph(test_db, doc_without_sections.id)

        assert result["nodes_created"] == 1  # only the doc node
        nodes = test_db.query(GraphNode).all()
        assert len(nodes) == 1

    def test_nonexistent_doc(self, test_db):
        from services.source_identity import index_document_to_graph
        with pytest.raises(ValueError, match="Document not found"):
            index_document_to_graph(test_db, "nonexistent")

    def test_doc_node_metadata(self, test_db, parsed_doc):
        from services.source_identity import index_document_to_graph
        from models import GraphNode

        index_document_to_graph(test_db, parsed_doc.id)

        doc_node = test_db.query(GraphNode).filter(GraphNode.node_type == "document").first()
        assert doc_node.metadata_["file_type"] == "md"
        assert doc_node.metadata_["source_lang"] == "zh"
        assert doc_node.metadata_["target_lang"] == "en"
        assert doc_node.metadata_["word_count"] == 100

    def test_heading_node_hierarchy(self, test_db, parsed_doc):
        from services.source_identity import index_document_to_graph
        from models import GraphNode, GraphEdge

        index_document_to_graph(test_db, parsed_doc.id)

        doc_node = test_db.query(GraphNode).filter(GraphNode.node_type == "document").first()
        heading_nodes = test_db.query(GraphNode).filter(GraphNode.node_type == "heading").all()

        for hn in heading_nodes:
            edge = (
                test_db.query(GraphEdge)
                .filter(
                    GraphEdge.source_id == doc_node.id,
                    GraphEdge.target_id == hn.id,
                    GraphEdge.relation == "contains",
                )
                .first()
            )
            assert edge is not None, f"Missing edge from doc to heading {hn.label}"
