from datetime import date, datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from models.models import User
from models.profile_models import (
    DatingMatch,
    DatingExposure,
    DatingPreference,
    DatingProfile,
    DatingProfileMedia,
    MediaAsset,
    PrivateAlbumGrant,
    ProfileField,
    ProfileMedia,
)
from routes.dating import ExposureCreate, record_dating_exposure, unmatch
from routes.private_albums import (
    AlbumCreate,
    AlbumGrantCreate,
    create_private_album,
    get_private_album,
    grant_private_album,
)
from services.dating_integrity import (
    approved_dating_media_ids,
    dating_readiness,
    reciprocal_structured_filters_match,
)
from services.profile_field_registry import (
    FIELD_REGISTRY_VERSION,
    fields_match,
    public_registry,
    validate_field_value,
    validate_filter_map,
)


async def create_user(db, username: str) -> User:
    user = User(
        username=username,
        display_name=username.title(),
        initials=username[:2].upper(),
        password_hash="not-used",
    )
    db.add(user)
    await db.flush()
    return user


def eligible_profile(user_id: str) -> DatingProfile:
    return DatingProfile(
        user_id=user_id,
        enabled=True,
        visible=True,
        first_name="Test",
        date_of_birth_declared=date(1995, 1, 1),
        gender_identity="man",
        show_me=["man"],
        orientations=["gay"],
        intent="relationship",
        relationship_structure="monogamous",
        bio="Music first.",
        city="Philadelphia",
        location_consent=True,
        safety_acknowledged_at=datetime.now(timezone.utc),
    )


def preference(user_id: str) -> DatingPreference:
    return DatingPreference(
        user_id=user_id,
        age_min=18,
        age_max=99,
        identities=["man"],
        orientations=["gay"],
        intents=["relationship"],
        relationship_structures=["monogamous"],
        body_filters={},
        dealbreakers={},
    )


async def add_public_dating_media(db, user_id: str, prefix: str) -> None:
    for position in range(2):
        asset = MediaAsset(
            owner_id=user_id,
            storage_key=f"{prefix}/{position}",
            mime_type="image/jpeg",
            byte_size=100,
            moderation_state="approved",
            metadata_stripped=True,
        )
        db.add(asset)
        await db.flush()
        db.add_all(
            [
                ProfileMedia(
                    user_id=user_id,
                    media_id=asset.id,
                    position=position,
                    visibility="public",
                ),
                DatingProfileMedia(
                    user_id=user_id,
                    media_id=asset.id,
                    position=position,
                ),
            ]
        )


def test_field_registry_rejects_ungoverned_or_invalid_fields():
    assert public_registry()["version"] == FIELD_REGISTRY_VERSION
    with pytest.raises(ValueError, match="Unknown profile field"):
        validate_field_value("whatever_the_client_sent", "value", "public")
    with pytest.raises(ValueError, match="below the supported range"):
        validate_field_value("height_cm", 100, "filter_only")
    with pytest.raises(ValueError, match="unsupported value"):
        validate_field_value("smoking", "only on Tuesdays", "filter_only")

    filters = validate_filter_map({"height_cm": {"min": 165, "max": 190}, "body_type": ["athletic"]})
    assert fields_match(filters, {}, {"height_cm": 180, "body_type": "athletic"})
    assert not fields_match(filters, {}, {"height_cm": 180, "body_type": "stocky"})


@pytest.mark.asyncio
async def test_reciprocal_private_filters_are_enforced_without_projection(db_session):
    viewer = await create_user(db_session, "viewer")
    candidate = await create_user(db_session, "candidate")
    db_session.add_all(
        [
            ProfileField(
                user_id=viewer.id,
                field_key="smoking",
                value="never",
                visibility="filter_only",
                use_for_filtering=True,
            ),
            ProfileField(
                user_id=candidate.id,
                field_key="body_type",
                value="athletic",
                visibility="filter_only",
                use_for_filtering=True,
            ),
        ]
    )
    await db_session.flush()

    assert await reciprocal_structured_filters_match(
        db_session,
        viewer.id,
        {"body_type": ["athletic"]},
        {},
        candidate.id,
        {"smoking": ["never"]},
        {},
    )
    assert not await reciprocal_structured_filters_match(
        db_session,
        viewer.id,
        {"body_type": ["slim"]},
        {},
        candidate.id,
        {"smoking": ["never"]},
        {},
    )


