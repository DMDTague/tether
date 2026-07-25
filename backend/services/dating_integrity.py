"""Authoritative Dating readiness, media, and reciprocal filter evaluation."""

from __future__ import annotations

from datetime import date

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.profile_models import (
    DatingProfile,
    DatingProfileMedia,
    MediaAsset,
    ProfileField,
    ProfileMedia,
)
from services.profile_field_registry import fields_match


def declared_age(dob: date | None) -> int | None:
    if not dob:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def declared_date_of_birth(profile: DatingProfile) -> date | None:
    return profile.date_of_birth_declared or profile.date_of_birth


async def approved_dating_media_ids(db: AsyncSession, user_id: str) -> list[str]:
    rows = await db.execute(
        select(DatingProfileMedia.media_id)
        .join(MediaAsset, MediaAsset.id == DatingProfileMedia.media_id)
        .join(
            ProfileMedia,
            and_(
                ProfileMedia.user_id == DatingProfileMedia.user_id,
                ProfileMedia.media_id == DatingProfileMedia.media_id,
            ),
        )
        .where(
            DatingProfileMedia.user_id == user_id,
            ProfileMedia.visibility == "public",
            MediaAsset.owner_id == user_id,
            MediaAsset.moderation_state == "approved",
            or_(
                MediaAsset.mime_type.like("image/%"),
                MediaAsset.mime_type.like("video/%"),
            ),
        )
        .order_by(DatingProfileMedia.position)
    )
    return list(rows.scalars().all())


async def dating_readiness(db: AsyncSession, profile: DatingProfile | None) -> dict:
    if not profile:
        return {"ready": False, "reasons": ["profile_missing"], "approvedMediaCount": 0}
    approved_media = await approved_dating_media_ids(db, profile.user_id)
    reasons = []
    age = declared_age(declared_date_of_birth(profile))
    if age is None or age < 18:
        reasons.append("declared_adult_eligibility_missing")
    if not all(
        [
            profile.first_name,
            profile.gender_identity,
            profile.show_me,
            profile.intent,
            profile.bio,
            profile.city,
        ]
    ):
        reasons.append("required_fields_incomplete")
    if not profile.location_consent:
        reasons.append("location_consent_missing")
    if not profile.safety_acknowledged_at:
        reasons.append("safety_acknowledgement_missing")
    if len(set(approved_media)) < 2:
        reasons.append("two_approved_public_media_required")
    return {
        "ready": not reasons,
        "reasons": reasons,
        "approvedMediaCount": len(set(approved_media)),
        "mediaIds": approved_media,
        "ageStatus": "self_declared_eligible" if age is not None and age >= 18 else "not_eligible",
        "ageVerified": profile.age_verification_status == "verified" and bool(profile.age_verified_at),
        "ageVerificationStatus": profile.age_verification_status,
    }


async def filter_values(db: AsyncSession, user_id: str) -> dict:
    rows = (
        await db.execute(
            select(ProfileField).where(
                ProfileField.user_id == user_id,
                ProfileField.use_for_filtering.is_(True),
                ProfileField.visibility == "filter_only",
            )
        )
    ).scalars().all()
    return {row.field_key: row.value for row in rows}


async def reciprocal_structured_filters_match(
    db: AsyncSession,
    viewer_id: str,
    viewer_required: dict,
    viewer_excluded: dict,
    candidate_id: str,
    candidate_required: dict,
    candidate_excluded: dict,
) -> bool:
    viewer_values = await filter_values(db, viewer_id)
    candidate_values = await filter_values(db, candidate_id)
    return fields_match(viewer_required, viewer_excluded, candidate_values) and fields_match(
        candidate_required,
        candidate_excluded,
        viewer_values,
    )
