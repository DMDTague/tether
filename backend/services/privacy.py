from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import datetime, timezone

from models.models import User, Friendship, Session, TetherJoinGrant

class AuthDecision:
    ALLOW = "ALLOW"
    KNOCK_REQUIRED = "KNOCK_REQUIRED"
    DENY = "DENY"
    HOST_UNAVAILABLE = "HOST_UNAVAILABLE"
    NOT_FRIENDS = "NOT_FRIENDS"
    ALREADY_GRANTED = "ALREADY_GRANTED"

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

async def is_friend(db: AsyncSession, user_a_id: str, user_b_id: str) -> bool:
    if user_a_id == user_b_id:
        return True
    
    res = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user_a == user_a_id, Friendship.user_b == user_b_id),
                and_(Friendship.user_a == user_b_id, Friendship.user_b == user_a_id)
            ),
            Friendship.status == "accepted"
        )
    )
    return res.scalar_one_or_none() is not None

async def can_view_presence(db: AsyncSession, viewer_id: str, host_id: str) -> bool:
    """Can the viewer see the host's listening presence in the feed?"""
    if viewer_id == host_id:
        return True

    res = await db.execute(select(User).where(User.id == host_id))
    host = res.scalar_one_or_none()
    if not host or host.privacy_mode == "ghost":
        return False
        
    return await is_friend(db, viewer_id, host_id)

async def can_request_tether(db: AsyncSession, viewer_id: str, host_id: str, session_id: str) -> str:
    """Can the viewer even tap the tether/knock button?"""
    if viewer_id == host_id:
        return AuthDecision.ALLOW

    res = await db.execute(select(User).where(User.id == host_id))
    host = res.scalar_one_or_none()
    if not host or host.privacy_mode == "ghost":
        return AuthDecision.HOST_UNAVAILABLE
        
    if not await is_friend(db, viewer_id, host_id):
        return AuthDecision.NOT_FRIENDS
        
    return AuthDecision.ALLOW

async def can_join_session(db: AsyncSession, viewer_id: str, session_id: str) -> str:
    """Is the viewer fully authorized to receive session payloads?"""
    res = await db.execute(select(Session).where(Session.id == session_id))
    session = res.scalar_one_or_none()
    
    if not session:
        return AuthDecision.DENY

    host_id = session.host_id
    if viewer_id == host_id:
        return AuthDecision.ALLOW

    res = await db.execute(select(User).where(User.id == host_id))
    host = res.scalar_one_or_none()
    if not host or host.privacy_mode == "ghost":
        return AuthDecision.HOST_UNAVAILABLE
        
    if not await is_friend(db, viewer_id, host_id):
        return AuthDecision.NOT_FRIENDS

    if host.privacy_mode == "open-door":
        return AuthDecision.ALLOW

    if host.privacy_mode == "knock-first":
        # Check for active grant
        now = utcnow()
        res = await db.execute(
            select(TetherJoinGrant).where(
                TetherJoinGrant.session_id == session_id,
                TetherJoinGrant.listener_id == viewer_id,
                TetherJoinGrant.status == "active",
                TetherJoinGrant.expires_at > now
            )
        )
        grant = res.scalar_one_or_none()
        if grant:
            return AuthDecision.ALLOW
        
        return AuthDecision.KNOCK_REQUIRED

    return AuthDecision.DENY

async def consume_grant(db: AsyncSession, viewer_id: str, session_id: str) -> bool:
    """Mark an active grant as consumed upon successful join."""
    now = utcnow()
    res = await db.execute(
        select(TetherJoinGrant).where(
            TetherJoinGrant.session_id == session_id,
            TetherJoinGrant.listener_id == viewer_id,
            TetherJoinGrant.status == "active",
            TetherJoinGrant.expires_at > now
        )
    )
    grant = res.scalar_one_or_none()
    if grant:
        grant.status = "consumed"
        await db.flush()
        return True
    return False

