"use client";

import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api";
import Link from "next/link";

const pipelineSteps = [
  { step: 1, label: "上传", en: "Upload",    desc: "PDF · DOCX · MD",       icon: "↑" },
  { step: 2, label: "解析", en: "Parse",     desc: "结构化提取",              icon: "⊞" },
  { step: 3, label: "翻译", en: "Translate", desc: "多语言互译",              icon: "⇄" },
  { step: 4, label: "嵌入", en: "Embed",     desc: "语义向量化",              icon: "⊕" },
  { step: 5, label: "问答", en: "Q&A",       desc: "RAG 检索生成",            icon: "◎" },
];

function StatRow({ label, value, sub, href }: { label: string; value: string | number; sub?: string; href?: string }) {
  const inner = (
    <div className="flex items-baseline justify-between py-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
      <div>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</span>
        {sub && <span className="text-xs ml-2" style={{ color: "var(--text-faint)" }}>{sub}</span>}
      </div>
      <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}>
        {value}
      </span>
    </div>
  );
  if (href) return <Link href={href} className="block hover:opacity-70 transition-opacity">{inner}</Link>;
  return inner;
}

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

  const dash = (v: any) => (loading ? "—" : (v ?? "0"));

  return (
    <div className="space-y-10 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            文档智能中枢
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            多语言 GraphRAG 知识平台 · GMI Cloud 驱动
          </p>
        </div>
        <div className="flex gap-2 mt-1">
          <Link href="/upload" className="btn-primary text-sm">
            上传文档
          </Link>
          <Link href="/qa" className="btn-secondary text-sm">
            开始问答
          </Link>
        </div>
      </div>

      {/* Two-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Stats panel */}
        <div className="lg:col-span-1 card">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)", letterSpacing: "0.08em" }}>
            概览
          </h2>
          <div className="-mx-2">
            <StatRow label="文档总数"   value={dash(stats?.documents?.total)}      href="/upload" />
            <StatRow label="已翻译"     value={dash(stats?.documents?.translated)}  href="/upload" />
            <StatRow label="知识库条目" value={dash(stats?.documents?.indexed)}     href="/kb" />
            <StatRow label="术语条目"   value={dash(stats?.glossary?.total_terms)}  href="/glossary" sub="词条" />
          </div>

          <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--border-light)" }}>
            <Link href="/kb" className="btn-secondary w-full justify-center text-xs">
              浏览知识库
            </Link>
          </div>
        </div>

        {/* Pipeline + usage */}
        <div className="lg:col-span-2 space-y-6">

          {/* Pipeline */}
          <div className="card">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: "var(--text-faint)", letterSpacing: "0.08em" }}>
              处理流程
            </h2>
            <div className="relative">
              {/* Connector line */}
              <div
                className="absolute top-5 left-5 right-5 h-px"
                style={{ background: "var(--border)", zIndex: 0 }}
              />
              <div className="relative flex justify-between" style={{ zIndex: 1 }}>
                {pipelineSteps.map((s) => (
                  <div key={s.step} className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-medium"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--primary)" }}
                    >
                      {s.icon}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-semibold" style={{ color: "var(--text)" }}>{s.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Usage + Cost */}
          {stats?.usage && (
            <div className="card">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-faint)", letterSpacing: "0.08em" }}>
                用量 & 成本
              </h2>
              <div className="grid grid-cols-2 gap-x-8">
                <div className="space-y-0">
                  <StatRow label="翻译 Token" value={(stats.usage.translation_tokens || 0).toLocaleString()} />
                  <StatRow label="嵌入 Token" value={(stats.usage.embedding_tokens || 0).toLocaleString()} />
                  <StatRow label="合计 Token" value={(stats.usage.total_tokens || 0).toLocaleString()} />
                </div>
                {stats?.roi && (
                  <div className="space-y-0">
                    <StatRow label="AI 翻译费用" value={`$${(stats.roi.ai_translation_cost_usd || 0).toFixed(4)}`} />
                    <StatRow label="人工翻译估价" value={`$${(stats.roi.human_translation_estimate_usd || 0).toLocaleString()}`} />
                    <div className="flex items-baseline justify-between py-3">
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>节省比例</span>
                      <span className="text-sm font-semibold" style={{ color: "var(--success)", fontFamily: "var(--font-mono)" }}>
                        99.9%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick access */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-faint)", letterSpacing: "0.08em" }}>
          快速入口
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { href: "/obsidian", label: "导入知识库", desc: "导入 Obsidian 笔记构建知识图谱", icon: "↑" },
            { href: "/graph",    label: "探索图谱",   desc: "浏览节点与关系网络",            icon: "◎" },
            { href: "/glossary", label: "管理术语",   desc: "维护跨语言专业术语对照",        icon: "≡" },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="card-sm group block transition-all duration-150"
              style={{ textDecoration: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-focus)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm mb-3"
                style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}
              >
                {card.icon}
              </div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: "var(--text)" }}>{card.label}</div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{card.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
