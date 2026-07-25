"""Create, join, recover, and leave authoritative live listening sessions."""

from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import Session, SessionListener, User
from models.session_models import SessionEvent
from models.safety_models import UserBlock
from routes.auth import get_current_user_id
from services.matching import matcher
from services.presence import presence_store
from services.sync import sync_engine
from ws import protocol
from ws.manager import manager

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class CreateSessionRequest(BaseModel):
    track_id: str = Field(min_length=1, max_length=256)
    track_name: str = Field(min_length=1, max_length=256)
    artist_name: str = Field(min_length=1, max_length=256)
    track_duration_ms: int = Field(gt=0)
    provider: Literal["spotify", "apple_music"] = "spotify"
    track_isrc: Optional[str] = Field(default=None, max_length=16)
    next_track_name: Optional[str] = Field(default=None, max_length=256)
    album_name: Optional[str] = Field(default=None, max_length=256)
    explicit: bool = False
    artwork_url: Optional[str] = Field(default=None, max_length=512)


class JoinSessionRequest(BaseModel):
    session_id: str
    target_provider: Literal["spotify", "apple_music"] = "spotify"


async def _is_blocked(db: AsyncSession, first_id: str, second_id: str) -> bool:
    result = await db.execute(select(UserBlock.id).where(or_(and_(UserBlock.blocker_id == first_id, UserBlock.blocked_user_id == second_id), and_(UserBlock.blocker_id == second_id, UserBlock.blocked_user_id == first_id))))
    return result.scalar_one_or_none() is not None


