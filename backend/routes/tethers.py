"""
Tap to Tether — NFC/BLE physical discovery.
Creates or accepts a friendship (Tether) between two users.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from pydantic import BaseModel

from db.database import get_db
from models.models import User, Friendship
from routes.auth import get_current_user_id, user_to_dict

router = APIRouter(prefix="/api/tethers", tags=["tethers"])


class TapTetherRequest(BaseModel):
    target_user_id: str
    nfc_payload: str | None = None


@router.post("/tap")
async def tap_to_tether(
    req: TapTetherRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Instant Tether when two devices tap (NFC NDEF carries target user_id).
    Creates accepted friendship if none exists.
    """
    if req.target_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot tether with yourself")

    target_result = await db.execute(select(User).where(User.id == req.target_user_id))
    target = target_result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    me_result = await db.execute(select(User).where(User.id == user_id))
    me = me_result.scalar_one_or_none()

    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user_a == user_id, Friendship.user_b == req.target_user_id),
                and_(Friendship.user_a == req.target_user_id, Friendship.user_b == user_id),
            )
        )
    )
    friendship = existing.scalar_one_or_none()

    if friendship:
        if friendship.status != "accepted":
            friendship.status = "accepted"
            await db.commit()
        return {
            "success": True,
            "alreadyTethered": True,
            "tether": user_to_dict(target),
            "you": user_to_dict(me) if me else None,
        }

    friendship = Friendship(
        user_a=user_id,
        user_b=req.target_user_id,
        status="accepted",
    )
    db.add(friendship)
    await db.commit()

    return {
        "success": True,
        "alreadyTethered": False,
        "tether": user_to_dict(target),
        "you": user_to_dict(me) if me else None,
    }
