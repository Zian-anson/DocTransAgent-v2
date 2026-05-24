"use client";

import { useEffect, useState, useCallback } from "react";
import { graphApi } from "@/lib/api";

const NODE_TYPES = ["", "note", "heading", "tag", "alias", "wikilink_target"];

const NODE_TYPE_COLORS: Record<string, string> = {
  note:             "var(--primary)",
  heading:          "var(--accent)",
  tag:              "oklch(55% 0.10 280)",
  alias:            "oklch(55% 0.08 200)",
  wikilink_target:  "oklch(55% 0.08 130)",
};

const NODE_TYPE_BG: Record<string, string> = {
  note:             "var(--primary-subtle)",
  heading:          "var(--accent-subtle)",
  tag:              "oklch(95% 0.025 280)",
  alias:            "oklch(95% 0.020 200)",
  wikilink_target:  "oklch(96% 0.018 130)",
};

function NodeTypePill({ type }: { type: string }) {
  return (
    <span
      className="badge"
      style={{
        background: NODE_TYPE_BG[type] || "var(--bg-input)",
        color: NODE_TYPE_COLORS[type] || "var(--text-muted)",
      }}
    >
      {type}
    </span>
  );
}

export default function GraphExplorePage() {
  const [stats, setStats] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQ, setSearchQ] = useState("");
  const [filterType, setFilterType] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 30;
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [neighborhood, setNeighborhood] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchStats = useCallback(async () => {
    try { setStats(await graphApi.stats()); } catch {}
  }, []);

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { offset, limit };
      if (filterType) params.node_type = filterType;
      if (searchQ.trim()) params.q = searchQ.trim();
      const data = await graphApi.nodes(params);
      setNodes(data.nodes || []);
      setTotal(data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [searchQ, filterType, offset, limit]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  const handleSelectNode = async (nodeId: string) => {
    setLoadingDetail(true);
    setSelectedNode(null);
    setNeighborhood(null);
    try {
      const [detail, neigh] = await Promise.all([
        graphApi.node(nodeId),
        graphApi.neighborhood(nodeId),
      ]);
      setSelectedNode(detail);
      setNeighborhood(neigh);
    } catch {} finally { setLoadingDetail(false); }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
          图谱探索
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {stats
            ? `${stats.nodes_total.toLocaleString()} 个节点 · ${stats.edges_total.toLocaleString()} 条边`
            : "知识图谱节点与关系"}
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3">
        <input
          type="text"
          value={searchQ}
          onChange={(e) => { setSearchQ(e.target.value); setOffset(0); }}
          placeholder="搜索节点名称..."
          className="input flex-1"
          style={{ height: "40px", padding: "0 14px" }}
        />
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setOffset(0); }}
          className="input"
          style={{ width: "140px", height: "40px", padding: "0 12px" }}
        >
          {NODE_TYPES.map((t) => (
            <option key={t} value={t}>{t || "全部类型"}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Node list */}
        <div className="lg:col-span-1">
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--border-light)" }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)", letterSpacing: "0.07em" }}>
                节点
              </span>
              {total > 0 && (
                <span className="text-xs" style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
                  {total}
                </span>
              )}
            </div>

            {loading && (
              <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-faint)" }}>
                加载中...
              </div>
            )}

            {!loading && nodes.length === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {stats?.nodes_total === 0
                    ? "尚无图谱数据，请先导入笔记库"
                    : "没有匹配的节点"}
                </p>
              </div>
            )}

            {!loading && nodes.map((n: any) => {
              const isSelected = selectedNode?.node?.id === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => handleSelectNode(n.id)}
                  className="w-full text-left px-4 py-3 transition-colors"
                  style={{
                    borderBottom: "1px solid var(--border-light)",
                    background: isSelected ? "var(--primary-subtle)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div className="flex items-center gap-2">
                    <NodeTypePill type={n.node_type} />
                    <span className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                      {n.label}
                    </span>
                  </div>
                  {n.metadata?.relative_path && (
                    <div className="text-xs mt-1 truncate" style={{ color: "var(--text-faint)" }}>
                      {n.metadata.relative_path}
                    </div>
                  )}
                </button>
              );
            })}

            {totalPages > 1 && (
              <div
                className="flex items-center justify-between px-4 py-2.5 text-xs"
                style={{ borderTop: "1px solid var(--border-light)", color: "var(--text-faint)" }}
              >
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="btn-secondary text-xs"
                  style={{ padding: "3px 10px" }}
                >
                  上一页
                </button>
                <span style={{ fontFamily: "var(--font-mono)" }}>{currentPage} / {totalPages}</span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="btn-secondary text-xs"
                  style={{ padding: "3px 10px" }}
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2 space-y-4">
          {loadingDetail && (
            <div className="card flex items-center justify-center py-16">
              <span className="text-sm" style={{ color: "var(--text-faint)" }}>加载节点详情...</span>
            </div>
          )}

          {!loadingDetail && !selectedNode && (
            <div
              className="card flex flex-col items-center justify-center py-20 text-center"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "var(--bg-input)", color: "var(--text-faint)", fontSize: "18px" }}
              >
                ◎
              </div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                从左侧选择一个节点
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
                查看详情、来源路径和邻居关系
              </p>
            </div>
          )}

          {!loadingDetail && selectedNode && (
            <>
              {/* Node detail card */}
              <div className="card">
                <div className="flex items-center gap-3 mb-5">
                  <NodeTypePill type={selectedNode.node.node_type} />
                  <h3 className="font-semibold text-base" style={{ color: "var(--text)" }}>
                    {selectedNode.node.label}
                  </h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-faint)", letterSpacing: "0.07em" }}>
                      节点标识
                    </div>
                    <div
                      className="text-xs px-3 py-2 rounded-md break-all"
                      style={{ background: "var(--bg-input)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
                    >
                      {selectedNode.node.stable_key}
                    </div>
                  </div>

                  {selectedNode.node.metadata?.relative_path && (
                    <div>
                      <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-faint)", letterSpacing: "0.07em" }}>
                        源文件
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {selectedNode.node.metadata.relative_path}
                      </div>
                    </div>
                  )}

                  {selectedNode.node.content_snippet && (
                    <div>
                      <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-faint)", letterSpacing: "0.07em" }}>
                        内容预览
                      </div>
                      <div
                        className="text-xs px-3 py-2.5 rounded-md leading-relaxed"
                        style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}
                      >
                        {selectedNode.node.content_snippet}
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="flex gap-6 mt-5 pt-4 text-xs"
                  style={{ borderTop: "1px solid var(--border-light)", color: "var(--text-faint)" }}
                >
                  <span>出边 <strong style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{selectedNode.outgoing_edges?.length || 0}</strong></span>
                  <span>入边 <strong style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{selectedNode.incoming_edges?.length || 0}</strong></span>
                </div>
              </div>

              {/* Neighborhood */}
              {neighborhood && (
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)", letterSpacing: "0.07em" }}>
                      邻居关系
                    </h4>
                    <span className="text-xs" style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
                      {neighborhood.neighbor_count} 个邻居 · {neighborhood.edge_count} 条边
                    </span>
                  </div>

                  {neighborhood.neighbors.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>此节点暂无连接</p>
                  ) : (
                    <div className="space-y-1.5">
                      {neighborhood.edges?.map((e: any, i: number) => {
                        const srcLabel =
                          e.source_id === selectedNode.node.id
                            ? selectedNode.node.label
                            : neighborhood.neighbors.find((nb: any) => nb.id === e.source_id)?.label || e.source_id;
                        const tgtLabel =
                          e.target_id === selectedNode.node.id
                            ? selectedNode.node.label
                            : neighborhood.neighbors.find((nb: any) => nb.id === e.target_id)?.label || e.target_id;
                        return (
                          <div
                            key={e.id || i}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
                            style={{ background: "var(--bg-input)" }}
                          >
                            <span
                              className="badge flex-shrink-0"
                              style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}
                            >
                              {e.relation}
                            </span>
                            <span className="truncate font-medium" style={{ color: "var(--text)" }}>{srcLabel}</span>
                            <span style={{ color: "var(--text-faint)", flexShrink: 0 }}>→</span>
                            <span className="truncate" style={{ color: "var(--text-muted)" }}>{tgtLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
