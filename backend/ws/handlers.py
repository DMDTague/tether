"""Database-authorized WebSocket handlers; client payloads are never authority."""

from datetime import datetime, timedelta, timezone
import uuid

from sqlalchemy import select, update

from db.database import async_session
from models.models import Session, SessionListener, TetherJoinGrant, User
from models.session_models import Knock, SessionEvent, SyncMeasurement
from services.presence import presence_store
from services.safety_policy import is_blocked
from services.sync import sync_engine
from services.telemetry import record_server_outcome
from ws import protocol
from ws.manager import manager


def _now():
    return datetime.now(timezone.utc)


async def _participant(db, session: Session, user_id: str) -> bool:
    if session.host_id == user_id:
        return True
    row = await db.execute(
        select(SessionListener.user_id).where(
            SessionListener.session_id == session.id,
            SessionListener.user_id == user_id,
            SessionListener.left_at.is_(None),
        )
    )
    return row.scalar_one_or_none() is not None


async def handle_message(user_id: str, user_name: str, user_initials: str, data: dict):
    handlers = {
        "playback_event": lambda: handle_playback_event(user_id, data),
        "sync_measurement": lambda: handle_sync_measurement(user_id, data),
        "pulse": lambda: handle_pulse(user_id, user_name, data),
        "knock": lambda: handle_knock(user_id, user_name, user_initials, data),
        "knock_response": lambda: handle_knock_response(user_id, data),
        "presence_update": lambda: handle_presence_update(user_id, data),
        "reconnect": lambda: handle_reconnect(user_id, data),
        "tether_success": lambda: handle_tether_success(user_id, data),
    }
    action = handlers.get(data.get("type"))
    if action:
        await action()


async def handle_playback_event(user_id: str, data: dict):
    session_id = manager.get_user_session(user_id) or await presence_store.get_user_session(user_id)
    if not session_id:
        return
    async with async_session() as db:
        session = (
            await db.execute(
                select(Session).where(
                    Session.id == session_id,
                    Session.host_id == user_id,
                    Session.status == "active",
                )
            )
        ).scalar_one_or_none()
        if not session:
            return
        event = data.get("event")
        position = max(0, int(data.get("position_ms", 0)))
        if event == "pause":
            session.is_paused = True
            session.pause_position_ms = position
            payload = protocol.host_paused(session_id)
        elif event == "resume":
            session.is_paused = False
            session.pause_position_ms = position
            session.track_start_epoch = sync_engine.create_track_start_epoch() - position
            payload = protocol.host_resumed(session_id, position)
        elif event == "skip":
            track_id = str(data.get("track_id", ""))[:256]
            track_name = str(data.get("track_name", ""))[:256]
            artist_name = str(data.get("artist_name", ""))[:256]
            duration_ms = int(data.get("duration_ms", 0) or 0)
            if not track_id or not track_name or not artist_name or duration_ms <= 0:
                await manager.send_to_user(
                    user_id,
                    {"type": "error", "code": "skip_requires_complete_track_identity"},
                )
                return
            session.track_id = track_id
            session.provider_track_id = track_id
            session.track_name = track_name
            session.artist_name = artist_name
            session.track_duration_ms = duration_ms
            session.track_isrc = str(data.get("isrc", ""))[:16] or None
            # A new provider ID is not treated as canonically matched until the
            # catalog reconciliation service verifies it.
            session.canonical_track_id = None
            session.track_start_epoch = sync_engine.create_track_start_epoch() - position
            session.is_paused = False
            session.pause_position_ms = position
            payload = protocol.session_sync(track_id, position, False)
            payload.update(
                {
                    "track_name": track_name,
                    "artist_name": artist_name,
                    "duration_ms": duration_ms,
                    "canonical_track_id": None,
                }
            )
        else:
            return
        db.add(
            SessionEvent(
                session_id=session_id,
                actor_id=user_id,
                event_type=f"playback_{event}",
                payload={"positionMs": position},
            )
        )
        await db.commit()
    await manager.broadcast_to_session(session_id, payload, exclude=user_id)


