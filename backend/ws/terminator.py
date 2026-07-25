"""Authoritative session finalization and Memory Anchor creation."""

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select

from db.database import async_session
from models.models import MemoryAnchor, Session, SessionListener
from models.session_models import SessionEvent
from models.safety_models import UserReport
from services.presence import presence_store
from ws.manager import manager

logger = logging.getLogger(__name__)
MEANINGFUL_SECONDS = 5 * 60


async def handle_disconnect(user_id: str, session_id: str | None):
    """End a host session and create Anchors under one shared contract.

    Each anchored pair must have remained synchronized together for five
    minutes. A relational action may come from either participant, because it
    describes the shared session rather than an individual achievement.
    """
    if not session_id:
        return
    try:
        async with async_session() as db:
            session = (await db.execute(select(Session).where(Session.id == session_id))).scalar_one_or_none()
            if not session or session.host_id != user_id or session.status != "active":
                return
            ended_at = datetime.now(timezone.utc)
            listeners = (await db.execute(select(SessionListener).where(SessionListener.session_id == session_id, SessionListener.user_id != session.host_id, SessionListener.has_tethered.is_(True)))).scalars().all()
            relational_actor_ids = set((await db.execute(select(SessionEvent.actor_id).where(SessionEvent.session_id == session_id, SessionEvent.event_type.in_(["pulse", "queue_add", "message", "tether_success"])))).scalars().all())
            relational_action_seen = bool(relational_actor_ids) or any(listener.relational_action for listener in listeners)
            safety_rejections = int((await db.execute(select(func.count(UserReport.id)).where(UserReport.context_type == "session", UserReport.context_id == session_id))).scalar() or 0)
            pulse_count = int((await db.execute(select(func.count(SessionEvent.id)).where(SessionEvent.session_id == session_id, SessionEvent.event_type == "pulse"))).scalar() or 0)
            qualified = [listener for listener in listeners if listener.joined_at and max(0, (ended_at - listener.joined_at).total_seconds()) >= MEANINGFUL_SECONDS]
            meaningful = bool(qualified) and relational_action_seen and safety_rejections == 0
            if meaningful:
                host_city = manager.get_user_city(user_id)
                for listener in qualified:
                    listener_city = manager.get_user_city(listener.user_id)
                    same_region = bool(host_city and listener_city and host_city == listener_city)
                    duration_minutes = int((ended_at - listener.joined_at).total_seconds()) // 60
                    common = dict(session_id=session_id, track_name=session.track_name or "Unknown track", artist_name=session.artist_name or "Unknown artist", duration_minutes=duration_minutes, pulse_count=pulse_count, city_a="Same broad area" if same_region else (host_city or None), city_b=None if same_region else (listener_city or None), session_date=listener.joined_at, meaningful_session_verified=True)
                    db.add(MemoryAnchor(user_id=session.host_id, friend_id=listener.user_id, **common))
                    db.add(MemoryAnchor(user_id=listener.user_id, friend_id=session.host_id, **common))
            session.status, session.ended_at = "ended", ended_at
            await presence_store.remove_user_session(user_id)
            await db.commit()
            payload = {"type": "memory_created" if meaningful else "memory_not_created", "session_id": session_id, "meaningful": meaningful, "contract": "5m together + synchronized playback + relational action + no safety report"}
            await manager.send_to_user(session.host_id, payload)
            for listener in listeners:
                await manager.send_to_user(listener.user_id, payload)
    except Exception:
        logger.exception("session.finalization_failed", extra={"session_id": session_id})
