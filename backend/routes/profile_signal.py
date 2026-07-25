"""Canonical profile projection, field visibility, and explicit Dating onboarding."""

from datetime import date, datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import User
from models.profile_models import (
    DatingMatch,
    DatingPreference,
    DatingProfile,
    MediaAsset,
    ProfileField,
    ProfileMedia,
    PublicProfile,
)
from routes.auth import get_current_user_id
from services.safety_policy import is_blocked

router = APIRouter(prefix="/api/profile-signal", tags=["profile-signal"])


def _age(dob: date | None) -> int | None:
    if not dob:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


class Atmosphere(BaseModel):
    statement: str = Field(default="", max_length=240)
    palette: list[str] = Field(default_factory=list, max_length=5)
    motion: Literal["liquid-signal", "aura", "waves", "still"] = "liquid-signal"
    topFive: list[str] = Field(default_factory=list, max_length=5)
    pronouns: str = Field(default="", max_length=80)
    hometown: str = Field(default="", max_length=120)
    work: str = Field(default="", max_length=160)
    school: str = Field(default="", max_length=160)
    concertHabits: str = Field(default="", max_length=1000)
    favoriteVenues: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("palette")
    @classmethod
    def valid_palette(cls, values):
        for value in values:
            if len(value) != 7 or not value.startswith("#"):
                raise ValueError("Palette colors must use six-digit hex notation")
            int(value[1:], 16)
        return values


class FieldValue(BaseModel):
    key: str = Field(min_length=1, max_length=64)
    value: Any = None
    visibility: Literal["public", "after_match", "filter_only", "do_not_use"] = "public"


class DatingSignal(BaseModel):
    enabled: bool = False
    visible: bool = False
    firstName: str = Field(default="", max_length=64)
    dateOfBirth: date | None = None
    genderIdentity: str = Field(default="", max_length=120)
    showMe: list[str] = Field(default_factory=list, max_length=20)
    orientations: list[str] = Field(default_factory=list, max_length=20)
    intent: str = Field(default="", max_length=120)
    relationshipStructure: str = Field(default="", max_length=120)
    bio: str = Field(default="", max_length=2000)
    prompt: str = Field(default="", max_length=180)
    promptAnswer: str = Field(default="", max_length=500)
    city: str = Field(default="", max_length=120)
    locationConsent: bool = False
    safetyAcknowledged: bool = False
    mediaIds: list[str] = Field(default_factory=list, max_length=9)
    ageMin: int = Field(default=18, ge=18, le=99)
    ageMax: int = Field(default=99, ge=18, le=99)
    proximityBands: list[Literal["very_nearby", "nearby", "city", "region"]] = Field(
        default_factory=lambda: ["nearby", "city", "region"]
    )
    intents: list[str] = Field(default_factory=list)
    identities: list[str] = Field(default_factory=list)
    orientationsAccepted: list[str] = Field(default_factory=list)
    relationshipStructures: list[str] = Field(default_factory=list)
    communities: list[str] = Field(default_factory=list)
    genres: list[str] = Field(default_factory=list)
    bodyFilters: dict[str, Any] = Field(default_factory=dict)
    dealbreakers: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_activation(self):
        if self.ageMax < self.ageMin:
            raise ValueError("ageMax must be greater than or equal to ageMin")
        if self.visible and not self.enabled:
            raise ValueError("Dating visibility requires Dating to be enabled")
        if self.enabled:
            declared_age = _age(self.dateOfBirth)
            if declared_age is None or declared_age < 18:
                raise ValueError("Dating is restricted to declared adults age 18+")
            required = [
                self.firstName,
                self.genderIdentity,
                self.showMe,
                self.intent,
                self.bio,
                self.city,
            ]
            if not all(required) or not self.locationConsent or not self.safetyAcknowledged:
                raise ValueError("Complete the required Dating profile, safety step, and location consent")
        return self


class ProfileSignalUpdate(BaseModel):
    atmosphere: Atmosphere
    fields: list[FieldValue] = Field(default_factory=list, max_length=100)
    dating: DatingSignal


async def _has_active_match(db: AsyncSession, first_id: str, second_id: str) -> bool:
    user_a, user_b = sorted((first_id, second_id))
    match_id = await db.scalar(
        select(DatingMatch.id).where(
            DatingMatch.user_a == user_a,
            DatingMatch.user_b == user_b,
            DatingMatch.status == "active",
        )
    )
    return match_id is not None


