"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  documentsApi,
  translationApi,
  kbApi,
  type DocumentSummary,
} from "@/lib/api";
import { StatusBadge } from "@/components/Badges";
import { useTranslationProgress } from "@/hooks/useTranslationProgress";

export default function UploadPage() {
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const { progress, startPolling } = useTranslationProgress(activeDocId);

  const loadDocs = useCallback(async () => {
    try {
      setDocs(await documentsApi.list());
    } catch {}
  }, []);

  useEffect(() => {
    documentsApi
      .list()
      .then(setDocs)
      .catch(() => {});
  }, []);

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
          loadDocs();
        }
      } catch {
        clearInterval(interval);
      }
    }, 1000);
    // Timeout after 30 seconds
    setTimeout(() => clearInterval(interval), 30000);
  };

  const handleTranslate = async (docId: string) => {
    try {
      await translationApi.start(docId);
      setActiveDocId(docId);
      startPolling();
      pollDocStatus(docId, "translated");
    } catch (err) {
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
            <div className="text-4xl mb-3">📁</div>
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
              {docs.map((doc) => (
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
                      {["uploaded", "parsed"].includes(doc.status) && (
                        <button onClick={() => handleTranslate(doc.id)} className="btn-primary text-xs py-1 px-2.5">
                          翻译
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
      </div>
    </div>
  );
}
