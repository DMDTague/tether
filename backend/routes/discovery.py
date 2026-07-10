"""Evidence-based, privacy-preserving friendship and dating discovery."""

from typing import List, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import Block, User
from routes.auth import get_current_user_id, user_to_dict
from services.presence import presence_store
from services.profile_signal import profile_signal_store
from services.vibe_engine import cosine_similarity

router = APIRouter(prefix="/api/discovery", tags=["discovery"])


class LocationUpdate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


def _artist_names(user: User) -> list[str]:
    names: list[str] = []
    for artist in getattr(user, "top_artists", None) or []:
        value = artist.get("name") if isinstance(artist, dict) else str(artist)
        if value:
            names.append(value.strip())
    return names


def _enrich_user_dict(user: User, extra: dict | None = None) -> dict:
    data = user_to_dict(user)
    data["topArtists"] = getattr(user, "top_artists", None) or []
    data.pop("adFreeUntil", None)
    if extra:
        data.update(extra)
    return data


def _confidence_label(similarity: float, evidence_count: int) -> str:
    if similarity >= 0.82 and evidence_count >= 2:
        return "high"
    if similarity >= 0.62 or evidence_count >= 2:
        return "medium"
    return "early"


@router.post("/location", status_code=204)
async def update_discovery_location(location: LocationUpdate, user_id: str = Depends(get_current_user_id)):
    await presence_store.set_user_location(user_id, location.latitude, location.longitude)
    return None


@router.get("/match")
async def match_vibes(
    mode: Literal["friends", "dating"] = Query(default="friends"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    current_user = result.scalar_one_or_none()
    if not current_user or getattr(current_user, "privacy_mode", None) == "ghost":
        return []

    current_signal = await profile_signal_store.get_profile(user_id)
    current_dating = current_signal["dating"]
    if mode == "dating" and not (current_dating.get("enabled") and current_dating.get("visible")):
        return []

    blocked_result = await db.execute(select(Block.blocked_phone_number).where(Block.blocker_id == user_id))
    blocked_phones = {value for value in blocked_result.scalars().all() if value}
    blocked_by_ids: set[str] = set()
    if current_user.phone_number:
        blockers_result = await db.execute(select(Block.blocker_id).where(Block.blocked_phone_number == current_user.phone_number))
        blocked_by_ids = set(blockers_result.scalars().all())

    all_users_result = await db.execute(select(User).where(User.id != user_id))
    current_vector = getattr(current_user, "vibe_vector", None) or []
    current_artists = {name.casefold(): name for name in _artist_names(current_user)}
    priority_artist = str(current_dating.get("priorityArtist") or "").casefold()
    dealbreaker_artist = str(current_dating.get("dealbreakerArtist") or "").casefold()
    candidates: list[tuple[float, User, dict]] = []

    for candidate in all_users_result.scalars().all():
        if candidate.id in blocked_by_ids or (candidate.phone_number and candidate.phone_number in blocked_phones):
            continue
        if getattr(candidate, "privacy_mode", None) == "ghost":
            continue

        candidate_signal = await profile_signal_store.get_profile(candidate.id)
        candidate_dating = candidate_signal["dating"]
        candidate_artists = _artist_names(candidate)
        folded_artists = {name.casefold() for name in candidate_artists}
        if mode == "dating":
            if not (candidate_dating.get("enabled") and candidate_dating.get("visible")):
                continue
            if dealbreaker_artist and dealbreaker_artist in folded_artists:
                continue

        distance_band = await presence_store.distance_band_between(user_id, candidate.id)
        if distance_band == "over_50_miles":
            continue
        similarity = 0.0
        other_vector = getattr(candidate, "vibe_vector", None) or []
        if current_vector and other_vector and len(current_vector) == len(other_vector):
            similarity = max(0.0, min(1.0, float(cosine_similarity(current_vector, other_vector))))
        shared = [name for name in candidate_artists if name.casefold() in current_artists][:3]
        presence = await presence_store.get_presence(candidate.id)
        evidence: list[dict] = []
        if shared:
            evidence.append({"type": "shared_artists", "label": f"{len(shared)} shared artist{'s' if len(shared) != 1 else ''}", "artists": shared})
        if mode == "dating" and priority_artist and priority_artist in folded_artists:
            evidence.append({"type": "priority_artist", "label": "Shares your priority artist"})
        if presence:
            evidence.append({"type": "available_now", "label": "Listening now"})
        if distance_band:
            labels = {"under_5_miles": "Same broad area", "5_to_15_miles": "Nearby in the city", "15_to_50_miles": "Within the region"}
            evidence.append({"type": "distance_band", "label": labels.get(distance_band, "Region available")})
        if similarity >= 0.7:
            evidence.append({"type": "listening_pattern", "label": "Similar listening pattern"})
        if not evidence:
            evidence.append({"type": "early_signal", "label": "New musical signal"})

        rank = similarity + min(len(shared), 3) * 0.08 + (0.07 if presence else 0.0) + (0.03 if distance_band == "under_5_miles" else 0.0)
        if mode == "dating" and priority_artist in folded_artists:
            rank += 0.12
        public_signal = await profile_signal_store.public_profile(candidate.id, include_dating=mode == "dating")
        payload = {
            "discoveryMode": mode,
            "matchEvidence": evidence,
            "matchConfidence": _confidence_label(similarity, len(evidence)),
            "distanceBand": distance_band,
            "profileAtmosphere": public_signal.get("atmosphere"),
            "datingSignal": public_signal.get("dating") if mode == "dating" else None,
            "vibePreview": {"trackName": presence.get("track", ""), "artistName": presence.get("artist", ""), "artUrl": presence.get("albumArt", ""), "provider": presence.get("provider", "")} if presence else None,
        }
        candidates.append((rank, candidate, payload))

    candidates.sort(key=lambda item: (-item[0], item[1].display_name.casefold()))
    out: List[dict] = []
    for _, candidate, payload in candidates[:20]:
        out.append(_enrich_user_dict(candidate, payload))
    return out
