"""Taste Graph ingestion and explainable recommendations."""

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import CanonicalTrack, ProviderTrackMatch, User
from models.safety_models import UserBlock
from models.taste_models import ListenEvent, RecommendationExposure, RecommendationOutcome, UserArtistAggregate, UserTrackAggregate
from routes.auth import get_current_user_id, user_to_dict

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


class ListenEventCreate(BaseModel):
    provider: Literal["spotify", "apple_music", "manual", "tether"]
    providerTrackId: str = Field(min_length=1, max_length=256)
    eventType: Literal["start", "progress", "complete", "skip", "save", "tether"]
    progressMs: int | None = Field(default=None, ge=0)
    durationMs: int | None = Field(default=None, ge=1)
    occurredAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: Literal["observed", "provider_import", "manual"] = "observed"


class OutcomeCreate(BaseModel):
    outcomeType: Literal["opened", "played", "saved", "dismissed", "tethered", "followed", "reported"]


def _confidence(count: int) -> tuple[float, str]:
    return (0.85, "high") if count >= 25 else ((0.62, "medium") if count >= 8 else (0.35, "early"))


async def _track(db, provider: str, provider_id: str):
    match = (await db.execute(select(ProviderTrackMatch).where(ProviderTrackMatch.provider == provider, ProviderTrackMatch.provider_track_id == provider_id, ProviderTrackMatch.confidence >= 0.95))).scalar_one_or_none()
    return None if not match else (await db.execute(select(CanonicalTrack).where(CanonicalTrack.id == match.canonical_track_id))).scalar_one_or_none()


