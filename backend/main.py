"""
Tether Backend — FastAPI Application

Main entry point. Configures CORS, routes, WebSocket endpoint,
and database lifecycle.
"""

import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import jwt, JWTError

from config import get_settings
from db.database import init_db
from models.models import User
from routes import auth, friends, sessions, anchors, capsules, playback, ad_pass, users, recommendations, vibe, charts, sesh, discovery, blocks, tethers
from services.presence import presence_store
from ws.manager import manager
from ws.handlers import handle_message

settings = get_settings()

from worker import setup_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database, presence service, and background workers on startup."""
    await init_db()
    await presence_store.connect_redis(settings.REDIS_URL)
    setup_scheduler()
    yield


app = FastAPI(
    title="Tether API",
    description="Backend for the Tether music presence app",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow mobile app connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST Routes ───────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(friends.router)
app.include_router(sessions.router)
app.include_router(anchors.router)
app.include_router(capsules.router)
app.include_router(playback.router)
app.include_router(ad_pass.router)
app.include_router(users.router)
app.include_router(recommendations.router)
app.include_router(vibe.router)
app.include_router(charts.router, prefix="/api/charts")
app.include_router(sesh.router)
app.include_router(discovery.router)
app.include_router(blocks.router)
app.include_router(tethers.router)

# Mount static files for avatars
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return {"app": "Tether", "version": "0.1.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok", "connections": manager.active_connections}


# ── WebSocket Endpoint ────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(default=""),
    city: str = Query(default=""),
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None),
):
    """
    Main WebSocket endpoint for real-time communication.
    
    Authenticates via JWT token in query parameter.
    Handles all real-time messages: playback events, pulses,
    knocks, presence updates, and reconnection handshakes.
    """
    # Authenticate
    user_id = None
    user_name = "Unknown"
    user_initials = "??"

    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            from db.database import async_session
            from sqlalchemy import select
            async with async_session() as db:
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                if user:
                    user_name = user.display_name
                    user_initials = user.initials
                    # Send colors to manager
                    manager._user_colors[user_id] = user.theme_colors
        except JWTError:
            await websocket.close(code=4001, reason="Invalid token")
            return

    if not user_id:
        # Allow anonymous connections for development
        user_id = f"anon-{id(websocket)}"
        manager._user_colors[user_id] = None

    # Connect
    await manager.connect(user_id, websocket)
    if city:
        manager.set_user_city(user_id, city)
    if lat is not None and lon is not None:
        await presence_store.set_user_location(user_id, lat, lon)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                await handle_message(user_id, user_name, user_initials, data)
            except json.JSONDecodeError:
                pass  # Ignore malformed messages
    except WebSocketDisconnect:
        await manager.disconnect(user_id)
    except Exception:
        await manager.disconnect(user_id)


# ── Run ───────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
