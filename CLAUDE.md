# DocTransAgent Industrial Product Harness

This file is the operating harness for agents working on DocTransAgent. It is not a chat summary. Treat it as the project-local source of truth for intent, boundaries, quality gates, and production direction.

## Mission

Build DocTransAgent into an industrial-grade multilingual documentation intelligence platform.

The product should help teams ingest, translate, structure, connect, search, and reason over operational documents across languages and knowledge systems. Hackathon demo quality is not enough. Prioritize architecture that can grow into a reliable product.

Strategic direction:

```text
Obsidian-compatible multilingual GraphRAG platform for enterprise documentation intelligence.
```

Chinese positioning:

```text
面向企业文档资产的多语言 GraphRAG 知识中枢，兼容 Obsidian 工作流。
```

## Correct Repository

Work only in:

```bash
/Users/zhanghao/黑客松/DocTransAgent-v2
```

Do not use:

```bash
/Users/zhanghao/DocTransAgent-v2
```

That older sibling directory caused stale service/database confusion before.

## Current System

Backend:

- FastAPI
- SQLite
- SQLAlchemy
- ChromaDB
- GMI Serving API
- Local embedding fallback

Frontend:

- Next.js 16
- React
- TypeScript

Core features already present:

- Document upload
- Parsing
- Translation
- Bilingual review
- Export
- Knowledge-base indexing
- QA
- Glossary
- Dashboard

## Runtime Commands

Backend:

```bash
cd /Users/zhanghao/黑客松/DocTransAgent-v2/backend
python3 -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd /Users/zhanghao/黑客松/DocTransAgent-v2/frontend
npm run dev
```

App:

```text
http://localhost:3000
```

Health:

```text
http://localhost:3000/api/health
```

## Current Model Reality

Configuration is in:

```text
backend/.env
```

Current routing:

```text
GMI_BASE_URL=https://api.gmi-serving.com/v1
LLM_TRANSLATE=google/gemini-3.1-flash-lite-preview
LLM_QA=deepseek-ai/DeepSeek-V4-Pro
LLM_STRUCTURE=openai/gpt-5.4-nano
LLM_EMBED=qwen3-embedding-8b
```

Important:

- GMI chat models are available.
- Current GMI `/v1/models` did not expose a working embedding model.
- `qwen3-embedding-8b` returned `No matching target server found for model qwen3-embedding-8b`.
- Local `BAAI/bge-m3` is the planned embedding fallback, but it is not fully cached.
- A prior request tried to download `pytorch_model.bin` of about 2.27GB and stalled at 0%.

Current policy:

- Translation, QA, and structure analysis use GMI.
- Embeddings use local `BAAI/bge-m3` only if already fully cached.
- Never trigger a large model download inside a user request.
- Retrieval must degrade gracefully to keyword fallback.

## Existing Critical Changes

Preserve these unless deliberately replacing them with a better production-grade design.

### `backend/gmi_client.py`

- Chat calls use `max_completion_tokens`.
- Local BGE-M3 is loaded only with `local_files_only=True`.
- Missing local BGE-M3 raises a controlled error instead of downloading during request handling.

### `backend/services/retriever.py`

- Semantic retrieval falls back to keyword retrieval when embeddings fail.
- Fallback searches `documents.parsed_content` and `documents.translated_content`.
- This prevents QA from returning 500 when embeddings are unavailable.

### `frontend/src/app/upload/page.tsx`

- Translate button is disabled immediately after start.
- Duplicate translation requests are suppressed.
- `Document is in status translating` is treated as already-running, not fatal.

### `frontend/src/hooks/useTranslationProgress.ts`

- `startPolling(targetDocId)` accepts an explicit document id.

## Product Principles

Build for:

- Reliable ingestion of heterogeneous document sources.
- Traceable transformations from original document to translated text to graph nodes to answer citations.
- Explicit model routing and graceful degradation.
- Local-first compatibility for knowledge workers.
- Enterprise extension points: auth, audit, permissions, observability, and deployment separation.
- Incremental architectural replacement, not patch accumulation.

Avoid:

- Demo-only logic hidden in production paths.
- Silent fallbacks that change answer quality without surfacing status.
- One-off parsing rules that cannot be tested.
- Mixing UI state, product state, and long-running job state.
- Large blocking work inside request/response endpoints.
- Unbounded prompt context construction.
- In-place rewrites of working flows before a compatible replacement path exists.

## Industrial Architecture Direction

Target layered architecture:

```text
Sources
  Obsidian vaults, files, PDFs, DOCX, Markdown, future connectors

Ingestion Layer
  source adapters, parsers, metadata extraction, file identity

Document Layer
  documents, versions, sections, translations, glossary terms

Knowledge Layer
  chunks, embeddings, keyword index, graph nodes, graph edges

Retrieval Layer
  lexical retrieval, semantic retrieval, graph expansion, reranking

Reasoning Layer
  prompt assembly, model routing, citations, answer generation

Product/API Layer
  FastAPI routes, job status, exports, UI workflows

Observability Layer
  usage logs, errors, model latency, retrieval diagnostics
```

