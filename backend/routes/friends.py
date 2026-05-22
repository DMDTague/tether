"""
Tether Friends Routes

Send/accept/reject friend requests, sever, mute, toggle transparent presence.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from pydantic import BaseModel

from db.database import get_db
from models.models import User, Friendship
from routes.auth import get_current_user_id, user_to_dict

router = APIRouter(prefix="/api/friends", tags=["friends"])


class FriendRequest(BaseModel):
    username: str


@router.get("")
async def list_friends(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """List all friends for the current user."""
    result = await db.execute(
        select(Friendship).where(
            or_(Friendship.user_a == user_id, Friendship.user_b == user_id),
            Friendship.status.in_(["accepted", "pending"]),
        )
    )
    friendships = result.scalars().all()

    friends = []
    for f in friendships:
        friend_id = f.user_b if f.user_a == user_id else f.user_a
        friend_result = await db.execute(select(User).where(User.id == friend_id))
        friend = friend_result.scalar_one_or_none()
        if friend:
            friends.append({
                "friendshipId": f.id,
                "friend": user_to_dict(friend),
                "status": f.status,
                "transparentPresence": f.transparent_presence_a if f.user_a == user_id else f.transparent_presence_b,
            })
    return friends


@router.post("/request")
async def send_request(req: FriendRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Send a friend request by username."""
    result = await db.execute(select(User).where(User.username == req.username))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")

    # Check existing
    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user_a == user_id, Friendship.user_b == target.id),
                and_(Friendship.user_a == target.id, Friendship.user_b == user_id),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Friendship already exists")

    friendship = Friendship(user_a=user_id, user_b=target.id, status="pending")
    db.add(friendship)
    await db.flush()
    return {"id": friendship.id, "status": "pending"}


@router.post("/{friendship_id}/accept")
async def accept_request(friendship_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Friendship).where(Friendship.id == friendship_id))
    friendship = result.scalar_one_or_none()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
    friendship.status = "accepted"
    return {"status": "accepted"}


@router.post("/{friendship_id}/sever")
async def sever_connection(friendship_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Sever (block) — makes you invisible to them. Silent."""
    result = await db.execute(select(Friendship).where(Friendship.id == friendship_id))
    friendship = result.scalar_one_or_none()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
    friendship.status = "severed"
    return {"status": "severed"}


@router.post("/{friendship_id}/mute")
async def mute_friend(friendship_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Mute — stop receiving their presence signals."""
    result = await db.execute(select(Friendship).where(Friendship.id == friendship_id))
    friendship = result.scalar_one_or_none()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")

    if friendship.user_a == user_id:
        friendship.status = "muted_by_a"
    else:
        friendship.status = "muted_by_b"
    return {"status": friendship.status}


@router.post("/{friendship_id}/transparent-presence")
async def toggle_tp(friendship_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Toggle transparent presence for this friendship."""
    result = await db.execute(select(Friendship).where(Friendship.id == friendship_id))
    friendship = result.scalar_one_or_none()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")

    if friendship.user_a == user_id:
        friendship.transparent_presence_a = not friendship.transparent_presence_a
        return {"enabled": friendship.transparent_presence_a}
    else:
        friendship.transparent_presence_b = not friendship.transparent_presence_b
        return {"enabled": friendship.transparent_presence_b}
