"""Memory Anchor routes governed by one meaningful-session contract."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import MemoryAnchor, User
from routes.auth import get_current_user_id, user_to_dict

router = APIRouter(prefix="/api/anchors", tags=["anchors"])
MEANINGFUL_SESSION_MINUTES = 5


@router.get("")
async def list_anchors(user_id: str = Depends(get_current_user_id), mood_tag: Optional[str] = Query(None), friend_id: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    query = select(MemoryAnchor).where(MemoryAnchor.user_id == user_id)
    if mood_tag:
        query = query.where(MemoryAnchor.mood_tag == mood_tag)
    if friend_id:
        query = query.where(MemoryAnchor.friend_id == friend_id)
    result = await db.execute(query.order_by(MemoryAnchor.session_date.desc()))
    output = []
    for anchor in result.scalars().all():
        friend = (await db.execute(select(User).where(User.id == anchor.friend_id))).scalar_one_or_none()
        output.append({"id": anchor.id, "friend": user_to_dict(friend) if friend else None, "trackName": anchor.track_name, "artistName": anchor.artist_name, "durationMinutes": anchor.duration_minutes, "pulseCount": anchor.pulse_count, "moodTag": anchor.mood_tag, "cityA": anchor.city_a, "cityB": anchor.city_b, "sessionDate": anchor.session_date.isoformat() if anchor.session_date else None, "meaningfulSessionVerified": anchor.meaningful_session_verified})
    return output


@router.get("/recap")
async def get_recap(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    total_sessions = (await db.execute(select(func.count(MemoryAnchor.id)).where(MemoryAnchor.user_id == user_id))).scalar() or 0
    total_pulses = (await db.execute(select(func.sum(MemoryAnchor.pulse_count)).where(MemoryAnchor.user_id == user_id))).scalar() or 0
    meaningful_sessions = (await db.execute(select(func.count(MemoryAnchor.id)).where(MemoryAnchor.user_id == user_id, MemoryAnchor.meaningful_session_verified.is_(True)))).scalar() or 0
    mood_res = await db.execute(select(MemoryAnchor.mood_tag, func.count(MemoryAnchor.mood_tag).label("count")).where(MemoryAnchor.user_id == user_id, MemoryAnchor.mood_tag.isnot(None)).group_by(MemoryAnchor.mood_tag).order_by(desc("count")).limit(1))
    top_mood_row = mood_res.first()
    return {"totalSessions": total_sessions, "meaningfulSessions": meaningful_sessions, "totalPulses": total_pulses, "topMood": top_mood_row[0] if top_mood_row else None, "provenance": {"totalSessions": "observed", "meaningfulSessions": "observed", "totalPulses": "observed", "topMood": "self_declared"}}


@router.get("/pending-mood")
async def pending_mood(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    anchor = (await db.execute(select(MemoryAnchor).where(MemoryAnchor.user_id == user_id, MemoryAnchor.mood_tag.is_(None)).order_by(MemoryAnchor.session_date.asc()).limit(1))).scalar_one_or_none()
    if not anchor:
        return {"pending": False}
    friend = (await db.execute(select(User).where(User.id == anchor.friend_id))).scalar_one_or_none()
    return {"pending": True, "anchor": {"id": anchor.id, "friend": user_to_dict(friend) if friend else None, "trackName": anchor.track_name, "artistName": anchor.artist_name}}


class MoodPatchRequest(BaseModel):
    mood_tag: str = Field(min_length=1, max_length=32)


@router.patch("/{anchor_id}")
async def patch_anchor(anchor_id: str, req: MoodPatchRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    anchor = (await db.execute(select(MemoryAnchor).where(MemoryAnchor.id == anchor_id, MemoryAnchor.user_id == user_id))).scalar_one_or_none()
    if not anchor:
        raise HTTPException(status_code=404, detail="Anchor not found")
    anchor.mood_tag = req.mood_tag
    return {"success": True}


@router.post("/{anchor_id}/retether")
async def retether_anchor(anchor_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    anchor = (await db.execute(select(MemoryAnchor).where(MemoryAnchor.id == anchor_id, or_(MemoryAnchor.user_id == user_id, MemoryAnchor.friend_id == user_id)))).scalar_one_or_none()
    if not anchor:
        raise HTTPException(status_code=404, detail="Anchor not found")
    anchor.health = 100.0
    anchor.last_tethered_at = datetime.now(timezone.utc)
    return {"success": True, "health": 100.0}
