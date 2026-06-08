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
    album_name: Optional[str] = None
    explicit: Optional[bool] = False
    artwork_url: Optional[str] = None


class JoinSessionRequest(BaseModel):
    session_id: str
    target_provider: str = "spotify"


from services.matching import matcher

@router.post("/create")
async def create_session(req: CreateSessionRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Host creates a new listening session."""
    
    # Phase 3A: Canonicalize Spotify Track
    canonical_id = await matcher.canonicalize_spotify_track(
        db=db,
        spotify_track_id=req.track_id,
        title=req.track_name,
        artist=req.artist_name,
        duration_ms=req.track_duration_ms,
        isrc=req.track_isrc,
        album=req.album_name,
        explicit=req.explicit or False,
        artwork_url=req.artwork_url
    )

    session = Session(
        host_id=user_id,
        track_id=req.track_id,
        track_name=req.track_name,
        artist_name=req.artist_name,
        track_isrc=req.track_isrc,
        track_duration_ms=req.track_duration_ms,
        canonical_track_id=canonical_id,
        provider="spotify",
        provider_track_id=req.track_id,
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

    from services.privacy import can_join_session, consume_grant, AuthDecision
    
    # Phase 4: Privacy Enforcement
    decision = await can_join_session(db, user_id, session.id)
    
    if decision == AuthDecision.KNOCK_REQUIRED:
        return {
            "status": "knock_required",
            "sessionId": session.id,
            "hostId": session.host_id,
            "message": "Knock required"
        }
        
    if decision in [AuthDecision.HOST_UNAVAILABLE, AuthDecision.DENY, AuthDecision.NOT_FRIENDS]:
        # Do not leak specific privacy mode or lack of friendship
        return {
            "status": "unavailable",
            "message": "This user is unavailable to tether."
        }
        
    # If ALLOW, consume the grant (if one existed)
    await consume_grant(db, user_id, session.id)

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

    # Phase 3B: Cross-provider track matching
    provider_track_id = session.track_id # fallback to host's spotify ID
    is_ambiguous = False
    
    if session.canonical_track_id and req.target_provider != session.provider:
        match = await matcher.match_track_for_provider(
            db=db,
            canonical_track_id=session.canonical_track_id,
            target_provider=req.target_provider
        )
        if match:
            if match.match_method == "ambiguous":
                is_ambiguous = True
                provider_track_id = None
            else:
                provider_track_id = match.provider_track_id
        else:
            provider_track_id = None # unavailable

    return {
        "status": "success",
        "sessionId": session.id,
        "trackId": provider_track_id,
        "trackName": session.track_name,
        "artistName": session.artist_name,
        "positionMs": position,
        "isPaused": session.is_paused,
        "trackStartEpoch": session.track_start_epoch,
        "trackDurationMs": session.track_duration_ms,
        "nextTrackName": session.next_track_name,
        "isAmbiguous": is_ambiguous,
        "isUnavailable": provider_track_id is None and not is_ambiguous
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
