import os
import uuid
from typing import List, Optional

import aiofiles
from colorthief import ColorThief
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import Follow, User
from routes.auth import get_current_user_id, user_to_dict
from services.safety_policy import is_blocked
from services.vibe_engine import get_vibe_params

router = APIRouter(prefix="/api/users", tags=["users"])

STATIC_AVATARS_DIR = "static/avatars"
os.makedirs(STATIC_AVATARS_DIR, exist_ok=True)


@router.get("/me")
async def get_current_user_profile(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_dict(user)


class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    primary_vibe: Optional[str] = None
    backdrop_type: Optional[str] = None
    expo_push_token: Optional[str] = None
    privacy_mode: Optional[str] = None


@router.patch("/me")
async def update_profile(
    payload: ProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.bio is not None:
        user.bio = payload.bio
    if payload.primary_vibe is not None:
        user.primary_vibe = payload.primary_vibe
        style, speed = get_vibe_params(payload.primary_vibe)
        user.skia_style = style
        user.skia_speed = speed
    if payload.backdrop_type is not None:
        user.backdrop_type = payload.backdrop_type
    if payload.expo_push_token is not None:
        user.expo_push_token = payload.expo_push_token
    if payload.privacy_mode is not None and payload.privacy_mode in {"open-door", "knock-first", "ghost"}:
        user.privacy_mode = payload.privacy_mode

    await db.commit()
    return user_to_dict(user)


@router.patch("/me/complete-onboarding")
async def complete_onboarding(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_sparked = True
    user.is_onboarded = True
    if not user.spark_token:
        user.spark_token = str(uuid.uuid4())
    await db.commit()
    return user_to_dict(user)


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    file_ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4().hex}{file_ext}"
    filepath = os.path.join(STATIC_AVATARS_DIR, filename)
    async with aiofiles.open(filepath, "wb") as out_file:
        await out_file.write(await file.read())

    try:
        palette = ColorThief(filepath).get_palette(color_count=4)
        user.theme_colors = [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in palette]
    except Exception:
        user.theme_colors = user.theme_colors or ["#7C5FE6", "#00C9FF"]

    url = f"/static/avatars/{filename}"
    user.profile_picture_url = url
    await db.commit()
    return {"url": url, "theme_colors": user.theme_colors}


class TopArtistReq(BaseModel):
    id: str
    name: str


@router.post("/me/top-artists")
async def update_top_artists(
    artists: List[TopArtistReq],
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.top_artists = [{"id": artist.id, "name": artist.name} for artist in artists]
    await db.commit()
    return {"success": True}


@router.post("/{target_id}/follow")
async def follow_user(
    target_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    if target_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    if await is_blocked(db, user_id, target_id):
        raise HTTPException(status_code=404, detail="Target user not found")
    target = (await db.execute(select(User).where(User.id == target_id))).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    existing = await db.execute(
        select(Follow).where(Follow.follower_id == user_id, Follow.following_id == target_id)
    )
    if existing.scalar_one_or_none():
        return {"success": True, "status": "already following"}
    db.add(Follow(follower_id=user_id, following_id=target_id))
    await db.commit()
    return {"success": True}


@router.delete("/{target_id}/unfollow")
async def unfollow_user(
    target_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    follow = (
        await db.execute(
            select(Follow).where(
                Follow.follower_id == user_id,
                Follow.following_id == target_id,
            )
        )
    ).scalar_one_or_none()
    if follow:
        await db.delete(follow)
        await db.commit()
    return {"success": True}


@router.get("/{username}/profile")
async def get_profile(
    username: str,
    viewer_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Legacy profile route preserved as an authenticated public projection."""

    user = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not user or await is_blocked(db, viewer_id, user.id):
        raise HTTPException(status_code=404, detail="User not found")

    follower_count = int(
        await db.scalar(select(func.count(Follow.follower_id)).where(Follow.following_id == user.id))
        or 0
    )
    following_count = int(
        await db.scalar(select(func.count(Follow.following_id)).where(Follow.follower_id == user.id))
        or 0
    )
    profile = user_to_dict(user)
    profile.pop("phoneNumber", None)
    profile.pop("sparkToken", None)
    profile["followerCount"] = follower_count
    profile["followingCount"] = following_count
    profile["projection"] = "legacy_authenticated_public"
    return profile


class SparkRequest(BaseModel):
    spark_token: str


@router.post("/spark")
async def spark_user(
    req: SparkRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Legacy Spark flow; blocked pairs cannot reconnect or follow one another."""

    host = (await db.execute(select(User).where(User.spark_token == req.spark_token))).scalar_one_or_none()
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not host:
        raise HTTPException(status_code=400, detail="Invalid or expired spark token")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if host.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot spark yourself")
    if await is_blocked(db, user.id, host.id):
        raise HTTPException(status_code=404, detail="User not available")

    user.is_sparked = True
    for follower_id, following_id in ((user.id, host.id), (host.id, user.id)):
        existing = await db.execute(
            select(Follow).where(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id,
            )
        )
        if not existing.scalar_one_or_none():
            db.add(Follow(follower_id=follower_id, following_id=following_id))

    host.spark_token = str(uuid.uuid4())
    await db.commit()

    from ws.manager import manager

    if manager.is_connected(user.id):
        await manager.send_to_user(
            user.id,
            {
                "type": "sparked",
                "partner_name": host.display_name,
                "partner_colors": host.theme_colors or ["#7C5FE6", "#00C9FF"],
            },
        )
    if manager.is_connected(host.id):
        await manager.send_to_user(
            host.id,
            {
                "type": "sparked",
                "partner_name": user.display_name,
                "partner_colors": user.theme_colors or ["#7C5FE6", "#00C9FF"],
            },
        )
    return {"success": True, "host": host.username}
