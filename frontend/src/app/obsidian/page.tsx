"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { obsidianApi, graphApi } from "@/lib/api";

export default function ObsidianImportPage() {
  const [vaultPath, setVaultPath] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [graphStats, setGraphStats] = useState<any>(null);
  const [recentImports, setRecentImports] = useState<any[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchState = useCallback(async () => {
    try {
      const [stats, imports] = await Promise.all([
        graphApi.stats(),
        obsidianApi.listImports(),
      ]);
      setGraphStats(stats);
      setRecentImports(imports.imports || []);
    } catch {
      // silently ignore — graph may be empty
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleImport = async () => {
    if (!vaultPath.trim()) return;
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const res = await obsidianApi.importVault(vaultPath.trim());
      setResult(res);
      await fetchState();
    } catch (e: any) {
      setError(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleFileImport = async () => {
    if (uploadedFiles.length === 0) return;
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const res = await obsidianApi.uploadFiles(uploadedFiles);
      setResult(res);
      setUploadedFiles([]);
      await fetchState();
    } catch (e: any) {
      setError(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    const mdFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".md"));
    if (mdFiles.length === 0) {
      setError("请选择 .md 文件");
      return;
    }
    setUploadedFiles(mdFiles);
    setError("");
    setResult(null);
  };

  const nodeTypes = graphStats?.nodes_by_type || {};
  const edgeRelations = graphStats?.edges_by_relation || {};

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          知识导入
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          导入 Obsidian 笔记库以构建知识图谱
        </p>
      </div>

      {/* Import form */}
      <div
        className="rounded-xl p-6 border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>
          导入笔记库
        </h3>

        {/* --- File upload zone --- */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors mb-4"
          style={{
            borderColor: dragOver ? "var(--primary)" : "var(--border)",
            background: dragOver ? "var(--primary-subtle)" : "var(--bg)",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".md"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <div className="text-3xl mb-2">📁</div>
          {uploadedFiles.length > 0 ? (
            <div className="space-y-1">
              <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
                已选择 {uploadedFiles.length} 个文件
              </div>
              <div className="text-xs max-h-32 overflow-y-auto" style={{ color: "var(--text-muted)" }}>
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="truncate">{f.name}</div>
                ))}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setUploadedFiles([]); }}
                className="text-xs underline mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                清除
              </button>
            </div>
          ) : (
            <>
              <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
                拖拽 .md 文件到这里
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                或点击选择文件 · 支持批量
              </div>
            </>
          )}
        </div>

        {uploadedFiles.length > 0 && (
          <button
            onClick={handleFileImport}
            disabled={importing}
            className="w-full px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 mb-4"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            {importing ? "导入中..." : "导入所选文件"}
          </button>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1" style={{ borderTop: "1px solid var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>或输入路径</span>
          <div className="flex-1" style={{ borderTop: "1px solid var(--border)" }} />
        </div>

        {/* --- Path input --- */}
        <div className="flex gap-3">
          <input
            type="text"
            value={vaultPath}
            onChange={(e) => setVaultPath(e.target.value)}
            placeholder="/path/to/your/obsidian/vault"
            className="flex-1 px-4 py-2.5 rounded-lg text-sm border"
            style={{
              background: "var(--bg)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
            onKeyDown={(e) => e.key === "Enter" && handleImport()}
          />
          <button
            onClick={handleImport}
            disabled={importing || !vaultPath.trim()}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            {importing ? "导入中..." : "导入"}
          </button>
        </div>

        {error && (
          <div
            className="mt-3 px-4 py-2.5 rounded-lg text-sm"
            style={{ background: "var(--bg)", color: "var(--error)" }}
          >
            {error}
          </div>
        )}

        {result && (
          <div
            className="mt-3 px-4 py-2.5 rounded-lg text-sm"
            style={{ background: result.status === "completed" ? "var(--primary-subtle)" : "var(--bg)", color: "var(--primary)" }}
          >
            {result.status === "completed"
              ? `成功导入 ${result.imported_count} 篇笔记`
              : `状态：${result.status}`}
          </div>
        )}
      </div>

      {/* Graph overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="rounded-xl p-5 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {graphStats?.nodes_total ?? 0}
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            图谱节点
          </div>
        </div>
        <div
          className="rounded-xl p-5 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {graphStats?.edges_total ?? 0}
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            图谱边
          </div>
        </div>
        <div
          className="rounded-xl p-5 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {nodeTypes.note ?? 0}
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            笔记
          </div>
        </div>
        <div
          className="rounded-xl p-5 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {nodeTypes.tag ?? 0}
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            标签
          </div>
        </div>
      </div>

      {/* Node type breakdown */}
      {Object.keys(nodeTypes).length > 0 && (
        <div
          className="rounded-xl p-6 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>
            节点类型分布
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(nodeTypes).map(([type, count]) => (
              <div
                key={type}
                className="flex justify-between items-center px-4 py-2.5 rounded-lg"
                style={{ background: "var(--bg)" }}
              >
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {type}
                </span>
                <span className="text-sm font-mono font-semibold" style={{ color: "var(--text)" }}>
                  {String(count)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edge relation breakdown */}
      {Object.keys(edgeRelations).length > 0 && (
        <div
          className="rounded-xl p-6 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>
            边关系分布
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(edgeRelations).map(([rel, count]) => (
              <div
                key={rel}
                className="flex justify-between items-center px-4 py-2.5 rounded-lg"
                style={{ background: "var(--bg)" }}
              >
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {rel}
                </span>
                <span className="text-sm font-mono font-semibold" style={{ color: "var(--text)" }}>
                  {String(count)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent imports */}
      <div
        className="rounded-xl p-6 border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>
          最近导入记录
        </h3>

        {recentImports.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            还没有导入记录。在上方输入笔记库路径开始导入。
          </p>
        ) : (
          <div className="space-y-2">
            {recentImports.map((imp: any) => (
              <div
                key={imp.id}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg"
                style={{ background: "var(--bg)" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background:
                        imp.status === "completed"
                          ? "var(--success)"
                          : imp.status === "error"
                          ? "var(--error)"
                          : "var(--warning)",
                    }}
                  />
                  <span className="text-sm" style={{ color: "var(--text)" }}>
                    {imp.source_path}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>{imp.imported_count} 篇笔记</span>
                  <span>{imp.status}</span>
                  {imp.created_at && (
                    <span>{new Date(imp.created_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
