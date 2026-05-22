from routes.auth import get_current_user_id
"""
Tether Sessions Routes

Create, join, leave sessions. Send pulses.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from db.database import get_db
from models.models import Session, SessionListener, User
from services.sync import sync_engine
from ws.manager import manager
from ws import protocol

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class CreateSessionRequest(BaseModel):
    track_id: str
    track_name: str
    artist_name: str
    track_duration_ms: int
    track_isrc: Optional[str] = None
    next_track_name: Optional[str] = None


class JoinSessionRequest(BaseModel):
    session_id: str


@router.post("/create")
async def create_session(req: CreateSessionRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Host creates a new listening session."""
    session = Session(
        host_id=user_id,
        track_id=req.track_id,
        track_name=req.track_name,
        artist_name=req.artist_name,
        track_isrc=req.track_isrc,
        track_duration_ms=req.track_duration_ms,
        track_start_epoch=sync_engine.create_track_start_epoch(),
        next_track_name=req.next_track_name,
    )
    db.add(session)
    await db.flush()

    # Register host in WebSocket session
    await manager.join_session(user_id, session.id)

    return {
        "sessionId": session.id,
        "trackStartEpoch": session.track_start_epoch,
        "trackDurationMs": session.track_duration_ms,
        "positionMs": 0,
        "isPaused": session.is_paused,
    }


@router.post("/join")
async def join_session(req: JoinSessionRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Listener joins an existing session."""
    result = await db.execute(select(Session).where(Session.id == req.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Add listener to DB
    listener = SessionListener(session_id=session.id, user_id=user_id)
    db.add(listener)
    await db.flush()

    # Register in WebSocket
    await manager.join_session(user_id, session.id)

    # Get user info for broadcast
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one()

    # Notify session members
    await manager.broadcast_to_session(
        session.id,
        protocol.listener_joined(user.id, user.display_name, user.initials),
        exclude=user_id,
    )

    # Calculate current position
    position = sync_engine.calculate_position_ms(
        session.track_start_epoch,
        session.track_duration_ms,
        session.is_paused,
        session.pause_position_ms or 0,
    )

    return {
        "sessionId": session.id,
        "trackId": session.track_id,
        "trackName": session.track_name,
        "artistName": session.artist_name,
        "positionMs": position,
        "isPaused": session.is_paused,
        "trackStartEpoch": session.track_start_epoch,
        "trackDurationMs": session.track_duration_ms,
        "nextTrackName": session.next_track_name,
    }


@router.post("/{session_id}/leave")
async def leave_session(session_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Leave an active session."""
    await manager.leave_session(user_id)

    # Remove from DB
    result = await db.execute(
        select(SessionListener).where(
            SessionListener.session_id == session_id,
            SessionListener.user_id == user_id,
        )
    )
    listener = result.scalar_one_or_none()
    if listener:
        await db.delete(listener)

    # Notify remaining members
    await manager.broadcast_to_session(
        session_id,
        protocol.listener_left(user_id),
    )

    return {"status": "left"}


@router.post("/{session_id}/pulse")
async def send_pulse(session_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Send a pulse to all session members."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await manager.broadcast_to_session(
        session_id,
        protocol.pulse_received(user.display_name),
        exclude=user_id,
    )

    return {"status": "pulse_sent"}
