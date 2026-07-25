"""Friendship routes with participant-scoped mutations.

Relationship state and per-user notification preferences are deliberately
separate: muting somebody must not silently destroy friendship permissions.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import Friendship, User
from routes.auth import get_current_user_id, user_to_dict

router = APIRouter(prefix="/api/friends", tags=["friends"])


class FriendRequest(BaseModel):
    username: str


async def _friendship_for_participant(db: AsyncSession, friendship_id: str, user_id: str) -> Friendship:
    result = await db.execute(select(Friendship).where(Friendship.id == friendship_id))
    friendship = result.scalar_one_or_none()
    if not friendship or user_id not in {friendship.user_a, friendship.user_b}:
        raise HTTPException(status_code=404, detail="Friendship not found")
    return friendship


@router.get("")
async def list_friends(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Friendship).where(or_(Friendship.user_a == user_id, Friendship.user_b == user_id), Friendship.status.in_(["accepted", "pending"])))
    friends = []
    for friendship in result.scalars().all():
        friend_id = friendship.user_b if friendship.user_a == user_id else friendship.user_a
        friend = (await db.execute(select(User).where(User.id == friend_id))).scalar_one_or_none()
        if not friend:
            continue
        is_a = friendship.user_a == user_id
        friends.append({"friendshipId": friendship.id, "friend": user_to_dict(friend), "status": friendship.status, "muted": friendship.muted_a if is_a else friendship.muted_b, "transparentPresence": friendship.transparent_presence_a if is_a else friendship.transparent_presence_b})
    return friends


@router.post("/request")
async def send_request(req: FriendRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    target = (await db.execute(select(User).where(User.username == req.username.strip()))).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")
    existing = await db.execute(select(Friendship).where(or_(and_(Friendship.user_a == user_id, Friendship.user_b == target.id), and_(Friendship.user_a == target.id, Friendship.user_b == user_id))))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Friendship already exists")
    friendship = Friendship(user_a=user_id, user_b=target.id, status="pending")
    db.add(friendship)
    await db.flush()
    return {"id": friendship.id, "status": "pending"}


@router.post("/{friendship_id}/accept")
async def accept_request(friendship_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    friendship = await _friendship_for_participant(db, friendship_id, user_id)
    if friendship.status != "pending":
        raise HTTPException(status_code=409, detail="Friendship is not pending")
    if friendship.user_b != user_id:
        raise HTTPException(status_code=403, detail="Only the recipient can accept")
    friendship.status = "accepted"
    return {"status": "accepted"}


@router.post("/{friendship_id}/sever")
async def sever_connection(friendship_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    friendship = await _friendship_for_participant(db, friendship_id, user_id)
    friendship.status = "severed"
    friendship.severed_by = user_id
    friendship.muted_a = False
    friendship.muted_b = False
    return {"status": "severed"}


@router.post("/{friendship_id}/mute")
async def toggle_mute(friendship_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    friendship = await _friendship_for_participant(db, friendship_id, user_id)
    if friendship.status != "accepted":
        raise HTTPException(status_code=409, detail="Only accepted friendships can be muted")
    if friendship.user_a == user_id:
        friendship.muted_a = not friendship.muted_a
        muted = friendship.muted_a
    else:
        friendship.muted_b = not friendship.muted_b
        muted = friendship.muted_b
    return {"status": friendship.status, "muted": muted}


@router.post("/{friendship_id}/transparent-presence")
async def toggle_transparent_presence(friendship_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    friendship = await _friendship_for_participant(db, friendship_id, user_id)
    if friendship.status != "accepted":
        raise HTTPException(status_code=409, detail="Transparent presence requires friendship")
    if friendship.user_a == user_id:
        friendship.transparent_presence_a = not friendship.transparent_presence_a
        enabled = friendship.transparent_presence_a
    else:
        friendship.transparent_presence_b = not friendship.transparent_presence_b
        enabled = friendship.transparent_presence_b
    return {"enabled": enabled}
