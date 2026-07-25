"""Tap to Tether — one-time physical consent, never a raw account-ID shortcut."""

from datetime import datetime, timedelta, timezone
import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import Friendship, User
from models.safety_models import TapTetherToken
from routes.auth import get_current_user_id, user_to_dict
from services.safety_policy import is_blocked

router = APIRouter(prefix="/api/tethers", tags=["tethers"])
TAP_TOKEN_TTL_SECONDS = 120
TAP_ACTION = "accept_friendship"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _ordered_pair(first_id: str, second_id: str) -> tuple[str, str]:
    return tuple(sorted((first_id, second_id)))


class TapTokenRequest(BaseModel):
    target_user_id: str = Field(min_length=1, max_length=36)


class TapTetherRequest(BaseModel):
    target_user_id: str = Field(min_length=1, max_length=36)
    nfc_payload: str = Field(min_length=32, max_length=256)


@router.post("/tap-token", status_code=201)
async def create_tap_token(
    req: TapTokenRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a short-lived token bound to both authenticated accounts.

    The plaintext token is returned once and should travel over NFC/BLE. The
    target account—not the initiator—must consume it to confirm the relationship.
    """

    if req.target_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot tether with yourself")
    target = (
        await db.execute(select(User).where(User.id == req.target_user_id))
    ).scalar_one_or_none()
    if not target or await is_blocked(db, user_id, req.target_user_id):
        raise HTTPException(status_code=404, detail="User not available")

    plaintext = secrets.token_urlsafe(32)
    expires_at = _now() + timedelta(seconds=TAP_TOKEN_TTL_SECONDS)
    db.add(
        TapTetherToken(
            token_hash=_digest(plaintext),
            initiator_id=user_id,
            target_id=req.target_user_id,
            action=TAP_ACTION,
            expires_at=expires_at,
        )
    )
    await db.flush()
    return {
        "nfcPayload": plaintext,
        "initiatorUserId": user_id,
        "targetUserId": req.target_user_id,
        "action": TAP_ACTION,
        "expiresAt": expires_at.isoformat(),
        "oneTime": True,
    }


@router.post("/tap")
async def tap_to_tether(
    req: TapTetherRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Consume a one-time physical token and accept the bound friendship."""

    if req.target_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot tether with yourself")
    if await is_blocked(db, user_id, req.target_user_id):
        raise HTTPException(status_code=404, detail="User not available")

    token = (
        await db.execute(
            select(TapTetherToken)
            .where(
                TapTetherToken.token_hash == _digest(req.nfc_payload),
                TapTetherToken.initiator_id == req.target_user_id,
                TapTetherToken.target_id == user_id,
                TapTetherToken.action == TAP_ACTION,
                TapTetherToken.consumed_at.is_(None),
                TapTetherToken.expires_at > _now(),
            )
            .with_for_update()
        )
    ).scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=409, detail="Tap token is invalid, expired, used, or not bound to these accounts")

    target = (
        await db.execute(select(User).where(User.id == req.target_user_id))
    ).scalar_one_or_none()
    me = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not target or not me:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user_a == user_id, Friendship.user_b == req.target_user_id),
                and_(Friendship.user_a == req.target_user_id, Friendship.user_b == user_id),
            )
        )
    )
    friendship = existing.scalar_one_or_none()
    already_tethered = bool(friendship and friendship.status == "accepted")

    if friendship:
        friendship.status = "accepted"
        friendship.severed_by = None
    else:
        user_a, user_b = _ordered_pair(user_id, req.target_user_id)
        friendship = Friendship(user_a=user_a, user_b=user_b, status="accepted")
        db.add(friendship)

    token.consumed_at = _now()
    token.consumed_by = user_id
    await db.flush()

    return {
        "success": True,
        "alreadyTethered": already_tethered,
        "consentProof": "one_time_physical_token",
        "tether": user_to_dict(target),
        "you": user_to_dict(me),
    }
