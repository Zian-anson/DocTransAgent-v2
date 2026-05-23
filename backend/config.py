import os
from typing import List
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    model_config = {"protected_namespaces": (), "env_file": ".env"}

    # GMI Cloud Inference Engine
    gmi_api_key: str = "your-gmi-api-key-here"
    gmi_base_url: str = "https://api.gmi-serving.com/v1"

    # Model routing map (model names on GMI Cloud platform)
    llm_translate: str = "gemini-2.5-flash"
    llm_qa: str = "deepseek-v3"
    llm_structure: str = "glm-4"
    llm_embed: str = "qwen3-embedding-8b"

    # SiliconFlow / external embedding (OpenAI-compatible)
    embed_provider: str = ""
    embed_api_key: str = ""
    embed_base_url: str = "https://api.siliconflow.cn/v1"
    embed_model: str = "BAAI/bge-m3"

    # Chunking
    chunk_size: int = 500
    chunk_overlap: int = 50

    # Paths
    upload_dir: str = os.path.join(os.path.dirname(__file__), "static/uploads")
    chroma_dir: str = os.path.join(os.path.dirname(__file__), "data/chroma")
    db_path: str = os.path.join(os.path.dirname(__file__), "data/app.db")

    # Translation
    max_concurrent_translations: int = 5
    supported_languages: List[str] = ["en", "zh", "ja", "ko", "fr", "de", "es", "pt", "ar", "ru"]

    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

@lru_cache()
def get_settings() -> Settings:
    return Settings()
