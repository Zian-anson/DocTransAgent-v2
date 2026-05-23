"use client";

import { useEffect, useState } from "react";
import { obsidianApi, graphApi } from "@/lib/api";

export default function ObsidianImportPage() {
  const [vaultPath, setVaultPath] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [graphStats, setGraphStats] = useState<any>(null);
  const [recentImports, setRecentImports] = useState<any[]>([]);

  const fetchState = async () => {
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
  };

  useEffect(() => {
    fetchState();
  }, []);

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

  const nodeTypes = graphStats?.nodes_by_type || {};
  const edgeRelations = graphStats?.edges_by_relation || {};

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Obsidian Import
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Import an Obsidian vault to build the knowledge graph
        </p>
      </div>

      {/* Import form */}
      <div
        className="rounded-xl p-6 border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>
          Import Vault
        </h3>

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
            {importing ? "Importing..." : "Import"}
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
              ? `Imported ${result.imported_count} notes successfully`
              : `Status: ${result.status}`}
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
            Graph Nodes
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
            Graph Edges
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
            Notes
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
            Tags
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
            Nodes by Type
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
            Edges by Relation
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
          Recent Imports
        </h3>

        {recentImports.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No imports yet. Enter a vault path above to get started.
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
                  <span>{imp.imported_count} notes</span>
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
