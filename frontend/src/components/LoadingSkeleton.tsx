export function CardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-5 w-1/3 rounded mb-3" style={{ background: "var(--bg-input)" }} />
      <div className="space-y-2">
        <div className="h-3 rounded w-full" style={{ background: "var(--bg-input)" }} />
        <div className="h-3 rounded w-5/6" style={{ background: "var(--bg-input)" }} />
        <div className="h-3 rounded w-4/6" style={{ background: "var(--bg-input)" }} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card animate-pulse">
      <div className="h-8 rounded mb-4" style={{ background: "var(--bg-input)" }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="h-4 rounded flex-1" style={{ background: "var(--bg-input)" }} />
          <div className="h-4 rounded w-16" style={{ background: "var(--bg-input)" }} />
          <div className="h-4 rounded w-20" style={{ background: "var(--bg-input)" }} />
          <div className="h-4 rounded w-24" style={{ background: "var(--bg-input)" }} />
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  // Pre-computed widths to keep render pure (no Math.random)
  const items: { isUser: boolean; width: number }[] = [
    { isUser: true, width: 58 },
    { isUser: false, width: 64 },
    { isUser: true, width: 47 },
  ];
  return (
    <div className="space-y-4 animate-pulse">
      {items.map(({ isUser, width }, i) => (
        <div key={i} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
          <div
            className="rounded-2xl px-4 py-3"
            style={{
              width: `${width}%`,
              background: isUser ? "var(--primary)" : "var(--bg-card)",
            }}
          >
            <div className="h-3 rounded w-full mb-1.5" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="h-3 rounded w-3/4" style={{ background: "rgba(255,255,255,0.1)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-48 rounded mb-2" style={{ background: "var(--bg-input)" }} />
        <div className="h-4 w-72 rounded" style={{ background: "var(--bg-input)" }} />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card">
            <div className="h-8 w-8 rounded mb-2" style={{ background: "var(--bg-input)" }} />
            <div className="h-6 w-16 rounded mb-1" style={{ background: "var(--bg-input)" }} />
            <div className="h-3 w-20 rounded" style={{ background: "var(--bg-input)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
