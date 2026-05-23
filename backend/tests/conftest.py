"""Shared fixtures for DocTransAgent backend tests."""
import os
import sys

# Ensure the backend package is importable (tests run from backend/ or project root)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from models import Base
from app import app

# In-memory SQLite with StaticPool — single shared connection avoids teardown races
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def _setup_teardown_db():
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def test_db():
    """Direct DB session for setting up test data."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture
def test_client():
    """FastAPI TestClient with DB dependency overridden to use in-memory SQLite."""
    from database import get_db

    def override_get_db():
        db = TestSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def sample_document(test_db):
    """Create a sample Document row with status=PARSED."""
    from models import Document, DocStatus

    doc = Document(
        id="sample-doc-001",
        filename="sample001.txt",
        original_filename="sample.txt",
        file_type="txt",
        file_size=512,
        source_lang="zh",
        target_lang="en",
        status=DocStatus.PARSED,
        sections=[{"heading": "Introduction", "content": "This is a test document.", "level": 1}],
        word_count=100,
    )
    test_db.add(doc)
    test_db.commit()
    test_db.refresh(doc)
    return doc