@router.post("/create")
async def create_session(req: CreateSessionRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    canonical_id: str | None = None
    if req.provider == "spotify":
        canonical_id = await matcher.canonicalize_spotify_track(db=db, spotify_track_id=req.track_id, title=req.track_name, artist=req.artist_name, duration_ms=req.track_duration_ms, isrc=req.track_isrc, album=req.album_name, explicit=req.explicit, artwork_url=req.artwork_url)
    else:
        from models.models import CanonicalTrack, ProviderTrackMatch
        canonical = None
        if req.track_isrc:
            canonical = (await db.execute(select(CanonicalTrack).where(CanonicalTrack.isrc == req.track_isrc))).scalar_one_or_none()
        if not canonical:
            canonical = CanonicalTrack(isrc=req.track_isrc, title=req.track_name, artist=req.artist_name, album=req.album_name, duration_ms=req.track_duration_ms, explicit=req.explicit, artwork_url=req.artwork_url)
            db.add(canonical)
            await db.flush()
        canonical_id = canonical.id
        match = (await db.execute(select(ProviderTrackMatch).where(ProviderTrackMatch.provider == req.provider, ProviderTrackMatch.provider_track_id == req.track_id))).scalar_one_or_none()
        if not match:
            db.add(ProviderTrackMatch(canonical_track_id=canonical.id, provider=req.provider, provider_track_id=req.track_id, match_method="host_provided", confidence=1.0))

    session = Session(host_id=user_id, track_id=req.track_id, track_name=req.track_name, artist_name=req.artist_name, track_isrc=req.track_isrc, track_duration_ms=req.track_duration_ms, canonical_track_id=canonical_id, provider=req.provider, provider_track_id=req.track_id, track_start_epoch=sync_engine.create_track_start_epoch(), next_track_name=req.next_track_name, status="active")
    db.add(session)
    await db.flush()
    db.add(SessionListener(session_id=session.id, user_id=user_id, has_tethered=True))
    db.add(SessionEvent(session_id=session.id, actor_id=user_id, event_type="session_created"))
    await db.flush()
    await manager.join_session(user_id, session.id)
    await presence_store.set_user_session(user_id, session.id)
    await presence_store.set_presence(user_id, "hosting", req.track_name, req.artist_name, req.artwork_url or "", req.provider)
    return {"sessionId": session.id, "provider": session.provider, "trackStartEpoch": session.track_start_epoch, "trackDurationMs": session.track_duration_ms, "positionMs": 0, "isPaused": bool(session.is_paused)}


@router.post("/join")
async def join_session(req: JoinSessionRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    session = (await db.execute(select(Session).where(Session.id == req.session_id, Session.status == "active"))).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if await _is_blocked(db, user_id, session.host_id):
        return {"status": "unavailable", "message": "This user is unavailable to tether."}
    from services.privacy import AuthDecision, can_join_session, consume_grant
    decision = await can_join_session(db, user_id, session.id)
    if decision == AuthDecision.KNOCK_REQUIRED:
        return {"status": "knock_required", "sessionId": session.id, "hostId": session.host_id, "message": "Knock required"}
    if decision in {AuthDecision.HOST_UNAVAILABLE, AuthDecision.DENY, AuthDecision.NOT_FRIENDS}:
        return {"status": "unavailable", "message": "This user is unavailable to tether."}
    await consume_grant(db, user_id, session.id)
    listener = (await db.execute(select(SessionListener).where(SessionListener.session_id == session.id, SessionListener.user_id == user_id))).scalar_one_or_none()
    if listener:
        listener.left_at = None
        listener.joined_at = datetime.now(timezone.utc)
    else:
        listener = SessionListener(session_id=session.id, user_id=user_id)
        db.add(listener)
    db.add(SessionEvent(session_id=session.id, actor_id=user_id, event_type="listener_joined"))
    await db.flush()
    await manager.join_session(user_id, session.id)
    await presence_store.set_user_session(user_id, session.id)
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one()
    await manager.broadcast_to_session(session.id, protocol.listener_joined(user.id, user.display_name, user.initials), exclude=user_id)
    position = sync_engine.calculate_position_ms(session.track_start_epoch, session.track_duration_ms, session.is_paused, session.pause_position_ms or 0)
    provider_track_id = session.provider_track_id
    is_ambiguous = False
    if session.canonical_track_id and req.target_provider != session.provider:
        match = await matcher.match_track_for_provider(db=db, canonical_track_id=session.canonical_track_id, target_provider=req.target_provider)
        if match and match.match_method == "ambiguous":
            is_ambiguous, provider_track_id = True, None
        elif match:
            provider_track_id = match.provider_track_id
        else:
            provider_track_id = None
    return {"status": "success", "sessionId": session.id, "hostProvider": session.provider, "targetProvider": req.target_provider, "trackId": provider_track_id, "trackName": session.track_name, "artistName": session.artist_name, "positionMs": position, "isPaused": bool(session.is_paused), "trackStartEpoch": session.track_start_epoch, "trackDurationMs": session.track_duration_ms, "nextTrackName": session.next_track_name, "isAmbiguous": is_ambiguous, "isUnavailable": provider_track_id is None and not is_ambiguous}


@router.post("/{session_id}/leave")
async def leave_session(session_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    session = (await db.execute(select(Session).where(Session.id == session_id, Session.status == "active"))).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    listener = (await db.execute(select(SessionListener).where(SessionListener.session_id == session_id, SessionListener.user_id == user_id, SessionListener.left_at.is_(None)))).scalar_one_or_none()
    if not listener and session.host_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    is_host = session.host_id == user_id
    now = datetime.now(timezone.utc)
    if listener and not is_host:
        listener.left_at = now
    db.add(SessionEvent(session_id=session_id, actor_id=user_id, event_type="session_left"))
    if is_host:
        # Persist the explicit leave before the shared finalizer opens its own
        # transaction. The finalizer remains the only place that ends a host
        # session and decides whether Memory Anchors are earned.
        await db.commit()
        from ws.terminator import handle_disconnect
        await handle_disconnect(user_id, session_id)
    await manager.leave_session(user_id)
    await presence_store.remove_user_session(user_id)
    await presence_store.remove_presence(user_id)
    await manager.broadcast_to_session(session_id, protocol.listener_left(user_id))
    return {"status": "ended" if is_host else "left"}


@router.post("/{session_id}/pulse")
async def send_pulse(session_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    session = (await db.execute(select(Session).where(Session.id == session_id, Session.status == "active"))).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    membership = await db.execute(select(SessionListener.user_id).where(SessionListener.session_id == session_id, SessionListener.user_id == user_id, SessionListener.left_at.is_(None)))
    if session.host_id != user_id and not membership.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")
    if await _is_blocked(db, user_id, session.host_id):
        raise HTTPException(status_code=404, detail="Session not found")
    if await presence_store.check_pulse_cooldown(session_id, user_id):
        raise HTTPException(status_code=429, detail="Pulse cooldown active")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.add(SessionEvent(session_id=session_id, actor_id=user_id, event_type="pulse"))
    await manager.broadcast_to_session(session_id, protocol.pulse_received(user.display_name), exclude=user_id)
    return {"status": "pulse_sent"}
