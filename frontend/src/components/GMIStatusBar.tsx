"use client";

import { useEffect, useState } from "react";

const MODEL_ROLES = [
  { key: "translate", role: "Translation", color: "#24837B" },
  { key: "qa", role: "Q&A", color: "#6366f1" },
  { key: "structure", role: "Structure", color: "#22c55e" },
  { key: "embed", role: "Embedding", color: "#c2842a" },
];

const FRIENDLY_NAMES: Record<string, string> = {
  "google/gemini-3.1-flash-lite-preview": "Gemini 3.1 Flash Lite",
  "google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "deepseek-ai/DeepSeek-V4-Pro": "DeepSeek V4 Pro",
  "deepseek-ai/DeepSeek-V4-Flash": "DeepSeek V4 Flash",
  "deepseek-v4-pro": "DeepSeek V4 Pro",
  "deepseek-v3": "DeepSeek V3",
  "openai/gpt-5.4-nano": "GPT-5.4-Nano",
  "openai/gpt-5.4-mini": "GPT-5.4-Mini",
  "glm-4": "GLM-4",
  "qwen3-embedding-8b": "Qwen3-Embedding-8B",
};

export default function GMIStatusBar() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  return (
    <div
      className="flex items-center gap-4 px-4 py-1.5 text-xs border-b"
      style={{ background: "var(--primary-subtle)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-1.5 font-medium" style={{ color: "var(--text-muted)" }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
        Inference Engine
      </div>
      <div className="flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
        {MODEL_ROLES.map(({ key, role, color }) => {
          const modelId = health?.models?.[key] || "";
          const name = FRIENDLY_NAMES[modelId] || modelId;
          return (
            <div key={key} className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full" style={{ background: color }} />
              {name}
            </div>
          );
        })}
      </div>
      {health && (
        <div className="ml-auto" style={{ color: "var(--text-muted)" }}>
          API Online
        </div>
      )}
    </div>
  );
}
