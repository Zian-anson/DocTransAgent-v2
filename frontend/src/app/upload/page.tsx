"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { documentsApi, translationApi, kbApi } from "@/lib/api";
import { StatusBadge } from "@/components/Badges";
import { useTranslationProgress } from "@/hooks/useTranslationProgress";

const LANG_OPTIONS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
  { code: "ru", label: "Русский" },
];

const LANG_LABEL: Record<string, string> = Object.fromEntries(
  LANG_OPTIONS.map((l) => [l.code, l.label])
);

function langDisplay(code?: string): string {
  if (!code) return "—";
  if (code.toLowerCase() === "auto") return "自动";
  return LANG_LABEL[code.toLowerCase()] || code.toUpperCase();
}

export default function UploadPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [targetLangs, setTargetLangs] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { progress, startPolling } = useTranslationProgress(activeDocId);

  const loadDocs = useCallback(async () => {
    try {
      setDocs(await documentsApi.list());
    } catch {}
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await documentsApi.upload(file);
      await loadDocs();
    } catch (err) {
      alert("上传失败: " + (err instanceof Error ? err.message : "未知错误"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const pollDocStatus = (docId: string, expectedStatus: string) => {
    const interval = setInterval(async () => {
      try {
        const doc = await documentsApi.get(docId);
        if (doc.status === expectedStatus || doc.status === "error") {
          clearInterval(interval);
          setTranslatingIds((cur) => { const n = new Set(cur); n.delete(docId); return n; });
          loadDocs();
        }
      } catch {
        clearInterval(interval);
        setTranslatingIds((cur) => { const n = new Set(cur); n.delete(docId); return n; });
      }
    }, 1000);
    setTimeout(() => {
      clearInterval(interval);
      setTranslatingIds((cur) => { const n = new Set(cur); n.delete(docId); return n; });
      loadDocs();
    }, 30000);
  };

  const handleTranslate = async (docId: string) => {
    if (translatingIds.has(docId)) return;
    setTranslatingIds((cur) => new Set(cur).add(docId));
    setActiveDocId(docId);
    const targetLang = targetLangs[docId];
    try {
      await translationApi.start(docId, targetLang);
      startPolling(docId);
      loadDocs();
      pollDocStatus(docId, "translated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误";
      if (message.includes("status translating")) {
        startPolling(docId);
        pollDocStatus(docId, "translated");
        return;
      }
      setTranslatingIds((cur) => { const n = new Set(cur); n.delete(docId); return n; });
      alert("翻译失败: " + message);
    }
  };

  const handleIndex = async (docId: string) => {
    try {
      await kbApi.index(docId);
      pollDocStatus(docId, "indexed");
    } catch (err) {
      alert("索引失败: " + (err instanceof Error ? err.message : "未知错误"));
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("确认删除此文档？")) return;
    try {
      await documentsApi.delete(docId);
      loadDocs();
    } catch (err) {
      alert("删除失败: " + (err instanceof Error ? err.message : "未知错误"));
    }
  };

  const paged = docs.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(docs.length / pageSize);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            文档管理
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            PDF · DOCX · Markdown · TXT
          </p>
        </div>
        <label className="btn-primary cursor-pointer">
          {uploading ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              上传中
            </>
          ) : (
            <>
              <span style={{ fontSize: "13px" }}>↑</span>
              上传文档
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.md,.txt"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Translation progress */}
      {progress && progress.total > 0 && (
        <div
          className="rounded-lg px-5 py-4 border"
          style={{ background: "var(--primary-subtle)", borderColor: "var(--primary-dim)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>翻译进行中</span>
              <span className="text-xs ml-3" style={{ color: "var(--text-muted)" }}>
                {progress.completed} / {progress.total} 段完成
                {progress.failed > 0 && <span style={{ color: "var(--error)" }}> · {progress.failed} 失败</span>}
              </span>
            </div>
            <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
              {progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--primary-dim)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                background: "var(--primary)",
              }}
            />
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-xl"
              style={{ background: "var(--bg-input)", color: "var(--text-faint)" }}
            >
              ↑
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
              还没有文档
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              上传 PDF、DOCX 或 Markdown 文件，开始多语言翻译流程
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                  {["文件名", "类型", "字数", "语言", "状态", "操作"].map((h, i) => (
                    <th
                      key={h}
                      className="py-3 px-4 font-medium text-xs uppercase tracking-wide"
                      style={{
                        color: "var(--text-faint)",
                        textAlign: i === 5 ? "right" : "left",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((doc) => {
                  const canTranslate = ["uploaded", "parsed"].includes(doc.status);
                  const isTranslating = translatingIds.has(doc.id) || ["translating", "parsing"].includes(doc.status);
                  const selectedTarget = targetLangs[doc.id] || doc.target_lang || "en";

                  return (
                    <tr
                      key={doc.id}
                      style={{ borderBottom: "1px solid var(--border-light)" }}
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-sm" style={{ color: "var(--text)" }}>
                          {doc.filename}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="badge"
                          style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}
                        >
                          {doc.file_type?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 tabular-nums text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {doc.word_count?.toLocaleString() ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-xs" style={{ color: "var(--text-muted)" }}>
                        {langDisplay(doc.source_lang)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end items-center gap-2">
                          {canTranslate && (
                            <select
                              value={selectedTarget}
                              onChange={(e) => setTargetLangs((cur) => ({ ...cur, [doc.id]: e.target.value }))}
                              disabled={isTranslating}
                              className="text-xs rounded-md px-2 py-1.5 border"
                              style={{
                                background: "var(--bg-input)",
                                borderColor: "var(--border)",
                                color: "var(--text)",
                                fontFamily: "var(--font-sans)",
                              }}
                            >
                              {LANG_OPTIONS.map((l) => (
                                <option key={l.code} value={l.code}>{l.label}</option>
                              ))}
                            </select>
                          )}

                          {["uploaded", "parsed", "translating", "parsing"].includes(doc.status) && (
                            <button
                              onClick={() => handleTranslate(doc.id)}
                              disabled={isTranslating}
                              className="btn-primary text-xs"
                              style={{ padding: "5px 12px" }}
                            >
                              {isTranslating ? (
                                <>
                                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                  翻译中
                                </>
                              ) : "翻译"}
                            </button>
                          )}

                          {["translated", "indexed"].includes(doc.status) && (
                            <Link
                              href={`/translate/${doc.id}`}
                              className="btn-secondary text-xs"
                              style={{ padding: "5px 12px", color: "var(--accent)", borderColor: "var(--accent)" }}
                            >
                              查看
                            </Link>
                          )}

                          {doc.status === "translated" && (
                            <button
                              onClick={() => handleIndex(doc.id)}
                              className="btn-secondary text-xs"
                              style={{ padding: "5px 12px", color: "var(--success)", borderColor: "var(--success)" }}
                            >
                              索引
                            </button>
                          )}

                          {doc.status === "indexed" && (
                            <span className="text-xs" style={{ color: "var(--success)" }}>已完成</span>
                          )}

                          {doc.status === "error" && (
                            <span className="text-xs" style={{ color: "var(--error)" }}>出错</span>
                          )}

                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="text-xs px-2 py-1 rounded transition-colors"
                            style={{ color: "var(--text-faint)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--error)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; }}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                className="flex items-center justify-between px-4 py-3 text-xs"
                style={{ borderTop: "1px solid var(--border-light)", color: "var(--text-muted)" }}
              >
                <span>{docs.length} 个文档 · 第 {page}/{totalPages} 页</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="btn-secondary text-xs"
                    style={{ padding: "4px 10px" }}
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="btn-secondary text-xs"
                    style={{ padding: "4px 10px" }}
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
