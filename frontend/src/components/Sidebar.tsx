"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", labelZh: "仪表盘" },
  { href: "/upload", label: "Documents", labelZh: "文档上传" },
  { href: "/kb", label: "Knowledge Base", labelZh: "知识库" },
  { href: "/qa", label: "Q&A", labelZh: "智能问答" },
  { href: "/glossary", label: "Glossary", labelZh: "术语表" },
  { href: "/obsidian", label: "Obsidian", labelZh: "知识导入" },
  { href: "/graph", label: "Graph", labelZh: "图谱探索" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-56 border-r flex flex-col z-40"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {/* Brand */}
      <div className="px-5 py-6 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold text-white"
            style={{ background: "var(--primary)" }}
          >
            DT
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: "var(--text)" }}>
              DocTransAgent
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              Document Intelligence
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? "font-medium" : ""
              }`}
              style={{
                background: isActive ? "var(--primary-subtle)" : "transparent",
                color: isActive ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              {item.label}
              <span className="text-xs opacity-60 ml-auto">{item.labelZh}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-4 border-t text-xs"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
          System Online
        </div>
      </div>
    </aside>
  );
}
