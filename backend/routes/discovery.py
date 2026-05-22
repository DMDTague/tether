from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import random

from db.database import get_db
from models.models import User, Block
from routes.auth import get_current_user_id, user_to_dict
from services.presence import presence_store
from services.vibe_engine import cosine_similarity
from services.spotify import search_track
from services.geo import haversine_miles

router = APIRouter(prefix="/api/discovery", tags=["discovery"])

RADIUS_MILES = 50.0


def _enrich_user_dict(user: User, extra: dict | None = None) -> dict:
    data = user_to_dict(user)
    data["topArtists"] = getattr(user, "top_artists", None) or []
    if user.phone_number:
        data["phoneNumber"] = user.phone_number
    if extra:
        data.update(extra)
    return data


@router.get("/match")
async def match_vibes(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    lat: Optional[float] = Query(default=None),
    lon: Optional[float] = Query(default=None),
):
    """
    Randomized discovery feed within 50 miles, ranked by musical compatibility.
    Filters blocked users. Stores caller location when lat/lon provided.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    current_user = result.scalar_one_or_none()
    if not current_user:
        return []

    if getattr(current_user, "privacy_mode", None) == "ghost":
        return []

    if lat is not None and lon is not None:
        await presence_store.set_user_location(user_id, lat, lon)

    blocked_result = await db.execute(
        select(Block.blocked_phone_number).where(Block.blocker_id == user_id)
    )
    blocked_phones = [r for r in blocked_result.scalars().all() if r]

    if current_user.phone_number:
        blockers_result = await db.execute(
            select(Block.blocker_id).where(
                Block.blocked_phone_number == current_user.phone_number
            )
        )
        blocked_by_ids = [r for r in blockers_result.scalars().all()]
    else:
        blocked_by_ids = []

    all_users_result = await db.execute(select(User).where(User.id != user_id))
    all_users = all_users_result.scalars().all()

    caller_loc = await presence_store.get_user_location(user_id)
    if lat is not None and lon is not None:
        caller_loc = {"lat": lat, "lon": lon}

    all_locs = await presence_store.get_all_user_locations()
    current_vector = getattr(current_user, "vibe_vector", None) or []

    scored: list[tuple[float, User]] = []
    for u in all_users:
        if u.id in blocked_by_ids:
            continue
        if u.phone_number and u.phone_number in blocked_phones:
            continue
        if getattr(u, "privacy_mode", None) == "ghost":
            continue

        if caller_loc:
            other_loc = all_locs.get(u.id)
            if other_loc:
                dist = haversine_miles(
                    caller_loc["lat"],
                    caller_loc["lon"],
                    other_loc["lat"],
                    other_loc["lon"],
                )
                if dist > RADIUS_MILES:
                    continue

        similarity = 0.5
        other_vector = getattr(u, "vibe_vector", None)
        if current_vector and other_vector and len(current_vector) == len(other_vector):
            similarity = cosine_similarity(current_vector, other_vector)

        scored.append((similarity + random.random() * 0.15, u))

    scored.sort(key=lambda x: x[0], reverse=True)
    pool = scored[:40]
    random.shuffle(pool)
    candidates = [(s, u) for s, u in pool[:20]]

    out: List[dict] = []
    for score, u in candidates:
        vibe_preview = None
        artists = getattr(u, "top_artists", None) or []
        if artists:
            first = artists[0]
            name = first.get("name") if isinstance(first, dict) else str(first)
            spotify = await search_track(name, name)
            if spotify:
                vibe_preview = {
                    "trackName": spotify.get("name", name),
                    "artistName": spotify.get("artist", name),
                    "previewUrl": spotify.get("previewUrl") or "",
                    "artUrl": spotify.get("artUrl") or "",
                    "uri": spotify.get("uri") or "",
                }
        compat = min(99, max(50, int(score * 100)))
        out.append(_enrich_user_dict(u, {"vibePreview": vibe_preview, "compatibility": compat}))

    return out
