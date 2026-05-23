"""Q&A routes — ask questions, streaming responses."""
import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.qa_engine import ask, ask_stream, clear_session, save_to_history

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/qa", tags=["qa"])


class QuestionRequest(BaseModel):
    question: str
    top_k: int = 5
    session_id: str = "default"


class QuestionResponse(BaseModel):
    question: str
    answer: str
    citations: list[dict]
    retrieved_chunks: list[dict]
    model: str
    tokens_input: int
    tokens_output: int
    latency_ms: float


@router.post("/ask", response_model=QuestionResponse)
async def ask_question(req: QuestionRequest):
    """Ask a question and get an answer with citations."""
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty")

    result = await ask(req.question, top_k=req.top_k, session_id=req.session_id)
    return result


@router.post("/ask/stream")
async def ask_question_stream(req: QuestionRequest):
    """Ask a question and get a streaming answer (SSE)."""
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty")

    async def event_stream():
        full_answer_parts: list[str] = []
        try:
            async for token in ask_stream(req.question, top_k=req.top_k, session_id=req.session_id):
                full_answer_parts.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"
            full_answer = "".join(full_answer_parts)
            save_to_history(req.session_id, req.question, full_answer)
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.delete("/session/{session_id}")
async def clear_qa_session(session_id: str):
    clear_session(session_id)
    return {"cleared": session_id}
