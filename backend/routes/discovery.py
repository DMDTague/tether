"""Evidence-based, privacy-preserving friendship and Dating discovery."""

from datetime import date
import hashlib
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import User
from models.profile_models import PublicProfile
from models.safety_models import UserBlock
from models.taste_models import UserArtistAggregate
from routes.auth import get_current_user_id, user_to_dict
from services.presence import presence_store

router = APIRouter(prefix="/api/discovery", tags=["discovery"])


class LocationUpdate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


def _artist_names(user: User) -> list[str]:
    names: list[str] = []
    for artist in user.top_artists or []:
        value = artist.get("name") if isinstance(artist, dict) else str(artist)
        if value:
            names.append(value.strip())
    return names


async def _is_blocked(db: AsyncSession, first_id: str, second_id: str) -> bool:
    result = await db.execute(select(UserBlock.id).where(or_(and_(UserBlock.blocker_id == first_id, UserBlock.blocked_user_id == second_id), and_(UserBlock.blocker_id == second_id, UserBlock.blocked_user_id == first_id))))
    return result.scalar_one_or_none() is not None


@router.post("/location", status_code=204)
async def update_discovery_location(location: LocationUpdate, user_id: str = Depends(get_current_user_id)):
    await presence_store.set_user_location(user_id, location.latitude, location.longitude)
    return None


@router.get("/match")
async def match_people(mode: Literal["friends", "dating"] = Query(default="friends"), user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    if mode == "dating":
        from routes.dating import discover_dating_profiles
        return await discover_dating_profiles(limit=20, user_id=user_id, db=db)

    current_user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not current_user or current_user.privacy_mode == "ghost":
        return []
    current_artists = {name.casefold(): name for name in _artist_names(current_user)}
    aggregate_result = await db.execute(select(UserArtistAggregate.artist_key).where(UserArtistAggregate.user_id == user_id))
    current_artist_keys = set(aggregate_result.scalars().all()) | set(current_artists)

    candidates: list[tuple[float, str, dict]] = []
    for candidate in (await db.execute(select(User).where(User.id != user_id))).scalars().all():
        if candidate.privacy_mode == "ghost" or await _is_blocked(db, user_id, candidate.id):
            continue
        raw_band = await presence_store.distance_band_between(user_id, candidate.id)
        normalized_band = {"under_5_miles": "very_nearby", "5_to_15_miles": "nearby", "15_to_50_miles": "region", "over_50_miles": "farther_away", None: "unknown"}[raw_band]
        candidate_artists = _artist_names(candidate)
        candidate_keys = set((await db.execute(select(UserArtistAggregate.artist_key).where(UserArtistAggregate.user_id == candidate.id))).scalars().all()) | {artist.casefold() for artist in candidate_artists}
        shared_keys = current_artist_keys & candidate_keys
        shared = [name for name in candidate_artists if name.casefold() in shared_keys][:3]
        presence = await presence_store.get_presence(candidate.id)
        public_profile = (await db.execute(select(PublicProfile).where(PublicProfile.user_id == candidate.id))).scalar_one_or_none()
        evidence: list[dict] = []
        if shared:
            evidence.append({"type": "shared_artists", "label": f"{len(shared)} shared artist{'s' if len(shared) != 1 else ''}", "artists": shared, "provenance": "imported_or_observed"})
        if presence:
            evidence.append({"type": "available_now", "label": "Listening now", "provenance": "observed"})
        if normalized_band != "unknown":
            evidence.append({"type": "distance_band", "label": {"very_nearby": "Very nearby", "nearby": "Nearby", "region": "Within the region", "farther_away": "Farther away"}[normalized_band], "provenance": "model_inferred"})
        if not evidence:
            evidence.append({"type": "early_signal", "label": "New musical signal", "provenance": "observed"})
        tie = int(hashlib.sha256(f"friends:{user_id}:{candidate.id}:{date.today().isoformat()}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF
        # Exact or relative distance never contributes inside the broad band.
        rank = min(len(shared), 3) * 0.3 + (0.15 if presence else 0.0) + ((public_profile.completeness if public_profile else 0.0) * 0.2) + tie * 0.1
        payload = user_to_dict(candidate)
        payload.pop("adFreeUntil", None)
        payload.update({"topArtists": candidate.top_artists or [], "discoveryMode": "friends", "matchEvidence": evidence, "matchConfidence": "evidence_available" if len(evidence) > 1 else "early_signal", "distanceBand": normalized_band, "profileAtmosphere": {"statement": public_profile.statement if public_profile else "", "topFive": (public_profile.top_five or []) if public_profile else [], "completeness": public_profile.completeness if public_profile else 0.0}, "vibePreview": {"trackName": presence.get("track", ""), "artistName": presence.get("artist", ""), "artUrl": presence.get("albumArt", ""), "provider": presence.get("provider", "")} if presence else None})
        candidates.append((rank, candidate.display_name.casefold(), payload))
    candidates.sort(key=lambda item: (-item[0], item[1]))
    return [payload for _, _, payload in candidates[:20]]
