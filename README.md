# DocTransAgent

> AI-powered overseas document translation & knowledge base agent.
> Built for 头号Builder全球挑战赛 Stop 1 · 北京站.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Next.js :3000 (Public)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Upload   │ │Translate │ │ Knowledge Base   │   │
│  │ Review   │ │ Search   │ │ RAG Q&A   │ Gloss│   │
│  └────┬─────┘ └────┬─────┘ └───────┬──────────┘   │
│       │            │              │                │
│       └────────────┼──────────────┘                │
│                    │ rewrites /api/*               │
└────────────────────┼──────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────┐
│           FastAPI :8000 (Internal)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Document │ │Translation│ │ RAG Engine       │   │
│  │ Parser   │ │ Engine    │ │ (ChromaDB)       │   │
│  └──────────┘ └──────────┘ └──────────────────┘   │
│                     │                              │
│  ┌──────────────────┴──────────────────────────┐  │
│  │        GMI Cloud Inference Engine            │  │
│  │  ┌────────┐ ┌────────┐ ┌──────┐ ┌────────┐  │  │
│  │  │Gemini  │ │DeepSeek│ │GLM-4 │ │ Qwen3  │  │  │
│  │  │2.5Flash│ │  V3    │ │Parse │ │Embed   │  │  │
│  │  └────────┘ └────────┘ └──────┘ └────────┘  │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

## Features

- **Multi-format Document Parsing** — PDF, DOCX, Markdown, TXT with section hierarchy preservation
- **Glossary-Driven Translation** — Enterprise terminology consistency engine via Gemini 2.5 Flash
- **Cross-Lingual Semantic Search** — Chinese queries match English documents and vice versa (Qwen3-Embedding)
- **RAG Q&A with Citations** — Source-grounded answers via DeepSeek V3 with streaming SSE
- **Auto Glossary Extraction** — LLM-powered domain term discovery (GLM-4)
- **ROI Dashboard** — Real-time cost savings vs human translation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM Gateway | GMI Cloud Inference Engine (4-model routing) |
| Backend | Python 3.10 + FastAPI |
| Vector DB | ChromaDB (embedded) |
| Metadata | SQLite |
| Frontend | Next.js 16 + React 19 + Tailwind CSS |
| Translation | Gemini 2.5 Flash via GMI Cloud |
| QA | DeepSeek V3 via GMI Cloud |
| Structure | GLM-4 via GMI Cloud |
| Embedding | Qwen3-Embedding-8B via GMI Cloud |

## Quick Start

```bash
# 1. Configure
cp backend/.env.example backend/.env
# Edit backend/.env with your GMI_API_KEY

# 2. Test GMI Cloud connection
python scripts/test_gmi_connection.py

# 3. Seed demo data
python scripts/seed_demo_data.py

# 4. Launch everything
./run.sh
```

Open http://localhost:3000 for the app, http://localhost:8000/docs for API docs.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/documents/upload` | Upload document |
| GET | `/api/documents` | List documents |
| POST | `/api/translate/{id}` | Start translation |
| GET | `/api/translate/{id}/progress` | Translation progress |
| POST | `/api/kb/index/{id}` | Index into knowledge base |
| GET | `/api/kb/search?q=...` | Cross-lingual search |
| POST | `/api/qa/ask` | RAG question answering |
| POST | `/api/qa/ask/stream` | Streaming RAG Q&A |
| GET/POST | `/api/glossary` | Glossary management |
| POST | `/api/glossary/auto-extract` | Auto-extract terms |
| GET | `/api/dashboard/stats` | Dashboard statistics |

## Project Structure

```
backend/          FastAPI (20 .py files)
  routes/         6 API route modules
  services/       7 business logic modules
  test_docs/      3 demo documents (Chinese)
frontend/         Next.js 16 (12 .ts/.tsx files)
  components/     Sidebar, GMIStatusBar, Badges
  hooks/          useStreamingQA, useTranslationProgress
  app/            6 pages (Dashboard, Upload, Translate, KB, QA, Glossary)
scripts/          seed_demo_data.py, test_gmi_connection.py
PITCH.md          Demo script + judge-specific talking points
```
