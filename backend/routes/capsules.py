"""
Tether Time Capsules Routes

Create capsules with environmental locks, list, and check lock conditions.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from db.database import get_db
from models.models import TimeCapsule, User
from routes.auth import get_current_user_id, user_to_dict
from services.weather import check_if_raining, get_temperature
import math
import json

router = APIRouter(prefix="/api/capsules", tags=["capsules"])


class CreateCapsuleRequest(BaseModel):
    recipient_id: str
    track_name: str
    artist_name: str
    track_id: Optional[str] = None
    start_position_ms: int
    lock_type: Optional[str] = None  # midnight | rain | date
    lock_value: Optional[str] = None


@router.post("")
async def create_capsule(req: CreateCapsuleRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Create a time capsule (async tether) with optional environmental lock."""
    capsule = TimeCapsule(
        sender_id=user_id,
        recipient_id=req.recipient_id,
        track_name=req.track_name,
        artist_name=req.artist_name,
        track_id=req.track_id,
        start_position_ms=req.start_position_ms,
        lock_type=req.lock_type,
        lock_value=req.lock_value,
    )
    db.add(capsule)
    await db.flush()
    return {"id": capsule.id, "lockType": capsule.lock_type}


@router.get("")
async def list_capsules(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """List capsules received by the current user."""
    result = await db.execute(
        select(TimeCapsule)
        .where(TimeCapsule.recipient_id == user_id)
        .order_by(TimeCapsule.created_at.desc())
    )
    capsules = result.scalars().all()

    output = []
    for c in capsules:
        sender_result = await db.execute(select(User).where(User.id == c.sender_id))
        sender = sender_result.scalar_one_or_none()
        output.append({
            "id": c.id,
            "sender": user_to_dict(sender) if sender else None,
            "trackName": c.track_name,
            "artistName": c.artist_name,
            "startPositionMs": c.start_position_ms,
            "lockType": c.lock_type,
            "lockValue": c.lock_value,
            "isOpened": c.is_opened,
            "createdAt": c.created_at.isoformat() if c.created_at else None,
        })
    return output


@router.post("/{capsule_id}/check")
async def check_lock(
    capsule_id: str, 
    city: str = "", 
    lat: float | None = None, 
    lon: float | None = None, 
    user_id: str = Depends(get_current_user_id), 
    db: AsyncSession = Depends(get_db)
):
    """Check if a capsule's environmental lock conditions are met."""
    result = await db.execute(select(TimeCapsule).where(TimeCapsule.id == capsule_id))
    capsule = result.scalar_one_or_none()
    if not capsule:
        raise HTTPException(status_code=404, detail="Capsule not found")
    if capsule.recipient_id != user_id:
        raise HTTPException(status_code=403, detail="Not your capsule")

    # No lock = always unlocked
    if not capsule.lock_type:
        capsule.is_opened = True
        return {"unlocked": True}

    unlocked = False

    if capsule.lock_type == "midnight":
        now = datetime.now(timezone.utc)
        unlocked = now.hour >= 0 and now.hour < 6  # After midnight, before 6 AM

    elif capsule.lock_type == "date":
        if capsule.lock_value:
            try:
                target = datetime.fromisoformat(capsule.lock_value)
                unlocked = datetime.now(timezone.utc) >= target
            except ValueError:
                unlocked = False

    elif capsule.lock_type == "rain":
        if city:
            unlocked = await check_if_raining(city)
        else:
            unlocked = False

    elif capsule.lock_type == "time_of_day":
        if capsule.lock_value:
            try:
                params = json.loads(capsule.lock_value)
                now_hour = datetime.now(timezone.utc).hour
                start_h = params.get("start_hour", 0)
                end_h = params.get("end_hour", 24)
                if start_h <= end_h:
                    unlocked = start_h <= now_hour < end_h
                else:
                    unlocked = now_hour >= start_h or now_hour < end_h
            except Exception:
                pass
                
    elif capsule.lock_type == "temperature":
        if capsule.lock_value and lat is not None and lon is not None:
            try:
                params = json.loads(capsule.lock_value)
                min_t = params.get("min")
                max_t = params.get("max")
                current_t = await get_temperature(lat, lon)
                if current_t is not None:
                    if min_t is not None and current_t < min_t:
                        unlocked = False
                    elif max_t is not None and current_t > max_t:
                        unlocked = False
                    else:
                        unlocked = True
            except Exception:
                pass
                
    elif capsule.lock_type == "geofence":
        if capsule.lock_value and lat is not None and lon is not None:
            try:
                params = json.loads(capsule.lock_value)
                target_lat = params.get("lat")
                target_lon = params.get("lon")
                radius_m = params.get("radius_m", 500)
                
                if target_lat is not None and target_lon is not None:
                    # Haversine formula
                    R = 6371e3
                    phi1 = math.radians(lat)
                    phi2 = math.radians(target_lat)
                    dphi = math.radians(target_lat - lat)
                    dlambda = math.radians(target_lon - lon)
                    
                    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
                    d = R * c
                    
                    unlocked = d <= radius_m
            except Exception:
                pass

    if unlocked:
        capsule.is_opened = True
        await db.commit()

    return {"unlocked": unlocked}