@pytest.mark.asyncio
async def test_dating_readiness_uses_selected_moderated_media_and_declared_age(db_session):
    user = await create_user(db_session, "ready")
    profile = eligible_profile(user.id)
    db_session.add(profile)
    assets = []
    for position in range(2):
        asset = MediaAsset(
            owner_id=user.id,
            storage_key=f"ready/{position}",
            mime_type="image/jpeg",
            byte_size=100,
            moderation_state="approved",
            metadata_stripped=True,
        )
        db_session.add(asset)
        await db_session.flush()
        db_session.add_all(
            [
                ProfileMedia(
                    user_id=user.id,
                    media_id=asset.id,
                    position=position,
                    visibility="public",
                ),
                DatingProfileMedia(
                    user_id=user.id,
                    media_id=asset.id,
                    position=position,
                ),
            ]
        )
        assets.append(asset)
    await db_session.flush()

    assert await approved_dating_media_ids(db_session, user.id) == [asset.id for asset in assets]
    readiness = await dating_readiness(db_session, profile)
    assert readiness["ready"]
    assert readiness["ageStatus"] == "self_declared_eligible"
    assert readiness["ageVerified"] is False

    assets[0].moderation_state = "rejected"
    await db_session.flush()
    readiness = await dating_readiness(db_session, profile)
    assert not readiness["ready"]
    assert "two_approved_public_media_required" in readiness["reasons"]


@pytest.mark.asyncio
async def test_exposure_event_is_idempotent_and_truthfully_client_reported(db_session):
    viewer = await create_user(db_session, "exposureviewer")
    candidate = await create_user(db_session, "exposurecandidate")
    db_session.add_all(
        [
            eligible_profile(viewer.id),
            eligible_profile(candidate.id),
            preference(viewer.id),
            preference(candidate.id),
        ]
    )
    await add_public_dating_media(db_session, viewer.id, "viewer")
    await add_public_dating_media(db_session, candidate.id, "candidate")
    await db_session.flush()

    payload = ExposureCreate(
        candidate_id=candidate.id,
        client_event_id="viewport-event-0001",
    )
    first = await record_dating_exposure(payload, user_id=viewer.id, db=db_session)
    second = await record_dating_exposure(payload, user_id=viewer.id, db=db_session)
    assert first["exposureId"] == second["exposureId"]
    assert first["recordedWhen"] == "client_reported_render"
    assert second["duplicate"] is True
    exposure = (
        await db_session.execute(
            select(DatingExposure).where(DatingExposure.id == first["exposureId"])
        )
    ).scalar_one()
    assert exposure.proximity_band == "city"
    assert all(
        item["provenance"] == "server_eligibility_rule"
        for item in exposure.explanation
    )


@pytest.mark.asyncio
async def test_private_album_grant_requires_match_and_revokes_on_unmatch(db_session):
    owner = await create_user(db_session, "albumowner")
    match_user = await create_user(db_session, "albummatch")
    outsider = await create_user(db_session, "albumoutsider")
    asset = MediaAsset(
        owner_id=owner.id,
        storage_key="private/one",
        mime_type="image/jpeg",
        byte_size=100,
        moderation_state="approved",
        metadata_stripped=True,
    )
    db_session.add(asset)
    await db_session.flush()
    db_session.add(
        ProfileMedia(
            user_id=owner.id,
            media_id=asset.id,
            position=0,
            visibility="private",
        )
    )
    user_a, user_b = sorted((owner.id, match_user.id))
    match = DatingMatch(user_a=user_a, user_b=user_b, status="active")
    db_session.add(match)
    await db_session.flush()

    album_payload = await create_private_album(
        AlbumCreate(title="After match", media_ids=[asset.id]),
        user_id=owner.id,
        db=db_session,
    )
    album_id = album_payload["albumId"]

    with pytest.raises(HTTPException) as blocked:
        await grant_private_album(
            album_id,
            AlbumGrantCreate(grantee_id=outsider.id),
            user_id=owner.id,
            db=db_session,
        )
    assert blocked.value.status_code == 409

    await grant_private_album(
        album_id,
        AlbumGrantCreate(grantee_id=match_user.id),
        user_id=owner.id,
        db=db_session,
    )
    visible = await get_private_album(album_id, user_id=match_user.id, db=db_session)
    assert visible["mediaIds"] == [asset.id]
    assert visible["access"] == "active_grant"

    await unmatch(match.id, user_id=owner.id, db=db_session)
    grant = (
        await db_session.execute(
            select(PrivateAlbumGrant).where(
                PrivateAlbumGrant.album_id == album_id,
                PrivateAlbumGrant.grantee_id == match_user.id,
            )
        )
    ).scalar_one()
    assert grant.revoked_at is not None
    with pytest.raises(HTTPException) as hidden:
        await get_private_album(album_id, user_id=match_user.id, db=db_session)
    assert hidden.value.status_code == 404
