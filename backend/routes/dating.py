"""Wavelength Dating: reciprocal eligibility and one explicit match state machine."""

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
from models.profile_models import (
    Community,
    CommunityMembership,
    DatingExposure,
    DatingMatch,
    DatingPreference,
    DatingProfile,
    SongSignal,
    SwipeDecision,
)
from routes.auth import get_current_user_id
from services.presence import presence_store
from services.safety_policy import is_blocked

router = APIRouter(prefix="/api/dating", tags=["dating"])
POSITIVE_DECISIONS = {"like", "signal"}


class SwipeCreate(BaseModel):
    target_user_id: str = Field(min_length=1, max_length=36)
    decision: Literal["pass", "save", "like", "signal"]
    reason: Literal[
        "show_again_later",
        "not_my_type",
        "too_far",
        "wrong_intent",
        "not_enough_information",
        "never_show_again",
    ] | None = None


class SongSignalCreate(BaseModel):
    recipient_id: str = Field(min_length=1, max_length=36)
    provider: Literal["spotify", "apple_music"]
    provider_track_id: str = Field(min_length=1, max_length=256)
    message: str = Field(default="", max_length=500)


class ExposureCreate(BaseModel):
    candidate_id: str = Field(min_length=1, max_length=36)
    proximity_band: str | None = Field(default=None, max_length=24)
    explanation: list[dict] = Field(default_factory=list, max_length=12)


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


def _intersects(required: list | None, actual: list | None) -> bool:
    if not required:
        return True
    return bool({str(value).casefold() for value in required} & {str(value).casefold() for value in actual or []})


async def _load_profile_bundle(db: AsyncSession, user_id: str):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    profile = (await db.execute(select(DatingProfile).where(DatingProfile.user_id == user_id))).scalar_one_or_none()
    preference = (await db.execute(select(DatingPreference).where(DatingPreference.user_id == user_id))).scalar_one_or_none()
    return user, profile, preference


def _reciprocal_eligibility(
    viewer: DatingProfile,
    viewer_pref: DatingPreference,
    candidate: DatingProfile,
    candidate_pref: DatingPreference,
) -> tuple[bool, list[str]]:
    viewer_age, candidate_age = _age(viewer.date_of_birth), _age(candidate.date_of_birth)
    if viewer_age is None or candidate_age is None:
        return False, []
    if not (viewer_pref.age_min <= candidate_age <= viewer_pref.age_max):
        return False, []
    if not (candidate_pref.age_min <= viewer_age <= candidate_pref.age_max):
        return False, []

    if viewer.show_me and candidate.gender_identity not in viewer.show_me:
        return False, []
    if candidate.show_me and viewer.gender_identity not in candidate.show_me:
        return False, []
    if viewer_pref.identities and candidate.gender_identity not in viewer_pref.identities:
        return False, []
    if candidate_pref.identities and viewer.gender_identity not in candidate_pref.identities:
        return False, []

    if viewer_pref.intents and candidate.intent not in viewer_pref.intents:
        return False, []
    if candidate_pref.intents and viewer.intent not in candidate_pref.intents:
        return False, []
    if viewer_pref.relationship_structures and candidate.relationship_structure not in viewer_pref.relationship_structures:
        return False, []
    if candidate_pref.relationship_structures and viewer.relationship_structure not in candidate_pref.relationship_structures:
        return False, []
    if not _intersects(viewer_pref.orientations, candidate.orientations):
        return False, []
    if not _intersects(candidate_pref.orientations, viewer.orientations):
        return False, []

    return True, [
        "reciprocal_age",
        "reciprocal_identity",
        "reciprocal_orientation",
        "reciprocal_intent",
        "reciprocal_relationship_structure",
    ]


