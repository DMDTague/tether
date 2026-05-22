from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from db.database import get_db
from models.models import User
from routes.auth import get_current_user_id, user_to_dict

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

@router.get("/friends")
async def suggest_friends(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Suggest friends based on top artists overlap."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.top_artists:
        return []
        
    my_artist_ids = {a.get("id") for a in user.top_artists if a.get("id")}
    
    # In a real system, you'd do a complex SQL/JSON query or use a recommendation engine.
    # For SQLite/FastAPI prototyping, we can load active users and sort in-memory 
    # (acceptable for <1000 users).
    
    all_users_result = await db.execute(select(User).where(User.id != user_id))
    all_users = all_users_result.scalars().all()
    
    suggestions = []
    for other in all_users:
        if not other.top_artists:
            continue
            
        their_artist_ids = {a.get("id") for a in other.top_artists if a.get("id")}
        overlap = my_artist_ids.intersection(their_artist_ids)
        
        if overlap:
            profile = user_to_dict(other)
            profile["overlapCount"] = len(overlap)
            profile["overlappingArtists"] = [a.get("name") for a in other.top_artists if a.get("id") in overlap]
            suggestions.append(profile)
            
    # Sort by overlap count descending
    suggestions.sort(key=lambda x: x["overlapCount"], reverse=True)
    
    return suggestions[:10]  # Top 10 matches
