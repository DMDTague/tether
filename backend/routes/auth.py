"""Authentication, rotating refresh tokens, and short-lived WebSocket tickets."""

import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from db.database import get_db
from models.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
# NOTE: this state is per-process and in-memory. It is correct for a single
# instance only. Running more than one worker or replica means a refresh token
# minted on one process cannot be redeemed on another (users get logged out at
# random) and a revoked access token stays valid everywhere else. Moving these
# three maps to the Redis instance already configured in REDIS_URL is the
# prerequisite for horizontal scaling.
_attempts: dict[str, deque[float]] = defaultdict(deque)
_refresh_sessions: dict[str, tuple[str, float]] = {}
_revoked_access: set[str] = set()
_MAX_REVOKED_ACCESS = 10_000
_SWEEP_INTERVAL_SECONDS = 60.0
_last_sweep = [0.0]


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    display_name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=10, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized.replace("_", "").replace(".", "").isalnum():
            raise ValueError("Username may contain letters, numbers, dots, and underscores")
        return normalized


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(alias="refreshToken")


class LogoutRequest(BaseModel):
    refresh_token: str | None = Field(default=None, alias="refreshToken")


class AuthResponse(BaseModel):
    token: str
    refreshToken: str
    expiresIn: int
    user: dict


def _client_key(request: Request, action: str) -> str:
    """Identify the caller for rate limiting.

    X-Forwarded-For is client-controlled. Honouring it unconditionally lets an
    attacker rotate a fake value per request and defeat login rate limiting
    entirely, so it is only read when TRUST_PROXY_HEADERS is enabled.
    """
    host = request.client.host if request.client else "unknown"
    if settings.TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        host = forwarded or host
    return f"{action}:{host}"


def _sweep_expired(now: float) -> None:
    """Drop state that can no longer affect a decision.

    These maps are per-process and never shrink on their own; a long-running
    instance would otherwise grow one permanent entry per client key, per
    rotated refresh token, and per logged-out access token.
    """
    window = settings.AUTH_RATE_LIMIT_WINDOW_SECONDS
    for key in [k for k, bucket in _attempts.items() if not bucket or bucket[-1] < now - window]:
        del _attempts[key]
    for token_id in [t for t, (_, expires) in _refresh_sessions.items() if expires < now]:
        del _refresh_sessions[token_id]
    if len(_revoked_access) > _MAX_REVOKED_ACCESS:
        # Entries only need to outlive the access-token lifetime; the oldest go first.
        for token_id in list(_revoked_access)[: len(_revoked_access) - _MAX_REVOKED_ACCESS]:
            _revoked_access.discard(token_id)


def _enforce_rate_limit(request: Request, action: str) -> None:
    key = _client_key(request, action)
    now = time.time()
    if now - _last_sweep[0] > _SWEEP_INTERVAL_SECONDS:
        _last_sweep[0] = now
        _sweep_expired(now)
    bucket = _attempts[key]
    while bucket and bucket[0] < now - settings.AUTH_RATE_LIMIT_WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= settings.AUTH_RATE_LIMIT_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
    bucket.append(now)


