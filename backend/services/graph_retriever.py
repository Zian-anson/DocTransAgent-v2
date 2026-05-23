"""
Graph retriever — bounded, inspectable graph context for QA and retrieval.

This is a new Retrieval Layer boundary. It does not modify the existing
lexical/semantic retriever (services/retriever.py).
"""
import logging
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session

from models import GraphNode, GraphEdge

logger = logging.getLogger(__name__)

MAX_NEIGHBORHOOD_NODES = 50
MAX_CONTEXT_SNIPPET_LEN = 300


@dataclass
class GraphContext:
    nodes: list[dict] = field(default_factory=list)
    edges: list[dict] = field(default_factory=list)
    source: str = "graph"
    degraded: bool = False
    degradation_reason: str = ""


def retrieve_by_label(db: Session, query: str, node_type: Optional[str] = None, limit: int = 20) -> list[GraphNode]:
    """Fuzzy search graph nodes by label."""
    q = db.query(GraphNode).filter(GraphNode.label.ilike(f"%{query}%"))
    if node_type:
        q = q.filter(GraphNode.node_type == node_type)
    return q.order_by(GraphNode.updated_at.desc()).limit(limit).all()


def retrieve_by_stable_key(db: Session, stable_key: str) -> Optional[GraphNode]:
    return db.query(GraphNode).filter(GraphNode.stable_key == stable_key).first()


def expand_neighborhood(db: Session, node_id: str, max_hops: int = 1, max_nodes: int = MAX_NEIGHBORHOOD_NODES) -> GraphContext:
    """Expand graph neighborhood around a node.

    Args:
        db: SQLAlchemy session.
        node_id: Center node ID.
        max_hops: Maximum expansion hops (default 1).
        max_nodes: Hard cap on total nodes in result.

    Returns:
        GraphContext with center, neighbors, and connecting edges.
    """
    center = db.query(GraphNode).filter(GraphNode.id == node_id).first()
    if not center:
        return GraphContext(degraded=True, degradation_reason=f"Node {node_id} not found")

    visited_ids = {node_id}
    all_edges: list[dict] = []
    frontier = {node_id}

    for _ in range(max_hops):
        if not frontier:
            break

        edges = (
            db.query(GraphEdge)
            .filter(
                GraphEdge.source_id.in_(frontier) | GraphEdge.target_id.in_(frontier)
            )
            .limit(max_nodes * 4)
            .all()
        )

        new_ids = set()
        for e in edges:
            all_edges.append({
                "id": e.id,
                "source_id": e.source_id,
                "target_id": e.target_id,
                "relation": e.relation,
                "weight": e.weight,
            })
            if e.source_id not in visited_ids:
                new_ids.add(e.source_id)
            if e.target_id not in visited_ids:
                new_ids.add(e.target_id)

        visited_ids |= new_ids
        frontier = new_ids

        if len(visited_ids) >= max_nodes:
            break

    # Fetch all visited nodes
    node_rows = (
        db.query(GraphNode)
        .filter(GraphNode.id.in_(list(visited_ids)[:max_nodes]))
        .all()
    )
    nodes = [_node_dict(n) for n in node_rows]

    return GraphContext(nodes=nodes, edges=all_edges)


def retrieve_graph_context(db: Session, query: str, max_seeds: int = 5) -> GraphContext:
    """Search nodes by label, then expand 1-hop around matches.

    Returns compact GraphContext suitable for QA prompt injection.
    """
    seeds = retrieve_by_label(db, query, limit=max_seeds)
    if not seeds:
        return GraphContext(degraded=True, degradation_reason=f"No graph nodes matched '{query}'")

    visited_ids: set[str] = set()
    all_nodes: list[dict] = []
    all_edges: list[dict] = []

    for seed in seeds:
        ctx = expand_neighborhood(db, seed.id, max_hops=1, max_nodes=20)
        for n in ctx.nodes:
            if n["id"] not in visited_ids:
                visited_ids.add(n["id"])
                all_nodes.append(n)
        for e in ctx.edges:
            eid = e["id"]
            if not any(existing["id"] == eid for existing in all_edges):
                all_edges.append(e)

    return GraphContext(nodes=all_nodes, edges=all_edges)


def format_context_for_qa(ctx: GraphContext) -> str:
    """Format a GraphContext into a compact text block for LLM prompt injection.

    Produces no more than ~1000 tokens of graph context.
    """
    if not ctx.nodes:
        if ctx.degraded:
            return f"[Graph context unavailable: {ctx.degradation_reason}]"
        return ""

    lines = ["[Graph Context]"]
    node_index: dict[str, dict] = {n["id"]: n for n in ctx.nodes}

    for n in ctx.nodes[:20]:
        snippet = ""
        if n.get("content_snippet"):
            snippet = n["content_snippet"][:MAX_CONTEXT_SNIPPET_LEN]
        meta = n.get("metadata") or {}
        path = meta.get("relative_path", "")
        lines.append(
            f"  [{n['node_type']}] {n['label']}"
            + (f" ({path})" if path else "")
        )
        if snippet and n["node_type"] == "note":
            lines.append(f"    excerpt: {snippet}")

    # Compact edge summary
    if ctx.edges:
        edge_summary: dict[str, list[str]] = {}
        for e in ctx.edges:
            src = node_index.get(e["source_id"], {}).get("label", e["source_id"])
            tgt = node_index.get(e["target_id"], {}).get("label", e["target_id"])
            rel = e["relation"]
            key = f"{src} --{rel}--> {tgt}"
            edge_summary.setdefault(rel, []).append(key)

        lines.append("  Relations:")
        for rel, items in sorted(edge_summary.items()):
            for item in items[:5]:
                lines.append(f"    {item}")
            if len(items) > 5:
                lines.append(f"    ... and {len(items) - 5} more {rel}")

    return "\n".join(lines)


def _node_dict(n: GraphNode) -> dict:
    return {
        "id": n.id,
        "node_type": n.node_type,
        "stable_key": n.stable_key,
        "label": n.label,
        "doc_id": n.doc_id,
        "content_snippet": n.content_snippet,
        "metadata": n.metadata_,
    }
