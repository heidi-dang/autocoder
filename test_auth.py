"""Backend tests for cookie-based JWT auth.

These tests avoid real OAuth flows and focus on:
- /auth/me protection
- /auth/refresh rotation
- /auth/logout cookie clearing
"""

import tempfile
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text


def _reset_registry_singletons() -> None:
    import registry

    registry._engine = None  # noqa: SLF001
    registry._SessionLocal = None  # noqa: SLF001


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch):
    with tempfile.TemporaryDirectory() as tmp_home:
        monkeypatch.setenv("HOME", tmp_home)
        monkeypatch.setenv("AUTOCODER_ALLOW_REMOTE", "1")
        _reset_registry_singletons()

        monkeypatch.setenv("JWT_SECRET_KEY", "test-secret")
        monkeypatch.setenv("JWT_ALGORITHM", "HS256")
        monkeypatch.setenv("FRONTEND_URL", "http://localhost:5173")
        monkeypatch.setenv("BACKEND_URL", "http://127.0.0.1:8888")

        from server.main import app

        yield TestClient(app)


def _seed_user(user_id: int = 1) -> None:
    import registry

    engine, _ = registry._get_engine()  # noqa: SLF001
    with engine.connect() as conn:
        now = datetime.now(UTC).isoformat()
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, name, avatar_url, created_at, updated_at)
                VALUES (:id, :email, :name, :avatar_url, :created_at, :updated_at)
                """
            ),
            {
                "id": user_id,
                "email": "user@example.com",
                "name": "Test User",
                "avatar_url": "https://example.com/avatar.png",
                "created_at": now,
                "updated_at": now,
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO user_providers
                (user_id, provider, provider_account_id, provider_email, created_at)
                VALUES (:user_id, :provider, :provider_account_id, :provider_email, :created_at)
                """
            ),
            {
                "user_id": user_id,
                "provider": "github",
                "provider_account_id": "123",
                "provider_email": "user@example.com",
                "created_at": now,
            },
        )
        conn.commit()


def _seed_refresh_token(user_id: int, refresh_token: str) -> None:
    import registry
    from server.routers import auth as auth_mod

    payload = auth_mod._jwt_decode(refresh_token)  # noqa: SLF001
    expires_at = datetime.fromtimestamp(int(payload["exp"]), tz=UTC).isoformat()

    engine, _ = registry._get_engine()  # noqa: SLF001
    with engine.connect() as conn:
        now = datetime.now(UTC).isoformat()
        conn.execute(
            text(
                """
                INSERT INTO refresh_tokens
                (user_id, token_hash, expires_at, revoked_at, created_at, user_agent, ip)
                VALUES (:user_id, :token_hash, :expires_at, NULL, :created_at, NULL, NULL)
                """
            ),
            {
                "user_id": user_id,
                "token_hash": auth_mod._hash_refresh_token(refresh_token),  # noqa: SLF001
                "expires_at": expires_at,
                "created_at": now,
            },
        )
        conn.commit()


def test_me_requires_auth(client: TestClient):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_me_returns_user_when_access_cookie_present(client: TestClient):
    from server.routers import auth as auth_mod

    auth_mod._ensure_auth_schema()  # noqa: SLF001
    _seed_user(user_id=1)

    access = auth_mod._mint_access_token(1)  # noqa: SLF001
    client.cookies.set(auth_mod.ACCESS_COOKIE_NAME, access)

    resp = client.get("/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == 1
    assert data["email"] == "user@example.com"
    assert "github" in data["providers"]


def test_refresh_rotates_tokens(client: TestClient):
    from server.routers import auth as auth_mod

    auth_mod._ensure_auth_schema()  # noqa: SLF001
    _seed_user(user_id=1)

    refresh = auth_mod._mint_refresh_token(1)  # noqa: SLF001
    _seed_refresh_token(1, refresh)

    client.cookies.set(auth_mod.REFRESH_COOKIE_NAME, refresh)

    resp = client.post("/auth/refresh")
    assert resp.status_code == 200

    set_cookie = resp.headers.get("set-cookie", "")
    assert auth_mod.ACCESS_COOKIE_NAME in set_cookie
    assert auth_mod.REFRESH_COOKIE_NAME in set_cookie


def test_logout_clears_cookies(client: TestClient):
    from server.routers import auth as auth_mod

    auth_mod._ensure_auth_schema()  # noqa: SLF001
    _seed_user(user_id=1)

    access = auth_mod._mint_access_token(1)  # noqa: SLF001
    refresh = auth_mod._mint_refresh_token(1)  # noqa: SLF001
    _seed_refresh_token(1, refresh)

    client.cookies.set(auth_mod.ACCESS_COOKIE_NAME, access)
    client.cookies.set(auth_mod.REFRESH_COOKIE_NAME, refresh)

    resp = client.post("/auth/logout")
    assert resp.status_code == 200

    set_cookie = resp.headers.get("set-cookie", "")
    assert auth_mod.ACCESS_COOKIE_NAME in set_cookie
    assert auth_mod.REFRESH_COOKIE_NAME in set_cookie