@router.post("/listens", status_code=202)
async def record_listen(payload: ListenEventCreate, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    track = await _track(db, payload.provider, payload.providerTrackId)
    db.add(ListenEvent(user_id=user_id, canonical_track_id=track.id if track else None, provider=payload.provider, provider_track_id=payload.providerTrackId, event_type=payload.eventType, progress_ms=payload.progressMs, duration_ms=payload.durationMs, source=payload.source, occurred_at=payload.occurredAt))
    if track:
        aggregate = (await db.execute(select(UserTrackAggregate).where(UserTrackAggregate.user_id == user_id, UserTrackAggregate.canonical_track_id == track.id))).scalar_one_or_none()
        if not aggregate:
            aggregate = UserTrackAggregate(user_id=user_id, canonical_track_id=track.id)
            db.add(aggregate)
        field = {"start": "play_count", "complete": "completion_count", "skip": "skip_count", "save": "save_count", "tether": "tether_count"}.get(payload.eventType)
        if field:
            setattr(aggregate, field, getattr(aggregate, field) + 1)
        if payload.eventType == "start":
            aggregate.last_played_at = payload.occurredAt
        artist_key = track.artist.strip().casefold()
        artist = (await db.execute(select(UserArtistAggregate).where(UserArtistAggregate.user_id == user_id, UserArtistAggregate.artist_key == artist_key))).scalar_one_or_none()
        if not artist:
            artist = UserArtistAggregate(user_id=user_id, artist_key=artist_key, artist_name=track.artist)
            db.add(artist)
        artist_field = {"start": "play_count", "complete": "completion_count", "save": "save_count", "tether": "tether_count"}.get(payload.eventType)
        if artist_field:
            setattr(artist, artist_field, getattr(artist, artist_field) + 1)
    return {"accepted": True, "canonicalTrackId": track.id if track else None, "provenance": payload.source, "normalizationStatus": "matched" if track else "unresolved"}


@router.get("/tracks")
async def recommend_tracks(surface: Literal["listen", "profile", "exchange", "dating"] = Query(default="listen"), limit: int = Query(default=20, ge=1, le=50), user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    mine = (await db.execute(select(UserTrackAggregate).where(UserTrackAggregate.user_id == user_id))).scalars().all()
    listened = {row.canonical_track_id for row in mine}
    evidence_count = sum(row.play_count + row.completion_count + row.save_count + row.tether_count for row in mine)
    confidence, label = _confidence(evidence_count)
    rows = await db.execute(select(CanonicalTrack, func.sum(UserTrackAggregate.completion_count), func.sum(UserTrackAggregate.save_count), func.sum(UserTrackAggregate.tether_count), func.sum(UserTrackAggregate.skip_count)).join(UserTrackAggregate).where(UserTrackAggregate.user_id != user_id).group_by(CanonicalTrack.id))
    ranked = []
    for track, completes, saves, tethers, skips in rows.all():
        if track.id not in listened:
            ranked.append((((completes or 0) + 2 * (saves or 0) + 4 * (tethers or 0) - .5 * (skips or 0)), track, int(completes or 0), int(saves or 0), int(tethers or 0)))
    ranked.sort(key=lambda row: (-row[0], row[1].artist.casefold(), row[1].title.casefold()))
    output = []
    for _, track, completes, saves, tethers in ranked[:limit]:
        explanation = {"statement": "You have no observed listen for this track; this is a probabilistic suggestion.", "evidence": {"communityCompletions": completes, "communitySaves": saves, "sharedTethers": tethers, "yourObservedEvidenceCount": evidence_count}, "provenance": "observed_aggregate", "confidenceLabel": label}
        exposure = RecommendationExposure(user_id=user_id, object_type="track", object_id=track.id, surface=surface, provenance="observed_aggregate", confidence=confidence, explanation=explanation, no_observed_listen=True)
        db.add(exposure)
        await db.flush()
        output.append({"exposureId": exposure.id, "track": {"id": track.id, "title": track.title, "artist": track.artist, "album": track.album, "artworkUrl": track.artwork_url}, "confidence": confidence, "confidenceLabel": label, "noObservedListen": True, "explanation": explanation, "actions": ["listen", "send", "tether", "save", "not_for_me"]})
    return {"recommendations": output, "model": "taste-graph-v1", "evidenceCount": evidence_count}


@router.get("/friends")
async def suggest_friends(limit: int = Query(default=10, ge=1, le=25), user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    mine = (await db.execute(select(UserArtistAggregate).where(UserArtistAggregate.user_id == user_id))).scalars().all()
    my_artists = {row.artist_key: row for row in mine}
    if not my_artists:
        return []
    blocks = (await db.execute(select(UserBlock).where(or_(UserBlock.blocker_id == user_id, UserBlock.blocked_user_id == user_id)))).scalars().all()
    excluded = {user_id, *[block.blocked_user_id if block.blocker_id == user_id else block.blocker_id for block in blocks]}
    suggestions = []
    for other in (await db.execute(select(User).where(User.id.notin_(excluded)))).scalars().all():
        overlap = [row for row in (await db.execute(select(UserArtistAggregate).where(UserArtistAggregate.user_id == other.id))).scalars().all() if row.artist_key in my_artists]
        if not overlap:
            continue
        strength = sum(min(row.play_count, my_artists[row.artist_key].play_count) + 2 * min(row.save_count, my_artists[row.artist_key].save_count) + 4 * min(row.tether_count, my_artists[row.artist_key].tether_count) for row in overlap)
        profile = user_to_dict(other)
        profile.update({"matchEvidence": [{"type": "observed_artist", "artist": row.artist_name, "provenance": "observed_aggregate"} for row in overlap[:3]], "matchConfidence": _confidence(len(overlap))[1], "rankSignal": strength})
        suggestions.append(profile)
    suggestions.sort(key=lambda item: (-item["rankSignal"], item["displayName"].casefold()))
    return suggestions[:limit]


@router.post("/exposures/{exposure_id}/outcomes", status_code=201)
async def record_outcome(exposure_id: str, payload: OutcomeCreate, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    exposure = (await db.execute(select(RecommendationExposure).where(RecommendationExposure.id == exposure_id, RecommendationExposure.user_id == user_id))).scalar_one_or_none()
    if not exposure:
        raise HTTPException(status_code=404, detail="Recommendation exposure not found")
    existing = (await db.execute(select(RecommendationOutcome).where(RecommendationOutcome.exposure_id == exposure_id, RecommendationOutcome.outcome_type == payload.outcomeType))).scalar_one_or_none()
    if not existing:
        db.add(RecommendationOutcome(exposure_id=exposure_id, outcome_type=payload.outcomeType))
    return {"recorded": True, "outcomeType": payload.outcomeType}
