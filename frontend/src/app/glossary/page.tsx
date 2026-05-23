"use client";

import { useState, useEffect, useCallback } from "react";
import { glossaryApi } from "@/lib/api";

interface GlossaryItem {
  id: string;
  source_term: string;
  target_term: string;
  category: string;
  project: string;
}

export default function GlossaryPage() {
  const [entries, setEntries] = useState<GlossaryItem[]>([]);
  const [sourceTerm, setSourceTerm] = useState("");
  const [targetTerm, setTargetTerm] = useState("");
  const [category, setCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [project, setProject] = useState("default");

  const loadEntries = useCallback(async () => {
    try {
      setEntries(await glossaryApi.list(project));
    } catch {}
  }, [project]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTerm.trim() || !targetTerm.trim()) return;
    setAdding(true);
    try {
      await glossaryApi.create({ source_term: sourceTerm, target_term: targetTerm, category: category || undefined, project });
      setSourceTerm("");
      setTargetTerm("");
      setCategory("");
      loadEntries();
    } catch (err) {
      alert("Failed: " + (err instanceof Error ? err.message : "Unexpected error"));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await glossaryApi.delete(id);
      loadEntries();
    } catch {}
  };

  // Group by category
  const grouped = entries.reduce<Record<string, GlossaryItem[]>>((acc, e) => {
    const cat = e.category || "未分类";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">术语表管理</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            管理企业品牌术语、产品名称、技术词汇的标准翻译，确保翻译一致性
          </p>
        </div>
        <select
          value={project}
          onChange={(e) => setProject(e.target.value)}
          className="text-sm rounded-lg px-3 py-1.5 border"
          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          <option value="default">默认项目</option>
          <option value="product">产品文档</option>
          <option value="brand">品牌材料</option>
          <option value="compliance">合规文档</option>
          <option value="legal">法务文件</option>
        </select>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="card">
        <h3 className="font-semibold mb-3">添加术语</h3>
        <div className="grid grid-cols-3 gap-3">
          <input
            className="input"
            placeholder="源术语 (中文)"
            value={sourceTerm}
            onChange={(e) => setSourceTerm(e.target.value)}
          />
          <input
            className="input"
            placeholder="目标翻译 (English)"
            value={targetTerm}
            onChange={(e) => setTargetTerm(e.target.value)}
          />
          <input
            className="input"
            placeholder="分类 (可选)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <button type="submit" disabled={adding} className="btn-primary text-sm mt-3">
          {adding ? "添加中..." : "添加术语"}
        </button>
      </form>

      {/* Glossary list grouped by category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-12" style={{ color: "var(--text-muted)" }}>
          <p className="text-lg font-medium mb-1">Glossary is empty</p>
          <p>术语表为空</p>
          <p className="text-sm mt-1">添加企业专属术语确保品牌翻译一致性</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="card">
            <h3 className="font-semibold mb-3 text-sm" style={{ color: "var(--accent)" }}>{cat}</h3>
            <div className="space-y-1.5">
              {items.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{e.source_term}</span>
                    <span style={{ color: "var(--text-muted)" }}>→</span>
                    <span style={{ color: "var(--accent)" }}>{e.target_term}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-xs opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                    style={{ color: "var(--text-muted)" }}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
