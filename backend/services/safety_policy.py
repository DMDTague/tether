"""One reusable safety policy for account-to-account visibility and cleanup.

A block is symmetric at every customer-facing boundary even though the durable row
records who initiated it. Creating a block also resolves relationship state that
would otherwise continue granting access.
"""

from datetime import datetime, timezone

from sqlalchemy import and_, delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.models import Follow, Friendship, Session, SessionListener, TetherJoinGrant
from models.profile_models import DatingMatch, PrivateAlbum, PrivateAlbumGrant
from models.safety_models import UserBlock


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def pair_clause(first_id: str, second_id: str):
    return or_(
        and_(UserBlock.blocker_id == first_id, UserBlock.blocked_user_id == second_id),
        and_(UserBlock.blocker_id == second_id, UserBlock.blocked_user_id == first_id),
    )


async def is_blocked(db: AsyncSession, first_id: str, second_id: str) -> bool:
    if first_id == second_id:
        return False
    result = await db.execute(select(UserBlock.id).where(pair_clause(first_id, second_id)))
    return result.scalar_one_or_none() is not None


async def blocked_user_ids(db: AsyncSession, viewer_id: str) -> set[str]:
    rows = await db.execute(
        select(UserBlock.blocker_id, UserBlock.blocked_user_id).where(
            or_(UserBlock.blocker_id == viewer_id, UserBlock.blocked_user_id == viewer_id)
        )
    )
    output: set[str] = set()
    for blocker_id, blocked_id in rows.all():
        output.add(blocked_id if blocker_id == viewer_id else blocker_id)
    return output


async def apply_block_cleanup(db: AsyncSession, blocker_id: str, blocked_id: str) -> None:
    """Atomically revoke pair-scoped access when a block is created.

    Message evidence is retained for reports, but all customer-facing conversation
    reads must apply ``is_blocked`` before returning it. Friendship, follow,
    Dating, session, and private-media access are revoked immediately.
    """

    now = utcnow()
    user_a, user_b = sorted((blocker_id, blocked_id))

    friendships = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user_a == blocker_id, Friendship.user_b == blocked_id),
                and_(Friendship.user_a == blocked_id, Friendship.user_b == blocker_id),
            )
        )
    )
    for friendship in friendships.scalars().all():
        friendship.status = "severed"
        friendship.severed_by = blocker_id

    await db.execute(
        delete(Follow).where(
            or_(
                and_(Follow.follower_id == blocker_id, Follow.following_id == blocked_id),
                and_(Follow.follower_id == blocked_id, Follow.following_id == blocker_id),
            )
        )
    )

    match = (
        await db.execute(
            select(DatingMatch)
            .where(
                DatingMatch.user_a == user_a,
                DatingMatch.user_b == user_b,
                DatingMatch.status == "active",
            )
            .with_for_update()
        )
    ).scalar_one_or_none()
    if match:
        match.status = "blocked"
        match.ended_at = now
        match.ended_by = blocker_id

    await db.execute(
        update(TetherJoinGrant)
        .where(
            or_(
                and_(TetherJoinGrant.host_id == blocker_id, TetherJoinGrant.listener_id == blocked_id),
                and_(TetherJoinGrant.host_id == blocked_id, TetherJoinGrant.listener_id == blocker_id),
            ),
            TetherJoinGrant.status == "active",
        )
        .values(status="revoked")
    )

    active_pair_sessions = await db.execute(
        select(SessionListener)
        .join(Session, Session.id == SessionListener.session_id)
        .where(
            Session.status == "active",
            SessionListener.left_at.is_(None),
            or_(
                and_(Session.host_id == blocker_id, SessionListener.user_id == blocked_id),
                and_(Session.host_id == blocked_id, SessionListener.user_id == blocker_id),
            ),
        )
    )
    for listener in active_pair_sessions.scalars().all():
        listener.left_at = now

    grants = await db.execute(
        select(PrivateAlbumGrant)
        .join(PrivateAlbum, PrivateAlbum.id == PrivateAlbumGrant.album_id)
        .where(
            PrivateAlbumGrant.revoked_at.is_(None),
            or_(
                and_(PrivateAlbum.owner_id == blocker_id, PrivateAlbumGrant.grantee_id == blocked_id),
                and_(PrivateAlbum.owner_id == blocked_id, PrivateAlbumGrant.grantee_id == blocker_id),
            ),
        )
        .with_for_update()
    )
    for grant in grants.scalars().all():
        grant.revoked_at = now

    await db.flush()
