/**
 * API client — centralized HTTP layer for backend communication.
 * Modular design: each domain has its own sub-module exported here.
 */

// Use relative URL — Next.js rewrites proxy /api/* to the Python backend
const BASE_URL = "";

// ── Shared types ───────────────────────────────────────
export interface DocumentSummary {
  id: string;
  filename: string;
  file_type: string;
  source_lang: string;
  target_lang: string;
  status: string;
  word_count?: number;
  created_at: string;
}

export interface DocumentDetail extends DocumentSummary {
  sections?: Section[];
  translated_sections?: Section[];
  chunk_count?: number;
}

export interface Section {
  heading: string;
  level: number;
  content: string;
}

export interface TranslationProgress {
  total: number;
  completed: number;
  failed: number;
  status: string;
}

export interface TranslationProgressResponse {
  doc_id: string;
  status: string;
  progress: TranslationProgress | null;
}

export interface SearchResult {
  chunk_id: string;
  text: string;
  metadata: Record<string, string>;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  count: number;
}

export interface KBStats {
  total_chunks: number;
  collection_name: string;
  indexed_documents: number;
  total_words: number;
}

export interface Citation {
  source_index: number;
  text: string;
  metadata: Record<string, string>;
  score: number;
}

export interface QAResponse {
  question: string;
  answer: string;
  citations: Citation[];
  retrieved_chunks: SearchResult[];
  model: string;
  tokens_input: number;
  tokens_output: number;
  latency_ms: number;
}

export interface GlossaryEntry {
  id: string;
  source_term: string;
  target_term: string;
  category: string | null;
  project: string;
}

export interface GlossaryCreate {
  source_term: string;
  target_term: string;
  category?: string;
}

export interface AutoExtractedTerm {
  source: string;
  target: string;
  category?: string;
}

export interface DashboardStats {
  documents: {
    total: number;
    translated: number;
    indexed: number;
    total_words: number;
  };
  glossary: {
    total_terms: number;
  };
  usage: {
    total_tokens: number;
    translation_tokens: number;
    embedding_tokens: number;
    total_estimated_cost_usd: number;
  };
  roi: {
    ai_translation_cost_usd: number;
    human_translation_estimate_usd: number;
    savings_usd: number;
  };
}

// ── HTTP core ──────────────────────────────────────────
interface ErrorDetail {
  msg?: string;
  [key: string]: unknown;
}

interface ErrorBody {
  detail?: string | ErrorDetail[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body: ErrorBody = await res.json().catch(() => ({}));
    let message = `Request failed: ${res.status}`;
    const detail = body.detail;
    if (typeof detail === "string") message = detail;
    else if (Array.isArray(detail))
      message = detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ── Documents ──────────────────────────────────────────
export const documentsApi = {
  upload: async (
    file: File,
    sourceLang = "zh",
    targetLang = "en"
  ): Promise<DocumentSummary> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `${BASE_URL}/api/documents/upload?source_lang=${sourceLang}&target_lang=${targetLang}`,
      { method: "POST", body: form }
    );
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },
  list: () => request<DocumentSummary[]>("/api/documents"),
  get: (id: string) => request<DocumentDetail>(`/api/documents/${id}`),
  delete: (id: string) =>
    request<{ deleted: string }>(`/api/documents/${id}`, { method: "DELETE" }),
};

// ── Translation ────────────────────────────────────────
export const translationApi = {
  start: (docId: string) =>
    request<{ doc_id: string; status: string }>(`/api/translate/${docId}`, {
      method: "POST",
    }),
  progress: (docId: string) =>
    request<TranslationProgressResponse>(`/api/translate/${docId}/progress`),
};

// ── Knowledge Base ─────────────────────────────────────
export const kbApi = {
  index: (docId: string) =>
    request<{ doc_id: string; status: string }>(`/api/kb/index/${docId}`, {
      method: "POST",
    }),
  search: (q: string, topK = 10) =>
    request<SearchResponse>(
      `/api/kb/search?q=${encodeURIComponent(q)}&top_k=${topK}`
    ),
  stats: () => request<KBStats>("/api/kb/stats"),
  deindex: (docId: string) =>
    request<{ deleted_chunks: number }>(`/api/kb/index/${docId}`, {
      method: "DELETE",
    }),
};

// ── Q&A ────────────────────────────────────────────────
export const qaApi = {
  ask: (question: string, sessionId = "default", topK = 5) =>
    request<QAResponse>("/api/qa/ask", {
      method: "POST",
      body: JSON.stringify({ question, session_id: sessionId, top_k: topK }),
    }),
  askStream: (
    question: string,
    sessionId = "default",
    topK = 5,
    signal?: AbortSignal
  ) => {
    return fetch(`${BASE_URL}/api/qa/ask/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, session_id: sessionId, top_k: topK }),
      signal,
    });
  },
  clearSession: (sessionId: string) =>
    request<{ cleared: string }>(`/api/qa/session/${sessionId}`, {
      method: "DELETE",
    }),
};

// ── Glossary ───────────────────────────────────────────
export const glossaryApi = {
  list: (project = "default") =>
    request<GlossaryEntry[]>(`/api/glossary?project=${project}`),
  create: (data: GlossaryCreate) =>
    request<GlossaryEntry>("/api/glossary", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ deleted: string }>(`/api/glossary/${id}`, { method: "DELETE" }),
  autoExtract: (text: string) =>
    request<{ terms: AutoExtractedTerm[]; count: number }>(
      "/api/glossary/auto-extract",
      {
        method: "POST",
        body: JSON.stringify({ text }),
      }
    ),
};

// ── Dashboard ──────────────────────────────────────────
export const dashboardApi = {
  stats: () => request<DashboardStats>("/api/dashboard/stats"),
};
