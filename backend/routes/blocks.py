"""Account-level block controls with immediate pair-state cleanup."""

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import User
from models.safety_models import UserBlock
from routes.auth import get_current_user_id
from services.safety_policy import apply_block_cleanup

router = APIRouter(prefix="/api/blocks", tags=["safety"])


class BlockRequest(BaseModel):
    blocked_user_id: str = Field(min_length=1, max_length=36)
    reason: str | None = Field(default=None, max_length=120)


def _serialize(block: UserBlock) -> dict:
    return {
        "id": block.id,
        "blockedUserId": block.blocked_user_id,
        "reason": block.reason,
        "createdAt": block.created_at.isoformat() if block.created_at else None,
    }


@router.get("")
async def list_blocks(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserBlock)
        .where(UserBlock.blocker_id == user_id)
        .order_by(UserBlock.created_at.desc())
    )
    return [_serialize(block) for block in result.scalars().all()]


@router.post("", status_code=201)
async def block_user(
    req: BlockRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    if req.blocked_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    target = await db.execute(select(User.id).where(User.id == req.blocked_user_id))
    if not target.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.execute(
        select(UserBlock).where(
            UserBlock.blocker_id == user_id,
            UserBlock.blocked_user_id == req.blocked_user_id,
        )
    )
    block = existing.scalar_one_or_none()
    already_blocked = block is not None
    if not block:
        block = UserBlock(
            blocker_id=user_id,
            blocked_user_id=req.blocked_user_id,
            reason=req.reason,
        )
        db.add(block)
        await db.flush()

    # Cleanup is intentionally repeated for an idempotent block request. That
    # prevents stale grants or relationships created by a racing workflow from
    # surviving merely because the block row already existed.
    await apply_block_cleanup(db, user_id, req.blocked_user_id)
    return {**_serialize(block), "alreadyBlocked": already_blocked}


@router.delete("/{blocked_user_id}", status_code=204)
async def unblock_user(
    blocked_user_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(UserBlock).where(
            UserBlock.blocker_id == user_id,
            UserBlock.blocked_user_id == blocked_user_id,
        )
    )
    # Unblocking only removes the safety boundary. It never silently restores a
    # friendship, Dating match, private grant, follow, or live-session access.
    return Response(status_code=204)
