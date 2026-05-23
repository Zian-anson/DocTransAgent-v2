"""Tests for health check endpoint."""


def test_health_check(test_client):
    resp = test_client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "DocTransAgent"
    assert "models" in data
