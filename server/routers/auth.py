"""Auth Router

OAuth (GitHub/Google) + JWT session cookies.

Implements:
- GET /auth/github/login
- GET /auth/github/callback
- GET /auth/google/login
- GET /auth/google/callback
- GET /auth/me
- POST /auth/refresh
- POST /auth/logout
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode, urljoin

import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import text

import registry

router = APIRouter(prefix="/auth", tags=["auth"])


ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("ascii"))


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise HTTPException(status_code=500, detail=f"Missing required env var: {name}")
    return value


def _is_secure_cookie() -> bool:
    backend_url = os.getenv("BACKEND_URL", "").strip().lower()
    return backend_url.startswith("https://")


def _cookie_domain() -> str | None:
    return os.getenv("AUTH_COOKIE_DOMAIN") or None


def _jwt_secret() -> bytes:
    return _require_env("JWT_SECRET_KEY").encode("utf-8")


def _jwt_algorithm() -> str:
    return os.getenv("JWT_ALGORITHM", "HS256")


def _jwt_encode(payload: dict[str, Any]) -> str:
    alg = _jwt_algorithm()
    if alg != "HS256":
        raise HTTPException(status_code=500, detail="Unsupported JWT_ALGORITHM (only HS256 supported)")

    header = {"typ": "JWT", "alg": alg}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    sig = hmac.new(_jwt_secret(), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(sig)
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def _jwt_decode(token: str) -> dict[str, Any]:
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
    except ValueError as e:
        raise HTTPException(status_code=401, detail="Invalid token") from e

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_sig = hmac.new(_jwt_secret(), signing_input, hashlib.sha256).digest()
    if not hmac.compare_digest(_b64url_encode(expected_sig), sig_b64):
        raise HTTPException(status_code=401, detail="Invalid token")

    payload = json.loads(_b64url_decode(payload_b64))

    exp = payload.get("exp")
    if exp is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        exp_dt = datetime.fromtimestamp(int(exp), tz=UTC)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token") from e

    if _utc_now() >= exp_dt:
        raise HTTPException(status_code=401, detail="Token expired")

    return payload


def _hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _ensure_auth_schema() -> None:
    engine, _ = registry._get_engine()  # noqa: SLF001
    with engine.connect() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS users (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  email TEXT UNIQUE,
                  name TEXT,
                  avatar_url TEXT,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS user_providers (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  provider TEXT NOT NULL,
                  provider_account_id TEXT NOT NULL,
                  provider_email TEXT,
                  created_at TEXT NOT NULL,
                  UNIQUE(provider, provider_account_id),
                  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS refresh_tokens (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  token_hash TEXT NOT NULL UNIQUE,
                  expires_at TEXT NOT NULL,
                  revoked_at TEXT,
                  created_at TEXT NOT NULL,
                  user_agent TEXT,
                  ip TEXT,
                  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """
            )
        )
        conn.commit()


def _get_registry_session():
    _ensure_auth_schema()
    _, SessionLocal = registry._get_engine()  # noqa: SLF001
    return SessionLocal()


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    secure = _is_secure_cookie()
    domain = _cookie_domain()

    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=int(timedelta(minutes=15).total_seconds()),
        path="/",
        domain=domain,
    )

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=int(timedelta(days=30).total_seconds()),
        path="/auth/refresh",
        domain=domain,
    )


def _clear_auth_cookies(response: Response) -> None:
    domain = _cookie_domain()

    response.delete_cookie(key=ACCESS_COOKIE_NAME, path="/", domain=domain)
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/auth/refresh", domain=domain)


def _mint_access_token(user_id: int) -> str:
    now = _utc_now()
    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=15)).timestamp()),
    }
    return _jwt_encode(payload)


def _mint_refresh_token(user_id: int) -> str:
    now = _utc_now()
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=30)).timestamp()),
        "jti": secrets.token_urlsafe(16),
    }
    return _jwt_encode(payload)


