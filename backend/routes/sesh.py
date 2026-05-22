import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional

from db.database import get_db
from models.models import Sesh, User
from routes.auth import get_current_user_id

router = APIRouter(prefix="/api/sesh", tags=["sesh"])

class TrackData(BaseModel):
    id: str
    name: str
    artist: str
    artUrl: str

class CreateSeshRequest(BaseModel):
    tracks: List[TrackData]

AI_PROMPT_TEMPLATE = """
System: You are an AI assistant for the Tether music app. Your job is to analyze a list of recently played tracks and generate a Vibe Title and a Caption for the user's "Sesh" (listening session).
Safety Rules:
- Contextual Censorship: Enforce a "Safe Community" policy.
- Hard Blocks: Aggressively block dehumanizing hate speech, antisemitic tropes, and extreme racial slurs.
- Allow-list: Be "context-aware" regarding culturally reclaimed language. Words like "queer", "cunty", or "faggot" are permitted only when used in positive, social, or artistic contexts. If in doubt, prioritize the safety and inclusion of Black and Queer users.

Tracks:
{tracks}

Generate a short Title (max 5 words) and a Caption (1-2 sentences) capturing the vibe.
"""

def mock_ai_generation(tracks_info: str) -> tuple[str, str]:
    # Mocking AI generation for now
    if "pop" in tracks_info.lower():
        return "High Energy Pop", "Just vibed to some high energy tracks. The perfect Sesh to get moving."
    return "Chill Resonance", "A smooth, laid-back Sesh. Let the music flow."

@router.post("")
async def create_sesh(req: CreateSeshRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    publish_at = now + timedelta(hours=1)
    sesh = Sesh(
        user_id=user_id,
        title=None,
        caption=None,
        tracks=[t.dict() for t in req.tracks],
        status="pending",
        publish_at=publish_at,
    )
    db.add(sesh)
    await db.commit()
    await db.refresh(sesh)

    return {
        "id": sesh.id,
        "status": sesh.status,
        "publishAt": publish_at.isoformat(),
    }


@router.get("/pending/me")
async def get_pending_seshs(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Active -> Pending seshs awaiting AI publish (1 hour after creation)."""
    result = await db.execute(
        select(Sesh).where(
            Sesh.user_id == user_id,
            Sesh.status == "pending",
        ).order_by(Sesh.created_at.desc())
    )
    seshs = result.scalars().all()
    now = datetime.now(timezone.utc)
    out = []
    for s in seshs:
        if not s.created_at:
            continue
        publish_at = s.publish_at or (s.created_at + timedelta(hours=1))
        remaining = max(0, int((publish_at - now).total_seconds()))
        out.append({
            "id": s.id,
            "status": s.status,
            "remainingSeconds": remaining,
            "publishAt": publish_at.isoformat(),
        })
    return out

@router.get("/{username}")
async def get_user_seshs(username: str, db: AsyncSession = Depends(get_db)):
    user_result = await db.execute(select(User).where(User.username == username))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(
        select(Sesh).where(Sesh.user_id == user.id).order_by(Sesh.created_at.desc())
    )
    seshs = result.scalars().all()

    return [{
        "id": s.id,
        "title": s.title or "Processing Vibe...",
        "caption": s.caption,
        "tracks": s.tracks,
        "status": s.status,
        "createdAt": s.created_at.isoformat() if s.created_at else None,
        "publishedAt": s.published_at.isoformat() if s.published_at else None,
    } for s in seshs if s.status == "published" or s.title]
