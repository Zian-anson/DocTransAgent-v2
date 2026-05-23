export function ModelBadge({ model, latency, tokens }: { model: string; latency?: number; tokens?: number }) {
  return (
    <span
      className="badge"
      style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}
    >
      {model}
      {latency !== undefined && <span style={{ opacity: 0.7 }}> · {latency}ms</span>}
      {tokens !== undefined && <span style={{ opacity: 0.7 }}> · {tokens} tok</span>}
    </span>
  );
}

export function CitationCard({ source }: { source: { source_index: number; text: string; metadata: Record<string, string>; score: number } }) {
  return (
    <div
      className="rounded-xl p-3 text-sm border transition-colors cursor-pointer"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: "var(--primary)" }}>
          Source {source.source_index}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {(source.score * 100).toFixed(0)}% match
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {source.text.slice(0, 200)}...
      </p>
      {source.metadata.title && (
        <p className="text-xs mt-1 font-medium truncate">{source.metadata.title}</p>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    uploaded: { color: "var(--text-muted)", label: "已上传" },
    parsing: { color: "var(--warning)", label: "解析中" },
    parsed: { color: "var(--accent)", label: "已解析" },
    translating: { color: "var(--warning)", label: "翻译中" },
    translated: { color: "var(--accent)", label: "已翻译" },
    indexing: { color: "var(--warning)", label: "索引中" },
    indexed: { color: "var(--success)", label: "已索引" },
    error: { color: "var(--error)", label: "错误" },
  };
  const cfg = statusConfig[status] || { color: "var(--text-muted)", label: status };
  return (
    <span className="badge" style={{ background: cfg.color + "22", color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-2 py-3">
      <span className="typing-dot w-2 h-2 rounded-full" style={{ background: "var(--text-muted)" }} />
      <span className="typing-dot w-2 h-2 rounded-full" style={{ background: "var(--text-muted)" }} />
      <span className="typing-dot w-2 h-2 rounded-full" style={{ background: "var(--text-muted)" }} />
    </div>
  );
}
