"""Privacy-conscious telemetry: client intent and server outcomes are distinct."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from db.database import get_db
from models.taste_models import ProductEvent
from routes.auth import get_current_user_id
from services.telemetry import SERVER_OUTCOME_EVENTS

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])
settings = get_settings()

# These events describe customer intent or a client-visible interaction. They do
# not assert that a provider, match, session, delivery, or Memory Anchor succeeded.
CLIENT_EVENT_PROPERTIES: dict[str, set[str]] = {
    "app_opened": {"surface", "entryPoint"},
    "now_playing_detected": {"provider", "detectionMethod"},
    "live_presence_impression": {"surface", "countBucket"},
    "session_start_tapped": {"surface", "privacyMode"},
    "invite_sent": {"surface", "recipientCountBucket"},
    "knock_sent": {"surface"},
    "join_started": {"surface", "provider"},
    "pulse_sent": {"surface"},
    "queue_item_added": {"surface", "provider"},
    "privacy_mode_changed": {"mode"},
    "profile_opened": {"surface", "relationshipType"},
    "match_explanation_opened": {"surface"},
    "match_feedback_given": {"feedback"},
    "dating_mode_opened": {"surface"},
    "dating_profile_completed": {"completionBucket"},
    "dating_candidate_shown": {"surface", "proximityBand"},
    "dating_passed": {"reasonCode"},
    "dating_signal_sent": {"provider"},
    "dating_preferences_changed": {"changedFieldCount"},
    "exchange_opened": {"feed"},
    "exchange_post_impression": {"feed", "rankBucket"},
    "exchange_post_opened": {"feed"},
    "exchange_to_listen": {"feed", "provider"},
    "exchange_to_tether": {"feed"},
    "review_feedback_given": {"feedback"},
    "music_list_saved": {"surface"},
    "recommendation_shown": {"family", "surface", "confidenceBucket"},
    "recommendation_outcome": {"outcome", "surface"},
    "report_submitted": {"contextType", "categoryCode"},
    "error_shown": {"surface", "errorCode", "recoverable"},
}

ALL_EVENTS = set(CLIENT_EVENT_PROPERTIES) | SERVER_OUTCOME_EVENTS
MAX_EVENT_AGE = timedelta(days=7)
MAX_FUTURE_SKEW = timedelta(minutes=5)


class TelemetryEvent(BaseModel):
    eventId: str = Field(min_length=8, max_length=64)
    event: str
    schemaVersion: int = Field(default=1, ge=1, le=10)
    occurredAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    journeyId: str | None = Field(default=None, min_length=8, max_length=64)
    sessionId: str | None = Field(default=None, min_length=1, max_length=36)
    exposureId: str | None = Field(default=None, min_length=1, max_length=64)
    properties: dict[str, Any] = Field(default_factory=dict)

    @field_validator("event")
    @classmethod
    def client_intent_event(cls, value: str) -> str:
        if value in SERVER_OUTCOME_EVENTS:
            raise ValueError("Server-authoritative outcomes cannot be submitted by clients")
        if value not in CLIENT_EVENT_PROPERTIES:
            raise ValueError("Unknown client-intent telemetry event")
        return value

    @field_validator("properties")
    @classmethod
    def scalar_properties(cls, value: dict[str, Any]) -> dict[str, Any]:
        if len(value) > 12:
            raise ValueError("Too many event properties")
        for key, item in value.items():
            if isinstance(item, str) and len(item) > 80:
                raise ValueError(f"Property is too long: {key}")
            if not isinstance(item, (str, int, float, bool, type(None))):
                raise ValueError(f"Property must be scalar: {key}")
        return value


class TelemetryBatch(BaseModel):
    events: list[TelemetryEvent] = Field(min_length=1, max_length=50)


@router.get("/dictionary")
async def event_dictionary():
    return {
        "schemaVersion": 2,
        "clientIntent": {
            name: sorted(properties) for name, properties in sorted(CLIENT_EVENT_PROPERTIES.items())
        },
        "serverOutcome": sorted(SERVER_OUTCOME_EVENTS),
        "rule": "Clients may record intent only; product outcomes come from authoritative workflows.",
    }


@router.post("/batch", status_code=202)
async def ingest_telemetry(
    batch: TelemetryBatch,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    if not settings.TELEMETRY_ENABLED:
        raise HTTPException(status_code=503, detail="Telemetry is disabled")

    now = datetime.now(timezone.utc)
    accepted = 0
    duplicates = 0
    for event in batch.events:
        occurred_at = event.occurredAt if event.occurredAt.tzinfo else event.occurredAt.replace(tzinfo=timezone.utc)
        if occurred_at < now - MAX_EVENT_AGE or occurred_at > now + MAX_FUTURE_SKEW:
            raise HTTPException(status_code=422, detail=f"Telemetry timestamp outside accepted window: {event.eventId}")

        allowed = CLIENT_EVENT_PROPERTIES[event.event]
        unexpected = set(event.properties) - allowed
        if unexpected:
            raise HTTPException(
                status_code=422,
                detail=f"Properties not allowed for {event.event}: {', '.join(sorted(unexpected))}",
            )

        existing = await db.scalar(select(ProductEvent.id).where(ProductEvent.event_id == event.eventId))
        if existing:
            duplicates += 1
            continue
        db.add(
            ProductEvent(
                event_id=event.eventId,
                user_id=user_id,
                event_name=event.event,
                authority="client_intent",
                schema_version=event.schemaVersion,
                journey_id=event.journeyId,
                session_id=event.sessionId,
                exposure_id=event.exposureId,
                occurred_at=occurred_at,
                properties=event.properties,
            )
        )
        accepted += 1

    return {"accepted": accepted, "duplicates": duplicates, "storage": "durable", "authority": "client_intent"}


FUNNELS = {
    "ten_second_tether": [
        "app_opened",
        "now_playing_detected",
        "session_start_tapped",
        "session_created",
        "join_started",
        "provider_resolved",
        "audio_started",
        "ten_second_tether_reached",
    ],
    "wavelength_to_tether": [
        "dating_candidate_shown",
        "profile_opened",
        "dating_signal_sent",
        "dating_match_created",
        "join_started",
        "meaningful_session_reached",
    ],
    "exchange_to_listen": [
        "exchange_post_impression",
        "exchange_post_opened",
        "exchange_to_listen",
        "audio_started",
        "meaningful_session_reached",
    ],
}


@router.get("/funnels/{funnel_name}")
async def funnel_summary(
    funnel_name: Literal["ten_second_tether", "wavelength_to_tether", "exchange_to_listen"],
    days: int = Query(default=7, ge=1, le=90),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    if user_id not in settings.telemetry_admin_user_ids:
        raise HTTPException(status_code=403, detail="Funnel analytics are administrative")

    since = datetime.now(timezone.utc) - timedelta(days=days)
    steps = FUNNELS[funnel_name]
    rows = await db.execute(
        select(
            ProductEvent.user_id,
            ProductEvent.journey_id,
            ProductEvent.event_name,
            ProductEvent.occurred_at,
        )
        .where(
            ProductEvent.event_name.in_(steps),
            ProductEvent.occurred_at >= since,
            ProductEvent.journey_id.is_not(None),
        )
        .order_by(ProductEvent.user_id, ProductEvent.journey_id, ProductEvent.occurred_at)
    )

    journeys: dict[tuple[str, str], list[str]] = defaultdict(list)
    for account_id, journey_id, event_name, _ in rows.all():
        journeys[(account_id, journey_id)].append(event_name)

    counts = [0 for _ in steps]
    for events in journeys.values():
        cursor = 0
        for event_name in events:
            if cursor < len(steps) and event_name == steps[cursor]:
                counts[cursor] += 1
                cursor += 1

    output = []
    for index, (step, count) in enumerate(zip(steps, counts)):
        previous = counts[index - 1] if index else None
        output.append(
            {
                "step": step,
                "journeys": count,
                "conversionFromPrior": None if previous in (None, 0) else round(count / previous, 4),
            }
        )
    return {
        "funnel": funnel_name,
        "windowDays": days,
        "cohort": "ordered user+journey paths",
        "steps": output,
    }
