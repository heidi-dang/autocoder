"""Lightweight tests for health and readiness endpoints."""

import pytest
from fastapi.testclient import TestClient

@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("AUTOCODER_ALLOW_REMOTE", "1")
    from server.main import app

    return TestClient(app)


def test_health_returns_ok(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json().get("status") == "ok"


def test_readiness_returns_ready(client: TestClient):
    response = client.get("/readiness")
    assert response.status_code == 200
    assert response.json().get("status") == "ready"
