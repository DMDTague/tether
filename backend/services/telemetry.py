"""Authoritative product-outcome telemetry.

Client routes may record intentions only. Backend workflows call this module for
outcomes that require server authority, such as a match, successful join, or
verified Memory Anchor.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.taste_models import ProductEvent

SERVER_OUTCOME_EVENTS = {
    "session_created",
    "join_succeeded",
    "join_failed",
    "provider_resolved",
    "audio_started",
    "initial_drift_measured",
    "ten_second_tether_reached",
    "session_30s_reached",
    "session_5m_reached",
    "meaningful_session_reached",
    "session_ended",
    "anchor_created",
    "dating_match_created",
    "review_created",
    "diary_entry_created",
    "music_list_created",
    "block_created",
}


async def record_server_outcome(
    db: AsyncSession,
    *,
    user_id: str,
    event_name: str,
    event_id: str | None = None,
    journey_id: str | None = None,
    session_id: str | None = None,
    exposure_id: str | None = None,
    properties: dict | None = None,
    occurred_at: datetime | None = None,
) -> ProductEvent:
    if event_name not in SERVER_OUTCOME_EVENTS:
        raise ValueError(f"Not a server-authoritative outcome: {event_name}")
    durable_event_id = event_id or str(uuid.uuid4())
    existing = await db.scalar(select(ProductEvent).where(ProductEvent.event_id == durable_event_id))
    if existing:
        return existing
    event = ProductEvent(
        event_id=durable_event_id,
        user_id=user_id,
        event_name=event_name,
        authority="server_outcome",
        schema_version=1,
        journey_id=journey_id,
        session_id=session_id,
        exposure_id=exposure_id,
        occurred_at=occurred_at or datetime.now(timezone.utc),
        properties=properties or {},
    )
    db.add(event)
    await db.flush()
    return event