Keep interfaces between layers explicit. Do not let Obsidian import logic leak into QA, translation, or frontend components.

## Refactor Strategy

Industrializing this project will require real architecture changes. Do not interpret "preserve existing flows" as "only make tiny local patches forever."

Use incremental architectural replacement:

```text
1. Build a new boundary beside the old flow.
2. Add compatibility adapters so existing product flows keep working.
3. Route one small capability through the new boundary.
4. Verify behavior and tests.
5. Migrate the next capability.
6. Remove old direct paths only after the replacement is proven.
```

Preferred pattern:

```text
strangler-fig refactor
```

Meaning:

- Create new source, ingestion, graph, and retrieval boundaries alongside the current document/QA implementation.
- Keep upload, translation, review, export, and QA usable while migration happens.
- Replace old direct calls gradually with adapters or shared services.
- Avoid "big bang" rewrites that leave the app broken for multiple turns.

Allowed:

- Creating new architectural modules when they establish a clear product boundary.
- Refactoring a flow behind a compatibility-preserving interface.
- Replacing an old module if tests/build pass and the public API behavior remains compatible.
- Adding migration-oriented models or services before every caller has moved to them.

Not allowed:

- Rewriting the whole backend or frontend in one sweep.
- Breaking existing translation to introduce GraphRAG.
- Deleting old working paths before the new path is wired, tested, and observable.
- Hiding degraded behavior from API/UI diagnostics.

When choosing between a small patch and a structural change:

- Prefer the structural change if the patch would deepen coupling or make GraphRAG harder.
- Prefer the patch if the structural change is speculative, untested, or broader than the current slice.

## Obsidian + GraphRAG Product Goal

Add Obsidian-compatible knowledge ingestion and GraphRAG retrieval as a real product capability, not a throwaway demo.

The first production-minded slice should support:

1. Importing an Obsidian vault or folder of Markdown files.
2. Parsing `[[wikilinks]]`, tags, frontmatter, headings, aliases, and note identity.
3. Persisting graph nodes and edges in SQLite through SQLAlchemy.
4. Connecting graph nodes to existing `Document` records.
5. Using graph context in QA with compact, traceable citations.
6. Exposing import status and graph statistics in the UI.
7. Degrading cleanly when embeddings are unavailable.

Do not build a full Obsidian plugin yet. The product should be Obsidian-compatible before it is Obsidian-native.

## Suggested Backend Modules

Add or evolve modules along these lines:

```text
backend/services/source_identity.py
backend/services/obsidian_importer.py
backend/services/markdown_parser.py
backend/services/graph_builder.py
backend/services/graph_retriever.py
backend/services/retrieval_diagnostics.py
backend/routes/obsidian.py
backend/routes/graph.py
```

Use the smallest set needed for the current task. Do not add empty architecture files.

## Suggested Data Model

Use SQLite/SQLAlchemy first. Design so it can later migrate to Postgres or a graph database.

Candidate entities:

```text
GraphNode
  id
  type
  stable_key
  label
  doc_id
  metadata
  created_at
  updated_at

GraphEdge
  id
  source_id
  target_id
  relation
  weight
  metadata
  created_at

SourceImport
  id
  source_type
  source_path
  status
  imported_count
  error_message
  created_at
  completed_at
```

Suggested node types:

```text
note
document
section
heading
tag
alias
wikilink_target
term
```

Suggested edge relations:

```text
contains
links_to
tagged_with
has_heading
alias_of
mentions
derived_from
translated_to
```

Important data rules:

- Use stable keys for idempotent re-imports.
- Avoid duplicate graph nodes for the same note/tag/link target.
- Store metadata as structured JSON.
- Keep raw imported text connected to source documents.
- Preserve provenance: every graph node or edge should be traceable to a source file or document when possible.

## Obsidian Import Requirements

For Markdown files:

- Skip hidden/system directories: `.obsidian`, `.git`, `node_modules`, `.trash`.
- Import `.md` files only.
- Parse YAML frontmatter if present.
- Parse headings with levels.
- Parse wikilinks:
  - `[[Note]]`
  - `[[Note|Alias]]`
  - `[[Folder/Note#Heading]]`
- Parse tags:
  - inline tags like `#market-entry`
  - frontmatter tags if present
- Preserve file path relative to vault root.
- Compute a stable file identity from relative path and content hash.

Import must be idempotent:

- Re-importing the same vault should update existing records or replace source-specific graph edges.
- It must not create unbounded duplicates.

## GraphRAG Retrieval Requirements

Retrieval should be explicit and inspectable.

Suggested pipeline:

1. Lexical retrieval over documents/chunks.
2. Semantic retrieval when embeddings are available.
3. Merge and deduplicate candidates.
4. Map candidates to graph nodes.
5. Expand graph neighborhood with a bounded hop count.
6. Score or rank graph context.
7. Assemble model context with citations and provenance.

Boundaries:

- Default graph expansion should be one hop.
- Never dump the entire graph into an LLM prompt.
- Include only compact facts: note title, relation, source path, short snippet.
- Return retrieval diagnostics for development/debugging.

When embeddings are unavailable:

