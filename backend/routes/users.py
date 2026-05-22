import os
import uuid
import aiofiles
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from colorthief import ColorThief

from db.database import get_db
from models.models import User, Follow
from routes.auth import get_current_user_id, user_to_dict
from services.vibe_engine import get_vibe_params

router = APIRouter(prefix="/api/users", tags=["users"])

STATIC_AVATARS_DIR = "static/avatars"
os.makedirs(STATIC_AVATARS_DIR, exist_ok=True)


@router.get("/me")
async def get_current_user_profile(
    user_id: str = Depends(get_current_user_id),  # In a real app, this comes from auth dependency
    db: AsyncSession = Depends(get_db)
):
    """Get current user profile."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
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
    """Update user profile fields."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
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

    if payload.privacy_mode is not None and payload.privacy_mode in ("open-door", "knock-first", "ghost"):
        user.privacy_mode = payload.privacy_mode

    await db.commit()
    return user_to_dict(user)


@router.patch("/me/complete-onboarding")
async def complete_onboarding(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Mark user as fully onboarded."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not user.is_sparked:
        user.is_sparked = True
        
    user.is_onboarded = True
    if not user.spark_token:
        import uuid
        user.spark_token = str(uuid.uuid4())
    await db.commit()
    return user_to_dict(user)


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),  # In a real app, this comes from auth dependency
    db: AsyncSession = Depends(get_db)
):
    """Upload a new profile picture."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4().hex}{file_ext}"
    filepath = os.path.join(STATIC_AVATARS_DIR, filename)

    async with aiofiles.open(filepath, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)

    try:
        color_thief = ColorThief(filepath)
        palette = color_thief.get_palette(color_count=4)
        hex_colors = [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in palette]
        user.theme_colors = hex_colors
    except Exception as e:
        print(f"Color extraction failed: {e}")

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
    user_id: str = Depends(get_current_user_id),  # In a real app, from auth dependency
    db: AsyncSession = Depends(get_db)
):
    """Sync Spotify top artists to user profile."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.top_artists = [{"id": a.id, "name": a.name} for a in artists]
    await db.commit()
    return {"success": True}


@router.post("/{target_id}/follow")
async def follow_user(
    target_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Follow a user."""
    if target_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
        
    # Check if target exists
    result = await db.execute(select(User).where(User.id == target_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    # Check if already following
    existing = await db.execute(
        select(Follow).where(
            and_(Follow.follower_id == user_id, Follow.following_id == target_id)
        )
    )
    if existing.scalar_one_or_none():
        return {"success": True, "status": "already following"}

    follow = Follow(follower_id=user_id, following_id=target_id)
    db.add(follow)
    await db.commit()
    return {"success": True}


@router.delete("/{target_id}/unfollow")
async def unfollow_user(
    target_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Unfollow a user."""
    result = await db.execute(
        select(Follow).where(
            and_(Follow.follower_id == user_id, Follow.following_id == target_id)
        )
    )
    follow = result.scalar_one_or_none()
    if follow:
        await db.delete(follow)
        await db.commit()
    return {"success": True}


@router.get("/{username}/profile")
async def get_profile(
    username: str,
    db: AsyncSession = Depends(get_db)
):
    """Get user profile and follow counts."""
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Follower count
    followers = await db.execute(
        select(func.count(Follow.follower_id)).where(Follow.following_id == user.id)
    )
    follower_count = followers.scalar() or 0

    # Following count
    following = await db.execute(
        select(func.count(Follow.following_id)).where(Follow.follower_id == user.id)
    )
    following_count = following.scalar() or 0

    profile = user_to_dict(user)
    profile["followerCount"] = follower_count
    profile["followingCount"] = following_count
    
    return profile

class SparkRequest(BaseModel):
    spark_token: str

@router.post("/spark")
async def spark_user(req: SparkRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Validate a spark token from another user and connect them IRL."""
    result = await db.execute(select(User).where(User.spark_token == req.spark_token))
    host = result.scalar_one_or_none()
    if not host:
        raise HTTPException(status_code=400, detail="Invalid or expired spark token")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if host.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot spark yourself")
        
    user.is_sparked = True
    
    # Create mutual follow
    existing_u2h = await db.execute(select(Follow).where(and_(Follow.follower_id == user.id, Follow.following_id == host.id)))
    if not existing_u2h.scalar_one_or_none():
        db.add(Follow(follower_id=user.id, following_id=host.id))
        
    existing_h2u = await db.execute(select(Follow).where(and_(Follow.follower_id == host.id, Follow.following_id == user.id)))
    if not existing_h2u.scalar_one_or_none():
        db.add(Follow(follower_id=host.id, following_id=user.id))

    host.spark_token = str(uuid.uuid4())
    await db.commit()
    
    # Broadcast to both users
    from ws.manager import manager
    
    if manager.is_connected(user.id):
        await manager.send_to_user(user.id, {
            "type": "sparked",
            "partner_name": host.display_name,
            "partner_colors": host.theme_colors or ["#7C5FE6", "#00C9FF"]
        })
        
    if manager.is_connected(host.id):
        await manager.send_to_user(host.id, {
            "type": "sparked",
            "partner_name": user.display_name,
            "partner_colors": user.theme_colors or ["#7C5FE6", "#00C9FF"]
        })
        
    return {"success": True, "host": host.username}
