"""Authoritative, pair-scoped session finalization and Memory Anchor creation."""

import logging
from datetime import datetime, timezone

from sqlalchemy import and_, func, or_, select

from db.database import async_session
from models.models import MemoryAnchor, Session, SessionListener
from models.session_models import SessionEvent, SyncMeasurement
from models.safety_models import UserReport
from services.presence import presence_store
from services.telemetry import record_server_outcome
from ws.manager import manager

logger = logging.getLogger(__name__)
MEANINGFUL_SECONDS = 5 * 60
MAX_MEANINGFUL_DRIFT_MS = 2_000
MIN_SYNC_MEASUREMENTS = 3
MIN_SYNC_GOOD_RATIO = 0.80
DELIBERATE_RELATIONAL_EVENTS = ["pulse", "queue_add", "message", "song_signal"]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


async def _has_pair_rejection(db, session_id: str, host_id: str, listener_id: str) -> bool:
    count = await db.scalar(
        select(func.count(UserReport.id)).where(
            UserReport.context_type == "session",
            UserReport.context_id == session_id,
            or_(
                and_(UserReport.reporter_id == host_id, UserReport.reported_user_id == listener_id),
                and_(UserReport.reporter_id == listener_id, UserReport.reported_user_id == host_id),
            ),
        )
    )
    return bool(count)


async def _sync_is_verified(db, session_id: str, listener_id: str, started_at: datetime, ended_at: datetime) -> bool:
    measurements = (
        await db.execute(
            select(SyncMeasurement.drift_ms).where(
                SyncMeasurement.session_id == session_id,
                SyncMeasurement.user_id == listener_id,
                SyncMeasurement.measured_at >= started_at,
                SyncMeasurement.measured_at <= ended_at,
            )
        )
    ).scalars().all()
    if len(measurements) < MIN_SYNC_MEASUREMENTS:
        return False
    good = sum(1 for drift in measurements if abs(int(drift)) <= MAX_MEANINGFUL_DRIFT_MS)
    return good / len(measurements) >= MIN_SYNC_GOOD_RATIO


async def _anchor_exists(db, session_id: str, owner_id: str, friend_id: str) -> bool:
    return await db.scalar(
        select(MemoryAnchor.id).where(
            MemoryAnchor.session_id == session_id,
            MemoryAnchor.user_id == owner_id,
            MemoryAnchor.friend_id == friend_id,
        )
    ) is not None


async def _record_listener_departure(user_id: str, session_id: str) -> bool:
    """Persist an unexpected listener disconnect so later finalization cannot overcount it."""

    async with async_session() as db:
        session = (
            await db.execute(select(Session).where(Session.id == session_id, Session.status == "active"))
        ).scalar_one_or_none()
        if not session or session.host_id == user_id:
            return False
        listener = (
            await db.execute(
                select(SessionListener)
                .where(
                    SessionListener.session_id == session_id,
                    SessionListener.user_id == user_id,
                    SessionListener.left_at.is_(None),
                )
                .with_for_update()
            )
        ).scalar_one_or_none()
        if listener:
            listener.left_at = _now()
            db.add(
                SessionEvent(
                    session_id=session_id,
                    actor_id=user_id,
                    event_type="listener_disconnected",
                )
            )
            await presence_store.remove_user_session(user_id)
            await db.commit()
        return True


