import time

import pytest
from fastapi import HTTPException
from jose import jwt

from config import get_settings
from routes import auth
from routes.auth import (
    LogoutRequest,
    create_token_pair,
    create_ws_ticket,
    decode_access_token,
    decode_ws_ticket,
)


def test_access_and_refresh_tokens_have_distinct_types():
    settings = get_settings()
    access, refresh, expires_in = create_token_pair("user-1")
    access_payload = jwt.decode(access, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    refresh_payload = jwt.decode(refresh, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert access_payload["typ"] == "access"
    assert refresh_payload["typ"] == "refresh"
    assert expires_in == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    assert decode_access_token(access)["sub"] == "user-1"


def test_websocket_ticket_is_short_lived_and_scoped():
    settings = get_settings()
    ticket, expires_in = create_ws_ticket("user-2")
    payload = jwt.decode(ticket, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["typ"] == "websocket"
    assert expires_in == settings.WS_TICKET_EXPIRE_SECONDS
    assert decode_ws_ticket(ticket) == "user-2"


def test_dummy_password_hash_uses_registration_cost():
    cost = int(auth._DUMMY_PASSWORD_HASH.split(b"$")[2])
    assert cost == auth._BCRYPT_ROUNDS == 12


@pytest.mark.asyncio
async def test_logout_revokes_access_token_until_its_expiry():
    settings = get_settings()
    access, _, _ = create_token_pair("user-logout")
    payload = jwt.decode(access, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    token_id = str(payload["jti"])

    await auth.logout(LogoutRequest(), token=access)

    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(access)
    assert exc_info.value.status_code == 401
    assert auth._revoked_access[token_id] == float(payload["exp"])

    auth._revoked_access[token_id] = time.time() - 1
    auth._sweep_expired(time.time())
    assert token_id not in auth._revoked_access