async def _approved_public_media_ids(db: AsyncSession, user_id: str) -> list[str]:
    rows = await db.execute(
        select(ProfileMedia.media_id)
        .join(MediaAsset, MediaAsset.id == ProfileMedia.media_id)
        .where(
            ProfileMedia.user_id == user_id,
            ProfileMedia.visibility == "public",
            MediaAsset.owner_id == user_id,
            MediaAsset.moderation_state == "approved",
            or_(
                MediaAsset.mime_type.like("image/%"),
                MediaAsset.mime_type.like("video/%"),
            ),
        )
        .order_by(ProfileMedia.position)
    )
    return list(rows.scalars().all())


async def _dating_readiness(db: AsyncSession, dating: DatingProfile | None) -> dict:
    if not dating:
        return {"ready": False, "reasons": ["profile_missing"], "approvedMediaCount": 0}
    approved_media = await _approved_public_media_ids(db, dating.user_id)
    reasons = []
    declared_age = _age(dating.date_of_birth)
    if declared_age is None or declared_age < 18:
        reasons.append("declared_adult_eligibility_missing")
    if not all([dating.first_name, dating.gender_identity, dating.show_me, dating.intent, dating.bio, dating.city]):
        reasons.append("required_fields_incomplete")
    if not dating.location_consent:
        reasons.append("location_consent_missing")
    if not dating.safety_acknowledged_at:
        reasons.append("safety_acknowledgement_missing")
    if len(set(approved_media)) < 2:
        reasons.append("two_approved_public_media_required")
    return {
        "ready": not reasons,
        "reasons": reasons,
        "approvedMediaCount": len(set(approved_media)),
        "ageStatus": "self_declared_eligible" if declared_age is not None and declared_age >= 18 else "not_eligible",
        "ageVerified": False,
    }


async def _serialize(
    db: AsyncSession,
    profile_user_id: str,
    viewer_id: str,
) -> dict:
    owner = profile_user_id == viewer_id
    matched = owner or await _has_active_match(db, profile_user_id, viewer_id)
    profile = (
        await db.execute(select(PublicProfile).where(PublicProfile.user_id == profile_user_id))
    ).scalar_one_or_none()
    dating = (
        await db.execute(select(DatingProfile).where(DatingProfile.user_id == profile_user_id))
    ).scalar_one_or_none()
    prefs = (
        await db.execute(select(DatingPreference).where(DatingPreference.user_id == profile_user_id))
    ).scalar_one_or_none()
    rows = (
        await db.execute(select(ProfileField).where(ProfileField.user_id == profile_user_id))
    ).scalars().all()

    fields = {}
    for row in rows:
        if not owner:
            can_return = row.visibility == "public" or (row.visibility == "after_match" and matched)
            if not can_return or row.visibility in {"filter_only", "do_not_use"}:
                continue
        fields[row.field_key] = {
            "value": row.value,
            "visibility": row.visibility,
            "provenance": row.provenance,
        }

    atmosphere = {
        "statement": profile.statement if profile else "",
        "palette": profile.palette or [] if profile else [],
        "motion": profile.motion if profile else "liquid-signal",
        "topFive": profile.top_five or [] if profile else [],
        "pronouns": profile.pronouns or "" if profile else "",
        "hometown": profile.hometown or "" if profile else "",
        "work": profile.work or "" if profile else "",
        "school": profile.school or "" if profile else "",
        "concertHabits": profile.concert_habits or "" if profile else "",
        "favoriteVenues": profile.favorite_venues or [] if profile else [],
    }
    readiness = await _dating_readiness(db, dating)
    private_dating = None
    if owner and dating:
        private_dating = {
            "enabled": dating.enabled,
            "visible": dating.visible,
            "firstName": dating.first_name,
            "dateOfBirth": dating.date_of_birth,
            "age": _age(dating.date_of_birth),
            "adultEligibility": readiness["ageStatus"],
            "ageVerified": False,
            "genderIdentity": dating.gender_identity,
            "showMe": dating.show_me,
            "orientations": dating.orientations,
            "intent": dating.intent,
            "relationshipStructure": dating.relationship_structure,
            "bio": dating.bio,
            "prompt": dating.prompt,
            "promptAnswer": dating.prompt_answer,
            "city": dating.city,
            "locationConsent": dating.location_consent,
            "readiness": readiness,
            "preferences": {
                "ageMin": prefs.age_min,
                "ageMax": prefs.age_max,
                "proximityBands": prefs.proximity_bands,
                "intents": prefs.intents,
                "identities": prefs.identities,
                "orientations": prefs.orientations,
                "relationshipStructures": prefs.relationship_structures,
                "communities": prefs.communities,
                "genres": prefs.genres,
                "bodyFilters": prefs.body_filters,
                "dealbreakers": prefs.dealbreakers,
            } if prefs else None,
        }
    return {
        "atmosphere": atmosphere,
        "fields": fields,
        "dating": private_dating,
        "viewerRelationship": "owner" if owner else "active_match" if matched else "public",
    }


