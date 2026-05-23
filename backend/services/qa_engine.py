"""
RAG QA Engine — retrieval-augmented generation with streaming and citations.
"""
import logging
import re
from typing import AsyncGenerator
from gmi_client import gmi
from services.retriever import search

logger = logging.getLogger(__name__)

# In-memory conversation store (per session)
_conversations: dict[str, list[dict]] = {}


async def ask(
    question: str, top_k: int = 5, session_id: str = "default"
) -> dict:
    """RAG Q&A: retrieve contexts, generate answer with citations."""
    retrieved = await search(question, top_k=top_k)
    contexts = [r["text"] for r in retrieved]

    history = _conversations.get(session_id, [])[-6:]

    result = await gmi.ask_with_context(question, contexts, history)

    citations = _extract_citations(retrieved, result["answer"])

    # Update conversation history
    if session_id not in _conversations:
        _conversations[session_id] = []
    _conversations[session_id].append({"role": "user", "content": question})
    _conversations[session_id].append({"role": "assistant", "content": result["answer"]})

    return {
        "question": question,
        "answer": result["answer"],
        "citations": citations,
        "retrieved_chunks": [
            {"text": r["text"], "metadata": r["metadata"], "score": r["score"]}
            for r in retrieved
        ],
        "model": result["model"],
        "tokens_input": result["tokens_input"],
        "tokens_output": result["tokens_output"],
        "latency_ms": result["latency_ms"],
    }


async def ask_stream(
    question: str, top_k: int = 5, session_id: str = "default"
) -> AsyncGenerator[str, None]:
    """Streaming RAG Q&A with SSE."""
    retrieved = await search(question, top_k=top_k)
    contexts = [r["text"] for r in retrieved]
    history = _conversations.get(session_id, [])[-6:]

    # Stream tokens
    async for token in gmi.ask_stream(question, contexts, history):
        yield token

    # Update history (we'd need to construct full answer - handled in the route)


def save_to_history(session_id: str, question: str, answer: str):
    """Save a Q&A pair to the in-memory conversation history."""
    if session_id not in _conversations:
        _conversations[session_id] = []
    _conversations[session_id].append({"role": "user", "content": question})
    _conversations[session_id].append({"role": "assistant", "content": answer})


def clear_session(session_id: str):
    _conversations.pop(session_id, None)


def _extract_citations(retrieved: list[dict], answer: str) -> list[dict]:
    """Parse [Source N] references from the answer and link to retrieved chunks."""
    pattern = re.compile(r"\[Source\s*(\d+)\]", re.IGNORECASE)
    cited_indices = set()
    for match in pattern.finditer(answer):
        idx = int(match.group(1)) - 1
        if 0 <= idx < len(retrieved):
            cited_indices.add(idx)

    return [
        {
            "source_index": i + 1,
            "text": retrieved[i]["text"][:300],
            "metadata": retrieved[i]["metadata"],
            "score": retrieved[i]["score"],
        }
        for i in cited_indices
    ]
