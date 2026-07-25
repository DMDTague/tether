"""Private Dating albums with match-scoped, revocable access."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.profile_models import (
    DatingMatch,
    MediaAsset,
    PrivateAlbum,
    PrivateAlbumGrant,
    ProfileMedia,
)
from routes.auth import get_current_user_id
from services.safety_policy import is_blocked

router = APIRouter(prefix="/api/private-albums", tags=["dating", "media"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


class AlbumCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    media_ids: list[str] = Field(min_length=1, max_length=9)


class AlbumGrantCreate(BaseModel):
    grantee_id: str = Field(min_length=1, max_length=36)
    expires_in_hours: int | None = Field(default=168, ge=1, le=720)


async def _active_match(db: AsyncSession, first_id: str, second_id: str) -> bool:
    user_a, user_b = sorted((first_id, second_id))
    return bool(
        await db.scalar(
            select(DatingMatch.id).where(
                DatingMatch.user_a == user_a,
                DatingMatch.user_b == user_b,
                DatingMatch.status == "active",
            )
        )
    )


async def _validate_album_media(
    db: AsyncSession,
    owner_id: str,
    media_ids: list[str],
) -> list[str]:
    unique_ids = list(dict.fromkeys(media_ids))
    if len(unique_ids) != len(media_ids):
        raise HTTPException(status_code=422, detail="Private album media must be distinct")
    rows = await db.execute(
        select(MediaAsset.id)
        .join(
            ProfileMedia,
            and_(
                ProfileMedia.media_id == MediaAsset.id,
                ProfileMedia.user_id == owner_id,
            ),
        )
        .where(
            MediaAsset.id.in_(unique_ids),
            MediaAsset.owner_id == owner_id,
            MediaAsset.moderation_state == "approved",
            ProfileMedia.visibility.in_(["private", "after_match"]),
            or_(
                MediaAsset.mime_type.like("image/%"),
                MediaAsset.mime_type.like("video/%"),
            ),
        )
    )
    approved = set(rows.scalars().all())
    if approved != set(unique_ids):
        raise HTTPException(
            status_code=409,
            detail="Every private-album item must be an approved private profile asset owned by this account",
        )
    return unique_ids


def _serialize(album: PrivateAlbum, *, include_media: bool, grant: PrivateAlbumGrant | None = None) -> dict:
    return {
        "albumId": album.id,
        "title": album.title,
        "mediaIds": album.media_ids if include_media else [],
        "access": "owner" if grant is None else "active_grant",
        "grantExpiresAt": grant.expires_at.isoformat() if grant and grant.expires_at else None,
    }


@router.post("", status_code=201)
async def create_private_album(
    payload: AlbumCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    media_ids = await _validate_album_media(db, user_id, payload.media_ids)
    album = PrivateAlbum(owner_id=user_id, title=payload.title, media_ids=media_ids)
    db.add(album)
    await db.flush()
    return _serialize(album, include_media=True)


@router.get("")
async def list_private_albums(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(PrivateAlbum).where(PrivateAlbum.owner_id == user_id).order_by(PrivateAlbum.created_at.desc())
    )
    return [_serialize(album, include_media=True) for album in rows.scalars().all()]


@router.get("/{album_id}")
async def get_private_album(
    album_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    album = (
        await db.execute(select(PrivateAlbum).where(PrivateAlbum.id == album_id))
    ).scalar_one_or_none()
    if not album or await is_blocked(db, user_id, album.owner_id):
        raise HTTPException(status_code=404, detail="Album not found")
    if album.owner_id == user_id:
        return _serialize(album, include_media=True)
    grant = (
        await db.execute(
            select(PrivateAlbumGrant).where(
                PrivateAlbumGrant.album_id == album.id,
                PrivateAlbumGrant.grantee_id == user_id,
                PrivateAlbumGrant.revoked_at.is_(None),
                or_(
                    PrivateAlbumGrant.expires_at.is_(None),
                    PrivateAlbumGrant.expires_at > _now(),
                ),
            )
        )
    ).scalar_one_or_none()
    if not grant or not await _active_match(db, user_id, album.owner_id):
        raise HTTPException(status_code=404, detail="Album not found")
    return _serialize(album, include_media=True, grant=grant)


@router.post("/{album_id}/grants", status_code=201)
async def grant_private_album(
    album_id: str,
    payload: AlbumGrantCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    if payload.grantee_id == user_id:
        raise HTTPException(status_code=400, detail="Owners already have access")
    album = (
        await db.execute(
            select(PrivateAlbum)
            .where(PrivateAlbum.id == album_id, PrivateAlbum.owner_id == user_id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    if await is_blocked(db, user_id, payload.grantee_id) or not await _active_match(
        db, user_id, payload.grantee_id
    ):
        raise HTTPException(status_code=409, detail="Private albums can be shared only with an active match")

    daily_grants = int(
        await db.scalar(
            select(func.count(PrivateAlbumGrant.id)).where(
                PrivateAlbumGrant.granted_by == user_id,
                PrivateAlbumGrant.created_at >= _now() - timedelta(days=1),
            )
        )
        or 0
    )
    if daily_grants >= 20:
        raise HTTPException(status_code=429, detail="Private album grant limit reached")

    grant = (
        await db.execute(
            select(PrivateAlbumGrant)
            .where(
                PrivateAlbumGrant.album_id == album.id,
                PrivateAlbumGrant.grantee_id == payload.grantee_id,
            )
            .with_for_update()
        )
    ).scalar_one_or_none()
    if not grant:
        grant = PrivateAlbumGrant(
            album_id=album.id,
            grantee_id=payload.grantee_id,
            granted_by=user_id,
        )
        db.add(grant)
    grant.granted_by = user_id
    grant.revoked_at = None
    grant.expires_at = (
        _now() + timedelta(hours=payload.expires_in_hours)
        if payload.expires_in_hours
        else None
    )
    await db.flush()
    return {
        "grantId": grant.id,
        "albumId": album.id,
        "granteeId": grant.grantee_id,
        "expiresAt": grant.expires_at.isoformat() if grant.expires_at else None,
    }


@router.delete("/{album_id}/grants/{grantee_id}", status_code=204)
async def revoke_private_album(
    album_id: str,
    grantee_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    grant = (
        await db.execute(
            select(PrivateAlbumGrant)
            .join(PrivateAlbum, PrivateAlbum.id == PrivateAlbumGrant.album_id)
            .where(
                PrivateAlbum.id == album_id,
                PrivateAlbum.owner_id == user_id,
                PrivateAlbumGrant.grantee_id == grantee_id,
                PrivateAlbumGrant.revoked_at.is_(None),
            )
            .with_for_update()
        )
    ).scalar_one_or_none()
    if grant:
        grant.revoked_at = _now()
    return Response(status_code=204)