def _upsert_user_and_provider(
    *,
    provider: str,
    provider_account_id: str,
    email: str | None,
    name: str | None,
    avatar_url: str | None,
) -> int:
    session = _get_registry_session()
    now = _utc_now().isoformat()
    try:
        user_id: int | None = None

        provider_row = session.execute(
            text(
                """
                SELECT user_id FROM user_providers
                WHERE provider = :provider AND provider_account_id = :provider_account_id
                """
            ),
            {"provider": provider, "provider_account_id": provider_account_id},
        ).fetchone()

        if provider_row:
            user_id = int(provider_row[0])

        if user_id is None and email:
            user_row = session.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email}).fetchone()
            if user_row:
                user_id = int(user_row[0])

        if user_id is None:
            session.execute(
                text(
                    """
                    INSERT INTO users (email, name, avatar_url, created_at, updated_at)
                    VALUES (:email, :name, :avatar_url, :created_at, :updated_at)
                    """
                ),
                {
                    "email": email,
                    "name": name,
                    "avatar_url": avatar_url,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            user_id = int(session.execute(text("SELECT last_insert_rowid()"))).fetchone()[0]
        else:
            session.execute(
                text(
                    """
                    UPDATE users
                    SET name = COALESCE(:name, name),
                        avatar_url = COALESCE(:avatar_url, avatar_url),
                        updated_at = :updated_at
                    WHERE id = :id
                    """
                ),
                {"id": user_id, "name": name, "avatar_url": avatar_url, "updated_at": now},
            )

        session.execute(
            text(
                """
                INSERT OR IGNORE INTO user_providers
                (user_id, provider, provider_account_id, provider_email, created_at)
                VALUES (:user_id, :provider, :provider_account_id, :provider_email, :created_at)
                """
            ),
            {
                "user_id": user_id,
                "provider": provider,
                "provider_account_id": provider_account_id,
                "provider_email": email,
                "created_at": now,
            },
        )

        session.commit()
        return user_id
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _store_refresh_token(
    *,
    user_id: int,
    refresh_token: str,
    request: Request,
) -> None:
    session = _get_registry_session()
    try:
        token_hash = _hash_refresh_token(refresh_token)
        payload = _jwt_decode(refresh_token)
        exp_ts = int(payload["exp"])
        expires_at = datetime.fromtimestamp(exp_ts, tz=UTC).isoformat()
        now = _utc_now().isoformat()

        session.execute(
            text(
                """
                INSERT INTO refresh_tokens
                (user_id, token_hash, expires_at, revoked_at, created_at, user_agent, ip)
                VALUES (:user_id, :token_hash, :expires_at, NULL, :created_at, :user_agent, :ip)
                """
            ),
            {
                "user_id": user_id,
                "token_hash": token_hash,
                "expires_at": expires_at,
                "created_at": now,
                "user_agent": request.headers.get("user-agent"),
                "ip": request.client.host if request.client else None,
            },
        )
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _revoke_refresh_token(refresh_token: str) -> None:
    session = _get_registry_session()
    try:
        token_hash = _hash_refresh_token(refresh_token)
        now = _utc_now().isoformat()
        session.execute(
            text(
                """
                UPDATE refresh_tokens
                SET revoked_at = :revoked_at
                WHERE token_hash = :token_hash AND revoked_at IS NULL
                """
            ),
            {"revoked_at": now, "token_hash": token_hash},
        )
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _get_user(user_id: int) -> dict[str, Any] | None:
    session = _get_registry_session()
    try:
        row = session.execute(
            text("SELECT id, email, name, avatar_url FROM users WHERE id = :id"),
            {"id": user_id},
        ).fetchone()
        if not row:
            return None

        providers_rows = session.execute(
            text("SELECT provider FROM user_providers WHERE user_id = :user_id"),
            {"user_id": user_id},
        ).fetchall()

        return {
            "id": row[0],
            "email": row[1],
            "name": row[2],
            "avatar_url": row[3],
            "providers": sorted({r[0] for r in providers_rows}),
        }
    finally:
        session.close()


def _oauth_state_sign(data: dict[str, Any]) -> str:
    raw = json.dumps(data, separators=(",", ":")).encode("utf-8")
    payload_b64 = _b64url_encode(raw)
    sig = hmac.new(_jwt_secret(), payload_b64.encode("ascii"), hashlib.sha256).digest()
    return f"{payload_b64}.{_b64url_encode(sig)}"


def _oauth_state_verify(token: str) -> dict[str, Any]:
    try:
        payload_b64, sig_b64 = token.split(".")
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid state") from e

    expected = hmac.new(_jwt_secret(), payload_b64.encode("ascii"), hashlib.sha256).digest()
    if not hmac.compare_digest(_b64url_encode(expected), sig_b64):
        raise HTTPException(status_code=400, detail="Invalid state")

    data = json.loads(_b64url_decode(payload_b64))
    exp = data.get("exp")
    if exp is None:
        raise HTTPException(status_code=400, detail="Invalid state")
    if _utc_now() >= datetime.fromtimestamp(int(exp), tz=UTC):
        raise HTTPException(status_code=400, detail="State expired")
    return data


async def _github_exchange_code_for_token(code: str) -> str:
    client_id = _require_env("GITHUB_CLIENT_ID")
    client_secret = _require_env("GITHUB_CLIENT_SECRET")

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            json={"client_id": client_id, "client_secret": client_secret, "code": code},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="GitHub token exchange failed")

    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="GitHub token exchange failed")
    return token


