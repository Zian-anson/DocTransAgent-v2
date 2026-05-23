"""
Retrieval diagnostics — structured observability for every retrieval step.

Captures which retrieval modes were used, how many results each returned,
and any degradation. Designed to be attached to QA responses without
modifying the existing retriever or QA engine internals.
"""
import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class RetrievalStep:
    mode: str          # "semantic" | "keyword_fallback" | "graph" | "degraded"
    results_count: int
    latency_ms: float
    degraded: bool = False
    degradation_reason: str = ""


@dataclass
class DiagnosticsContext:
    steps: list[RetrievalStep] = field(default_factory=list)
    total_latency_ms: float = 0
    overall_mode: str = "unknown"   # best-effort summary

    def add_step(self, mode: str, results_count: int, latency_ms: float,
                 degraded: bool = False, degradation_reason: str = ""):
        self.steps.append(RetrievalStep(
            mode=mode,
            results_count=results_count,
            latency_ms=round(latency_ms, 1),
            degraded=degraded,
            degradation_reason=degradation_reason,
        ))

    def finalize(self):
        """Compute overall mode from step data."""
        if not self.steps:
            self.overall_mode = "empty"
            return

        self.total_latency_ms = round(sum(s.latency_ms for s in self.steps), 1)

        modes = [s.mode for s in self.steps]
        if any(s.mode == "semantic" for s in self.steps):
            self.overall_mode = "semantic"
        elif any(s.mode == "keyword_fallback" for s in self.steps):
            self.overall_mode = "keyword_fallback"
        elif any(s.mode == "graph" for s in self.steps):
            self.overall_mode = "graph"
        else:
            self.overall_mode = "degraded"

    def to_dict(self) -> dict:
        return {
            "overall_mode": self.overall_mode,
            "total_latency_ms": self.total_latency_ms,
            "steps": [
                {
                    "mode": s.mode,
                    "results_count": s.results_count,
                    "latency_ms": s.latency_ms,
                    "degraded": s.degraded,
                    "degradation_reason": s.degradation_reason,
                }
                for s in self.steps
            ],
        }

    @property
    def is_degraded(self) -> bool:
        return any(s.degraded for s in self.steps)
