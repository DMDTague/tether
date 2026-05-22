from routes.auth import get_current_user_id
"""
Tether Ad Pass Routes

Handles the "Tollbooth" rewarded ad model:
- Check if a user's 4-hour ad pass is active
- Refresh the pass after watching an ad
- Voluntary "Support the Servers" ad grants
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel

from db.database import get_db
from models.models import User

router = APIRouter(prefix="/api/ad-pass", tags=["ad-pass"])

AD_PASS_DURATION_HOURS = 4


class AdPassStatus(BaseModel):
    active: bool
    expires_at: str | None
    remaining_seconds: int


class AdPassRefresh(BaseModel):
    ad_unit_id: str  # The ad unit ID that was watched (for verification)


@router.get("/status")
async def check_pass(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)) -> AdPassStatus:
    """Check if the user's ad pass is currently active."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    ad_free_until = user.ad_free_until

    if ad_free_until and ad_free_until > now:
        remaining = int((ad_free_until - now).total_seconds())
        return AdPassStatus(
            active=True,
            expires_at=ad_free_until.isoformat(),
            remaining_seconds=remaining,
        )

    return AdPassStatus(active=False, expires_at=None, remaining_seconds=0)


@router.post("/refresh")
async def refresh_pass(req: AdPassRefresh, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """
    Refresh the user's ad pass after they watch a rewarded ad.
    
    In production, this would verify the ad completion with the
    Google AdMob server-side verification callback. For now,
    we trust the client's report.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    new_expiry = now + timedelta(hours=AD_PASS_DURATION_HOURS)

    # If they still have time left, extend from the current expiry
    if user.ad_free_until and user.ad_free_until > now:
        new_expiry = user.ad_free_until + timedelta(hours=AD_PASS_DURATION_HOURS)

    user.ad_free_until = new_expiry

    return {
        "active": True,
        "expiresAt": new_expiry.isoformat(),
        "remainingSeconds": int((new_expiry - now).total_seconds()),
        "message": "Thank you for supporting Tether.",
    }


@router.post("/support")
async def support_servers(req: AdPassRefresh, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """
    Voluntary 'Support the Servers' ad watch.
    Same as refresh, but can be triggered from settings at any time.
    """
    return await refresh_pass(req, user_id, db)