async def _github_fetch_user(token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=20) as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        )
        if user_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="GitHub user fetch failed")
        user = user_resp.json()

        email_resp = await client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        )

    email: str | None = None
    if email_resp.status_code == 200:
        emails = email_resp.json()
        primary_verified = [e for e in emails if e.get("primary") and e.get("verified")]
        if primary_verified:
            email = primary_verified[0].get("email")
        elif emails:
            email = emails[0].get("email")

    return {
        "provider_account_id": str(user.get("id")),
        "email": email,
        "name": user.get("name") or user.get("login"),
        "avatar_url": user.get("avatar_url"),
    }


async def _google_exchange_code_for_token(code: str, redirect_uri: str) -> dict[str, Any]:
    client_id = _require_env("GOOGLE_CLIENT_ID")
    client_secret = _require_env("GOOGLE_CLIENT_SECRET")

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Google token exchange failed")

    data = resp.json()
    if not data.get("id_token"):
        raise HTTPException(status_code=401, detail="Google token exchange failed")
    return data


async def _google_decode_and_validate_id_token(id_token: str) -> dict[str, Any]:
    # Minimal validation: use Google tokeninfo endpoint.
    # Avoids bundling JWKS verification dependencies.
    client_id = _require_env("GOOGLE_CLIENT_ID")

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": id_token})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Google token validation failed")

    data = resp.json()

    aud = data.get("aud")
    if aud != client_id:
        raise HTTPException(status_code=401, detail="Google token validation failed")

    if data.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(status_code=401, detail="Google token validation failed")

    return data


def _frontend_redirect(next_path: str | None) -> str:
    frontend = _require_env("FRONTEND_URL").rstrip("/") + "/"
    path = (next_path or "/").lstrip("/")
    return urljoin(frontend, path)


@router.get("/github/login")
async def github_login(request: Request, next: str | None = None):
    client_id = _require_env("GITHUB_CLIENT_ID")
    backend_url = _require_env("BACKEND_URL").rstrip("/")

    redirect_uri = f"{backend_url}/auth/github/callback"

    state_payload = {
        "provider": "github",
        "next": next or "/",
        "nonce": secrets.token_urlsafe(16),
        "exp": int((_utc_now() + timedelta(minutes=10)).timestamp()),
    }
    state = _oauth_state_sign(state_payload)

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": "read:user user:email",
        "state": state,
    }

    url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return RedirectResponse(url=url, status_code=302)


@router.get("/github/callback")
async def github_callback(request: Request, code: str | None = None, state: str | None = None):
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code/state")

    state_data = _oauth_state_verify(state)
    token = await _github_exchange_code_for_token(code)
    user = await _github_fetch_user(token)

    user_id = _upsert_user_and_provider(
        provider="github",
        provider_account_id=user["provider_account_id"],
        email=user.get("email"),
        name=user.get("name"),
        avatar_url=user.get("avatar_url"),
    )

    access = _mint_access_token(user_id)
    refresh = _mint_refresh_token(user_id)
    _store_refresh_token(user_id=user_id, refresh_token=refresh, request=request)

    redirect_to = _frontend_redirect(state_data.get("next"))
    response = RedirectResponse(url=redirect_to, status_code=302)
    _set_auth_cookies(response, access, refresh)
    return response


