"""Privacy-conscious durable product telemetry and funnel summaries."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from db.database import get_db
from models.taste_models import ProductEvent
from routes.auth import get_current_user_id

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])
settings = get_settings()

ALLOWED_EVENTS = {
    "app_opened", "now_playing_detected", "live_presence_impression", "session_start_tapped", "session_created", "invite_sent", "knock_sent", "join_started", "join_succeeded", "join_failed", "provider_resolved", "audio_started", "initial_drift_measured", "ten_second_tether_reached", "session_30s_reached", "session_5m_reached", "meaningful_session_reached", "pulse_sent", "queue_item_added", "sync_corrected", "session_ended", "anchor_created", "privacy_mode_changed", "profile_opened", "match_explanation_opened", "match_feedback_given", "dating_mode_opened", "dating_profile_completed", "dating_candidate_shown", "dating_passed", "dating_signal_sent", "dating_match_created", "dating_preferences_changed", "exchange_opened", "exchange_post_impression", "exchange_post_opened", "exchange_to_listen", "exchange_to_tether", "review_created", "review_feedback_given", "diary_entry_created", "music_list_created", "music_list_saved", "recommendation_shown", "recommendation_outcome", "report_submitted", "block_created", "error_shown",
}
FORBIDDEN_PROPERTY_PARTS = {"message", "body", "note", "title", "artist", "prompt", "answer", "query", "search", "latitude", "longitude", "phone", "email", "password", "token", "handle", "username", "displayname", "orientation", "identity", "height", "relationship", "coordinate", "contact", "credential", "provideraccount"}


class TelemetryEvent(BaseModel):
    event: str
    schemaVersion: int = Field(default=1, ge=1, le=10)
    occurredAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    properties: dict[str, Any] = Field(default_factory=dict)

    @field_validator("event")
    @classmethod
    def known_event(cls, value: str) -> str:
        if value not in ALLOWED_EVENTS:
            raise ValueError("Unknown telemetry event")
        return value

    @field_validator("properties")
    @classmethod
    def safe_properties(cls, value: dict[str, Any]) -> dict[str, Any]:
        if len(value) > 30:
            raise ValueError("Too many event properties")
        safe = {}
        for key, item in value.items():
            normalized = key.replace("_", "").casefold()
            if any(part in normalized for part in FORBIDDEN_PROPERTY_PARTS):
                raise ValueError(f"Sensitive property is not permitted: {key}")
            if isinstance(item, str) and len(item) > 120:
                raise ValueError(f"Property is too long: {key}")
            if not isinstance(item, (str, int, float, bool, type(None))):
                raise ValueError(f"Property must be scalar: {key}")
            safe[key] = item
        return safe


class TelemetryBatch(BaseModel):
    events: list[TelemetryEvent] = Field(min_length=1, max_length=50)


@router.get("/dictionary")
async def event_dictionary():
    return {"schemaVersion": 1, "events": sorted(ALLOWED_EVENTS)}


@router.post("/batch", status_code=202)
async def ingest_telemetry(batch: TelemetryBatch, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    if not settings.TELEMETRY_ENABLED:
        raise HTTPException(status_code=503, detail="Telemetry is disabled")
    for event in batch.events:
        db.add(ProductEvent(user_id=user_id, event_name=event.event, schema_version=event.schemaVersion, occurred_at=event.occurredAt, properties=event.properties))
    return {"accepted": len(batch.events), "storage": "durable"}


FUNNELS = {
    "ten_second_tether": ["app_opened", "now_playing_detected", "session_start_tapped", "session_created", "join_started", "provider_resolved", "audio_started", "ten_second_tether_reached"],
    "wavelength_to_tether": ["dating_candidate_shown", "profile_opened", "dating_signal_sent", "dating_match_created", "join_started", "meaningful_session_reached"],
    "exchange_to_listen": ["exchange_post_impression", "exchange_post_opened", "exchange_to_listen", "audio_started", "meaningful_session_reached"],
}


@router.get("/funnels/{funnel_name}")
async def funnel_summary(funnel_name: Literal["ten_second_tether", "wavelength_to_tether", "exchange_to_listen"], days: int = Query(default=7, ge=1, le=90), user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    del user_id
    since = datetime.now(timezone.utc) - timedelta(days=days)
    steps = FUNNELS[funnel_name]
    rows = await db.execute(select(ProductEvent.event_name, func.count(ProductEvent.id)).where(ProductEvent.event_name.in_(steps), ProductEvent.occurred_at >= since).group_by(ProductEvent.event_name))
    counts = {name: int(count) for name, count in rows.all()}
    output, previous = [], None
    for step in steps:
        count = counts.get(step, 0)
        output.append({"step": step, "count": count, "conversionFromPrior": None if previous in (None, 0) else round(count / previous, 4)})
        previous = count
    return {"funnel": funnel_name, "windowDays": days, "steps": output}
