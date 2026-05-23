"""Tests for document CRUD endpoints."""
from io import BytesIO

from models import Document, DocStatus


class TestUploadDocument:
    def test_upload_document(self, test_client):
        content = b"Hello, this is a test document for upload."
        files = {"file": ("test_upload.txt", BytesIO(content), "text/plain")}
        resp = test_client.post("/api/documents/upload", files=files)
        assert resp.status_code == 200
        data = resp.json()
        assert data["filename"] == "test_upload.txt"
        assert data["status"] == "uploaded"
        assert "id" in data

        # Verify doc appears in list
        list_resp = test_client.get("/api/documents")
        assert list_resp.status_code == 200
        docs = list_resp.json()
        assert any(d["id"] == data["id"] for d in docs)

    def test_upload_invalid_type(self, test_client):
        content = b"fake executable content"
        files = {"file": ("malware.exe", BytesIO(content), "application/octet-stream")}
        resp = test_client.post("/api/documents/upload", files=files)
        assert resp.status_code == 400


class TestListDocuments:
    def test_list_documents(self, test_db, test_client):
        # Create 2 documents directly in the DB
        for i in range(2):
            doc = Document(
                filename=f"doc{i}.txt",
                original_filename=f"test_doc_{i}.txt",
                file_type="txt",
                source_lang="zh",
                target_lang="en",
                status=DocStatus.UPLOADED,
            )
            test_db.add(doc)
        test_db.commit()

        resp = test_client.get("/api/documents")
        assert resp.status_code == 200
        docs = resp.json()
        assert len(docs) == 2

    def test_list_empty(self, test_client):
        resp = test_client.get("/api/documents")
        assert resp.status_code == 200
        assert resp.json() == []


class TestGetDocument:
    def test_get_document(self, sample_document, test_client):
        resp = test_client.get(f"/api/documents/{sample_document.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == sample_document.id
        assert data["filename"] == sample_document.original_filename
        assert data["status"] == "parsed"
        assert data["sections"] == sample_document.sections

    def test_get_nonexistent_document(self, test_client):
        resp = test_client.get("/api/documents/nonexistent-id")
        assert resp.status_code == 404


class TestDeleteDocument:
    def test_delete_document(self, sample_document, test_client):
        resp = test_client.delete(f"/api/documents/{sample_document.id}")
        assert resp.status_code == 200
        assert resp.json() == {"deleted": sample_document.id}

        # Verify it is gone from list
        list_resp = test_client.get("/api/documents")
        docs = list_resp.json()
        assert all(d["id"] != sample_document.id for d in docs)

    def test_delete_nonexistent_document(self, test_client):
        resp = test_client.delete("/api/documents/nonexistent-id")
        assert resp.status_code == 404
