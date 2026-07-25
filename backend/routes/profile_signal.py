"""Durable profile, field visibility, and explicit Dating onboarding."""

from datetime import date, datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import User
from models.profile_models import DatingPreference, DatingProfile, ProfileField, PublicProfile
from routes.auth import get_current_user_id

router = APIRouter(prefix="/api/profile-signal", tags=["profile-signal"])


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
    visibility: Literal["public", "matches", "private"] = "public"
    useForFiltering: bool = False


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
    proximityBands: list[Literal["very_nearby", "nearby", "city", "region"]] = Field(default_factory=lambda: ["nearby", "city", "region"])
    intents: list[str] = Field(default_factory=list)
    identities: list[str] = Field(default_factory=list)
    relationshipStructures: list[str] = Field(default_factory=list)
    genres: list[str] = Field(default_factory=list)
    dealbreakers: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_activation(self):
        if self.ageMax < self.ageMin:
            raise ValueError("ageMax must be greater than or equal to ageMin")
        if self.visible and not self.enabled:
            raise ValueError("Dating visibility requires Dating to be enabled")
        if self.enabled:
            if not self.dateOfBirth or (date.today() - self.dateOfBirth).days < 18 * 365:
                raise ValueError("Dating is restricted to adults age 18+")
            required = [self.firstName, self.genderIdentity, self.showMe, self.intent, self.bio, self.city]
            if not all(required) or len(self.mediaIds) < 2 or not self.locationConsent or not self.safetyAcknowledged:
                raise ValueError("Complete the required Dating profile, safety step, consent, and two media items")
        return self


class ProfileSignalUpdate(BaseModel):
    atmosphere: Atmosphere
    fields: list[FieldValue] = Field(default_factory=list, max_length=100)
    dating: DatingSignal


def _age(dob: date | None) -> int | None:
    if not dob:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


async def _serialize(db: AsyncSession, user_id: str, include_private: bool) -> dict:
    profile = (await db.execute(select(PublicProfile).where(PublicProfile.user_id == user_id))).scalar_one_or_none()
    dating = (await db.execute(select(DatingProfile).where(DatingProfile.user_id == user_id))).scalar_one_or_none()
    prefs = (await db.execute(select(DatingPreference).where(DatingPreference.user_id == user_id))).scalar_one_or_none()
    rows = (await db.execute(select(ProfileField).where(ProfileField.user_id == user_id))).scalars().all()
    fields = {row.field_key: {"value": row.value, "visibility": row.visibility, "useForFiltering": row.use_for_filtering, "provenance": row.provenance} for row in rows if include_private or row.visibility == "public"}
    atmosphere = {"statement": profile.statement if profile else "", "palette": profile.palette or [] if profile else [], "motion": profile.motion if profile else "liquid-signal", "topFive": profile.top_five or [] if profile else [], "pronouns": profile.pronouns or "" if profile else "", "hometown": profile.hometown or "" if profile else "", "work": profile.work or "" if profile else "", "school": profile.school or "" if profile else "", "concertHabits": profile.concert_habits or "" if profile else "", "favoriteVenues": profile.favorite_venues or [] if profile else []}
    private_dating = None
    if include_private and dating:
        private_dating = {"enabled": dating.enabled, "visible": dating.visible, "firstName": dating.first_name, "dateOfBirth": dating.date_of_birth, "age": _age(dating.date_of_birth), "genderIdentity": dating.gender_identity, "showMe": dating.show_me, "orientations": dating.orientations, "intent": dating.intent, "relationshipStructure": dating.relationship_structure, "bio": dating.bio, "prompt": dating.prompt, "promptAnswer": dating.prompt_answer, "city": dating.city, "locationConsent": dating.location_consent, "completion": dating.completion, "preferences": {"ageMin": prefs.age_min, "ageMax": prefs.age_max, "proximityBands": prefs.proximity_bands, "intents": prefs.intents, "identities": prefs.identities, "relationshipStructures": prefs.relationship_structures, "genres": prefs.genres, "dealbreakers": prefs.dealbreakers} if prefs else None}
    return {"atmosphere": atmosphere, "fields": fields, "dating": private_dating}


@router.get("/me")
async def get_my_profile_signal(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    return await _serialize(db, user_id, True)


@router.patch("/me")
async def update_my_profile_signal(update: ProfileSignalUpdate, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    profile = (await db.execute(select(PublicProfile).where(PublicProfile.user_id == user_id))).scalar_one_or_none() or PublicProfile(user_id=user_id)
    db.add(profile)
    a = update.atmosphere
    profile.statement, profile.palette, profile.motion, profile.top_five = a.statement, a.palette, a.motion, a.topFive
    profile.pronouns, profile.hometown, profile.work, profile.school = a.pronouns, a.hometown, a.work, a.school
    profile.concert_habits, profile.favorite_venues = a.concertHabits, a.favoriteVenues
    profile.completeness = min(1.0, sum(bool(v) for v in [a.statement, a.topFive, a.pronouns, a.hometown, a.concertHabits]) / 5)
    for item in update.fields:
        row = (await db.execute(select(ProfileField).where(ProfileField.user_id == user_id, ProfileField.field_key == item.key))).scalar_one_or_none() or ProfileField(user_id=user_id, field_key=item.key)
        db.add(row)
        row.value, row.visibility, row.use_for_filtering = item.value, item.visibility, item.useForFiltering
    d = update.dating
    dating = (await db.execute(select(DatingProfile).where(DatingProfile.user_id == user_id))).scalar_one_or_none() or DatingProfile(user_id=user_id)
    prefs = (await db.execute(select(DatingPreference).where(DatingPreference.user_id == user_id))).scalar_one_or_none() or DatingPreference(user_id=user_id)
    db.add_all([dating, prefs])
    dating.enabled, dating.visible, dating.first_name, dating.date_of_birth = d.enabled, d.visible, d.firstName, d.dateOfBirth
    dating.adult_verified_at = datetime.now(timezone.utc) if d.enabled else None
    dating.gender_identity, dating.show_me, dating.orientations = d.genderIdentity, d.showMe, d.orientations
    dating.intent, dating.relationship_structure, dating.bio = d.intent, d.relationshipStructure, d.bio
    dating.prompt, dating.prompt_answer, dating.city = d.prompt, d.promptAnswer, d.city
    dating.location_consent = d.locationConsent
    dating.safety_acknowledged_at = datetime.now(timezone.utc) if d.safetyAcknowledged else None
    dating.completion = 1.0 if d.enabled else 0.0
    prefs.age_min, prefs.age_max, prefs.proximity_bands = d.ageMin, d.ageMax, d.proximityBands
    prefs.intents, prefs.identities, prefs.relationship_structures, prefs.genres, prefs.dealbreakers = d.intents, d.identities, d.relationshipStructures, d.genres, d.dealbreakers
    media = (await db.execute(select(ProfileField).where(ProfileField.user_id == user_id, ProfileField.field_key == "dating_media_ids"))).scalar_one_or_none() or ProfileField(user_id=user_id, field_key="dating_media_ids", visibility="private")
    media.value = d.mediaIds
    db.add(media)
    return await _serialize(db, user_id, True)


@router.delete("/me/dating", status_code=204)
async def disable_dating(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    dating = (await db.execute(select(DatingProfile).where(DatingProfile.user_id == user_id))).scalar_one_or_none()
    if dating:
        dating.enabled = dating.visible = False
    return None


@router.get("/{profile_user_id}")
async def get_public_profile_signal(profile_user_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    del user_id
    if not (await db.execute(select(User.id).where(User.id == profile_user_id))).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Profile not found")
    return await _serialize(db, profile_user_id, False)
