/**
 * API client — centralized HTTP layer for backend communication.
 * Modular design: each domain has its own sub-module exported here.
 */

// Use relative URL — Next.js rewrites proxy /api/* to the Python backend
const BASE_URL = "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    let message = `Request failed: ${res.status}`;
    const detail = body.detail;
    if (typeof detail === "string") message = detail;
    else if (Array.isArray(detail)) message = detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
    throw new Error(message);
  }
  return res.json();
}

// ── Documents ──────────────────────────────────────────
export const documentsApi = {
  upload: async (file: File, sourceLang = "zh", targetLang = "en") => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `${BASE_URL}/api/documents/upload?source_lang=${sourceLang}&target_lang=${targetLang}`,
      { method: "POST", body: form }
    );
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },
  list: () => request<any[]>("/api/documents"),
  get: (id: string) => request<any>(`/api/documents/${id}`),
  delete: (id: string) => request<any>(`/api/documents/${id}`, { method: "DELETE" }),
};

// ── Translation ────────────────────────────────────────
export const translationApi = {
  start: (docId: string) =>
    request<any>(`/api/translate/${docId}`, { method: "POST" }),
  progress: (docId: string) => request<any>(`/api/translate/${docId}/progress`),
};

// ── Knowledge Base ─────────────────────────────────────
export const kbApi = {
  index: (docId: string) =>
    request<any>(`/api/kb/index/${docId}`, { method: "POST" }),
  search: (q: string, topK = 10) =>
    request<any>(`/api/kb/search?q=${encodeURIComponent(q)}&top_k=${topK}`),
  stats: () => request<any>("/api/kb/stats"),
  deindex: (docId: string) =>
    request<any>(`/api/kb/index/${docId}`, { method: "DELETE" }),
};

// ── Q&A ────────────────────────────────────────────────
export const qaApi = {
  ask: (question: string, sessionId = "default", topK = 5) =>
    request<any>("/api/qa/ask", {
      method: "POST",
      body: JSON.stringify({ question, session_id: sessionId, top_k: topK }),
    }),
  askStream: (question: string, sessionId = "default", topK = 5) => {
    const params = new URLSearchParams({ q: question, session_id: sessionId, top_k: String(topK) });
    // Use POST for streaming via fetch with SSE reader
    return fetch(`${BASE_URL}/api/qa/ask/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, session_id: sessionId, top_k: topK }),
    });
  },
  clearSession: (sessionId: string) =>
    request<any>(`/api/qa/session/${sessionId}`, { method: "DELETE" }),
};

// ── Glossary ───────────────────────────────────────────
export const glossaryApi = {
  list: (project = "default") => request<any[]>(`/api/glossary?project=${project}`),
  create: (data: { source_term: string; target_term: string; category?: string }) =>
    request<any>("/api/glossary", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<any>(`/api/glossary/${id}`, { method: "DELETE" }),
  autoExtract: (text: string) =>
    request<any>("/api/glossary/auto-extract", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
};

// ── Dashboard ──────────────────────────────────────────
export const dashboardApi = {
  stats: () => request<any>("/api/dashboard/stats"),
};
