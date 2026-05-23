"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { qaApi, type Citation } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isLoading?: boolean;
}

export function useStreamingQA(sessionId = "default") {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight stream on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const ask = useCallback(
    async (question: string) => {
      // Cancel any previous in-flight stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: "", isLoading: true },
      ]);
      setIsStreaming(true);

      try {
        const response = await qaApi.askStream(
          question,
          sessionId,
          5,
          controller.signal
        );
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
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch {
                // skip malformed SSE lines
              }
            }
          }
        }
      } catch (error) {
        // Ignore abort errors — user initiated
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
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
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [sessionId]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    qaApi.clearSession(sessionId);
  }, [sessionId]);

  return { messages, isStreaming, ask, stop, clearMessages };
}
