"""Tether FastAPI application with explicit trust boundaries."""

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import JWTError
from sqlalchemy import select

from config import get_settings
from db.database import async_session, init_db
from models.models import User
from routes import (
    ad_pass,
    anchors,
    auth,
    blocks,
    capsules,
    charts,
    discovery,
    friends,
    playback,
    recommendations,
    sesh,
    sessions,
    telemetry,
    tethers,
    users,
    vibe,
)
from routes.auth import decode_ws_ticket
from services.presence import presence_store
from worker import setup_scheduler
from ws.handlers import handle_message
from ws.manager import manager

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_runtime()
    await init_db()
    await presence_store.connect_redis(settings.REDIS_URL)
    setup_scheduler()
    yield


app = FastAPI(
    title="Tether API",
    description="Real-time shared listening, presence, memories, and cross-provider coordination.",
    version="0.2.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

for route in (
    auth.router,
    friends.router,
    sessions.router,
    anchors.router,
    capsules.router,
    playback.router,
    ad_pass.router,
    users.router,
    recommendations.router,
    vibe.router,
    sesh.router,
    discovery.router,
    blocks.router,
    tethers.router,
    telemetry.router,
):
    app.include_router(route)
app.include_router(charts.router, prefix="/api/charts")
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return {"app": "Tether", "version": "0.2.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    ticket: str = Query(default=""),
    region: str = Query(default=""),
):
    """Authenticate with a one-minute ticket, never a primary JWT in the URL."""
    user_id: str | None = None
    user_name = "Unknown"
    user_initials = "??"

    if ticket:
        try:
            user_id = decode_ws_ticket(ticket)
        except JWTError:
            await websocket.close(code=4001, reason="Invalid or expired WebSocket ticket")
            return

    if not user_id:
        if not (settings.ENVIRONMENT == "development" and settings.ALLOW_ANONYMOUS_WS):
            await websocket.close(code=4003, reason="Authentication required")
            return
        user_id = f"anon-{id(websocket)}"

    if not user_id.startswith("anon-"):
        async with async_session() as db:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user:
                await websocket.close(code=4003, reason="User not found")
                return
            user_name = user.display_name
            user_initials = user.initials
            manager._user_colors[user_id] = user.theme_colors

    await manager.connect(user_id, websocket)
    if region:
        manager.set_user_city(user_id, region[:80])

    try:
        while True:
            raw = await websocket.receive_text()
            if len(raw.encode("utf-8")) > settings.MAX_WS_MESSAGE_BYTES:
                await websocket.send_json({"type": "error", "code": "message_too_large"})
                continue
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("ws.malformed_json", extra={"user_id": user_id})
                await websocket.send_json({"type": "error", "code": "invalid_json"})
                continue
            if not isinstance(data, dict) or not isinstance(data.get("type"), str):
                await websocket.send_json({"type": "error", "code": "invalid_message_shape"})
                continue
            await handle_message(user_id, user_name, user_initials, data)
    except WebSocketDisconnect:
        await manager.disconnect(user_id)
    except Exception:
        logger.exception("ws.unhandled_error", extra={"user_id": user_id})
        await manager.disconnect(user_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=not settings.is_production)
