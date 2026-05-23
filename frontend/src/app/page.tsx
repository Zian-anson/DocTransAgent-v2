"use client";

import { useEffect, useState } from "react";
import { dashboardApi, type DashboardStats } from "@/lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .stats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "文档总数", value: stats?.documents?.total ?? "-", href: "/upload", icon: "📄", color: "#6366f1" },
    { label: "已翻译", value: stats?.documents?.translated ?? "-", href: "/upload", icon: "🌐", color: "#06b6d4" },
    { label: "知识库条目", value: stats?.documents?.indexed ?? "-", href: "/kb", icon: "🗂️", color: "#22c55e" },
    { label: "术语条目", value: stats?.glossary?.total_terms ?? "-", href: "/glossary", icon: "📝", color: "#f59e0b" },
  ];

  // Pipeline flow steps
  const pipelineSteps = [
    { step: 1, label: "文档上传", desc: "PDF/DOCX/MD", icon: "📤", model: null },
    { step: 2, label: "文档解析", desc: "GLM-4 结构化", icon: "🔍", model: "GLM-4", color: "#22c55e" },
    { step: 3, label: "智能翻译", desc: "Gemini 2.5 Flash", icon: "🌐", model: "Gemini", color: "#06b6d4" },
    { step: 4, label: "向量嵌入", desc: "Qwen3-Embedding", icon: "🧮", model: "Qwen3", color: "#f59e0b" },
    { step: 5, label: "RAG 问答", desc: "DeepSeek V3", icon: "💬", model: "DeepSeek", color: "#6366f1" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">DocTransAgent</h1>
        <p className="mt-1" style={{ color: "var(--text-muted)" }}>
          企业出海文档智能翻译与知识库 — Built on GMI Cloud Inference Engine
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link href="/upload" className="btn-primary text-sm">上传文档</Link>
        <Link href="/kb" className="btn-secondary text-sm">搜索知识库</Link>
        <Link href="/qa" className="btn-secondary text-sm">智能问答</Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="card hover:border-indigo-500/40 transition-colors">
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-2xl font-bold">
              {loading ? <span className="animate-pulse" style={{ color: "var(--text-muted)" }}>...</span> : card.value}
            </div>
            <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{card.label}</div>
          </Link>
        ))}
      </div>

      {/* GMI Cloud Multi-Model Pipeline — VISUAL CENTERPIECE */}
      <div className="card" style={{ borderColor: "rgba(99,102,241,0.3)" }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
          <h3 className="font-semibold text-sm">GMI Cloud 多模型推理管线</h3>
          <span className="text-xs opacity-40 ml-auto">4 Models · 1 API</span>
        </div>

        <div className="flex items-center gap-0">
          {pipelineSteps.map((s, i) => (
            <div key={s.step} className="flex items-center flex-1">
              {/* Step card */}
              <div
                className="flex-1 rounded-xl p-3 text-center transition-all hover:scale-105"
                style={{
                  background: s.model
                    ? `linear-gradient(180deg, ${s.color}18, transparent)`
                    : "var(--bg-input)",
                  border: `1px solid ${s.model ? s.color + "30" : "var(--border)"}`,
                }}
              >
                <div className="text-lg mb-1">{s.icon}</div>
                <div className="text-xs font-medium">{s.label}</div>
                <div className="text-xs mt-0.5" style={{ color: s.color || "var(--text-muted)" }}>
                  {s.desc}
                </div>
                {s.model && (
                  <div
                    className="text-xs mt-1.5 mx-auto px-2 py-0.5 rounded-full inline-block"
                    style={{ background: s.color + "22", color: s.color }}
                  >
                    GMI Cloud
                  </div>
                )}
              </div>
              {/* Arrow connector */}
              {i < pipelineSteps.length - 1 && (
                <div className="flex-shrink-0 px-0.5" style={{ color: "var(--text-muted)" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" opacity={0.4}>
                    <path d="M9.5 3.5L14 8l-4.5 4.5M2 8h12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ROI + Usage — side by side */}
      <div className="grid grid-cols-2 gap-6">
        {stats?.roi && (
          <div className="card" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.08))" }}>
            <h3 className="font-semibold mb-4">ROI 成本对比</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "var(--text-muted)" }}>人工翻译成本</span>
                  <span className="font-bold text-red-400">${stats.roi.human_translation_estimate_usd.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "var(--bg-input)" }}>
                  <div className="h-full rounded-full bg-red-400/60" style={{ width: "100%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "var(--text-muted)" }}>AI 翻译成本</span>
                  <span className="font-bold text-green-400">${stats.roi.ai_translation_cost_usd.toFixed(4)}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "var(--bg-input)" }}>
                  <div
                    className="h-full rounded-full bg-green-400/60"
                    style={{
                      width: `${Math.min((stats.roi.ai_translation_cost_usd / stats.roi.human_translation_estimate_usd) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t text-center" style={{ borderColor: "var(--border)" }}>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>节省</div>
                <div className="text-xl font-bold" style={{ color: "var(--accent)" }}>
                  {(99.9).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {stats?.usage && (
          <div className="card">
            <h3 className="font-semibold mb-4">GMI Cloud 用量</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "翻译 Tokens", value: (stats.usage.translation_tokens || 0).toLocaleString(), model: "Gemini 2.5 Flash", color: "#06b6d4" },
                { label: "嵌入 Tokens", value: (stats.usage.embedding_tokens || 0).toLocaleString(), model: "Qwen3-Embedding", color: "#f59e0b" },
                { label: "总 Tokens", value: (stats.usage.total_tokens || 0).toLocaleString(), model: "All Models", color: "#6366f1" },
                { label: "预估费用", value: `$${(stats.usage.total_estimated_cost_usd || 0).toFixed(4)}`, model: "GMI Cloud", color: "#22c55e" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg p-3" style={{ background: "var(--bg-input)" }}>
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{item.label}</div>
                  <div className="text-lg font-mono font-bold">{item.value}</div>
                  <div className="text-xs mt-1" style={{ color: item.color }}>{item.model}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