@router.get("/me")
async def get_my_profile_signal(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await _serialize(db, user_id, user_id)


@router.patch("/me")
async def update_my_profile_signal(
    update: ProfileSignalUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    profile = (
        await db.execute(select(PublicProfile).where(PublicProfile.user_id == user_id))
    ).scalar_one_or_none() or PublicProfile(user_id=user_id)
    db.add(profile)
    atmosphere = update.atmosphere
    profile.statement = atmosphere.statement
    profile.palette = atmosphere.palette
    profile.motion = atmosphere.motion
    profile.top_five = atmosphere.topFive
    profile.pronouns = atmosphere.pronouns
    profile.hometown = atmosphere.hometown
    profile.work = atmosphere.work
    profile.school = atmosphere.school
    profile.concert_habits = atmosphere.concertHabits
    profile.favorite_venues = atmosphere.favoriteVenues
    profile.completeness = min(
        1.0,
        sum(bool(value) for value in [
            atmosphere.statement,
            atmosphere.topFive,
            atmosphere.pronouns,
            atmosphere.hometown,
            atmosphere.concertHabits,
        ]) / 5,
    )

    for item in update.fields:
        row = (
            await db.execute(
                select(ProfileField).where(
                    ProfileField.user_id == user_id,
                    ProfileField.field_key == item.key,
                )
            )
        ).scalar_one_or_none() or ProfileField(user_id=user_id, field_key=item.key)
        db.add(row)
        row.value = item.value
        row.visibility = item.visibility
        row.use_for_filtering = item.visibility == "filter_only"

    payload = update.dating
    dating = (
        await db.execute(select(DatingProfile).where(DatingProfile.user_id == user_id))
    ).scalar_one_or_none() or DatingProfile(user_id=user_id)
    prefs = (
        await db.execute(select(DatingPreference).where(DatingPreference.user_id == user_id))
    ).scalar_one_or_none() or DatingPreference(user_id=user_id)
    db.add_all([dating, prefs])

    if payload.enabled:
        approved_ids = set(await _approved_public_media_ids(db, user_id))
        requested_ids = set(payload.mediaIds)
        if len(requested_ids) < 2 or not requested_ids.issubset(approved_ids):
            raise HTTPException(
                status_code=409,
                detail="Dating requires two distinct, approved, public media assets owned by this account",
            )

    dating.enabled = payload.enabled
    dating.visible = False
    dating.first_name = payload.firstName
    dating.date_of_birth = payload.dateOfBirth
    # Self-entered date of birth establishes declared eligibility only. It is
    # never represented as identity or age verification.
    dating.adult_verified_at = None
    dating.gender_identity = payload.genderIdentity
    dating.show_me = payload.showMe
    dating.orientations = payload.orientations
    dating.intent = payload.intent
    dating.relationship_structure = payload.relationshipStructure
    dating.bio = payload.bio
    dating.prompt = payload.prompt
    dating.prompt_answer = payload.promptAnswer
    dating.city = payload.city
    dating.location_consent = payload.locationConsent
    dating.safety_acknowledged_at = datetime.now(timezone.utc) if payload.safetyAcknowledged else None

    prefs.age_min = payload.ageMin
    prefs.age_max = payload.ageMax
    prefs.proximity_bands = payload.proximityBands
    prefs.intents = payload.intents
    prefs.identities = payload.identities
    prefs.orientations = payload.orientationsAccepted
    prefs.relationship_structures = payload.relationshipStructures
    prefs.communities = payload.communities
    prefs.genres = payload.genres
    prefs.body_filters = payload.bodyFilters
    prefs.dealbreakers = payload.dealbreakers

    await db.flush()
    readiness = await _dating_readiness(db, dating)
    dating.completion = 1.0 if readiness["ready"] else 0.0
    dating.visible = bool(payload.visible and payload.enabled and readiness["ready"])
    if payload.visible and not dating.visible:
        raise HTTPException(status_code=409, detail={"message": "Dating profile is not ready", **readiness})
    return await _serialize(db, user_id, user_id)


@router.delete("/me/dating", status_code=204)
async def disable_dating(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    dating = (
        await db.execute(select(DatingProfile).where(DatingProfile.user_id == user_id))
    ).scalar_one_or_none()
    if dating:
        dating.enabled = False
        dating.visible = False
        dating.completion = 0.0
    return None


@router.get("/{profile_user_id}")
async def get_public_profile_signal(
    profile_user_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    if await is_blocked(db, user_id, profile_user_id):
        raise HTTPException(status_code=404, detail="Profile not found")
    if not (
        await db.execute(select(User.id).where(User.id == profile_user_id))
    ).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Profile not found")
    return await _serialize(db, profile_user_id, user_id)
