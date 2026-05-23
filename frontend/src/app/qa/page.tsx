"use client";

import { useState, useRef, useEffect } from "react";
import { useStreamingQA } from "@/hooks/useStreamingQA";

export default function QAPage() {
  const { messages, isStreaming, ask, clearMessages } = useStreamingQA("demo");
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const question = input;
    setInput("");
    await ask(question);
  };

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Q&A</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            RAG-based Q&A with citation sources. Cross-lingual support.
          </p>
        </div>
        <button onClick={clearMessages} className="btn-secondary text-xs" disabled={messages.length === 0}>
          清空对话
        </button>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center pt-20" style={{ color: "var(--text-muted)" }}>
            <p className="font-medium text-lg mb-2">RAG Q&A</p>
            <p className="text-sm mt-1">向你的知识库提问，获取带源引用的精准答案</p>
            <div className="flex flex-wrap gap-2 justify-center mt-6 text-xs">
              {[
                "产品需要哪些欧盟认证？",
                "What certifications do we need?",
                "技术规格中提到的安全标准是什么？",
              ].map((sample) => (
                <button
                  key={sample}
                  onClick={() => {
                    setInput(sample);
                    setTimeout(() => {
                      const form = document.getElementById("qa-form") as HTMLFormElement;
                      form?.requestSubmit();
                    }, 100);
                  }}
                  disabled={isStreaming}
                  className="rounded-full px-3 py-1.5 border transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div
                className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-medium mt-0.5 text-white"
                style={{ background: "var(--primary)" }}
              >
                A
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "rounded-br-md"
                  : "rounded-bl-md"
              }`}
              style={{
                background: msg.role === "user" ? "var(--primary)" : "var(--bg-card)",
                border: msg.role === "user" ? "none" : "1px solid var(--border)",
              }}
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
                {msg.isLoading && (
                  <span className="inline-flex ml-1">
                    <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--text-muted)" }} />
                    <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block ml-0.5" style={{ background: "var(--text-muted)" }} />
                    <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block ml-0.5" style={{ background: "var(--text-muted)" }} />
                  </span>
                )}
              </div>
            </div>
            {msg.role === "user" && (
              <div
                className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                style={{ background: "var(--bg-input)" }}
              >
                U
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <form id="qa-form" onSubmit={handleSubmit} className="flex gap-3">
        <input
          className="input flex-1"
          placeholder="向知识库提问... (支持中英文)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming || !input.trim()} className="btn-primary">
          {isStreaming ? "回复中..." : "发送"}
        </button>
      </form>
    </div>
  );
}
