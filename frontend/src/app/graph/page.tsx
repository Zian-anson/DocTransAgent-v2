"use client";

import { useEffect, useState, useCallback } from "react";
import { graphApi } from "@/lib/api";

const NODE_TYPES = ["", "note", "heading", "tag", "alias", "wikilink_target"];

export default function GraphExplorePage() {
  const [stats, setStats] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQ, setSearchQ] = useState("");
  const [filterType, setFilterType] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [neighborhood, setNeighborhood] = useState<any>(null);

  const fetchStats = useCallback(async () => {
    try {
      const s = await graphApi.stats();
      setStats(s);
    } catch {}
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
    } catch {} finally {
      setLoading(false);
    }
  }, [searchQ, filterType, offset, limit]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  const handleSelectNode = async (nodeId: string) => {
    try {
      const [detail, neigh] = await Promise.all([
        graphApi.node(nodeId),
        graphApi.neighborhood(nodeId),
      ]);
      setSelectedNode(detail);
      setNeighborhood(neigh);
    } catch {}
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Graph Explorer
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {stats ? `${stats.nodes_total} nodes, ${stats.edges_total} edges` : "Explore the knowledge graph"}
        </p>
      </div>

      {/* Search and filter bar */}
      <div className="flex gap-3">
        <input
          type="text"
          value={searchQ}
          onChange={(e) => { setSearchQ(e.target.value); setOffset(0); }}
          placeholder="Search nodes by label..."
          className="flex-1 px-4 py-2.5 rounded-lg text-sm border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        />
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setOffset(0); }}
          className="px-4 py-2.5 rounded-lg text-sm border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        >
          {NODE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t || "All types"}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Node list panel */}
        <div className="lg:col-span-1 space-y-4">
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div
              className="px-4 py-3 border-b text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              Nodes {total > 0 && `(${total})`}
            </div>

            {loading && (
              <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                Loading...
              </div>
            )}

            {!loading && nodes.length === 0 && (
              <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                {stats?.nodes_total === 0
                  ? "No graph data. Import an Obsidian vault first."
                  : "No nodes match your search."}
              </div>
            )}

            {!loading &&
              nodes.map((n: any) => (
                <button
                  key={n.id}
                  onClick={() => handleSelectNode(n.id)}
                  className="w-full text-left px-4 py-3 border-b transition-colors last:border-b-0"
                  style={{
                    borderColor: "var(--border)",
                    background: selectedNode?.node?.id === n.id ? "var(--primary-subtle)" : "transparent",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: "var(--bg)", color: "var(--text-muted)" }}
                    >
                      {n.node_type}
                    </span>
                    <span className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                      {n.label}
                    </span>
                  </div>
                  {n.metadata?.relative_path && (
                    <div className="text-xs mt-1 truncate" style={{ color: "var(--text-muted)" }}>
                      {n.metadata.relative_path}
                    </div>
                  )}
                </button>
              ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderColor: "var(--border)" }}>
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="text-xs px-3 py-1 rounded transition-colors disabled:opacity-30"
                  style={{ color: "var(--primary)" }}
                >
                  Previous
                </button>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="text-xs px-3 py-1 rounded transition-colors disabled:opacity-30"
                  style={{ color: "var(--primary)" }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedNode ? (
            <div
              className="rounded-xl border p-12 text-center"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Select a node to view details and neighborhood
              </p>
            </div>
          ) : (
            <>
              {/* Node detail */}
              <div
                className="rounded-xl border p-6"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}
                  >
                    {selectedNode.node.node_type}
                  </span>
                  <h3 className="font-semibold" style={{ color: "var(--text)" }}>
                    {selectedNode.node.label}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Stable Key</span>
                    <div className="font-mono text-xs mt-0.5 break-all" style={{ color: "var(--text)" }}>
                      {selectedNode.node.stable_key}
                    </div>
                  </div>
                  {selectedNode.node.metadata?.relative_path && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Source Path</span>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text)" }}>
                        {selectedNode.node.metadata.relative_path}
                      </div>
                    </div>
                  )}
                  {selectedNode.node.content_snippet && (
                    <div className="col-span-2">
                      <span style={{ color: "var(--text-muted)" }}>Content Preview</span>
                      <div
                        className="text-xs mt-0.5 p-3 rounded-lg leading-relaxed"
                        style={{ background: "var(--bg)", color: "var(--text)" }}
                      >
                        {selectedNode.node.content_snippet}
                      </div>
                    </div>
                  )}
                </div>

                {/* Edges summary */}
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="flex gap-4 text-xs">
                    <span style={{ color: "var(--text-muted)" }}>
                      Outgoing: {selectedNode.outgoing_edges?.length || 0}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                      Incoming: {selectedNode.incoming_edges?.length || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Neighborhood */}
              {neighborhood && (
                <div
                  className="rounded-xl border p-6"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <h4 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>
                    Neighborhood ({neighborhood.neighbor_count} neighbors, {neighborhood.edge_count} edges)
                  </h4>

                  {neighborhood.neighbors.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      This node has no connections.
                    </p>
                  ) : (
                    <div className="space-y-1">
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
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                            style={{ background: "var(--bg)" }}
                          >
                            <span
                              className="text-xs px-1.5 py-0.5 rounded font-medium"
                              style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}
                            >
                              {e.relation}
                            </span>
                            <span className="truncate" style={{ color: "var(--text)" }}>
                              {srcLabel}
                            </span>
                            <span style={{ color: "var(--text-muted)" }}>--</span>
                            <span className="truncate" style={{ color: "var(--text)" }}>
                              {tgtLabel}
                            </span>
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
