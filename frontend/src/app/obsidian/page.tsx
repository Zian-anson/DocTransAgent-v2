"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { obsidianApi, graphApi } from "@/lib/api";
import Link from "next/link";

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
      const [stats, imports] = await Promise.all([graphApi.stats(), obsidianApi.listImports()]);
      setGraphStats(stats);
      setRecentImports(imports.imports || []);
    } catch {}
  }, []);

  useEffect(() => { fetchState(); }, [fetchState]);

  const handleImport = async () => {
    if (!vaultPath.trim()) return;
    setImporting(true); setError(""); setResult(null);
    try {
      const res = await obsidianApi.importVault(vaultPath.trim());
      setResult(res);
      await fetchState();
    } catch (e: any) {
      setError(e.message || "导入失败");
    } finally { setImporting(false); }
  };

  const handleFileImport = async () => {
    if (uploadedFiles.length === 0) return;
    setImporting(true); setError(""); setResult(null);
    try {
      const res = await obsidianApi.uploadFiles(uploadedFiles);
      setResult(res);
      setUploadedFiles([]);
      await fetchState();
    } catch (e: any) {
      setError(e.message || "导入失败");
    } finally { setImporting(false); }
  };

  const handleFiles = (files: FileList | File[]) => {
    const mdFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".md"));
    if (mdFiles.length === 0) { setError("请选择 .md 文件"); return; }
    setUploadedFiles(mdFiles); setError(""); setResult(null);
  };

  const nodeTypes = graphStats?.nodes_by_type || {};
  const edgeRelations = graphStats?.edges_by_relation || {};
  const hasGraph = graphStats && (graphStats.nodes_total > 0);

  const statCards = [
    { label: "节点",  value: graphStats?.nodes_total ?? 0 },
    { label: "边",    value: graphStats?.edges_total ?? 0 },
    { label: "笔记",  value: nodeTypes.note ?? 0 },
    { label: "标签",  value: nodeTypes.tag ?? 0 },
  ];

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            知识导入
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            导入 Obsidian 笔记库，构建多语言知识图谱
          </p>
        </div>
        {hasGraph && (
          <Link href="/graph" className="btn-secondary text-sm">
            探索图谱
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Import form */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-faint)", letterSpacing: "0.08em" }}>
              导入笔记
            </h2>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-150"
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
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: dragOver ? "var(--primary)" : "var(--bg-card)", color: dragOver ? "white" : "var(--text-faint)", border: "1px solid var(--border)" }}
              >
                ↑
              </div>
              {uploadedFiles.length > 0 ? (
                <div>
                  <div className="text-sm font-semibold mb-1" style={{ color: "var(--primary)" }}>
                    已选 {uploadedFiles.length} 个文件
                  </div>
                  <div className="text-xs max-h-24 overflow-y-auto space-y-0.5" style={{ color: "var(--text-muted)" }}>
                    {uploadedFiles.map((f, i) => <div key={i} className="truncate">{f.name}</div>)}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadedFiles([]); }}
                    className="text-xs underline mt-2"
                    style={{ color: "var(--text-faint)" }}
                  >
                    清除
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    拖拽 .md 文件到这里
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
                    或点击选择 · 支持批量上传
                  </div>
                </>
              )}
            </div>

            {uploadedFiles.length > 0 && (
              <button
                onClick={handleFileImport}
                disabled={importing}
                className="btn-primary w-full justify-center mt-3"
              >
                {importing ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> 导入中...</>
                ) : `导入 ${uploadedFiles.length} 个文件`}
              </button>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1" style={{ borderTop: "1px solid var(--border-light)" }} />
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>或输入路径</span>
              <div className="flex-1" style={{ borderTop: "1px solid var(--border-light)" }} />
            </div>

            {/* Path input */}
            <div className="flex gap-3">
              <input
                type="text"
                value={vaultPath}
                onChange={(e) => setVaultPath(e.target.value)}
                placeholder="/path/to/obsidian/vault"
                className="input flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleImport()}
              />
              <button
                onClick={handleImport}
                disabled={importing || !vaultPath.trim()}
                className="btn-primary"
              >
                {importing ? "导入中..." : "导入"}
              </button>
            </div>

            {/* Feedback */}
            {error && (
              <div
                className="mt-3 px-4 py-3 rounded-lg text-sm"
                style={{ background: "oklch(97% 0.015 20)", color: "var(--error)", border: "1px solid oklch(90% 0.04 20)" }}
              >
                {error}
              </div>
            )}
            {result && (
              <div
                className="mt-3 px-4 py-3 rounded-lg text-sm"
                style={{
                  background: result.status === "completed" ? "var(--primary-subtle)" : "var(--bg-input)",
                  color: result.status === "completed" ? "var(--primary)" : "var(--text-muted)",
                  border: `1px solid ${result.status === "completed" ? "var(--primary-dim)" : "var(--border)"}`,
                }}
              >
                {result.status === "completed"
                  ? `成功导入 ${result.imported_count} 篇笔记`
                  : `状态：${result.status}`}
              </div>
            )}
          </div>
        </div>

        {/* Stats sidebar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Overview numbers */}
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((s) => (
              <div key={s.label} className="card-sm text-center">
                <div
                  className="text-2xl font-semibold tabular-nums"
                  style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}
                >
                  {s.value}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Node type breakdown */}
          {Object.keys(nodeTypes).length > 0 && (
            <div className="card">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-faint)", letterSpacing: "0.08em" }}>
                节点类型
              </h2>
              <div className="space-y-1">
                {Object.entries(nodeTypes).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex justify-between items-center px-3 py-2 rounded-md text-xs"
                    style={{ background: "var(--bg)" }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>{type}</span>
                    <span style={{ color: "var(--text)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {String(count)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edge relation breakdown */}
          {Object.keys(edgeRelations).length > 0 && (
            <div className="card">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-faint)", letterSpacing: "0.08em" }}>
                关系类型
              </h2>
              <div className="space-y-1">
                {Object.entries(edgeRelations).map(([rel, count]) => (
                  <div
                    key={rel}
                    className="flex justify-between items-center px-3 py-2 rounded-md text-xs"
                    style={{ background: "var(--bg)" }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>{rel}</span>
                    <span style={{ color: "var(--text)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {String(count)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent imports */}
      {recentImports.length > 0 && (
        <div className="card">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-faint)", letterSpacing: "0.08em" }}>
            导入记录
          </h2>
          <div className="space-y-1.5">
            {recentImports.map((imp: any) => (
              <div
                key={imp.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg text-sm"
                style={{ background: "var(--bg)" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background:
                        imp.status === "completed" ? "var(--success)"
                        : imp.status === "error" ? "var(--error)"
                        : "var(--warning)",
                    }}
                  />
                  <span className="text-sm font-medium truncate max-w-xs" style={{ color: "var(--text)" }}>
                    {imp.source_path}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs flex-shrink-0" style={{ color: "var(--text-faint)" }}>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{imp.imported_count} 篇</span>
                  <span>{imp.status}</span>
                  {imp.created_at && <span>{new Date(imp.created_at).toLocaleDateString("zh-CN")}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentImports.length === 0 && !hasGraph && (
        <div className="card text-center py-8">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            还没有导入记录。在上方拖入 .md 文件或输入笔记库路径开始导入。
          </p>
        </div>
      )}
    </div>
  );
}