async def handle_disconnect(user_id: str, session_id: str | None):
    """Record listener departure or finalize a host session exactly once."""

    if not session_id:
        return
    if await _record_listener_departure(user_id, session_id):
        return

    notifications: dict[str, dict] = {}
    try:
        async with async_session() as db:
            session = (
                await db.execute(
                    select(Session)
                    .where(
                        Session.id == session_id,
                        Session.host_id == user_id,
                        Session.status == "active",
                    )
                    .with_for_update()
                )
            ).scalar_one_or_none()
            if not session:
                return

            ended_at = _now()
            listeners = (
                await db.execute(
                    select(SessionListener).where(
                        SessionListener.session_id == session_id,
                        SessionListener.user_id != session.host_id,
                        SessionListener.has_tethered.is_(True),
                    )
                )
            ).scalars().all()
            deliberate_actor_ids = set(
                (
                    await db.execute(
                        select(SessionEvent.actor_id).where(
                            SessionEvent.session_id == session_id,
                            SessionEvent.event_type.in_(DELIBERATE_RELATIONAL_EVENTS),
                        )
                    )
                ).scalars().all()
            )

            host_city = manager.get_user_city(user_id)
            host_created_any = False
            qualified_pairs = 0
            for listener in listeners:
                joined_at = _aware(listener.joined_at) if listener.joined_at else None
                pair_end = min(ended_at, _aware(listener.left_at)) if listener.left_at else ended_at
                overlap_seconds = max(0, (pair_end - joined_at).total_seconds()) if joined_at else 0
                deliberate = listener.relational_action or listener.user_id in deliberate_actor_ids
                sync_verified = bool(
                    joined_at
                    and overlap_seconds >= MEANINGFUL_SECONDS
                    and await _sync_is_verified(db, session_id, listener.user_id, joined_at, pair_end)
                )
                rejected = await _has_pair_rejection(db, session_id, session.host_id, listener.user_id)
                meaningful = overlap_seconds >= MEANINGFUL_SECONDS and deliberate and sync_verified and not rejected

                evidence = {
                    "overlapSeconds": int(overlap_seconds),
                    "playbackConfirmed": bool(listener.has_tethered),
                    "syncVerified": sync_verified,
                    "deliberateAction": deliberate,
                    "safetyRejected": rejected,
                }
                notifications[listener.user_id] = {
                    "type": "memory_created" if meaningful else "memory_not_created",
                    "session_id": session_id,
                    "meaningful": meaningful,
                    "contract": "5m real overlap + playback confirmed + sync evidence + deliberate pair action + no pair rejection",
                    "evidence": evidence,
                }
                if not meaningful:
                    continue

                qualified_pairs += 1
                listener_city = manager.get_user_city(listener.user_id)
                same_region = bool(host_city and listener_city and host_city == listener_city)
                pulse_count = int(
                    await db.scalar(
                        select(func.count(SessionEvent.id)).where(
                            SessionEvent.session_id == session_id,
                            SessionEvent.event_type == "pulse",
                            SessionEvent.actor_id == listener.user_id,
                        )
                    ) or 0
                )
                common = dict(
                    session_id=session_id,
                    track_name=session.track_name or "Unknown track",
                    artist_name=session.artist_name or "Unknown artist",
                    duration_minutes=int(overlap_seconds) // 60,
                    pulse_count=pulse_count,
                    city_a="Same broad area" if same_region else (host_city or None),
                    city_b=None if same_region else (listener_city or None),
                    session_date=joined_at,
                    meaningful_session_verified=True,
                )

                for owner_id, friend_id in (
                    (session.host_id, listener.user_id),
                    (listener.user_id, session.host_id),
                ):
                    if not await _anchor_exists(db, session_id, owner_id, friend_id):
                        db.add(MemoryAnchor(user_id=owner_id, friend_id=friend_id, **common))
                        await db.flush()
                        await record_server_outcome(
                            db,
                            user_id=owner_id,
                            event_name="anchor_created",
                            event_id=f"anchor:{session_id}:{owner_id}:{friend_id}",
                            session_id=session_id,
                            properties={"qualifiedBy": "pair_contract"},
                        )
                        if owner_id == session.host_id:
                            host_created_any = True

                for account_id in (session.host_id, listener.user_id):
                    await record_server_outcome(
                        db,
                        user_id=account_id,
                        event_name="meaningful_session_reached",
                        event_id=f"meaningful:{session_id}:{session.host_id}:{listener.user_id}:{account_id}",
                        session_id=session_id,
                        properties={"overlapSeconds": int(overlap_seconds)},
                    )

            session.status = "ended"
            session.ended_at = ended_at
            await record_server_outcome(
                db,
                user_id=session.host_id,
                event_name="session_ended",
                event_id=f"session-ended:{session_id}",
                session_id=session_id,
                properties={"qualifiedPairCount": qualified_pairs},
            )
            await presence_store.remove_user_session(user_id)
            for listener in listeners:
                await presence_store.remove_user_session(listener.user_id)
            await db.commit()

            notifications[session.host_id] = {
                "type": "memory_created" if host_created_any else "memory_not_created",
                "session_id": session_id,
                "meaningful": host_created_any,
                "qualifiedPairCount": qualified_pairs,
                "contract": "Each listener pair is evaluated independently",
            }

        for target_id, payload in notifications.items():
            await manager.send_to_user(target_id, payload)
    except Exception:
        logger.exception("session.finalization_failed", extra={"session_id": session_id})