async def _reconcile_match(
    db: AsyncSession,
    first_id: str,
    second_id: str,
    ended_by: str | None = None,
) -> DatingMatch | None:
    """Derive match state from the two current positive-interest decisions."""

    user_a, user_b = _ordered_pair(first_id, second_id)
    rows = await db.execute(
        select(SwipeDecision.actor_id, SwipeDecision.decision).where(
            or_(
                and_(SwipeDecision.actor_id == first_id, SwipeDecision.target_id == second_id),
                and_(SwipeDecision.actor_id == second_id, SwipeDecision.target_id == first_id),
            )
        )
    )
    decisions = {actor_id: decision for actor_id, decision in rows.all()}
    mutual = all(decisions.get(account_id) in POSITIVE_DECISIONS for account_id in (first_id, second_id))

    match = (
        await db.execute(
            select(DatingMatch)
            .where(DatingMatch.user_a == user_a, DatingMatch.user_b == user_b)
            .with_for_update()
        )
    ).scalar_one_or_none()

    if mutual:
        if not match:
            match = DatingMatch(user_a=user_a, user_b=user_b, status="active")
            db.add(match)
            await db.flush()
        else:
            match.status = "active"
            match.matched_at = _now()
            match.ended_at = None
            match.ended_by = None
        return match

    if match and match.status == "active":
        match.status = "interest_withdrawn"
        match.ended_at = _now()
        match.ended_by = ended_by
    return None


async def _require_eligible_pair(db: AsyncSession, first_id: str, second_id: str):
    if first_id == second_id or await is_blocked(db, first_id, second_id):
        raise HTTPException(status_code=404, detail="Profile not found")
    first_user, first_profile, first_pref = await _load_profile_bundle(db, first_id)
    second_user, second_profile, second_pref = await _load_profile_bundle(db, second_id)
    if not all([first_user, first_profile, first_pref, second_user, second_profile, second_pref]):
        raise HTTPException(status_code=404, detail="Profile not found")
    if not (first_profile.enabled and first_profile.visible and second_profile.enabled and second_profile.visible):
        raise HTTPException(status_code=404, detail="Profile not found")
    eligible, evidence = _reciprocal_eligibility(first_profile, first_pref, second_profile, second_pref)
    if not eligible:
        raise HTTPException(status_code=409, detail="Profiles are not reciprocally eligible")
    return first_user, first_profile, first_pref, second_user, second_profile, second_pref, evidence


