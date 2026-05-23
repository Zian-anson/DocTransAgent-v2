"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { documentsApi, translationApi, kbApi } from "@/lib/api";
import { StatusBadge } from "@/components/Badges";
import { useTranslationProgress } from "@/hooks/useTranslationProgress";

export default function UploadPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
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
      alert("上传失败: " + (err instanceof Error ? err.message : "Unexpected error"));
    } finally {
      setUploading(false);
    }
  };

  // Poll document status until it reaches the expected state or errors
  const pollDocStatus = (docId: string, expectedStatus: string) => {
    const interval = setInterval(async () => {
      try {
        const doc = await documentsApi.get(docId);
        if (doc.status === expectedStatus || doc.status === "error") {
          clearInterval(interval);
          setTranslatingIds((current) => {
            const next = new Set(current);
            next.delete(docId);
            return next;
          });
          loadDocs();
        }
      } catch {
        clearInterval(interval);
        setTranslatingIds((current) => {
          const next = new Set(current);
          next.delete(docId);
          return next;
        });
      }
    }, 1000);
    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(interval);
      setTranslatingIds((current) => {
        const next = new Set(current);
        next.delete(docId);
        return next;
      });
      loadDocs();
    }, 30000);
  };

  const handleTranslate = async (docId: string) => {
    if (translatingIds.has(docId)) return;
    setTranslatingIds((current) => new Set(current).add(docId));
    setActiveDocId(docId);
    try {
      await translationApi.start(docId);
      startPolling(docId);
      loadDocs();
      pollDocStatus(docId, "translated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      if (message.includes("status translating")) {
        startPolling(docId);
        pollDocStatus(docId, "translated");
        return;
      }
      setTranslatingIds((current) => {
        const next = new Set(current);
        next.delete(docId);
        return next;
      });
      alert("Translation failed: " + (err instanceof Error ? err.message : "Unexpected error"));
    }
  };

  const handleIndex = async (docId: string) => {
    try {
      await kbApi.index(docId);
      pollDocStatus(docId, "indexed");
    } catch (err) {
      alert("Index failed: " + (err instanceof Error ? err.message : "Unexpected error"));
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      await documentsApi.delete(docId);
      loadDocs();
    } catch (err) {
      alert("Delete failed: " + (err instanceof Error ? err.message : "Unexpected error"));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">文档上传</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            支持 PDF, DOCX, Markdown, TXT 格式
          </p>
        </div>
        <label className="btn-primary cursor-pointer text-sm">
          {uploading ? "上传中..." : "+ 上传文档"}
          <input type="file" className="hidden" accept=".pdf,.docx,.md,.txt" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {/* Active translation progress */}
      {progress && (
        <div className="card border-indigo-500/30">
          <div className="flex items-center gap-3">
            <span className="animate-pulse text-lg">⚡</span>
            <div className="flex-1">
              <div className="text-sm font-medium">翻译进度 · GMI Cloud Gemini 2.5 Flash</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {progress.completed}/{progress.total} chunks completed
                {progress.failed > 0 && ` (${progress.failed} failed)`}
              </div>
            </div>
            <span className="text-sm font-mono" style={{ color: "var(--accent)" }}>
              {progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%
            </span>
          </div>
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                background: "linear-gradient(90deg, var(--primary), var(--accent))",
              }}
            />
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="card">
        {docs.length === 0 ? (
          <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
            <p className="text-lg font-medium mb-1">No documents yet</p>
            <p>还没有上传文档</p>
            <p className="text-sm mt-1">上传 PDF, DOCX, MD 或 TXT 文件开始翻译</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th className="text-left py-3 px-3 font-medium" style={{ color: "var(--text-muted)" }}>文件名</th>
                <th className="text-left py-3 px-3 font-medium" style={{ color: "var(--text-muted)" }}>类型</th>
                <th className="text-left py-3 px-3 font-medium" style={{ color: "var(--text-muted)" }}>字数</th>
                <th className="text-left py-3 px-3 font-medium" style={{ color: "var(--text-muted)" }}>状态</th>
                <th className="text-right py-3 px-3 font-medium" style={{ color: "var(--text-muted)" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {docs.slice((page - 1) * pageSize, page * pageSize).map((doc) => (
                <tr key={doc.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: "var(--border)" }}>
                  <td className="py-3 px-3 font-medium">{doc.filename}</td>
                  <td className="py-3 px-3">
                    <span className="badge" style={{ background: "var(--bg-input)" }}>{doc.file_type.toUpperCase()}</span>
                  </td>
                  <td className="py-3 px-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    {doc.word_count?.toLocaleString() ?? "-"}
                  </td>
                  <td className="py-3 px-3"><StatusBadge status={doc.status} /></td>
                  <td className="py-3 px-3">
                    <div className="flex justify-end gap-1.5">
                      {["uploaded", "parsed", "translating", "parsing"].includes(doc.status) && (
                        <button
                          onClick={() => handleTranslate(doc.id)}
                          disabled={translatingIds.has(doc.id) || ["translating", "parsing"].includes(doc.status)}
                          className="btn-primary text-xs py-1 px-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {translatingIds.has(doc.id) || ["translating", "parsing"].includes(doc.status) ? "翻译中" : "翻译"}
                        </button>
                      )}
                      {["translated", "indexed"].includes(doc.status) && (
                        <Link href={`/translate/${doc.id}`} className="btn-secondary text-xs py-1 px-2.5"
                          style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
                          查看
                        </Link>
                      )}
                      {doc.status === "translated" && (
                        <button onClick={() => handleIndex(doc.id)} className="btn-secondary text-xs py-1 px-2.5"
                          style={{ color: "var(--success)", borderColor: "var(--success)" }}>
                          索引
                        </button>
                      )}
                      {doc.status === "indexed" && (
                        <span className="text-xs py-1 px-2.5" style={{ color: "var(--success)" }}>已完成</span>
                      )}
                      {doc.status === "error" && (
                        <span className="text-xs py-1 px-2.5" style={{ color: "var(--error)" }}>查看错误</span>
                      )}
                      <button onClick={() => handleDelete(doc.id)} className="text-xs py-1 px-2 opacity-40 hover:opacity-100 hover:text-red-400">
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {docs.length > pageSize && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {docs.length} 个文档 · 第 {page}/{Math.ceil(docs.length / pageSize)} 页
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="text-xs px-3 py-1 rounded-md border transition-colors hover:border-indigo-500/50 disabled:opacity-30"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                上一页
              </button>
              <button
                onClick={() => setPage(Math.min(Math.ceil(docs.length / pageSize), page + 1))}
                disabled={page >= Math.ceil(docs.length / pageSize)}
                className="text-xs px-3 py-1 rounded-md border transition-colors hover:border-indigo-500/50 disabled:opacity-30"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
