"use client";

import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .stats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Documents", labelZh: "文档总数", value: stats?.documents?.total ?? "-", href: "/upload" },
    { label: "Translated", labelZh: "已翻译", value: stats?.documents?.translated ?? "-", href: "/upload" },
    { label: "Indexed", labelZh: "知识库条目", value: stats?.documents?.indexed ?? "-", href: "/kb" },
    { label: "Glossary Terms", labelZh: "术语条目", value: stats?.glossary?.total_terms ?? "-", href: "/glossary" },
  ];

  const pipelineSteps = [
    { step: 1, label: "Upload", labelZh: "文档上传", desc: "PDF/DOCX/MD" },
    { step: 2, label: "Parse", labelZh: "文档解析", desc: "GPT-5.4-Nano" },
    { step: 3, label: "Translate", labelZh: "智能翻译", desc: "Gemini 3.1 Flash" },
    { step: 4, label: "Embed", labelZh: "向量嵌入", desc: "Qwen3-Embedding" },
    { step: 5, label: "Q&A", labelZh: "RAG 问答", desc: "DeepSeek V4 Pro" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          DocTransAgent
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Multilingual document translation and knowledge intelligence platform
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link
          href="/upload"
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: "var(--primary)", color: "#fff" }}
        >
          Upload Document
        </Link>
        <Link
          href="/kb"
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Search Knowledge Base
        </Link>
        <Link
          href="/qa"
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Ask Q&A
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl p-5 transition-colors border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {loading ? (
                <span className="animate-pulse" style={{ color: "var(--text-muted)" }}>
                  ...
                </span>
              ) : (
                card.value
              )}
            </div>
            <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {card.label}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
              {card.labelZh}
            </div>
          </Link>
        ))}
      </div>

      {/* Pipeline */}
      <div className="rounded-xl p-6 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <h3 className="font-semibold text-sm mb-5" style={{ color: "var(--text)" }}>
          Processing Pipeline
        </h3>

        <div className="flex items-center gap-0">
          {pipelineSteps.map((s, i) => (
            <div key={s.step} className="flex items-center flex-1">
              <div
                className="flex-1 rounded-lg p-3 text-center"
                style={{
                  background: "var(--bg)",
                  border: `1px solid var(--border)`,
                }}
              >
                <div className="text-xs font-medium mb-0.5" style={{ color: "var(--primary)" }}>
                  {s.step}
                </div>
                <div className="text-xs font-medium" style={{ color: "var(--text)" }}>
                  {s.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {s.desc}
                </div>
              </div>
              {i < pipelineSteps.length - 1 && (
                <div className="flex-shrink-0 px-1" style={{ color: "var(--border)" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" opacity={0.6}>
                    <path d="M9.5 3.5L14 8l-4.5 4.5M2 8h12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Usage + Cost */}
      <div className="grid grid-cols-2 gap-6">
        {stats?.usage && (
          <div
            className="rounded-xl p-6 border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>
              Usage
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Translation Tokens", value: (stats.usage.translation_tokens || 0).toLocaleString() },
                { label: "Embedding Tokens", value: (stats.usage.embedding_tokens || 0).toLocaleString() },
                { label: "Total Tokens", value: (stats.usage.total_tokens || 0).toLocaleString() },
                { label: "Est. Cost", value: `$${(stats.usage.total_estimated_cost_usd || 0).toFixed(4)}` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg p-3"
                  style={{ background: "var(--bg)" }}
                >
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    {item.label}
                  </div>
                  <div className="text-base font-mono font-semibold" style={{ color: "var(--text)" }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats?.roi && (
          <div
            className="rounded-xl p-6 border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>
              Cost Comparison
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "var(--text-muted)" }}>Human Translation</span>
                  <span className="font-semibold" style={{ color: "var(--error)" }}>
                    ${stats.roi.human_translation_estimate_usd.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "var(--bg)" }}>
                  <div className="h-full rounded-full" style={{ width: "100%", background: "var(--error)", opacity: 0.5 }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "var(--text-muted)" }}>AI Translation</span>
                  <span className="font-semibold" style={{ color: "var(--success)" }}>
                    ${stats.roi.ai_translation_cost_usd.toFixed(4)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "var(--bg)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min((stats.roi.ai_translation_cost_usd / stats.roi.human_translation_estimate_usd) * 100, 100)}%`,
                      background: "var(--success)",
                      opacity: 0.5,
                    }}
                  />
                </div>
              </div>
              <div className="pt-3 border-t text-center" style={{ borderColor: "var(--border)" }}>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Savings
                </div>
                <div className="text-xl font-bold" style={{ color: "var(--primary)" }}>
                  99.9%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
