"use client";

import { useState, useCallback } from "react";
import { qaApi } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isLoading?: boolean;
}

interface Citation {
  source_index: number;
  text: string;
  metadata: Record<string, string>;
  score: number;
}

export function useStreamingQA(sessionId = "default") {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const ask = useCallback(
    async (question: string) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: "", isLoading: true },
      ]);
      setIsStreaming(true);

      try {
        const response = await qaApi.askStream(question, sessionId);
        if (!response.ok) throw new Error("Stream request failed");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) {
                  fullContent += data.token;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      updated[updated.length - 1] = {
                        ...last,
                        content: fullContent,
                        isLoading: false,
                      };
                    }
                    return updated;
                  });
                }
                if (data.done) {
                  setIsStreaming(false);
                }
              } catch {
                // skip malformed SSE lines
              }
            }
          }
        }
      } catch (error) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              isLoading: false,
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    qaApi.clearSession(sessionId);
  }, [sessionId]);

  return { messages, isStreaming, ask, clearMessages };
}