async def handle_sync_measurement(user_id: str, data: dict):
    session_id = str(data.get("session_id", ""))
    mapped = manager.get_user_session(user_id) or await presence_store.get_user_session(user_id)
    if not session_id or mapped != session_id:
        return
    try:
        drift_ms = int(data.get("drift_ms"))
    except (TypeError, ValueError):
        return
    if abs(drift_ms) > 120_000:
        return
    async with async_session() as db:
        session = (
            await db.execute(select(Session).where(Session.id == session_id, Session.status == "active"))
        ).scalar_one_or_none()
        if not session or not await _participant(db, session, user_id):
            return
        db.add(SyncMeasurement(session_id=session_id, user_id=user_id, drift_ms=drift_ms))
        db.add(
            SessionEvent(
                session_id=session_id,
                actor_id=user_id,
                event_type="sync_measured",
                payload={"driftBucket": min(abs(drift_ms) // 250, 40)},
            )
        )
        await db.commit()


async def handle_pulse(user_id: str, user_name: str, data: dict):
    session_id = data.get("session_id")
    mapped = manager.get_user_session(user_id) or await presence_store.get_user_session(user_id)
    if not session_id or mapped != session_id:
        return
    async with async_session() as db:
        session = (
            await db.execute(select(Session).where(Session.id == session_id, Session.status == "active"))
        ).scalar_one_or_none()
        if not session or not await _participant(db, session, user_id) or await is_blocked(db, user_id, session.host_id):
            return
        if await presence_store.check_pulse_cooldown(session_id, user_id):
            return
        await db.execute(
            update(SessionListener)
            .where(
                SessionListener.session_id == session_id,
                SessionListener.user_id == user_id,
                SessionListener.left_at.is_(None),
            )
            .values(relational_action=True)
        )
        db.add(SessionEvent(session_id=session_id, actor_id=user_id, event_type="pulse"))
        await db.commit()
    await manager.broadcast_to_session(session_id, protocol.pulse_received(user_name), exclude=user_id)


async def handle_knock(user_id: str, user_name: str, initials: str, data: dict):
    target_id, session_id = data.get("target_user_id"), data.get("session_id")
    if not target_id or not session_id or target_id == user_id:
        return
    from services.privacy import AuthDecision, can_request_tether

    async with async_session() as db:
        session = (
            await db.execute(
                select(Session).where(
                    Session.id == session_id,
                    Session.host_id == target_id,
                    Session.status == "active",
                )
            )
        ).scalar_one_or_none()
        if not session or await is_blocked(db, user_id, target_id):
            return
        if await can_request_tether(db, user_id, target_id, session_id) not in {
            AuthDecision.KNOCK_REQUIRED,
            AuthDecision.ALLOW,
        }:
            return
        knock = Knock(
            id=str(uuid.uuid4()),
            session_id=session_id,
            knocker_id=user_id,
            host_id=target_id,
            expires_at=_now() + timedelta(seconds=120),
        )
        db.add(knock)
        await db.commit()
    await manager.send_to_user(
        target_id,
        protocol.knock_request(user_id, user_name, initials, knock.id, session_id),
    )


async def handle_knock_response(user_id: str, data: dict):
    knock_id, accepted = data.get("knock_id"), bool(data.get("accepted"))
    if not knock_id:
        return
    async with async_session() as db:
        knock = (
            await db.execute(
                select(Knock)
                .where(
                    Knock.id == knock_id,
                    Knock.host_id == user_id,
                    Knock.status == "pending",
                )
                .with_for_update()
            )
        ).scalar_one_or_none()
        if not knock or knock.expires_at <= _now():
            if knock:
                knock.status, knock.handled_at = "expired", _now()
                await db.commit()
            return
        session = (
            await db.execute(
                select(Session).where(
                    Session.id == knock.session_id,
                    Session.host_id == user_id,
                    Session.status == "active",
                )
            )
        ).scalar_one_or_none()
        if not session or await is_blocked(db, user_id, knock.knocker_id):
            accepted = False
        knock.status, knock.handled_at = ("accepted" if accepted else "rejected"), _now()
        if accepted:
            db.add(
                TetherJoinGrant(
                    session_id=knock.session_id,
                    host_id=user_id,
                    listener_id=knock.knocker_id,
                    expires_at=_now() + timedelta(seconds=120),
                )
            )
        await db.commit()
        target, session_id = knock.knocker_id, knock.session_id
    await manager.send_to_user(
        target,
        {
            "type": "knock_accepted" if accepted else "knock_rejected",
            "session_id": session_id,
            "knock_id": knock_id,
        },
    )


async def handle_presence_update(user_id: str, data: dict):
    mode = data.get("privacy_mode")
    if mode not in {"open-door", "knock-first", "ghost"}:
        return
    async with async_session() as db:
        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user:
            return
        user.privacy_mode = mode
        await db.commit()
    if mode == "ghost":
        await presence_store.remove_presence(user_id)
    await manager.send_to_user(user_id, {"type": "presence_updated", "privacy_mode": mode})


async def handle_reconnect(user_id: str, data: dict):
    session_id = data.get("last_session_id")
    if not session_id:
        return
    from services.privacy import AuthDecision, can_join_session

    async with async_session() as db:
        if await can_join_session(db, user_id, session_id) != AuthDecision.ALLOW:
            return
        session = (
            await db.execute(select(Session).where(Session.id == session_id, Session.status == "active"))
        ).scalar_one_or_none()
        if not session:
            return
        listener = (
            await db.execute(
                select(SessionListener).where(
                    SessionListener.session_id == session_id,
                    SessionListener.user_id == user_id,
                    SessionListener.has_tethered.is_(True),
                )
            )
        ).scalar_one_or_none()
        if session.host_id != user_id and not listener:
            # Reconnect cannot create membership or bypass provider resolution.
            await manager.send_to_user(user_id, {"type": "reconnect_failed", "code": "playback_not_previously_confirmed"})
            return
        if listener:
            listener.left_at = None
        rows = await db.execute(
            select(User.id, User.display_name, User.initials)
            .join(SessionListener, SessionListener.user_id == User.id)
            .where(
                SessionListener.session_id == session_id,
                SessionListener.left_at.is_(None),
            )
        )
        listeners = [
            {"id": row.id, "displayName": row.display_name, "initials": row.initials}
            for row in rows.all()
        ]
        position = sync_engine.calculate_position_ms(
            session.track_start_epoch,
            session.track_duration_ms,
            session.is_paused,
            session.pause_position_ms or 0,
        )
        await db.commit()
    await manager.join_session(user_id, session_id)
    await presence_store.set_user_session(user_id, session_id)
    await manager.send_to_user(
        user_id,
        protocol.reconnect_ack(
            session_id=session_id,
            position_ms=position,
            listeners=listeners,
            is_paused=bool(session.is_paused),
        ),
    )


async def handle_tether_success(user_id: str, data: dict):
    session_id = data.get("session_id")
    if not session_id:
        return
    async with async_session() as db:
        session = (
            await db.execute(select(Session).where(Session.id == session_id, Session.status == "active"))
        ).scalar_one_or_none()
        if not session or not await _participant(db, session, user_id):
            return
        await db.execute(
            update(SessionListener)
            .where(
                SessionListener.session_id == session_id,
                SessionListener.user_id == user_id,
                SessionListener.left_at.is_(None),
            )
            .values(has_tethered=True)
        )
        db.add(SessionEvent(session_id=session_id, actor_id=user_id, event_type="tether_success"))
        await record_server_outcome(
            db,
            user_id=user_id,
            event_name="audio_started",
            event_id=f"audio-started:{session_id}:{user_id}",
            session_id=session_id,
            properties={"providerConfirmedByClient": True},
        )
        await record_server_outcome(
            db,
            user_id=user_id,
            event_name="join_succeeded",
            event_id=f"join-succeeded:{session_id}:{user_id}",
            session_id=session_id,
        )
        await db.commit()
