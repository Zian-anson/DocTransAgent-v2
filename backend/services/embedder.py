"""
Embedding pipeline — text to vectors via GMI Cloud Qwen3-Embedding-8B.
Supports multilingual cross-lingual alignment.
"""
from typing import Optional, List
import logging
from gmi_client import gmi
from services.chunker import chunk_for_embedding

logger = logging.getLogger(__name__)


async def embed_document(text: str, metadata: Optional[dict] = None) -> List[dict]:
    """Chunk a document and generate embeddings for each chunk."""
    chunks = chunk_for_embedding(text)
    if not chunks:
        return []

    vectors = await gmi.embed(chunks)

    results = []
    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        results.append({
            "chunk_id": f"{metadata.get('doc_id', 'unknown')}_chunk_{i}",
            "text": chunk,
            "embedding": vector,
            "metadata": {
                **(metadata or {}),
                "chunk_index": i,
                "total_chunks": len(chunks),
            },
        })
    return results


async def embed_query(query: str) -> List[float]:
    """Generate embedding for a search query."""
    return await gmi.embed_single(query)
