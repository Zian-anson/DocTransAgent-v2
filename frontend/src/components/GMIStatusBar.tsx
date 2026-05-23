"use client";

import { useEffect, useState } from "react";

interface ModelStatus {
  name: string;
  role: string;
  color: string;
  status: "online" | "offline";
}

const MODELS: ModelStatus[] = [
  { name: "Gemini 2.5 Flash", role: "翻译引擎", color: "#06b6d4", status: "online" },
  { name: "DeepSeek V3", role: "RAG 问答", color: "#6366f1", status: "online" },
  { name: "GLM-4", role: "文档结构化", color: "#22c55e", status: "online" },
  { name: "Qwen3-Embedding", role: "向量嵌入", color: "#f59e0b", status: "online" },
];

interface HealthResponse {
  status: string;
  service: string;
  models: {
    translate: string;
    qa: string;
    structure: string;
    embed: string;
  };
  gmi_cloud: string;
}

export default function GMIStatusBar() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  return (
    <div
      className="flex items-center gap-4 px-4 py-2 text-xs border-b"
      style={{ background: "rgba(99,102,241,0.08)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-1.5 font-medium" style={{ color: "var(--accent)" }}>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
        GMI Cloud Inference Engine
      </div>
      <div className="flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
        {MODELS.map((m) => (
          <div key={m.name} className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full" style={{ background: m.color }} />
            {m.name}
            <span className="opacity-50">· {m.role}</span>
          </div>
        ))}
      </div>
      {health && (
        <div className="ml-auto" style={{ color: "var(--text-muted)" }}>
          v{health.service} · {health.models.translate}
        </div>
      )}
    </div>
  );
}
