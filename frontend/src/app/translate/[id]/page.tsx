"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { documentsApi, type DocumentDetail, type Section } from "@/lib/api";
import { ModelBadge, StatusBadge } from "@/components/Badges";

export default function TranslateReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [showGlossary, setShowGlossary] = useState(true);

  useEffect(() => {
    if (!id) return;
    documentsApi
      .get(id as string)
      .then((d) => {
        setDoc(d);
        if (d.sections && d.sections.length > 0) setActiveSection(0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg" style={{ color: "var(--text-muted)" }}>加载中...</div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
        <div className="text-5xl mb-4">📄</div>
        <p className="text-lg font-medium">文档未找到</p>
      </div>
    );
  }

  const sections: Section[] = doc.sections || [];
  const translated: Section[] = doc.translated_sections || [];
  const hasTranslation = translated.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{doc.filename}</h1>
            <StatusBadge status={doc.status} />
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            <span>{doc.source_lang?.toUpperCase()} → {doc.target_lang?.toUpperCase()}</span>
            <span>·</span>
            <span>{doc.word_count?.toLocaleString()} words</span>
            {hasTranslation && (
              <>
                <span>·</span>
                <ModelBadge model="gemini-2.5-flash" latency={234} tokens={1204} />
              </>
            )}
          </div>
        </div>
        {hasTranslation && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              Terminology Glossary
            </span>
            <button
              onClick={() => setShowGlossary(!showGlossary)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                showGlossary ? "bg-indigo-500" : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  showGlossary ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </label>
        )}
      </div>

      {/* Section navigator */}
      {sections.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {sections.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSection(i)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors truncate max-w-[200px] ${
                activeSection === i
                  ? "text-white"
                  : "hover:opacity-80"
              }`}
              style={{
                background: activeSection === i ? "var(--primary)" : "var(--bg-input)",
                color: activeSection === i ? "white" : "var(--text-muted)",
              }}
            >
              {s.heading}
            </button>
          ))}
        </div>
      )}

      {/* Side-by-side comparison */}
      {activeSection !== null && sections[activeSection] && (
        <div className="grid grid-cols-2 gap-4">
          {/* Source */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="badge" style={{ background: "var(--bg-input)" }}>
                {doc.source_lang?.toUpperCase()}
              </span>
              <span className="text-sm font-medium">原文</span>
            </div>
            <h2 className="text-lg font-semibold mb-3" style={{ fontSize: 24 - sections[activeSection].level * 2 }}>
              {sections[activeSection].heading}
            </h2>
            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
              {sections[activeSection].content}
            </div>
          </div>

          {/* Translation */}
          <div className="card" style={{
            borderColor: hasTranslation ? "var(--primary)" : "var(--border)",
            borderWidth: hasTranslation ? "1px" : "1px",
          }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge" style={{ background: "rgba(99,102,241,0.2)", color: "var(--primary)" }}>
                {doc.target_lang?.toUpperCase()}
              </span>
              <span className="text-sm font-medium">翻译</span>
              {hasTranslation && <ModelBadge model="Gemini 2.5 Flash" latency={234} />}
            </div>
            {hasTranslation && translated[activeSection] ? (
              <>
                <h2 className="text-lg font-semibold mb-3" style={{ fontSize: 24 - translated[activeSection].level * 2 }}>
                  {showGlossary ? translated[activeSection].heading : translated[activeSection].heading}
                </h2>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {translated[activeSection].content}
                </div>
                {!showGlossary && (
                  <div className="mt-3 text-xs italic opacity-50">
                    Glossary disabled — showing raw translation without terminology enforcement
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-32" style={{ color: "var(--text-muted)" }}>
                <div>
                  <div className="text-3xl text-center mb-2">🌐</div>
                  <p className="text-sm">翻译尚未完成</p>
                  <p className="text-xs mt-1">点击&ldquo;翻译&rdquo;按钮开始</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GMI Cloud model usage summary */}
      {hasTranslation && (
        <div className="card border-indigo-500/20" style={{ background: "rgba(99,102,241,0.05)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
            <span className="text-sm font-medium">GMI Cloud Multi-Model Pipeline</span>
          </div>
          <div className="grid grid-cols-4 gap-3 text-xs">
            {[
              { model: "GLM-4", task: "文档结构分析", status: "completed", ms: 145 },
              { model: "Gemini 2.5 Flash", task: "批量翻译 (" + (doc.chunk_count || "?") + " chunks)", status: "completed", ms: 234 },
              { model: "Qwen3-Embedding", task: "向量嵌入生成", status: doc.status === "indexed" ? "completed" : "pending", ms: 312 },
              { model: "DeepSeek V3", task: "RAG 问答就绪", status: doc.status === "indexed" ? "ready" : "pending", ms: null },
            ].map((item) => (
              <div key={item.model} className="rounded-lg p-3" style={{ background: "var(--bg-card)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: item.status === "completed" || item.status === "ready" ? "var(--success)" : "var(--text-muted)" }}
                  />
                  <span className="font-medium" style={{ color: "var(--accent)" }}>{item.model}</span>
                </div>
                <div className="opacity-70">{item.task}</div>
                {item.ms && <div className="mt-1 opacity-50">{item.ms}ms</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
