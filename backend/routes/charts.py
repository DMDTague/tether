import time
import asyncio
import billboard
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any

from routes.auth import get_current_user_id
from services.spotify import search_track

router = APIRouter()

# Simple in-memory cache to avoid hitting Billboard repeatedly and getting blocked
# Format: { 'hot-100': { 'time': 123456789, 'data': [...] }, ... }
# Note: Cache stores complete track data including artwork, so updates are atomic
cache: Dict[str, Any] = {}
cache_clear_times: Dict[str, float] = {}
CACHE_TTL = 3600 * 2 # 2 hours - keeps data fresh while avoiding rate limits
CACHE_CLEAR_COOLDOWN = 60 * 15

async def hydrate_track(song) -> dict:
    # Billboard provides album art directly - use it!
    billboard_art = song.image if hasattr(song, 'image') else None
    
    # Only search Spotify if Billboard doesn't have art
    spotify_data = {}
    if not billboard_art:
        spotify_data = await search_track(song.title, song.artist)
    else:
        spotify_data = {'albumArt': billboard_art}
    
    return {
        'rank': song.rank,
        'title': song.title,
        'artist': song.artist,
        'spotify_data': spotify_data
    }

async def get_chart_data(chart_name: str, limit: int = 10):
    now = time.time()
    if chart_name in cache and (now - cache[chart_name]['time']) < CACHE_TTL:
        return cache[chart_name]['data']
    
    try:
        # The billboard library is synchronous and making network requests!
        # We MUST run it in a threadpool so it doesn't block the entire FastAPI event loop.
        chart = await asyncio.to_thread(billboard.ChartData, chart_name)
        
        tasks = []
        for i, song in enumerate(chart):
            if i >= limit:
                break
            tasks.append(hydrate_track(song))
            
        data = await asyncio.gather(*tasks)
        
        cache[chart_name] = {
            'time': now,
            'data': data
        }
        return data
    except Exception as e:
        print(f"Error fetching {chart_name}: {e}")
        if chart_name in cache:
            return cache[chart_name]['data']
        return []

@router.get("/billboard")
async def get_billboard_charts():
    """Top 15 Hot 100 tracks and Billboard 200 albums/EPs (Spotify-hydrated)."""
    hot_100 = await get_chart_data('hot-100', 15)
    billboard_200 = await get_chart_data('billboard-200', 15)
    
    return {
        "hot_100": hot_100,
        "billboard_200": billboard_200
    }

@router.post("/billboard/clear-cache")
async def clear_billboard_cache(user_id: str = Depends(get_current_user_id)):
    """Clear the Billboard cache to force fresh data fetch."""
    now = time.monotonic()
    last_clear = cache_clear_times.get(user_id)
    if last_clear is not None and now - last_clear < CACHE_CLEAR_COOLDOWN:
        raise HTTPException(status_code=429, detail="Chart refresh cooldown is active")
    cache_clear_times[user_id] = now
    global cache
    cache.clear()
    return {"message": "Billboard cache cleared"}
