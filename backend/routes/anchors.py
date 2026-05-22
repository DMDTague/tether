"""
Tether Memory Anchors Routes
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, desc
from pydantic import BaseModel
from typing import Optional

from db.database import get_db
from models.models import MemoryAnchor, User
from routes.auth import get_current_user_id, user_to_dict

router = APIRouter(prefix="/api/anchors", tags=["anchors"])


@router.get("")
async def list_anchors(
    user_id: str = Depends(get_current_user_id),
    mood_tag: Optional[str] = Query(None),
    friend_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List memory anchors with optional filters."""
    query = select(MemoryAnchor).where(MemoryAnchor.user_id == user_id)
    if mood_tag:
        query = query.where(MemoryAnchor.mood_tag == mood_tag)
    if friend_id:
        query = query.where(MemoryAnchor.friend_id == friend_id)

    query = query.order_by(MemoryAnchor.session_date.desc())
    result = await db.execute(query)
    anchors = result.scalars().all()

    output = []
    for a in anchors:
        friend_result = await db.execute(select(User).where(User.id == a.friend_id))
        friend = friend_result.scalar_one_or_none()
        output.append({
            "id": a.id,
            "friend": user_to_dict(friend) if friend else None,
            "trackName": a.track_name,
            "artistName": a.artist_name,
            "durationMinutes": a.duration_minutes,
            "pulseCount": a.pulse_count,
            "moodTag": a.mood_tag,
            "cityA": a.city_a,
            "cityB": a.city_b,
            "sessionDate": a.session_date.isoformat() if a.session_date else None,
        })
    return output

@router.get("/recap")
async def get_recap(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Generate a wrapped-style recap for the user."""
    # Total sessions
    sessions_res = await db.execute(select(func.count(MemoryAnchor.id)).where(MemoryAnchor.user_id == user_id))
    total_sessions = sessions_res.scalar() or 0
    
    # Total pulses
    pulses_res = await db.execute(select(func.sum(MemoryAnchor.pulse_count)).where(MemoryAnchor.user_id == user_id))
    total_pulses = pulses_res.scalar() or 0
    
    # Distance bridged (rough estimate for now)
    # Since city geocoding in DB would require a lot of math, we'll assign a flat 100 miles per inter-city connection for the prototype
    distance_res = await db.execute(
        select(func.count(MemoryAnchor.id))
        .where(MemoryAnchor.user_id == user_id)
        .where(MemoryAnchor.city_a != MemoryAnchor.city_b)
    )
    long_distance_sessions = distance_res.scalar() or 0
    distance_bridged = long_distance_sessions * 100
    
    # Top mood
    mood_res = await db.execute(
        select(MemoryAnchor.mood_tag, func.count(MemoryAnchor.mood_tag).label('count'))
        .where(MemoryAnchor.user_id == user_id)
        .where(MemoryAnchor.mood_tag.isnot(None))
        .group_by(MemoryAnchor.mood_tag)
        .order_by(desc('count'))
        .limit(1)
    )
    top_mood_row = mood_res.first()
    top_mood = top_mood_row[0] if top_mood_row else "None"
    
    return {
        "totalSessions": total_sessions,
        "totalPulses": total_pulses,
        "distanceBridged": distance_bridged,
        "topMood": top_mood
    }

@router.get("/pending-mood")
async def pending_mood(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Get the oldest memory anchor without a mood tag for the user."""
    result = await db.execute(
        select(MemoryAnchor)
        .where(MemoryAnchor.user_id == user_id)
        .where(MemoryAnchor.mood_tag.is_(None))
        .order_by(MemoryAnchor.session_date.asc())
        .limit(1)
    )
    anchor = result.scalar_one_or_none()
    if not anchor:
        return {"pending": False}
        
    friend_result = await db.execute(select(User).where(User.id == anchor.friend_id))
    friend = friend_result.scalar_one_or_none()
    
    return {
        "pending": True,
        "anchor": {
            "id": anchor.id,
            "friend": user_to_dict(friend) if friend else None,
            "trackName": anchor.track_name,
            "artistName": anchor.artist_name,
        }
    }

class MoodPatchRequest(BaseModel):
    mood_tag: str

@router.patch("/{anchor_id}")
async def patch_anchor(anchor_id: str, req: MoodPatchRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Update the mood tag of a memory anchor."""
    result = await db.execute(select(MemoryAnchor).where(MemoryAnchor.id == anchor_id))
    anchor = result.scalar_one_or_none()
    
    if not anchor:
        raise HTTPException(status_code=404, detail="Anchor not found")
    if anchor.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your anchor")
        
    anchor.mood_tag = req.mood_tag
    await db.commit()
    
    return {"success": True}

@router.post("/{anchor_id}/retether")
async def retether_anchor(anchor_id: str, db: AsyncSession = Depends(get_db)):
    """Re-ignite a memory anchor health to 100."""
    from datetime import datetime, timezone
    result = await db.execute(select(MemoryAnchor).where(MemoryAnchor.id == anchor_id))
    anchor = result.scalar_one_or_none()
    if not anchor:
        raise HTTPException(status_code=404, detail="Anchor not found")
        
    anchor.health = 100.0
    anchor.last_tethered_at = datetime.now(timezone.utc)
    await db.commit()
    return {"success": True, "health": 100.0}
