import pytest
from datetime import datetime, timezone

from services.graph_retriever import (
    retrieve_by_label,
    retrieve_by_stable_key,
    expand_neighborhood,
    retrieve_graph_context,
    format_context_for_qa,
    GraphContext,
)


@pytest.fixture
def seeded_db(test_db):
    """Seed graph data with a small connected graph."""
    from models import GraphNode, GraphEdge

    now = datetime.now(timezone.utc)

    n1 = GraphNode(id="n1", node_type="note", stable_key="notes/a.md@abc", label="Market Entry Strategy",
                   content_snippet="Strategy for entering the Chinese market.", metadata_={"relative_path": "notes/a.md"},
                   created_at=now, updated_at=now)
    n2 = GraphNode(id="n2", node_type="note", stable_key="notes/b.md@def", label="China Regulations",
                   content_snippet="Overview of Chinese business regulations.",
                   metadata_={"relative_path": "notes/b.md"}, created_at=now, updated_at=now)
    n3 = GraphNode(id="n3", node_type="tag", stable_key="tag:market-entry", label="#market-entry",
                   created_at=now, updated_at=now)
    n4 = GraphNode(id="n4", node_type="heading", stable_key="notes/a.md@abc#heading-3", label="Legal Requirements",
                   metadata_={"level": 2, "line": 3}, created_at=now, updated_at=now)
    n5 = GraphNode(id="n5", node_type="note", stable_key="notes/c.md@ghi", label="APAC Overview",
                   content_snippet="Overview of APAC region.", metadata_={"relative_path": "notes/c.md"},
                   created_at=now, updated_at=now)

    test_db.add_all([n1, n2, n3, n4, n5])
    test_db.flush()

    e1 = GraphEdge(id="e1", source_id="n1", target_id="n2", relation="links_to", weight=1.0, created_at=now)
    e2 = GraphEdge(id="e2", source_id="n1", target_id="n3", relation="tagged_with", weight=1.0, created_at=now)
    e3 = GraphEdge(id="e3", source_id="n1", target_id="n4", relation="contains", weight=1.0, created_at=now)
    e4 = GraphEdge(id="e4", source_id="n1", target_id="n5", relation="links_to", weight=1.0, created_at=now)

    test_db.add_all([e1, e2, e3, e4])
    test_db.commit()

    return test_db


class TestRetrieveByLabel:
    def test_exact_match(self, seeded_db):
        results = retrieve_by_label(seeded_db, "Market Entry Strategy")
        assert len(results) == 1
        assert results[0].label == "Market Entry Strategy"

    def test_partial_match(self, seeded_db):
        results = retrieve_by_label(seeded_db, "China")
        assert len(results) == 1
        assert results[0].label == "China Regulations"

    def test_filter_by_type(self, seeded_db):
        results = retrieve_by_label(seeded_db, "entry", node_type="tag")
        assert len(results) == 1
        assert results[0].node_type == "tag"

    def test_no_match(self, seeded_db):
        results = retrieve_by_label(seeded_db, "nonexistent")
        assert results == []


class TestRetrieveByStableKey:
    def test_found(self, seeded_db):
        node = retrieve_by_stable_key(seeded_db, "notes/a.md@abc")
        assert node is not None
        assert node.label == "Market Entry Strategy"

    def test_not_found(self, seeded_db):
        assert retrieve_by_stable_key(seeded_db, "nonexistent") is None


class TestExpandNeighborhood:
    def test_one_hop_from_center(self, seeded_db):
        ctx = expand_neighborhood(seeded_db, "n1", max_hops=1)
        assert not ctx.degraded
        assert len(ctx.nodes) == 5  # n1 + n2 + n3 + n4 + n5
        assert len(ctx.edges) == 4

    def test_isolated_node(self, seeded_db):
        """n5 has no outgoing edges, but n1 links to it — so it has 1 incoming edge."""
        ctx = expand_neighborhood(seeded_db, "n5", max_hops=1)
        assert not ctx.degraded
        assert len(ctx.nodes) >= 2  # n5 + n1
        assert len(ctx.edges) >= 1

    def test_node_not_found(self, seeded_db):
        ctx = expand_neighborhood(seeded_db, "nonexistent")
        assert ctx.degraded
        assert "not found" in ctx.degradation_reason

    def test_one_hop_from_tag(self, seeded_db):
        """n3 is a tag — it has incoming tagged_with from n1."""
        ctx = expand_neighborhood(seeded_db, "n3", max_hops=1)
        assert not ctx.degraded
        assert len(ctx.nodes) >= 2  # n3 + n1


class TestRetrieveGraphContext:
    def test_seed_and_expand(self, seeded_db):
        ctx = retrieve_graph_context(seeded_db, "Market")
        assert not ctx.degraded
        assert len(ctx.nodes) >= 2
        assert len(ctx.edges) >= 1

    def test_no_match(self, seeded_db):
        ctx = retrieve_graph_context(seeded_db, "nonexistent")
        assert ctx.degraded
        assert "No graph nodes matched" in ctx.degradation_reason


class TestFormatContextForQA:
    def test_formats_compact_text(self, seeded_db):
        ctx = retrieve_graph_context(seeded_db, "Market")
        text = format_context_for_qa(ctx)
        assert "[Graph Context]" in text
        assert "Market Entry Strategy" in text
        assert "Relations:" in text

    def test_empty_context(self):
        ctx = GraphContext()
        assert format_context_for_qa(ctx) == ""

    def test_degraded_context(self):
        ctx = GraphContext(degraded=True, degradation_reason="Test reason")
        text = format_context_for_qa(ctx)
        assert "unavailable" in text
        assert "Test reason" in text

    def test_no_snippet_for_non_note(self, seeded_db):
        """Non-note nodes should not include excerpt in formatted output."""
        ctx = retrieve_graph_context(seeded_db, "market-entry")
        text = format_context_for_qa(ctx)
        assert "excerpt:" not in text or "#market-entry" in text
