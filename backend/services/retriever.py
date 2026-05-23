"""
Hybrid retriever — semantic search over ChromaDB with cross-lingual support.
"""
from typing import Optional, List
import logging
import re
from database import SessionLocal, get_chroma_collection
from models import Document
from services.embedder import embed_query

logger = logging.getLogger(__name__)


async def search(query: str, top_k: int = 10, lang_filter: Optional[str] = None) -> List[dict]:
    """Cross-lingual semantic search. Query in any language, find docs in any language."""
    collection = get_chroma_collection()
    try:
        query_vec = await embed_query(query)
    except Exception as e:
        logger.warning("Semantic search unavailable, using keyword fallback: %s", e)
        return _keyword_search(query, top_k=top_k, lang_filter=lang_filter)

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

    # If semantic search returned nothing, try keyword fallback
    if not items:
        logger.info("Semantic search returned 0 results, trying keyword fallback")
        return _keyword_search(query, top_k=top_k, lang_filter=lang_filter)

    return items


def _tokenize_cjk(text: str) -> list[str]:
    """Tokenize for CJK fuzzy matching: unigrams + bigrams + full text.
    "\u6570\u5b57\u4eba\u5927\u8d5b" matches even when query is "\u6570\u5b57\u4eba\u6bd4\u8d5b".
    """
    tokens = []
    cjk_run = "".join(ch for ch in text if "\u4e00" <= ch <= "\u9fff")
    # Unigrams (single chars) for maximum recall
    if len(cjk_run) >= 1:
        tokens.extend(ch for ch in cjk_run)
    # Bigrams for precision
    if len(cjk_run) >= 2:
        for i in range(len(cjk_run) - 1):
            tokens.append(cjk_run[i:i+2])
    tokens.append(cjk_run)  # full phrase for exact match boost
    tokens.extend(re.findall(r"[\w\u4e00-\u9fff]+", text))
    # Filter: keep single CJK chars + multi-char tokens
    return [t.lower() for t in tokens if len(t) >= 1]


def _keyword_search(query: str, top_k: int = 10, lang_filter: Optional[str] = None) -> List[dict]:
    """Keyword fallback retriever. Uses bigram tokenization for CJK fuzzy matching."""
    terms = _tokenize_cjk(query)
    db = SessionLocal()
    try:
        docs_query = db.query(Document)
        if lang_filter:
            docs_query = docs_query.filter(Document.source_lang == lang_filter)

        items = []
        for doc in docs_query.all():
            # Search BOTH parsed and translated content for cross-lingual matching
            texts_to_search = []
            if doc.parsed_content:
                texts_to_search.append(("parsed", doc.parsed_content))
            if doc.translated_content:
                texts_to_search.append(("translated", doc.translated_content))

            for source, text in texts_to_search:
                chunks = _split_text(text)
                for idx, chunk in enumerate(chunks):
                    lowered = chunk.lower()
                    score = sum(lowered.count(term) for term in terms)
                    if score == 0 and not terms:
                        score = 1
                    if score > 0:
                        items.append({
                            "chunk_id": f"{doc.id}:keyword:{source}:{idx}",
                            "text": chunk,
                            "metadata": {
                                "doc_id": doc.id,
                                "filename": doc.original_filename,
                                "source": source,
                                "retrieval": "keyword_fallback",
                            },
                            "score": float(score),
                        })

        items.sort(key=lambda item: item["score"], reverse=True)
        return items[:top_k]
    finally:
        db.close()


def _split_text(text: str, max_chars: int = 900) -> List[str]:
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    chunks = []
    current = ""
    for paragraph in paragraphs:
        if len(current) + len(paragraph) + 2 <= max_chars:
            current = f"{current}\n\n{paragraph}".strip()
        else:
            if current:
                chunks.append(current)
            current = paragraph[:max_chars]
    if current:
        chunks.append(current)
    return chunks


async def index_chunks(chunks: List[dict], collection_name: str = "knowledge_base") -> int:
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
