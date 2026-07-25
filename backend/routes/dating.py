"""Wavelength Dating: reciprocal eligibility, musical gestures, and mutual matches."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import hashlib
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import User
from models.profile_models import Community, CommunityMembership, DatingExposure, DatingMatch, DatingPreference, DatingProfile, SongSignal, SwipeDecision
from models.safety_models import UserBlock
from routes.auth import get_current_user_id
from services.presence import presence_store

router = APIRouter(prefix="/api/dating", tags=["dating"])


class SwipeCreate(BaseModel):
    target_user_id: str = Field(min_length=1, max_length=36)
    decision: Literal["pass", "save", "like", "signal"]
    reason: Literal["show_again_later", "not_my_type", "too_far", "wrong_intent", "not_enough_information", "never_show_again"] | None = None


class SongSignalCreate(BaseModel):
    recipient_id: str = Field(min_length=1, max_length=36)
    provider: Literal["spotify", "apple_music"]
    provider_track_id: str = Field(min_length=1, max_length=256)
    message: str = Field(default="", max_length=500)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _age(dob: date | None) -> int | None:
    if not dob:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _artist_names(user: User) -> list[str]:
    values = []
    for artist in user.top_artists or []:
        value = artist.get("name") if isinstance(artist, dict) else str(artist)
        if value:
            values.append(value.strip())
    return values


def _ordered_pair(first: str, second: str) -> tuple[str, str]:
    return tuple(sorted((first, second)))


async def _is_blocked(db: AsyncSession, first: str, second: str) -> bool:
    result = await db.execute(select(UserBlock.id).where(or_(and_(UserBlock.blocker_id == first, UserBlock.blocked_user_id == second), and_(UserBlock.blocker_id == second, UserBlock.blocked_user_id == first))))
    return result.scalar_one_or_none() is not None


async def _load_profile_bundle(db: AsyncSession, user_id: str):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    profile = (await db.execute(select(DatingProfile).where(DatingProfile.user_id == user_id))).scalar_one_or_none()
    preference = (await db.execute(select(DatingPreference).where(DatingPreference.user_id == user_id))).scalar_one_or_none()
    return user, profile, preference


def _reciprocal_eligibility(viewer: DatingProfile, viewer_pref: DatingPreference, candidate: DatingProfile, candidate_pref: DatingPreference) -> tuple[bool, list[str]]:
    viewer_age, candidate_age = _age(viewer.date_of_birth), _age(candidate.date_of_birth)
    if viewer_age is None or candidate_age is None:
        return False, []
    if not (viewer_pref.age_min <= candidate_age <= viewer_pref.age_max) or not (candidate_pref.age_min <= viewer_age <= candidate_pref.age_max):
        return False, []
    if viewer.show_me and candidate.gender_identity not in viewer.show_me:
        return False, []
    if candidate.show_me and viewer.gender_identity not in candidate.show_me:
        return False, []
    if viewer_pref.intents and candidate.intent not in viewer_pref.intents:
        return False, []
    if candidate_pref.intents and viewer.intent not in candidate_pref.intents:
        return False, []
    return True, ["reciprocal_age", "reciprocal_identity", "reciprocal_intent"]


@router.get("/discover")
async def discover_dating_profiles(limit: int = Query(default=20, ge=1, le=50), user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    current_user, current_profile, current_pref = await _load_profile_bundle(db, user_id)
    if not current_user or not current_profile or not current_pref or not (current_profile.enabled and current_profile.visible and current_profile.completion >= 1.0):
        return []
    decisions = await db.execute(select(SwipeDecision.target_id, SwipeDecision.decision, SwipeDecision.resurface_after).where(SwipeDecision.actor_id == user_id))
    excluded, now = set(), _now()
    for target_id, decision, resurface_after in decisions.all():
        if decision in {"like", "signal", "save"} or (decision == "pass" and (resurface_after is None or resurface_after > now)):
            excluded.add(target_id)
    current_communities = set((await db.execute(select(CommunityMembership.community_id).where(CommunityMembership.user_id == user_id))).scalars().all())
    profiles = await db.execute(select(DatingProfile).where(DatingProfile.user_id != user_id, DatingProfile.enabled.is_(True), DatingProfile.visible.is_(True), DatingProfile.completion >= 1.0))
    current_artists = {artist.casefold() for artist in _artist_names(current_user)}
    candidates = []
    for candidate_profile in profiles.scalars().all():
        candidate_id = candidate_profile.user_id
        if candidate_id in excluded or await _is_blocked(db, user_id, candidate_id):
            continue
        candidate_user, _, candidate_pref = await _load_profile_bundle(db, candidate_id)
        if not candidate_user or not candidate_pref:
            continue
        eligible, eligibility_evidence = _reciprocal_eligibility(current_profile, current_pref, candidate_profile, candidate_pref)
        if not eligible:
            continue
        raw_band = await presence_store.distance_band_between(user_id, candidate_id)
        normalized_band = {"under_5_miles": "very_nearby", "5_to_15_miles": "nearby", "15_to_50_miles": "region", "over_50_miles": "farther_away", None: "city" if candidate_profile.city == current_profile.city else "unknown"}[raw_band]
        if normalized_band not in set(current_pref.proximity_bands or []) or normalized_band not in set(candidate_pref.proximity_bands or []):
            continue
        candidate_artists = _artist_names(candidate_user)
        shared_artists = [artist for artist in candidate_artists if artist.casefold() in current_artists][:3]
        candidate_communities = set((await db.execute(select(CommunityMembership.community_id).where(CommunityMembership.user_id == candidate_id))).scalars().all())
        shared_community_ids = list(current_communities & candidate_communities)[:3]
        community_names = list((await db.execute(select(Community.name).where(Community.id.in_(shared_community_ids)))).scalars().all()) if shared_community_ids else []
        evidence = [{"type": value, "provenance": "self_declared"} for value in eligibility_evidence]
        if shared_artists:
            evidence.append({"type": "shared_artists", "artists": shared_artists, "provenance": "imported_or_observed"})
        if community_names:
            evidence.append({"type": "shared_communities", "communities": community_names, "provenance": "self_declared"})
        evidence.append({"type": "proximity_band", "band": normalized_band, "provenance": "model_inferred"})
        tie = int(hashlib.sha256(f"{user_id}:{candidate_id}:{date.today().isoformat()}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF
        rank = len(shared_artists) * 0.25 + len(community_names) * 0.2 + candidate_profile.completion * 0.2 + tie * 0.1
        payload = {"userId": candidate_id, "name": candidate_profile.first_name, "age": _age(candidate_profile.date_of_birth), "intent": candidate_profile.intent, "relationshipStructure": candidate_profile.relationship_structure, "bio": candidate_profile.bio, "prompt": candidate_profile.prompt, "promptAnswer": candidate_profile.prompt_answer, "topArtists": candidate_user.top_artists or [], "distanceBand": normalized_band, "whyThisPerson": evidence, "matchConfidence": "evidence_available" if len(evidence) > 2 else "early_signal"}
        db.add(DatingExposure(viewer_id=user_id, candidate_id=candidate_id, proximity_band=normalized_band, explanation=evidence))
        candidates.append((rank, candidate_user.display_name.casefold(), payload))
    candidates.sort(key=lambda item: (-item[0], item[1]))
    return [payload for _, _, payload in candidates[:limit]]


@router.post("/swipes", status_code=201)
async def record_swipe(payload: SwipeCreate, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    if payload.target_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot swipe yourself")
    current_user, current_profile, current_pref = await _load_profile_bundle(db, user_id)
    target_user, target_profile, target_pref = await _load_profile_bundle(db, payload.target_user_id)
    if not all([current_user, current_profile, current_pref, target_user, target_profile, target_pref]) or await _is_blocked(db, user_id, payload.target_user_id):
        raise HTTPException(status_code=404, detail="Profile not found")
    eligible, _ = _reciprocal_eligibility(current_profile, current_pref, target_profile, target_pref)
    if not eligible:
        raise HTTPException(status_code=409, detail="Profiles are not reciprocally eligible")
    decision = (await db.execute(select(SwipeDecision).where(SwipeDecision.actor_id == user_id, SwipeDecision.target_id == payload.target_user_id))).scalar_one_or_none()
    if not decision:
        decision = SwipeDecision(actor_id=user_id, target_id=payload.target_user_id, decision=payload.decision)
        db.add(decision)
    decision.decision, decision.reason = payload.decision, payload.reason
    decision.undo_until = _now() + timedelta(seconds=10)
    decision.resurface_after = _now() + timedelta(days=30) if payload.reason == "show_again_later" else None
    matched, match_id = False, None
    if payload.decision in {"like", "signal"}:
        reciprocal = (await db.execute(select(SwipeDecision).where(SwipeDecision.actor_id == payload.target_user_id, SwipeDecision.target_id == user_id, SwipeDecision.decision.in_(["like", "signal"])))).scalar_one_or_none()
        if reciprocal:
            user_a, user_b = _ordered_pair(user_id, payload.target_user_id)
            match = (await db.execute(select(DatingMatch).where(DatingMatch.user_a == user_a, DatingMatch.user_b == user_b, DatingMatch.status == "active"))).scalar_one_or_none()
            if not match:
                match = DatingMatch(user_a=user_a, user_b=user_b)
                db.add(match)
                await db.flush()
            matched, match_id = True, match.id
    await db.flush()
    return {"decisionId": decision.id, "decision": decision.decision, "undoUntil": decision.undo_until.isoformat(), "matched": matched, "matchId": match_id}


@router.post("/swipes/{decision_id}/undo")
async def undo_swipe(decision_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    decision = (await db.execute(select(SwipeDecision).where(SwipeDecision.id == decision_id, SwipeDecision.actor_id == user_id))).scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    if not decision.undo_until or decision.undo_until < _now():
        raise HTTPException(status_code=409, detail="Undo window expired")
    await db.delete(decision)
    return {"undone": True}


@router.post("/signals", status_code=201)
async def send_song_signal(payload: SongSignalCreate, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    if payload.recipient_id == user_id or await _is_blocked(db, user_id, payload.recipient_id):
        raise HTTPException(status_code=404, detail="Profile not found")
    _, sender_profile, sender_pref = await _load_profile_bundle(db, user_id)
    _, recipient_profile, recipient_pref = await _load_profile_bundle(db, payload.recipient_id)
    if not sender_profile or not sender_pref or not recipient_profile or not recipient_pref or not _reciprocal_eligibility(sender_profile, sender_pref, recipient_profile, recipient_pref)[0]:
        raise HTTPException(status_code=409, detail="Profiles are not reciprocally eligible")
    signal = SongSignal(sender_id=user_id, recipient_id=payload.recipient_id, provider=payload.provider, provider_track_id=payload.provider_track_id, message=payload.message)
    db.add(signal)
    await db.flush()
    return {"signalId": signal.id, "status": "sent"}


@router.get("/matches")
async def list_matches(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DatingMatch).where(or_(DatingMatch.user_a == user_id, DatingMatch.user_b == user_id), DatingMatch.status == "active"))
    matches = []
    for match in result.scalars().all():
        other_id = match.user_b if match.user_a == user_id else match.user_a
        user = (await db.execute(select(User).where(User.id == other_id))).scalar_one_or_none()
        if user and not await _is_blocked(db, user_id, other_id):
            matches.append({"matchId": match.id, "userId": other_id, "displayName": user.display_name, "matchedAt": match.matched_at.isoformat(), "canMessage": True, "canTether": True})
    return matches


@router.delete("/matches/{match_id}")
async def unmatch(match_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    match = (await db.execute(select(DatingMatch).where(DatingMatch.id == match_id, or_(DatingMatch.user_a == user_id, DatingMatch.user_b == user_id), DatingMatch.status == "active"))).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    match.status, match.ended_at, match.ended_by = "unmatched", _now(), user_id
    return {"unmatched": True}
