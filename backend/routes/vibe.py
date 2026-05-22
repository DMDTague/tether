from routes.auth import get_current_user_id
"""
Tether Vibe Routes

Endpoints for the Spotify Vibe Engine:
- POST /api/vibe/update — Process a track's audio features into vibe data
- GET  /api/vibe/me — Get current user's vibe state
- GET  /api/vibe/matches — Find online users with similar vibes (Cosine Similarity)
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from db.database import get_db
from models.models import User
from services.spotify import get_audio_features, get_audio_features_for_user_token
from services.vibe_engine import (
    audio_features_to_vector,
    vector_to_color_palette,
    vector_to_shader_params,
    cosine_similarity,
)
from services.presence import presence_store

router = APIRouter(prefix="/api/vibe", tags=["vibe"])


# ── Request / Response Models ─────────────────────────────────

class VibeUpdateRequest(BaseModel):
    track_id: str
    spotify_token: Optional[str] = None  # User's Spotify OAuth token for direct API access


class ShaderParamsResponse(BaseModel):
    amplitude: float
    frequency: float
    speed: float
    warmth: float


class VibeResponse(BaseModel):
    vibe_vector: list[float]
    color_palette: list[str]
    shader_params: ShaderParamsResponse


class SparkMatchResponse(BaseModel):
    user_id: str
    display_name: str
    initials: str
    similarity: float  # 0–1
    color_palette: list[str]


# ── POST /api/vibe/update ─────────────────────────────────────

@router.post("/update", response_model=VibeResponse)
async def update_vibe(
    req: VibeUpdateRequest,
    user_id: str = Depends(get_current_user_id),  # In production, from auth dependency
    db: AsyncSession = Depends(get_db),
):
    """
    Process a track's audio features into a complete vibe state.
    
    1. Fetches audio features from Spotify for the given track ID
    2. Extracts a normalized 4D vibe vector
    3. Derives a color palette via HSL math
    4. Computes Skia shader parameters
    5. Stores the vector on the user and in presence cache
    """
    # Fetch audio features — prefer user token if provided
    if req.spotify_token:
        features = await get_audio_features_for_user_token(req.track_id, req.spotify_token)
    else:
        features = await get_audio_features(req.track_id)

    # Compute vibe data
    vector = audio_features_to_vector(features)
    palette = vector_to_color_palette(vector)
    shader = vector_to_shader_params(vector)

    # Persist to database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        user.vibe_vector = vector
        user.vibe_updated_at = datetime.now(timezone.utc)
        user.theme_colors = palette
        await db.commit()

    # Cache in presence store for real-time matching
    await presence_store.set_vibe_vector(user_id, vector)

    return VibeResponse(
        vibe_vector=vector,
        color_palette=palette,
        shader_params=ShaderParamsResponse(**shader),
    )


# ── GET /api/vibe/me ──────────────────────────────────────────

@router.get("/me", response_model=Optional[VibeResponse])
async def get_my_vibe(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the calling user's current vibe state.
    
    Returns their stored vector, derived palette, and shader params.
    Returns null if no vibe vector has been computed yet.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.vibe_vector:
        return None

    vector = user.vibe_vector
    palette = vector_to_color_palette(vector)
    shader = vector_to_shader_params(vector)

    return VibeResponse(
        vibe_vector=vector,
        color_palette=palette,
        shader_params=ShaderParamsResponse(**shader),
    )


# ── GET /api/vibe/matches ────────────────────────────────────

@router.get("/matches")
async def get_spark_matches(
    min_similarity: float = Query(default=0.6, ge=0.0, le=1.0),
    limit: int = Query(default=20, ge=1, le=50),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Find online users with similar vibes using Cosine Similarity.
    
    Queries all online users from the presence store, computes
    cosine similarity of the caller's vector against each, and
    returns matches ranked by similarity (descending).
    
    Only returns matches above the min_similarity threshold.
    """
    # Get caller's vector
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.vibe_vector:
        return []

    my_vector = user.vibe_vector

    # Get all online users with vectors
    online_users = await presence_store.get_online_users_with_vectors()

    # Compute similarity for each
    matches = []
    for online in online_users:
        other_id = online["userId"]
        if other_id == user_id:
            continue

        other_vector = online["vector"]
        sim = cosine_similarity(my_vector, other_vector)

        if sim >= min_similarity:
            # Fetch user profile for display
            other_result = await db.execute(select(User).where(User.id == other_id))
            other_user = other_result.scalar_one_or_none()
            if other_user:
                matches.append({
                    "userId": other_id,
                    "displayName": other_user.display_name,
                    "initials": other_user.initials,
                    "similarity": round(sim, 3),
                    "colorPalette": vector_to_color_palette(other_vector),
                })

    # Sort by similarity descending
    matches.sort(key=lambda m: m["similarity"], reverse=True)

    return matches[:limit]