- Continue with lexical retrieval and graph expansion.
- Surface degraded mode in diagnostics or API response.
- Do not fail the QA route solely because embeddings are unavailable.

## API Direction

Prefer stable, product-facing endpoints:

```text
POST /api/sources/obsidian/import
GET  /api/sources/imports
GET  /api/graph/stats
GET  /api/graph/nodes
GET  /api/graph/nodes/{node_id}
GET  /api/graph/neighborhood/{node_id}
POST /api/qa/ask
POST /api/qa/ask/stream
```

Avoid overloading existing endpoints with source-specific behavior.

For import requests, accept:

```json
{
  "vault_path": "/absolute/path/to/vault",
  "source_lang": "zh",
  "target_lang": "en"
}
```

Validation:

- `vault_path` must exist.
- `vault_path` must be a directory.
- Return a clear 4xx for invalid input.
- Do not expose secrets or arbitrary filesystem contents in error messages.

## Frontend Direction

Add product-grade UI, not a toy debug page.

Suggested pages:

```text
frontend/src/app/obsidian/page.tsx
frontend/src/app/graph/page.tsx
```

Minimum Obsidian import UI:

- Vault path input.
- Import action.
- Import status.
- Imported note count.
- Tag count.
- Wikilink count.
- Graph node/edge count.
- Clear degraded-mode indicator if embeddings are unavailable.

Minimum graph UI:

- Search/filter nodes.
- Show node type, label, source path.
- Show neighboring nodes.
- Show edge relation types.

Avoid heavy graph visualization libraries unless there is a clear need. A high-quality table/list/neighborhood view is better than a fragile visual graph.

## Industrial Quality Gates

Every meaningful change should preserve:

```bash
cd /Users/zhanghao/黑客松/DocTransAgent-v2/backend
python3 -m pytest -q
```

```bash
cd /Users/zhanghao/黑客松/DocTransAgent-v2/frontend
npm run build
```

For backend feature work, add focused tests when changing:

- parsers
- import idempotency
- graph building
- retrieval behavior
- model-routing fallbacks
- API validation

For frontend feature work, at minimum ensure production build passes. Add tests only if the repo already has an established frontend test setup or the change is risky enough to justify adding one.

## Production Concerns To Respect

### Security

- Treat imported file content as untrusted.
- Do not execute imported content.
- Do not follow arbitrary links during import.
- Sanitize frontend rendering.
- Do not leak API keys.
- Be careful with absolute filesystem paths in UI and logs.

### Privacy

- Documents may contain confidential enterprise data.
- Keep provenance local unless explicitly exported.
- Avoid unnecessary external calls for local parsing/indexing.
- Clearly separate local embedding from remote LLM calls.

### Reliability

- Long-running jobs should move toward background job records.
- User requests should not block on large downloads, heavy indexing, or whole-vault processing.
- Partial failures should be recorded and visible.
- Import should be restartable or idempotent.

### Observability

Track enough to debug:

- import count
- import duration
- parse failures
- graph node/edge counts
- retrieval mode: semantic, lexical, graph, degraded
- model latency
- token usage
- answer citation sources

Do not spam logs with huge document content.

### Migration Path

Current SQLite is acceptable for local-first and early product development.

Design so these can be introduced later:

- Postgres for multi-user/server deployment
- pgvector or managed vector DB for embeddings
- Neo4j/Kuzu/Graph DB if graph operations outgrow SQLite
- background queue for imports/indexing
- authenticated multi-tenant workspace model

Do not prematurely add these systems unless the task explicitly requires them.

## Agent Workflow

Before editing:

1. Inspect relevant files.
2. Understand existing patterns.
3. Check service state only if needed.
4. State a short plan for non-trivial work.

During implementation:

- Keep edits scoped to the current architectural slice.
- Prefer existing project patterns.
- Avoid unrelated refactors, but do not avoid necessary boundary-building.
- Maintain graceful degradation.
- Preserve existing translation behavior.
- Keep graph context bounded and traceable.
- Prefer compatibility adapters over direct rewrites of active flows.
- If a change intentionally replaces part of the old architecture, document the old path, new path, and compatibility guarantee.

Before final response:

1. Run required verification gates.
2. Report what changed.
3. Report what was verified.
4. Report known limitations.
5. Mention any follow-up migrations only if they are truly relevant.

## Definition Of Done For Obsidian GraphRAG Slice

A slice is complete only if:

- It either adds a new architecture boundary or safely migrates one caller to an existing boundary.
- Existing public API behavior is preserved or intentionally versioned.
- Markdown vault import works for a real folder.
- Import is idempotent enough to run repeatedly without obvious duplication.
- Graph nodes and edges persist in SQLite.
- The UI exposes import status and graph stats.
- QA can include graph context.
- QA still works when embeddings are missing.
- Existing translation flow still works.
- Backend tests pass.
- Frontend build passes.

## Current Known Verification Baseline

Previous successful baseline:

```text
backend: 12 passed
frontend: npm run build succeeded
health: /api/health returned OK
QA: /api/qa/ask returned normally in embedding-degraded mode
translation: DocTransAgent-使用说明.pdf reached TRANSLATED
```

Use this baseline to detect regressions.
