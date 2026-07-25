"""Tether FastAPI application with explicit trust and readiness boundaries."""

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from sqlalchemy import select, text

from config import get_settings
from db.database import REQUIRED_ALEMBIC_REVISION, async_session, engine, init_db
from models.models import User
from routes import (
    ad_pass,
    anchors,
    auth,
    blocks,
    capsules,
    charts,
    dating,
    discovery,
    friends,
    music_culture,
    playback,
    profile_signal,
    recommendations,
    safety,
    sesh,
    sessions,
    telemetry,
    tethers,
    users,
)
from services.presence import presence_store
from worker import setup_scheduler
from ws.handlers import handle_message
from ws.manager import manager

logger = logging.getLogger(__name__)
settings = get_settings()
BUILD_VERSION = "0.6.0-second-audit"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_runtime()
    await init_db()
    await presence_store.connect_redis(settings.REDIS_URL)
    setup_scheduler()
    yield


app = FastAPI(
    title="Tether API",
    description="A durable social music platform centered on authoritative shared listening and relationship state.",
    version=BUILD_VERSION,
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
    sesh.router,
    discovery.router,
    dating.router,
    profile_signal.router,
    music_culture.router,
    safety.router,
    blocks.router,
    tethers.router,
    telemetry.router,
):
    app.include_router(route)
app.include_router(charts.router, prefix="/api/charts")
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return {"app": "Tether", "version": BUILD_VERSION, "status": "running"}


@app.get("/live")
async def liveness():
    return {"status": "alive", "version": BUILD_VERSION}


@app.get("/health")
async def dependency_health():
    """Detailed dependency state; does not pretend a static process is ready."""

    database = {"available": False, "revision": None, "requiredRevision": REQUIRED_ALEMBIC_REVISION}
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
            if settings.is_production:
                database["revision"] = await connection.scalar(
                    text("SELECT version_num FROM alembic_version LIMIT 1")
                )
            else:
                database["revision"] = "development-create-all"
            database["available"] = True
    except Exception as exc:
        database["error"] = type(exc).__name__

    redis = await presence_store.health()
    ready = bool(
        database["available"]
        and (not settings.is_production or database["revision"] == REQUIRED_ALEMBIC_REVISION)
        and (not settings.is_production or redis["productionReady"])
    )
    return {
        "status": "ready" if ready else "degraded",
        "version": BUILD_VERSION,
        "database": database,
        "redis": redis,
        "websocketConnections": manager.active_connections,
    }


@app.get("/ready")
async def readiness():
    health = await dependency_health()
    if health["status"] != "ready":
        raise HTTPException(status_code=503, detail=health)
    return health


def _decode_websocket_ticket(ticket: str) -> tuple[str, str]:
    payload = jwt.decode(ticket, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    if payload.get("typ") != "websocket" or not payload.get("sub") or not payload.get("jti"):
        raise JWTError("Invalid WebSocket ticket")
    return str(payload["sub"]), str(payload["jti"])


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    ticket: str = Query(default=""),
    region: str = Query(default=""),
):
    """Authenticate with a short-lived ticket consumed exactly once."""

    if not ticket:
        await websocket.close(code=4003, reason="Authentication required")
        return
    try:
        user_id, ticket_id = _decode_websocket_ticket(ticket)
    except JWTError:
        await websocket.close(code=4001, reason="Invalid or expired WebSocket ticket")
        return
    if not await presence_store.consume_once(
        "websocket-ticket",
        ticket_id,
        settings.WS_TICKET_EXPIRE_SECONDS,
    ):
        await websocket.close(code=4001, reason="WebSocket ticket already used")
        return

    async with async_session() as db:
        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user:
            await websocket.close(code=4003, reason="User not found")
            return
        user_name, user_initials = user.display_name, user.initials
        manager._user_colors[user_id] = user.theme_colors

    connection_id = await manager.connect(user_id, websocket)
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
        await manager.disconnect(user_id, connection_id)
    except Exception:
        logger.exception("ws.unhandled_error", extra={"user_id": user_id, "connection_id": connection_id})
        await manager.disconnect(user_id, connection_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=not settings.is_production)
