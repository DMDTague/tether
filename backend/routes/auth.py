"""
Tether Auth Routes

Register, login, and JWT token management.
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from jose import jwt
import bcrypt

from db.database import get_db
from models.models import User
from config import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


class RegisterRequest(BaseModel):
    username: str
    display_name: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


def create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def make_initials(name: str) -> str:
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return name[:2].upper()


from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    """Dependency to extract current user from JWT."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

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
        "sparkToken": getattr(user, "spark_token", None),
        "themeColors": getattr(user, "theme_colors", None),
        "backdropType": getattr(user, "backdrop_type", "auto_mesh"),
        "backdropUrl": getattr(user, "backdrop_url", None),
        "primaryVibe": getattr(user, "primary_vibe", "chill"),
        "skiaStyle": getattr(user, "skia_style", "mesh"),
        "skiaSpeed": getattr(user, "skia_speed", 1.0),
        "vibeVector": getattr(user, "vibe_vector", None),
        "topArtists": getattr(user, "top_artists", None) or [],
    }


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if username exists
    result = await db.execute(select(User).where(User.username == req.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        username=req.username,
        display_name=req.display_name,
        initials=make_initials(req.display_name),
        password_hash=bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode(),
    )
    db.add(user)
    await db.flush()

    token = create_token(user.id)
    return AuthResponse(token=token, user=user_to_dict(user))


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()

    if not user or not bcrypt.checkpw(req.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user.id)
    return AuthResponse(token=token, user=user_to_dict(user))
