"use client";

import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api";
import Link from "next/link";

const pipelineSteps = [
  { icon: "↑", label: "上传",  desc: "PDF / DOCX / MD" },
  { icon: "⊞", label: "解析",  desc: "结构化提取" },
  { icon: "⇄", label: "翻译",  desc: "多语言互译" },
  { icon: "⊕", label: "嵌入",  desc: "语义向量化" },
  { icon: "◎", label: "问答",  desc: "RAG 生成" },
];

const quickLinks = [
  { href: "/obsidian", label: "导入笔记库", desc: "从 Obsidian vault 构建图谱", color: "var(--primary-subtle)", accent: "var(--primary)" },
  { href: "/graph",    label: "探索知识图谱", desc: "浏览节点与关系网络",       color: "oklch(95% 0.025 280)", accent: "oklch(52% 0.10 280)" },
  { href: "/glossary", label: "管理术语表",  desc: "维护跨语言专业词汇",       color: "oklch(95% 0.025 35)",  accent: "var(--accent)" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.stats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  const n = (v: any) => loading ? "—" : (v ?? "0");

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Hero row ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">文档智能中枢</p>
          <h1
            className="font-semibold leading-tight"
            style={{ fontSize: "28px", color: "var(--text)", letterSpacing: "-0.02em" }}
          >
            多语言 GraphRAG 平台
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", maxWidth: "40ch" }}>
            从文档上传到知识图谱，全链路 AI 驱动的企业文档智能工作流。
          </p>
        </div>
        <div className="flex gap-2 pb-1">
          <Link href="/upload" className="btn-primary">上传文档</Link>
          <Link href="/qa" className="btn-secondary">开始问答</Link>
        </div>
      </div>

      {/* ── Stats + pipeline ── */}
      <div className="grid grid-cols-12 gap-5">

        {/* Stats — 4 numbers in a column */}
        <div className="col-span-3 card flex flex-col justify-between" style={{ padding: "20px 20px" }}>
          <p className="section-label mb-5">数据概览</p>
          <div className="space-y-4 flex-1">
            {[
              { label: "文档总数",   value: n(stats?.documents?.total),      href: "/upload" },
              { label: "已翻译",     value: n(stats?.documents?.translated),  href: "/upload" },
              { label: "知识库条目", value: n(stats?.documents?.indexed),     href: "/kb" },
              { label: "术语条目",   value: n(stats?.glossary?.total_terms),  href: "/glossary" },
            ].map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="flex items-baseline justify-between group"
                style={{ textDecoration: "none" }}
              >
                <span
                  className="text-sm transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.label}
                </span>
                <span
                  className="font-semibold tabular-nums text-lg"
                  style={{ color: "var(--text)", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}
                >
                  {s.value}
                </span>
              </Link>
            ))}
          </div>
          <Link href="/upload" className="btn-secondary w-full mt-5 text-xs">查看全部文档</Link>
        </div>

        {/* Pipeline — horizontal timeline */}
        <div className="col-span-9 card" style={{ padding: "20px 24px" }}>
          <p className="section-label mb-6">处理流程</p>
          <div className="relative flex items-start justify-between">
            {/* Track */}
            <div
              className="absolute"
              style={{
                top: "20px",
                left: "32px",
                right: "32px",
                height: "1px",
                background: "var(--border)",
              }}
            />
            {pipelineSteps.map((s, i) => (
              <div key={i} className="relative flex flex-col items-center gap-3 flex-1">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-medium z-10"
                  style={{
                    background: i === 0 ? "var(--primary)" : "var(--bg-card)",
                    border: i === 0 ? "none" : "1px solid var(--border)",
                    color: i === 0 ? "oklch(98% 0.006 168)" : "var(--text-muted)",
                    boxShadow: i === 0 ? "var(--shadow-sm)" : "var(--shadow-xs)",
                  }}
                >
                  {s.icon}
                </div>
                <div className="text-center">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: i === 0 ? "var(--primary)" : "var(--text)" }}
                  >
                    {s.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Usage strip — only if data exists */}
          {stats?.usage && (
            <div
              className="mt-6 pt-5 grid grid-cols-4 gap-4"
              style={{ borderTop: "1px solid var(--border-light)" }}
            >
              {[
                { label: "翻译 Token", value: (stats.usage.translation_tokens || 0).toLocaleString() },
                { label: "嵌入 Token", value: (stats.usage.embedding_tokens || 0).toLocaleString() },
                { label: "总 Token",   value: (stats.usage.total_tokens || 0).toLocaleString() },
                { label: "估算费用",   value: `$${(stats.usage.total_estimated_cost_usd || 0).toFixed(4)}` },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>{item.label}</div>
                  <div
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── ROI bar ── */}
      {stats?.roi && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">成本对比</p>
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full"
              style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}
            >
              节省 99.9%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: "人工翻译估价", value: `$${(stats.roi.human_translation_estimate_usd || 0).toLocaleString()}`, pct: 100, color: "var(--border)" },
              { label: "AI 翻译费用",  value: `$${(stats.roi.ai_translation_cost_usd || 0).toFixed(4)}`, pct: Math.max(0.5, Math.min(100, (stats.roi.ai_translation_cost_usd / stats.roi.human_translation_estimate_usd) * 100)), color: "var(--primary)" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                  <span style={{ color: "var(--text)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{row.value}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-sunken)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${row.pct}%`, background: row.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick links ── */}
      <div>
        <p className="section-label mb-4">功能入口</p>
        <div className="grid grid-cols-3 gap-4">
          {quickLinks.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="card-sm group block transition-all duration-150"
              style={{ textDecoration: "none" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = card.accent;
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-xs)";
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm mb-3 font-medium"
                style={{ background: card.color, color: card.accent }}
              >
                {card.href === "/obsidian" ? "↑" : card.href === "/graph" ? "◎" : "≡"}
              </div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: "var(--text)" }}>
                {card.label}
              </div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {card.desc}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
