"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "仪表盘", icon: "◈" },
  { href: "/upload", label: "文档上传", icon: "↑" },
  { href: "/kb", label: "知识库", icon: "⌕" },
  { href: "/qa", label: "智能问答", icon: "◉" },
  { href: "/glossary", label: "术语表", icon: "▤" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 border-r flex flex-col z-40"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      {/* Brand */}
      <div className="px-5 py-6 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
            DT
          </div>
          <div>
            <div className="font-semibold text-sm">DocTransAgent</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              Powered by GMI Cloud
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "font-medium"
                  : "hover:opacity-80"
              }`}
              style={{
                background: isActive ? "var(--primary)" : "transparent",
                color: isActive ? "white" : "var(--text-muted)",
              }}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
          GMI Cloud Connected
        </div>
      </div>
    </aside>
  );
}
