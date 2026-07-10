"""Legacy compatibility routes after removing ads from core listening access.

Joining, starting, and participating in a Tether session are always free. These
routes remain temporarily so old clients do not fail while the tollbooth UI is
removed.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from routes.auth import get_current_user_id

router = APIRouter(prefix="/api/ad-pass", tags=["legacy-ad-pass"])


class AdPassStatus(BaseModel):
    active: bool = True
    expires_at: str | None = None
    remaining_seconds: int = 0
    core_access_gated: bool = False


class SupportRequest(BaseModel):
    verification_token: str | None = None


@router.get("/status", response_model=AdPassStatus)
async def check_pass(_: str = Depends(get_current_user_id)) -> AdPassStatus:
    return AdPassStatus()


@router.post("/refresh", status_code=status.HTTP_410_GONE)
async def refresh_pass(_: SupportRequest, __: str = Depends(get_current_user_id)):
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Core listening is no longer gated by rewarded ads.",
    )


@router.post("/support", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def support_servers(_: SupportRequest, __: str = Depends(get_current_user_id)):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Voluntary support requires provider-side receipt verification before launch.",
    )