@router.get("/google/login")
async def google_login(request: Request, next: str | None = None):
    client_id = _require_env("GOOGLE_CLIENT_ID")
    backend_url = _require_env("BACKEND_URL").rstrip("/")

    redirect_uri = f"{backend_url}/auth/google/callback"

    state_payload = {
        "provider": "google",
        "next": next or "/",
        "nonce": secrets.token_urlsafe(16),
        "exp": int((_utc_now() + timedelta(minutes=10)).timestamp()),
    }
    state = _oauth_state_sign(state_payload)

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }

    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=url, status_code=302)


@router.get("/google/callback")
async def google_callback(request: Request, code: str | None = None, state: str | None = None):
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code/state")

    state_data = _oauth_state_verify(state)

    backend_url = _require_env("BACKEND_URL").rstrip("/")
    redirect_uri = f"{backend_url}/auth/google/callback"

    tokens = await _google_exchange_code_for_token(code, redirect_uri)
    id_token = tokens["id_token"]
    claims = await _google_decode_and_validate_id_token(id_token)

    provider_account_id = claims.get("sub")
    if not provider_account_id:
        raise HTTPException(status_code=401, detail="Google token validation failed")

    user_id = _upsert_user_and_provider(
        provider="google",
        provider_account_id=str(provider_account_id),
        email=claims.get("email"),
        name=claims.get("name"),
        avatar_url=claims.get("picture"),
    )

    access = _mint_access_token(user_id)
    refresh = _mint_refresh_token(user_id)
    if request is None:
        raise HTTPException(status_code=500, detail="Request missing")
    _store_refresh_token(user_id=user_id, refresh_token=refresh, request=request)

    redirect_to = _frontend_redirect(state_data.get("next"))
    response = RedirectResponse(url=redirect_to, status_code=302)
    _set_auth_cookies(response, access, refresh)
    return response


@router.get("/me")
async def me(request: Request):
    token = request.cookies.get(ACCESS_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = _jwt_decode(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = int(payload["sub"])
    user = _get_user(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/refresh")
async def refresh(request: Request):
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = _jwt_decode(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token")

    token_hash = _hash_refresh_token(token)

    session = _get_registry_session()
    try:
        row = session.execute(
            text(
                """
                SELECT user_id, expires_at, revoked_at
                FROM refresh_tokens
                WHERE token_hash = :token_hash
                """
            ),
            {"token_hash": token_hash},
        ).fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="Not authenticated")
        if row[2] is not None:
            raise HTTPException(status_code=401, detail="Not authenticated")

        user_id = int(row[0])

        now_iso = _utc_now().isoformat()
        session.execute(
            text(
                """
                UPDATE refresh_tokens
                SET revoked_at = :revoked_at
                WHERE token_hash = :token_hash AND revoked_at IS NULL
                """
            ),
            {"revoked_at": now_iso, "token_hash": token_hash},
        )

        new_access = _mint_access_token(user_id)
        new_refresh = _mint_refresh_token(user_id)

        new_payload = _jwt_decode(new_refresh)
        exp_ts = int(new_payload["exp"])
        expires_at = datetime.fromtimestamp(exp_ts, tz=UTC).isoformat()

        session.execute(
            text(
                """
                INSERT INTO refresh_tokens
                (user_id, token_hash, expires_at, revoked_at, created_at, user_agent, ip)
                VALUES (:user_id, :token_hash, :expires_at, NULL, :created_at, :user_agent, :ip)
                """
            ),
            {
                "user_id": user_id,
                "token_hash": _hash_refresh_token(new_refresh),
                "expires_at": expires_at,
                "created_at": now_iso,
                "user_agent": request.headers.get("user-agent"),
                "ip": request.client.host if request.client else None,
            },
        )

        session.commit()

        response = Response(content=json.dumps({"ok": True}), media_type="application/json")
        _set_auth_cookies(response, new_access, new_refresh)
        return response
    except HTTPException:
        session.rollback()
        raise
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@router.post("/logout")
async def logout(request: Request):
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if token:
        try:
            _revoke_refresh_token(token)
        except Exception:
            pass

    response = Response(content=json.dumps({"ok": True}), media_type="application/json")
    _clear_auth_cookies(response)
    return response
