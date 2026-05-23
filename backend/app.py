"""
DocTransAgent — Main application entry point.
Overseas document intelligent translation & knowledge base construction agent.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from database import engine
from models import Base

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
    logger.info(f"GMI Cloud endpoint: {settings.gmi_base_url}")
    logger.info(f"Translation model: {settings.llm_translate}")
    logger.info(f"QA model: {settings.llm_qa}")
    logger.info(f"Embedding model: {settings.llm_embed}")
    yield
    logger.info("Shutdown complete")


app = FastAPI(
    title="DocTransAgent",
    description="AI-powered overseas document translation & knowledge base agent. Built on GMI Cloud Inference Engine.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register routes
from routes.documents import router as documents_router
from routes.translation import router as translation_router
from routes.knowledge_base import router as kb_router
from routes.qa import router as qa_router
from routes.glossary import router as glossary_router
from routes.dashboard import router as dashboard_router
from routes.export import router as export_router
from routes.graph import router as graph_router
from routes.obsidian import router as obsidian_router

app.include_router(documents_router)
app.include_router(translation_router)
app.include_router(kb_router)
app.include_router(qa_router)
app.include_router(glossary_router)
app.include_router(dashboard_router)
app.include_router(export_router)
app.include_router(graph_router)
app.include_router(obsidian_router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "DocTransAgent",
        "models": {
            "translate": settings.llm_translate,
            "qa": settings.llm_qa,
            "structure": settings.llm_structure,
            "embed": settings.llm_embed,
        },
        "gmi_cloud": settings.gmi_base_url,
    }
