from routes.auth import get_current_user_id
"""
Tether Playback Event Routes

Handles host playback events (skip, pause, resume) and propagates
them to all session listeners via WebSocket.
"""

import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from db.database import get_db
from models.models import Session
from services.sync import sync_engine
from ws.manager import manager
from ws import protocol

router = APIRouter(prefix="/api/playback", tags=["playback"])


class PlaybackEventRequest(BaseModel):
    session_id: str
    event: str  # skip | pause | resume
    track_id: Optional[str] = None
    track_name: Optional[str] = None
    artist_name: Optional[str] = None
    track_duration_ms: Optional[int] = None
    position_ms: Optional[int] = None
    next_track_name: Optional[str] = None


@router.post("/event")
async def report_event(req: PlaybackEventRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """
    Report a playback event from the host device.
    
    This is the core of the event-driven architecture:
    - API is only called on meaningful events (skip, pause, resume)
    - Between events, position is calculated from local clock
    """
    result = await db.execute(select(Session).where(Session.id == req.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.host_id != user_id:
        raise HTTPException(status_code=403, detail="Only the host can report events")

    if req.event == "pause":
        # Snapshot position and pause
        position = sync_engine.pause_snapshot(
            session.track_start_epoch,
            session.track_duration_ms,
        )
        session.is_paused = True
        session.pause_position_ms = position

        # Broadcast hard stop to all listeners
        await manager.broadcast_to_session(
            session.id,
            protocol.host_paused(session.id),
            exclude=user_id,
        )

        return {"event": "paused", "positionMs": position}

    elif req.event == "resume":
        # Create new start epoch from the paused position
        resume_pos = session.pause_position_ms or 0
        session.track_start_epoch = sync_engine.create_track_start_epoch(resume_pos)
        session.is_paused = False
        session.pause_position_ms = None

        # Broadcast resume with position
        await manager.broadcast_to_session(
            session.id,
            protocol.host_resumed(session.id, resume_pos),
            exclude=user_id,
        )

        return {"event": "resumed", "positionMs": resume_pos}

    elif req.event == "skip":
        # Update track info and reset clock
        session.track_id = req.track_id or session.track_id
        session.track_name = req.track_name or session.track_name
        session.artist_name = req.artist_name or session.artist_name
        session.track_duration_ms = req.track_duration_ms or session.track_duration_ms
        session.track_start_epoch = sync_engine.create_track_start_epoch(0)
        session.is_paused = False
        session.pause_position_ms = None
        session.next_track_name = req.next_track_name

        # Broadcast new track to all listeners
        await manager.broadcast_to_session(
            session.id,
            protocol.session_sync(session.track_id, 0, False),
            exclude=user_id,
        )

        return {"event": "skipped", "trackId": session.track_id}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown event: {req.event}")


@router.get("/{session_id}/position")
async def get_position(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get the current calculated position for a session (using local clock)."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    position = sync_engine.calculate_position_ms(
        session.track_start_epoch,
        session.track_duration_ms,
        session.is_paused,
        session.pause_position_ms or 0,
    )

    return {
        "sessionId": session.id,
        "trackId": session.track_id,
        "positionMs": position,
        "isPaused": session.is_paused,
    }