def _encode_token(user_id: str, token_type: str, expires_delta: timedelta) -> tuple[str, str, int]:
    now = datetime.now(timezone.utc)
    expires = now + expires_delta
    token_id = str(uuid4())
    encoded = jwt.encode({"sub": user_id, "typ": token_type, "jti": token_id, "iat": now, "exp": expires}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded, token_id, int(expires_delta.total_seconds())


def create_token_pair(user_id: str) -> tuple[str, str, int]:
    access, _, expires_in = _encode_token(user_id, "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh, refresh_id, refresh_seconds = _encode_token(user_id, "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    _refresh_sessions[refresh_id] = (user_id, time.time() + refresh_seconds)
    return access, refresh, expires_in


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("typ") != "access" or not payload.get("sub") or payload.get("jti") in _revoked_access:
            raise JWTError("Invalid access token")
        return payload
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


def create_ws_ticket(user_id: str) -> tuple[str, int]:
    ticket, _, expires_in = _encode_token(user_id, "websocket", timedelta(seconds=settings.WS_TICKET_EXPIRE_SECONDS))
    return ticket, expires_in


def decode_ws_ticket(ticket: str) -> str:
    payload = jwt.decode(ticket, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    if payload.get("typ") != "websocket" or not payload.get("sub"):
        raise JWTError("Invalid WebSocket ticket")
    return str(payload["sub"])


def make_initials(name: str) -> str:
    parts = name.strip().split()
    return ((parts[0][0] + parts[-1][0]) if len(parts) >= 2 else name[:2]).upper()


async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    return str(decode_access_token(token)["sub"])


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    user_id = str(decode_access_token(token)["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "displayName": user.display_name,
        "initials": user.initials,
        "privacyMode": user.privacy_mode,
        "adFreeUntil": user.ad_free_until.isoformat() if user.ad_free_until else None,
        "streamingService": user.streaming_service,
        "hasPremium": user.has_premium,
        "bio": getattr(user, "bio", None),
        "profilePictureUrl": getattr(user, "profile_picture_url", None),
        "isOnboarded": getattr(user, "is_onboarded", False),
        "isSparked": getattr(user, "is_sparked", False),
        "themeColors": getattr(user, "theme_colors", None),
        "backdropType": getattr(user, "backdrop_type", "auto_mesh"),
        "backdropUrl": getattr(user, "backdrop_url", None),
        "primaryVibe": getattr(user, "primary_vibe", "chill"),
        "skiaStyle": getattr(user, "skia_style", "mesh"),
        "skiaSpeed": getattr(user, "skia_speed", 1.0),
        "vibeVector": getattr(user, "vibe_vector", None),
        "topArtists": getattr(user, "top_artists", None) or [],
    }


def _auth_response(user: User) -> AuthResponse:
    access, refresh, expires_in = create_token_pair(user.id)
    return AuthResponse(token=access, refreshToken=refresh, expiresIn=expires_in, user=user_to_dict(user))


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    _enforce_rate_limit(request, "register")
    result = await db.execute(select(User).where(User.username == req.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(username=req.username, display_name=req.display_name.strip(), initials=make_initials(req.display_name), password_hash=bcrypt.hashpw(req.password.encode(), bcrypt.gensalt(rounds=12)).decode())
    db.add(user)
    await db.flush()
    return _auth_response(user)


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    _enforce_rate_limit(request, "login")
    result = await db.execute(select(User).where(User.username == req.username.strip().lower()))
    user = result.scalar_one_or_none()
    valid = user and bcrypt.checkpw(req.password.encode(), user.password_hash.encode())
    if not valid:
        if not user:
            bcrypt.hashpw(secrets.token_bytes(16), bcrypt.gensalt(rounds=4))
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return _auth_response(user)


@router.post("/refresh", response_model=AuthResponse)
async def refresh(req: RefreshRequest, request: Request, db: AsyncSession = Depends(get_db)):
    _enforce_rate_limit(request, "refresh")
    try:
        payload = jwt.decode(req.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("typ") != "refresh":
            raise JWTError("Wrong token type")
        token_id, user_id = str(payload.get("jti", "")), str(payload.get("sub", ""))
        session = _refresh_sessions.pop(token_id, None)
        if not session or session[0] != user_id or session[1] < time.time():
            raise JWTError("Refresh token already used or revoked")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return _auth_response(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(req: LogoutRequest, token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if payload.get("jti"):
        _revoked_access.add(str(payload["jti"]))
    if req.refresh_token:
        try:
            refresh_payload = jwt.decode(req.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            _refresh_sessions.pop(str(refresh_payload.get("jti", "")), None)
        except JWTError:
            pass
    return None


@router.post("/ws-ticket")
async def websocket_ticket(user_id: str = Depends(get_current_user_id)):
    ticket, expires_in = create_ws_ticket(user_id)
    return {"ticket": ticket, "expiresIn": expires_in}
