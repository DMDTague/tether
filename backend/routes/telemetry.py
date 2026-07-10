"""Small, explicit telemetry contract for customer-value and reliability events."""

import json
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from config import get_settings
from routes.auth import get_current_user_id

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])
logger = logging.getLogger(__name__)
settings = get_settings()

ALLOWED_EVENTS = {
    "app_opened",
    "now_playing_detected",
    "live_presence_impression",
    "session_start_tapped",
    "session_created",
    "invite_sent",
    "knock_sent",
    "join_started",
    "join_succeeded",
    "join_failed",
    "session_30s_reached",
    "session_5m_reached",
    "pulse_sent",
    "queue_item_added",
    "sync_corrected",
    "session_ended",
    "anchor_created",
    "privacy_mode_changed",
    "match_explanation_opened",
    "match_feedback_given",
    "dating_mode_opened",
    "dating_signal_sent",
    "dating_preferences_changed",
    "error_shown",
}
FORBIDDEN_PROPERTY_PARTS = {
    "message",
    "body",
    "query",
    "search",
    "latitude",
    "longitude",
    "phone",
    "email",
    "password",
    "token",
    "handle",
    "username",
    "displayname",
    "orientation",
    "identity",
}


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
        safe: dict[str, Any] = {}
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
async def ingest_telemetry(batch: TelemetryBatch, user_id: str = Depends(get_current_user_id)):
    if not settings.TELEMETRY_ENABLED:
        raise HTTPException(status_code=503, detail="Telemetry is disabled")
    for event in batch.events:
        logger.info(
            "product_event %s",
            json.dumps(
                {
                    "event": event.event,
                    "schemaVersion": event.schemaVersion,
                    "occurredAt": event.occurredAt.isoformat(),
                    "userId": user_id,
                    "properties": event.properties,
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
        )
    return {"accepted": len(batch.events)}
