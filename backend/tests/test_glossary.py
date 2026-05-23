"""Tests for glossary CRUD endpoints."""


class TestCreateEntry:
    def test_create_entry(self, test_client):
        payload = {
            "source_term": "智能芯片",
            "target_term": "AI Chip",
            "source_lang": "zh",
            "target_lang": "en",
            "project": "default",
            "category": "硬件",
        }
        resp = test_client.post("/api/glossary", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["source_term"] == "智能芯片"
        assert data["target_term"] == "AI Chip"
        assert "id" in data

        # Verify entry appears in list
        list_resp = test_client.get("/api/glossary", params={"project": "default"})
        assert list_resp.status_code == 200
        entries = list_resp.json()
        assert any(e["id"] == data["id"] for e in entries)


class TestListEntries:
    def test_list_entries(self, test_client):
        # Create multiple entries
        entries_data = [
            {"source_term": "term_a", "target_term": "Term A", "category": "tech"},
            {"source_term": "term_b", "target_term": "Term B", "category": "brand"},
            {"source_term": "term_c", "target_term": "Term C", "category": "legal"},
        ]
        for e in entries_data:
            resp = test_client.post("/api/glossary", json=e)
            assert resp.status_code == 200

        list_resp = test_client.get("/api/glossary", params={"project": "default"})
        assert list_resp.status_code == 200
        entries = list_resp.json()
        assert len(entries) == 3


class TestDeleteEntry:
    def test_delete_entry(self, test_client):
        # Create an entry
        create_resp = test_client.post(
            "/api/glossary",
            json={"source_term": "待删除", "target_term": "To Delete"},
        )
        assert create_resp.status_code == 200
        entry_id = create_resp.json()["id"]

        # Delete it
        del_resp = test_client.delete(f"/api/glossary/{entry_id}")
        assert del_resp.status_code == 200
        assert del_resp.json() == {"deleted": entry_id}

        # Verify removal from list
        list_resp = test_client.get("/api/glossary", params={"project": "default"})
        entries = list_resp.json()
        assert all(e["id"] != entry_id for e in entries)
