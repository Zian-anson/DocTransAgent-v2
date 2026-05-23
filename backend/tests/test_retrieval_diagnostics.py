import pytest
from services.retrieval_diagnostics import DiagnosticsContext, RetrievalStep


class TestDiagnosticsContext:
    def test_add_step(self):
        ctx = DiagnosticsContext()
        ctx.add_step("semantic", 10, 42.5)
        assert len(ctx.steps) == 1
        assert ctx.steps[0].mode == "semantic"
        assert ctx.steps[0].results_count == 10
        assert ctx.steps[0].latency_ms == 42.5
        assert ctx.steps[0].degraded is False

    def test_add_degraded_step(self):
        ctx = DiagnosticsContext()
        ctx.add_step("keyword_fallback", 3, 15.0, degraded=True,
                     degradation_reason="Embedding unavailable")
        assert ctx.steps[0].degraded is True
        assert "Embedding" in ctx.steps[0].degradation_reason

    def test_finalize_semantic(self):
        ctx = DiagnosticsContext()
        ctx.add_step("semantic", 8, 30.0)
        ctx.finalize()
        assert ctx.overall_mode == "semantic"
        assert ctx.total_latency_ms == 30.0

    def test_finalize_keyword_fallback(self):
        ctx = DiagnosticsContext()
        ctx.add_step("keyword_fallback", 5, 20.0, degraded=True,
                     degradation_reason="Embedding unavailable")
        ctx.finalize()
        assert ctx.overall_mode == "keyword_fallback"

    def test_finalize_empty(self):
        ctx = DiagnosticsContext()
        ctx.finalize()
        assert ctx.overall_mode == "empty"
        assert ctx.total_latency_ms == 0

    def test_finalize_mixed(self):
        """If semantic succeeds and graph also runs, overall = semantic."""
        ctx = DiagnosticsContext()
        ctx.add_step("semantic", 8, 30.0)
        ctx.add_step("graph", 3, 5.0)
        ctx.finalize()
        assert ctx.overall_mode == "semantic"

    def test_to_dict(self):
        ctx = DiagnosticsContext()
        ctx.add_step("semantic", 10, 42.5)
        ctx.finalize()
        d = ctx.to_dict()
        assert d["overall_mode"] == "semantic"
        assert d["total_latency_ms"] == 42.5
        assert len(d["steps"]) == 1
        assert d["steps"][0]["mode"] == "semantic"

    def test_is_degraded(self):
        ctx = DiagnosticsContext()
        ctx.add_step("semantic", 10, 30.0)
        assert ctx.is_degraded is False

        ctx.add_step("keyword_fallback", 0, 5.0, degraded=True,
                     degradation_reason="test")
        assert ctx.is_degraded is True

    def test_multiple_steps(self):
        ctx = DiagnosticsContext()
        ctx.add_step("semantic", 10, 30.0)
        ctx.add_step("graph", 3, 5.0)
        ctx.finalize()
        assert ctx.total_latency_ms == 35.0
        assert len(ctx.steps) == 2
        assert ctx.to_dict()["steps"][0]["results_count"] == 10
        assert ctx.to_dict()["steps"][1]["results_count"] == 3
