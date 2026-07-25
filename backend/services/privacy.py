"""Central authorization decisions for presence and live-session access."""

from datetime import datetime, timezone

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.models import Friendship, Session, TetherJoinGrant, User
from models.safety_models import UserBlock


class AuthDecision:
    ALLOW = "ALLOW"
    KNOCK_REQUIRED = "KNOCK_REQUIRED"
    DENY = "DENY"
    HOST_UNAVAILABLE = "HOST_UNAVAILABLE"
    NOT_FRIENDS = "NOT_FRIENDS"
    ALREADY_GRANTED = "ALREADY_GRANTED"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def is_blocked(db: AsyncSession, first_id: str, second_id: str) -> bool:
    if first_id == second_id:
        return False
    result = await db.execute(select(UserBlock.id).where(or_(and_(UserBlock.blocker_id == first_id, UserBlock.blocked_user_id == second_id), and_(UserBlock.blocker_id == second_id, UserBlock.blocked_user_id == first_id))))
    return result.scalar_one_or_none() is not None


async def is_friend(db: AsyncSession, user_a_id: str, user_b_id: str) -> bool:
    if user_a_id == user_b_id:
        return True
    if await is_blocked(db, user_a_id, user_b_id):
        return False
    result = await db.execute(select(Friendship).where(or_(and_(Friendship.user_a == user_a_id, Friendship.user_b == user_b_id), and_(Friendship.user_a == user_b_id, Friendship.user_b == user_a_id)), Friendship.status == "accepted"))
    return result.scalar_one_or_none() is not None


async def can_view_presence(db: AsyncSession, viewer_id: str, host_id: str) -> bool:
    """Return whether a viewer may see the host's live listening state."""
    if viewer_id == host_id:
        return True
    if await is_blocked(db, viewer_id, host_id):
        return False
    host = (await db.execute(select(User).where(User.id == host_id))).scalar_one_or_none()
    if not host or host.privacy_mode == "ghost":
        return False
    return await is_friend(db, viewer_id, host_id)


async def can_request_tether(db: AsyncSession, viewer_id: str, host_id: str, session_id: str) -> str:
    """Authorize showing or sending a Tether/Knock request.

    Knock First still allows the request itself. The separate join decision
    requires a live grant before any session payload is released.
    """
    if viewer_id == host_id:
        return AuthDecision.ALLOW
    if await is_blocked(db, viewer_id, host_id):
        return AuthDecision.HOST_UNAVAILABLE
    host = (await db.execute(select(User).where(User.id == host_id))).scalar_one_or_none()
    session = (await db.execute(select(Session).where(Session.id == session_id, Session.host_id == host_id, Session.status == "active"))).scalar_one_or_none()
    if not host or not session or host.privacy_mode == "ghost":
        return AuthDecision.HOST_UNAVAILABLE
    if not await is_friend(db, viewer_id, host_id):
        return AuthDecision.NOT_FRIENDS
    return AuthDecision.ALLOW


async def can_join_session(db: AsyncSession, viewer_id: str, session_id: str) -> str:
    """Authorize receipt of session payloads from durable state only."""
    session = (await db.execute(select(Session).where(Session.id == session_id, Session.status == "active"))).scalar_one_or_none()
    if not session:
        return AuthDecision.DENY
    host_id = session.host_id
    if viewer_id == host_id:
        return AuthDecision.ALLOW
    if await is_blocked(db, viewer_id, host_id):
        return AuthDecision.HOST_UNAVAILABLE
    host = (await db.execute(select(User).where(User.id == host_id))).scalar_one_or_none()
    if not host or host.privacy_mode == "ghost":
        return AuthDecision.HOST_UNAVAILABLE
    if not await is_friend(db, viewer_id, host_id):
        return AuthDecision.NOT_FRIENDS
    if host.privacy_mode == "open-door":
        return AuthDecision.ALLOW
    if host.privacy_mode == "knock-first":
        grant = (await db.execute(select(TetherJoinGrant).where(TetherJoinGrant.session_id == session_id, TetherJoinGrant.listener_id == viewer_id, TetherJoinGrant.status == "active", TetherJoinGrant.expires_at > utcnow()))).scalar_one_or_none()
        return AuthDecision.ALLOW if grant else AuthDecision.KNOCK_REQUIRED
    return AuthDecision.DENY


async def consume_grant(db: AsyncSession, viewer_id: str, session_id: str) -> bool:
    grant = (await db.execute(select(TetherJoinGrant).where(TetherJoinGrant.session_id == session_id, TetherJoinGrant.listener_id == viewer_id, TetherJoinGrant.status == "active", TetherJoinGrant.expires_at > utcnow()))).scalar_one_or_none()
    if not grant:
        return False
    grant.status = "consumed"
    await db.flush()
    return True