@router.get("/discover")
async def discover_dating_profiles(
    limit: int = Query(default=20, ge=1, le=50),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    current_user, current_profile, current_pref = await _load_profile_bundle(db, user_id)
    if not current_user or not current_profile or not current_pref or not (
        current_profile.enabled and current_profile.visible and current_profile.completion >= 1.0
    ):
        return []

    decisions = await db.execute(
        select(SwipeDecision.target_id, SwipeDecision.decision, SwipeDecision.resurface_after).where(
            SwipeDecision.actor_id == user_id
        )
    )
    excluded, now = set(), _now()
    for target_id, decision, resurface_after in decisions.all():
        if decision in {"like", "signal", "save"} or (
            decision == "pass" and (resurface_after is None or resurface_after > now)
        ):
            excluded.add(target_id)

    current_communities = set(
        (
            await db.execute(
                select(CommunityMembership.community_id).where(CommunityMembership.user_id == user_id)
            )
        ).scalars().all()
    )
    profiles = await db.execute(
        select(DatingProfile).where(
            DatingProfile.user_id != user_id,
            DatingProfile.enabled.is_(True),
            DatingProfile.visible.is_(True),
            DatingProfile.completion >= 1.0,
        )
    )
    current_artists = {artist.casefold() for artist in _artist_names(current_user)}
    candidates = []
    for candidate_profile in profiles.scalars().all():
        candidate_id = candidate_profile.user_id
        if candidate_id in excluded or await is_blocked(db, user_id, candidate_id):
            continue
        candidate_user, _, candidate_pref = await _load_profile_bundle(db, candidate_id)
        if not candidate_user or not candidate_pref:
            continue
        eligible, eligibility_evidence = _reciprocal_eligibility(
            current_profile, current_pref, candidate_profile, candidate_pref
        )
        if not eligible:
            continue
        raw_band = await presence_store.distance_band_between(user_id, candidate_id)
        normalized_band = {
            "under_5_miles": "very_nearby",
            "5_to_15_miles": "nearby",
            "15_to_50_miles": "region",
            "over_50_miles": "farther_away",
            None: "city" if candidate_profile.city == current_profile.city else "unknown",
        }[raw_band]
        if normalized_band not in set(current_pref.proximity_bands or []):
            continue
        if normalized_band not in set(candidate_pref.proximity_bands or []):
            continue

        candidate_artists = _artist_names(candidate_user)
        shared_artists = [artist for artist in candidate_artists if artist.casefold() in current_artists][:3]
        candidate_communities = set(
            (
                await db.execute(
                    select(CommunityMembership.community_id).where(
                        CommunityMembership.user_id == candidate_id
                    )
                )
            ).scalars().all()
        )
        shared_community_ids = list(current_communities & candidate_communities)[:3]
        community_names = list(
            (
                await db.execute(select(Community.name).where(Community.id.in_(shared_community_ids)))
            ).scalars().all()
        ) if shared_community_ids else []

        if current_pref.communities and not candidate_communities.intersection(current_pref.communities):
            continue
        if candidate_pref.communities and not current_communities.intersection(candidate_pref.communities):
            continue

        evidence = [{"type": value, "provenance": "self_declared"} for value in eligibility_evidence]
        if shared_artists:
            evidence.append({"type": "shared_artists", "artists": shared_artists, "provenance": "imported_or_observed"})
        if community_names:
            evidence.append({"type": "shared_communities", "communities": community_names, "provenance": "self_declared"})
        evidence.append({"type": "proximity_band", "band": normalized_band, "provenance": "model_inferred"})
        tie = int(
            hashlib.sha256(f"{user_id}:{candidate_id}:{date.today().isoformat()}".encode()).hexdigest()[:8],
            16,
        ) / 0xFFFFFFFF
        rank = len(shared_artists) * 0.25 + len(community_names) * 0.2 + tie * 0.1
        payload = {
            "userId": candidate_id,
            "name": candidate_profile.first_name,
            "age": _age(candidate_profile.date_of_birth),
            "intent": candidate_profile.intent,
            "relationshipStructure": candidate_profile.relationship_structure,
            "bio": candidate_profile.bio,
            "prompt": candidate_profile.prompt,
            "promptAnswer": candidate_profile.prompt_answer,
            "topArtists": candidate_user.top_artists or [],
            "distanceBand": normalized_band,
            "whyThisPerson": evidence,
            "matchConfidence": "evidence_available" if len(evidence) > 2 else "early_signal",
        }
        candidates.append((rank, candidate_user.display_name.casefold(), payload))

    candidates.sort(key=lambda item: (-item[0], item[1]))
    # Discovery no longer records impressions merely because an API response was
    # generated. The client records a separate exposure when the card is shown.
    return [payload for _, _, payload in candidates[:limit]]


@router.post("/exposures", status_code=201)
async def record_dating_exposure(
    payload: ExposureCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _require_eligible_pair(db, user_id, payload.candidate_id)
    exposure = DatingExposure(
        viewer_id=user_id,
        candidate_id=payload.candidate_id,
        proximity_band=payload.proximity_band,
        explanation=payload.explanation,
    )
    db.add(exposure)
    await db.flush()
    return {"exposureId": exposure.id, "recordedWhen": "card_rendered"}


@router.post("/swipes", status_code=201)
async def record_swipe(
    payload: SwipeCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _require_eligible_pair(db, user_id, payload.target_user_id)
    decision = (
        await db.execute(
            select(SwipeDecision)
            .where(
                SwipeDecision.actor_id == user_id,
                SwipeDecision.target_id == payload.target_user_id,
            )
            .with_for_update()
        )
    ).scalar_one_or_none()
    if not decision:
        decision = SwipeDecision(
            actor_id=user_id,
            target_id=payload.target_user_id,
            decision=payload.decision,
        )
        db.add(decision)
    decision.decision = payload.decision
    decision.reason = payload.reason
    decision.undo_until = _now() + timedelta(seconds=10)
    decision.resurface_after = _now() + timedelta(days=30) if payload.reason == "show_again_later" else None
    await db.flush()

    match = await _reconcile_match(db, user_id, payload.target_user_id, ended_by=user_id)
    return {
        "decisionId": decision.id,
        "decision": decision.decision,
        "undoUntil": decision.undo_until.isoformat(),
        "matched": match is not None,
        "matchId": match.id if match else None,
    }


@router.post("/swipes/{decision_id}/undo")
async def undo_swipe(
    decision_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    decision = (
        await db.execute(
            select(SwipeDecision)
            .where(SwipeDecision.id == decision_id, SwipeDecision.actor_id == user_id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    if not decision.undo_until or decision.undo_until < _now():
        raise HTTPException(status_code=409, detail="Undo window expired")
    target_id = decision.target_id
    await db.delete(decision)
    await db.flush()
    await _reconcile_match(db, user_id, target_id, ended_by=user_id)
    return {"undone": True, "matchReconciled": True}


@router.post("/signals", status_code=201)
async def send_song_signal(
    payload: SongSignalCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _require_eligible_pair(db, user_id, payload.recipient_id)
    signal = SongSignal(
        sender_id=user_id,
        recipient_id=payload.recipient_id,
        provider=payload.provider,
        provider_track_id=payload.provider_track_id,
        message=payload.message,
    )
    db.add(signal)

    decision = (
        await db.execute(
            select(SwipeDecision)
            .where(
                SwipeDecision.actor_id == user_id,
                SwipeDecision.target_id == payload.recipient_id,
            )
            .with_for_update()
        )
    ).scalar_one_or_none()
    if not decision:
        decision = SwipeDecision(
            actor_id=user_id,
            target_id=payload.recipient_id,
            decision="signal",
        )
        db.add(decision)
    decision.decision = "signal"
    decision.reason = None
    decision.undo_until = _now() + timedelta(seconds=10)
    decision.resurface_after = None
    await db.flush()

    match = await _reconcile_match(db, user_id, payload.recipient_id, ended_by=user_id)
    return {
        "signalId": signal.id,
        "decisionId": decision.id,
        "status": "sent",
        "matched": match is not None,
        "matchId": match.id if match else None,
    }


@router.get("/matches")
async def list_matches(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DatingMatch).where(
            or_(DatingMatch.user_a == user_id, DatingMatch.user_b == user_id),
            DatingMatch.status == "active",
        )
    )
    matches = []
    for match in result.scalars().all():
        other_id = match.user_b if match.user_a == user_id else match.user_a
        user = (await db.execute(select(User).where(User.id == other_id))).scalar_one_or_none()
        if user and not await is_blocked(db, user_id, other_id):
            matches.append(
                {
                    "matchId": match.id,
                    "userId": other_id,
                    "displayName": user.display_name,
                    "matchedAt": match.matched_at.isoformat(),
                    "canMessage": True,
                    "canTether": True,
                }
            )
    return matches


@router.delete("/matches/{match_id}")
async def unmatch(
    match_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    match = (
        await db.execute(
            select(DatingMatch)
            .where(
                DatingMatch.id == match_id,
                or_(DatingMatch.user_a == user_id, DatingMatch.user_b == user_id),
                DatingMatch.status == "active",
            )
            .with_for_update()
        )
    ).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    other_id = match.user_b if match.user_a == user_id else match.user_a
    decision = (
        await db.execute(
            select(SwipeDecision).where(
                SwipeDecision.actor_id == user_id,
                SwipeDecision.target_id == other_id,
            )
        )
    ).scalar_one_or_none()
    if decision:
        decision.decision = "pass"
        decision.reason = "show_again_later"
        decision.resurface_after = _now() + timedelta(days=30)
        decision.undo_until = None
    match.status = "unmatched"
    match.ended_at = _now()
    match.ended_by = user_id
    return {"unmatched": True, "eligibleForRematchAfter": decision.resurface_after.isoformat() if decision and decision.resurface_after else None}
