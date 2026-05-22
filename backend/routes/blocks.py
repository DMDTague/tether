"""
Block / report routes — ties into normalized phone_number on User.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from db.database import get_db
from models.models import User, Block
from routes.auth import get_current_user_id

router = APIRouter(prefix="/api/blocks", tags=["blocks"])


class BlockRequest(BaseModel):
    phone_number: str
    reason: str | None = None


@router.post("")
async def block_user(
    req: BlockRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Block a user by their normalized phone number."""
    phone = req.phone_number.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="phone_number required")

    existing = await db.execute(
        select(Block).where(
            Block.blocker_id == user_id,
            Block.blocked_phone_number == phone,
        )
    )
    if existing.scalar_one_or_none():
        return {"success": True, "alreadyBlocked": True}

    db.add(Block(blocker_id=user_id, blocked_phone_number=phone))
    await db.commit()
    return {"success": True, "alreadyBlocked": False}
