"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { kbApi } from "@/lib/api";

interface SearchResult {
  chunk_id: string;
  text: string;
  metadata: Record<string, string>;
  score: number;
}

export default function KBPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await kbApi.search(q);
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  // Load stats on mount
  useEffect(() => {
    kbApi.stats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">知识库搜索</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          跨语言语义搜索 — 中文搜索可匹配英文文档
          {stats && <span> · {stats.total_chunks} 索引块 · {stats.indexed_documents} 文档</span>}
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          className="input flex-1 text-lg"
          placeholder="输入关键词搜索（支持中文/英文跨语言检索）..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
        />
        <button type="submit" disabled={searching} className="btn-primary">
          {searching ? "搜索中..." : "搜索"}
        </button>
      </form>

      {/* Results */}
      <div className="space-y-3">
        {results.map((r) => (
          <div key={r.chunk_id} className="card hover:border-indigo-500/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="badge" style={{ background: "var(--primary)" }}>{(r.score * 100).toFixed(0)}%</span>
                {r.metadata.title && (
                  <span className="text-sm font-medium">{r.metadata.title}</span>
                )}
                {r.metadata.lang && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    ({r.metadata.lang === "en" ? "English" : r.metadata.lang})
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {r.text.slice(0, 400)}
              {r.text.length > 400 && "..."}
            </p>
          </div>
        ))}

        {!searching && query && results.length === 0 && (
          <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
            <p className="text-lg font-medium mb-1">No results</p>
            <p>未找到相关结果</p>
            <p className="text-sm mt-1">尝试其他关键词或先索引更多文档</p>
          </div>
        )}

        {!query && (
          <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
            <p className="font-medium text-lg mb-1">Cross-lingual Semantic Search</p>
            <p className="text-sm mt-1">输入中文关键词查找英文文档，或反之</p>
          </div>
        )}
      </div>
    </div>
  );
}
