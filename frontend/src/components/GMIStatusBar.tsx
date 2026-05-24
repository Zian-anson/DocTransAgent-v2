"use client";

import { useEffect, useState } from "react";

const MODEL_ROLES = [
  { key: "translate", role: "翻译" },
  { key: "qa",        role: "问答" },
  { key: "structure", role: "结构化" },
  { key: "embed",     role: "嵌入" },
];

const FRIENDLY_NAMES: Record<string, string> = {
  "google/gemini-3.1-flash-lite-preview": "Gemini 3.1 Flash Lite",
  "google/gemini-2.5-flash":              "Gemini 2.5 Flash",
  "deepseek-ai/DeepSeek-V4-Pro":          "DeepSeek V4 Pro",
  "deepseek-ai/DeepSeek-V3-0324":         "DeepSeek V3",
  "openai/gpt-5.4-nano":                  "GPT-5.4-Nano",
  "BAAI/bge-m3":                          "BGE-M3",
  "qwen3-embedding-8b":                   "Qwen3-Emb",
};

type HealthStatus = {
  models?: Record<string, string>;
};

export default function GMIStatusBar() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => {});
  }, []);

  return (
    <div
      className="flex items-center gap-4 px-5 py-2 text-xs"
      style={{
        background: "oklch(100% 0 0 / 0.62)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        height: "36px",
        color: "var(--text-muted)",
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: health ? "var(--primary)" : "var(--text-faint)" }} />
        <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>GMI Cloud</span>
      </div>
      <div
        className="w-px h-3"
        style={{ background: "var(--border)" }}
      />
      <div className="flex items-center gap-4">
        {MODEL_ROLES.map(({ key, role }) => {
          const modelId = health?.models?.[key] || "";
          const name = FRIENDLY_NAMES[modelId] || (modelId ? modelId.split("/").pop() : "—");
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span style={{ color: "var(--text-muted)" }}>{role}</span>
              <span
                className="px-1.5 py-0.5 rounded"
                style={{
                  background: "var(--primary-subtle)",
                  color: "var(--sidebar-active-text)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                }}
              >
                {name}
              </span>
            </div>
          );
        })}
      </div>
      {health && (
        <div className="ml-auto flex items-center gap-1" style={{ color: "var(--primary)" }}>
          API Online
        </div>
      )}
    </div>
  );
}
