"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { translationApi } from "@/lib/api";

interface TranslationProgress {
  total: number;
  completed: number;
  failed: number;
  status: string;
}

export function useTranslationProgress(docId: string | null) {
  const [progress, setProgress] = useState<TranslationProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    if (!docId) return;
    setIsRunning(true);

    const poll = async () => {
      try {
        const data = await translationApi.progress(docId);
        if (data.progress) {
          setProgress(data.progress);
        }
        if (data.status === "translated" || data.status === "error" || data.status === "indexed") {
          setIsRunning(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      } catch {
        // keep polling on error
      }
    };

    poll(); // immediate first call
    timerRef.current = setInterval(poll, 1000);
  }, [docId]);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { progress, isRunning, startPolling, stopPolling };
}
