"""Tests for QA + graph_context integration."""
import pytest
from unittest.mock import patch, AsyncMock
from datetime import datetime, timezone

pytestmark = pytest.mark.asyncio


MOCK_SEARCH_RESULT = [
    {
        "chunk_id": "doc-1:0",
        "text": "China requires foreign investors to register with MOFCOM.",
        "metadata": {"doc_id": "doc-1", "filename": "regulations.txt"},
        "score": 0.92,
    }
]

MOCK_QA_RESULT = {
    "answer": "Foreign investors must register with MOFCOM in China. [Source 1]",
    "model": "deepseek-ai/DeepSeek-V4-Pro",
    "tokens_input": 500,
    "tokens_output": 150,
    "latency_ms": 1200.0,
}


def _make_mock_graph_ctx(nodes=None, edges=None, degraded=False, reason=""):
    """Helper to create a mock GraphContext."""
    from services.graph_retriever import GraphContext
    return GraphContext(
        nodes=nodes or [],
        edges=edges or [],
        degraded=degraded,
        degradation_reason=reason,
    )


MOCK_GRAPH_NODES = [
    {"id": "gn1", "node_type": "note", "label": "China Regulations",
     "stable_key": "notes/cn.md@abc", "content_snippet": "Overview of Chinese business regulations.",
     "metadata": {}},
    {"id": "gn2", "node_type": "tag", "label": "#china",
     "stable_key": "tag:china", "content_snippet": None, "metadata": {}},
]

MOCK_GRAPH_CTX = _make_mock_graph_ctx(nodes=MOCK_GRAPH_NODES, edges=[])


class TestQAGraphContext:
    async def test_graph_context_in_response(self):
        """When graph has matching nodes, graph_context should be populated."""
        from services.qa_engine import ask
        with patch("services.qa_engine.search", new=AsyncMock(return_value=MOCK_SEARCH_RESULT)), \
             patch("services.qa_engine.gmi") as mock_gmi, \
             patch("services.qa_engine.retrieve_graph_context", return_value=MOCK_GRAPH_CTX), \
             patch("services.qa_engine.format_context_for_qa", return_value="[Graph Context]\n  [note] China Regulations"):
            mock_gmi.ask_with_context = AsyncMock(return_value=MOCK_QA_RESULT)

            result = await ask("China regulations", top_k=5)

        assert result["answer"]
        assert result["graph_context"] is not None
        assert len(result["graph_context"]) >= 1
        assert result["graph_context"][0]["label"] == "China Regulations"

        modes = [s["mode"] for s in result["diagnostics"]["steps"]]
        assert "graph" in modes

    async def test_no_graph_context_when_empty(self):
        """When graph is empty, graph_context should be None but QA still works."""
        from services.qa_engine import ask
        empty_ctx = _make_mock_graph_ctx(degraded=True, reason="No graph nodes matched")
        with patch("services.qa_engine.search", new=AsyncMock(return_value=MOCK_SEARCH_RESULT)), \
             patch("services.qa_engine.gmi") as mock_gmi, \
             patch("services.qa_engine.retrieve_graph_context", return_value=empty_ctx):
            mock_gmi.ask_with_context = AsyncMock(return_value=MOCK_QA_RESULT)

            result = await ask("Some query", top_k=5)

        assert result["answer"]
        assert result["graph_context"] is None

        modes = [s["mode"] for s in result["diagnostics"]["steps"]]
        assert "graph" in modes

    async def test_graph_failure_does_not_break_qa(self):
        """When graph retrieval raises an exception, QA should still return results."""
        from services.qa_engine import ask
        with patch("services.qa_engine.search", new=AsyncMock(return_value=MOCK_SEARCH_RESULT)), \
             patch("services.qa_engine.gmi") as mock_gmi, \
             patch("services.qa_engine.retrieve_graph_context", side_effect=RuntimeError("DB connection lost")):
            mock_gmi.ask_with_context = AsyncMock(return_value=MOCK_QA_RESULT)

            result = await ask("China regulations", top_k=5)

        assert result["answer"]
        assert result["graph_context"] is None

        graph_steps = [s for s in result["diagnostics"]["steps"] if s["mode"] == "graph"]
        assert len(graph_steps) == 1
        assert graph_steps[0]["degraded"] is True
        assert "DB connection lost" in graph_steps[0]["degradation_reason"]

    async def test_graph_keyword_fallback_still_works(self):
        """When embeddings are unavailable (keyword fallback), graph still works."""
        from services.qa_engine import ask

        fallback_result = [
            {
                "chunk_id": "doc-1:keyword:0",
                "text": "Some content about testing.",
                "metadata": {"doc_id": "doc-1", "filename": "test.txt", "retrieval": "keyword_fallback"},
                "score": 2.0,
            }
        ]

        with patch("services.qa_engine.search", new=AsyncMock(return_value=fallback_result)), \
             patch("services.qa_engine.gmi") as mock_gmi, \
             patch("services.qa_engine.retrieve_graph_context", return_value=MOCK_GRAPH_CTX), \
             patch("services.qa_engine.format_context_for_qa", return_value="[Graph Context]\n  [note] Test"):
            mock_gmi.ask_with_context = AsyncMock(return_value=MOCK_QA_RESULT)

            result = await ask("testing", top_k=5)

        assert result["answer"]
        assert result["diagnostics"]["overall_mode"] == "keyword_fallback"

    async def test_graph_context_structure(self):
        """Verify graph_context node dicts have the expected keys."""
        from services.qa_engine import ask
        with patch("services.qa_engine.search", new=AsyncMock(return_value=MOCK_SEARCH_RESULT)), \
             patch("services.qa_engine.gmi") as mock_gmi, \
             patch("services.qa_engine.retrieve_graph_context", return_value=MOCK_GRAPH_CTX), \
             patch("services.qa_engine.format_context_for_qa", return_value="[Graph Context]\n  [note] China Regulations"):
            mock_gmi.ask_with_context = AsyncMock(return_value=MOCK_QA_RESULT)

            result = await ask("China", top_k=5)

        assert result["graph_context"] is not None
        for node in result["graph_context"]:
            assert "id" in node
            assert "node_type" in node
            assert "label" in node
            assert "stable_key" in node
            assert "content_snippet" in node
