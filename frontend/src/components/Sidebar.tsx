"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/",
    label: "仪表盘",
    sub: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="6" height="6" rx="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/upload",
    label: "文档管理",
    sub: "Documents",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V6L9 1z" />
        <path d="M9 1v5h5" />
      </svg>
    ),
  },
  {
    href: "/kb",
    label: "知识库",
    sub: "Knowledge Base",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h12M2 8h12M2 13h7" />
        <circle cx="13" cy="13" r="2" />
        <path d="M13 11V9" />
      </svg>
    ),
  },
  {
    href: "/qa",
    label: "智能问答",
    sub: "Q&A",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 10.5a1 1 0 01-1 1H4l-3 3V2a1 1 0 011-1h11a1 1 0 011 1v8.5z" />
      </svg>
    ),
  },
  {
    href: "/glossary",
    label: "术语表",
    sub: "Glossary",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2H2v12h12V8M6 2l8 0M6 2v6h8" />
        <path d="M5 10h6M5 13h4" />
      </svg>
    ),
  },
  {
    href: "/obsidian",
    label: "知识导入",
    sub: "Import",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1L4 5h2.5v6h3V5H12L8 1z" />
        <path d="M2 13h12" />
      </svg>
    ),
  },
  {
    href: "/graph",
    label: "图谱探索",
    sub: "Graph",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="2" />
        <circle cx="2.5" cy="4" r="1.5" />
        <circle cx="13.5" cy="4" r="1.5" />
        <circle cx="2.5" cy="12" r="1.5" />
        <circle cx="13.5" cy="12" r="1.5" />
        <path d="M4 4.5L6 7M10 7l2-2.5M4 11.5L6 9M10 9l2 2.5" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-56 flex flex-col z-40"
      style={{
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid var(--border-light)" }}>
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--primary)", color: "oklch(99% 0.004 175)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1L2 4v6l5 3 5-3V4L7 1z" />
              <path d="M7 1v12M2 4l5 3 5-3" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight" style={{ color: "var(--text)" }}>
              DocTransAgent
            </div>
            <div className="text-xs leading-tight" style={{ color: "var(--text-faint)" }}>
              文档智能平台
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
              style={{
                background: isActive ? "var(--primary-subtle)" : "transparent",
                color: isActive ? "var(--primary)" : "var(--text-muted)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                }
              }}
            >
              <span className="flex-shrink-0" style={{ opacity: isActive ? 1 : 0.7 }}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <span
                  className="ml-auto text-xs"
                  style={{ color: "var(--primary)", opacity: 0.6, fontFamily: "var(--font-mono)", fontSize: "10px" }}
                >
                  {item.sub}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4" style={{ borderTop: "1px solid var(--border-light)" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-faint)" }}>
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: "var(--success)" }}
          />
          系统运行正常
        </div>
      </div>
    </aside>
  );
}
