import chromadb
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from config import get_settings

settings = get_settings()

# SQLAlchemy
engine = create_engine(f"sqlite:///{settings.db_path}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# ChromaDB
chroma_client = chromadb.PersistentClient(path=settings.chroma_dir)


def get_chroma_collection(name: str = "knowledge_base"):
    """Get or create a ChromaDB collection."""
    return chroma_client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
