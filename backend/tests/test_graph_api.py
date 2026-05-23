import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def graph_test_db(test_db):
    """Seed graph data into the in-memory test DB."""
    from models import GraphNode, GraphEdge, SourceImport
    import uuid
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    n1 = GraphNode(
        id="node-1",
        node_type="note",
        stable_key="notes/a.md@abc123",
        label="Note A",
        content_snippet="Content A snippet.",
        metadata_={"relative_path": "notes/a.md"},
        created_at=now,
        updated_at=now,
    )
    n2 = GraphNode(
        id="node-2",
        node_type="note",
        stable_key="notes/b.md@def456",
        label="Note B",
        metadata_={"relative_path": "notes/b.md"},
        created_at=now,
        updated_at=now,
    )
    n3 = GraphNode(
        id="node-3",
        node_type="tag",
        stable_key="tag:topic",
        label="#topic",
        created_at=now,
        updated_at=now,
    )

    test_db.add_all([n1, n2, n3])
    test_db.flush()

    e1 = GraphEdge(
        id="edge-1",
        source_id="node-1",
        target_id="node-2",
        relation="links_to",
        weight=1.0,
        created_at=now,
    )
    e2 = GraphEdge(
        id="edge-2",
        source_id="node-1",
        target_id="node-3",
        relation="tagged_with",
        weight=1.0,
        created_at=now,
    )

    test_db.add_all([e1, e2])

    si = SourceImport(
        id="import-1",
        source_type="obsidian",
        source_path="/tmp/vault",
        status="completed",
        imported_count=2,
        created_at=now,
        completed_at=now,
    )
    test_db.add(si)
    test_db.commit()

    return test_db


class TestGraphStats:
    def test_stats_returns_counts(self, test_client, graph_test_db):
        resp = test_client.get("/api/graph/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["nodes_total"] == 3
        assert data["edges_total"] == 2
        assert data["nodes_by_type"] == {"note": 2, "tag": 1}
        assert data["edges_by_relation"] == {"links_to": 1, "tagged_with": 1}
        assert len(data["recent_imports"]) == 1
        assert data["recent_imports"][0]["status"] == "completed"

    def test_stats_empty(self, test_client):
        """Stats should return zeros when graph is empty."""
        resp = test_client.get("/api/graph/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["nodes_total"] == 0
        assert data["edges_total"] == 0


class TestListNodes:
    def test_list_all(self, test_client, graph_test_db):
        resp = test_client.get("/api/graph/nodes")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert len(data["nodes"]) == 3

    def test_filter_by_type(self, test_client, graph_test_db):
        resp = test_client.get("/api/graph/nodes?node_type=tag")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["nodes"][0]["node_type"] == "tag"

    def test_search(self, test_client, graph_test_db):
        resp = test_client.get("/api/graph/nodes?q=Note%20A")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["nodes"][0]["label"] == "Note A"

    def test_pagination(self, test_client, graph_test_db):
        resp = test_client.get("/api/graph/nodes?limit=1&offset=0")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["nodes"]) == 1
        assert data["limit"] == 1

    def test_empty_list(self, test_client):
        resp = test_client.get("/api/graph/nodes")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0


class TestGetNode:
    def test_node_with_edges(self, test_client, graph_test_db):
        resp = test_client.get("/api/graph/nodes/node-1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["node"]["label"] == "Note A"
        assert len(data["outgoing_edges"]) == 2
        assert len(data["incoming_edges"]) == 0

    def test_node_not_found(self, test_client, graph_test_db):
        resp = test_client.get("/api/graph/nodes/nonexistent")
        assert resp.status_code == 404


class TestNeighborhood:
    def test_one_hop(self, test_client, graph_test_db):
        resp = test_client.get("/api/graph/neighborhood/node-1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["center"]["label"] == "Note A"
        assert data["neighbor_count"] == 2
        assert data["edge_count"] == 2

    def test_tag_node_has_incoming(self, test_client, graph_test_db):
        """Tag node has 1 incoming tagged_with edge from node-1."""
        resp = test_client.get("/api/graph/neighborhood/node-3")
        assert resp.status_code == 200
        data = resp.json()
        assert data["neighbor_count"] == 1  # node-1
        assert data["edge_count"] == 1  # incoming tagged_with

    def test_not_found(self, test_client, graph_test_db):
        resp = test_client.get("/api/graph/neighborhood/nonexistent")
        assert resp.status_code == 404
