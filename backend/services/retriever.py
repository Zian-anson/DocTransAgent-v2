"""
Hybrid retriever — semantic search over ChromaDB with cross-lingual support.
"""
import logging
from database import get_chroma_collection
from services.embedder import embed_query

logger = logging.getLogger(__name__)


async def search(query: str, top_k: int = 10, lang_filter: str | None = None) -> list[dict]:
    """Cross-lingual semantic search. Query in any language, find docs in any language."""
    collection = get_chroma_collection()
    query_vec = await embed_query(query)

    where_filter = None
    if lang_filter:
        where_filter = {"lang": lang_filter}

    results = collection.query(
        query_embeddings=[query_vec],
        n_results=top_k,
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )

    items = []
    if results["ids"] and results["ids"][0]:
        for i, chunk_id in enumerate(results["ids"][0]):
            items.append({
                "chunk_id": chunk_id,
                "text": results["documents"][0][i] if results["documents"] else "",
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "score": 1 - results["distances"][0][i] if results["distances"] else 0,
            })
    return items


async def index_chunks(chunks: list[dict], collection_name: str = "knowledge_base") -> int:
    """Index embedded chunks into ChromaDB."""
    collection = get_chroma_collection(collection_name)

    ids = [c["chunk_id"] for c in chunks]
    embeddings = [c["embedding"] for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [c["metadata"] for c in chunks]

    collection.add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
    return len(chunks)


async def delete_document_chunks(doc_id: str, collection_name: str = "knowledge_base") -> int:
    """Remove all chunks belonging to a document from the index."""
    collection = get_chroma_collection(collection_name)
    results = collection.get(where={"doc_id": doc_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])
        return len(results["ids"])
    return 0


async def get_index_stats(collection_name: str = "knowledge_base") -> dict:
    """Get statistics about the vector index."""
    collection = get_chroma_collection(collection_name)
    return {
        "total_chunks": collection.count(),
        "collection_name": collection_name,
    }
