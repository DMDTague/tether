"""Rate limiting must not be defeatable by a client-supplied header."""

import time

import pytest
from fastapi import HTTPException

from config import get_settings
from routes import auth


class _FakeClient:
    def __init__(self, host: str) -> None:
        self.host = host


class _FakeRequest:
    """Minimal stand-in for starlette.Request for the two fields _client_key reads."""

    def __init__(self, host: str, forwarded: str | None = None) -> None:
        self.client = _FakeClient(host)
        self.headers = {"x-forwarded-for": forwarded} if forwarded else {}


@pytest.fixture(autouse=True)
def _clean_auth_state():
    auth._attempts.clear()
    auth._refresh_sessions.clear()
    auth._revoked_access.clear()
    auth._last_sweep[0] = 0.0
    yield
    auth._attempts.clear()
    auth._refresh_sessions.clear()
    auth._revoked_access.clear()


def test_forwarded_header_is_ignored_unless_proxy_is_trusted(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "TRUST_PROXY_HEADERS", False)

    spoofed = _FakeRequest("203.0.113.9", forwarded="198.51.100.7")
    direct = _FakeRequest("203.0.113.9")

    assert auth._client_key(spoofed, "login") == auth._client_key(direct, "login")


def test_forwarded_header_is_used_when_proxy_is_trusted(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "TRUST_PROXY_HEADERS", True)

    behind_proxy = _FakeRequest("10.0.0.1", forwarded="198.51.100.7")
    assert auth._client_key(behind_proxy, "login").endswith("198.51.100.7")


def test_rotating_a_fake_forwarded_header_cannot_outrun_the_limit(monkeypatch):
    """The original bug: a new XFF per request reset the bucket every time."""
    settings = get_settings()
    monkeypatch.setattr(settings, "TRUST_PROXY_HEADERS", False)
    monkeypatch.setattr(settings, "AUTH_RATE_LIMIT_ATTEMPTS", 5)

    attacker_host = "203.0.113.50"
    for attempt in range(5):
        auth._enforce_rate_limit(_FakeRequest(attacker_host, forwarded=f"198.51.100.{attempt}"), "login")

    with pytest.raises(HTTPException) as excinfo:
        auth._enforce_rate_limit(_FakeRequest(attacker_host, forwarded="198.51.100.200"), "login")
    assert excinfo.value.status_code == 429


def test_expired_state_is_swept_rather_than_accumulating(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "AUTH_RATE_LIMIT_WINDOW_SECONDS", 1)

    now = time.time()
    auth._attempts["login:stale"].append(now - 3600)
    auth._refresh_sessions["expired-token"] = ("user-1", now - 10)
    auth._refresh_sessions["live-token"] = ("user-1", now + 3600)

    auth._sweep_expired(now)

    assert "login:stale" not in auth._attempts
    assert "expired-token" not in auth._refresh_sessions
    assert "live-token" in auth._refresh_sessions


def test_revoked_access_set_stays_bounded():
    for index in range(auth._MAX_REVOKED_ACCESS + 500):
        auth._revoked_access.add(f"jti-{index}")

    auth._sweep_expired(time.time())

    assert len(auth._revoked_access) <= auth._MAX_REVOKED_ACCESS
