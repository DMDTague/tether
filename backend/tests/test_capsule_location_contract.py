import json

import pytest
from sqlalchemy import select

from models.models import TimeCapsule
from routes.capsules import (
    CreateCapsuleRequest,
    _safe_lock_value,
    create_capsule,
)


@pytest.mark.asyncio
async def test_geofence_capsule_persists_only_a_coarse_cell(db_session):
    request = CreateCapsuleRequest(
        recipient_id="recipient-1",
        track_name="Track",
        artist_name="Artist",
        start_position_ms=0,
        lock_type="geofence",
        lock_value=json.dumps({"lat": 39.9526, "lon": -75.1652, "radius_m": 500}),
    )

    await create_capsule(request, user_id="sender-1", db=db_session)
    capsule = (await db_session.execute(select(TimeCapsule))).scalar_one()
    persisted = json.loads(capsule.lock_value)

    assert "lat" not in persisted
    assert "lon" not in persisted
    assert persisted["cell"] == [399, -752]
    assert persisted["precision"] == 0.1
    assert len(capsule.lock_value) <= 64


def test_legacy_geofence_coordinates_are_scrubbed_from_responses():
    safe_value = _safe_lock_value(
        "geofence",
        json.dumps({"lat": 39.9526, "lon": -75.1652, "radius_m": 500}),
    )
    payload = json.loads(safe_value)

    assert "lat" not in payload
    assert "lon" not in payload
    assert payload["cell"] == [399, -752]
