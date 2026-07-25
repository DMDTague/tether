import pytest
from pydantic import ValidationError

from routes.telemetry import TelemetryBatch, TelemetryEvent


def event(name: str, properties: dict | None = None) -> TelemetryEvent:
    return TelemetryEvent(
        eventId=f"event-{name}-0001",
        event=name,
        journeyId="journey-0001",
        properties=properties or {},
    )


def test_known_client_intent_is_accepted():
    payload = event("join_started", {"surface": "listen", "provider": "spotify"})
    assert payload.schemaVersion == 1
    assert payload.event == "join_started"


@pytest.mark.parametrize(
    "server_outcome",
    [
        "join_succeeded",
        "audio_started",
        "meaningful_session_reached",
        "dating_match_created",
        "anchor_created",
    ],
)
def test_server_outcomes_cannot_be_submitted_by_clients(server_outcome):
    with pytest.raises(ValidationError):
        event(server_outcome)


def test_properties_are_allowlisted_per_event():
    with pytest.raises(ValidationError):
        event("error_shown", {"messageBody": "secret"})
    with pytest.raises(ValidationError):
        event("dating_mode_opened", {"orientation": "private"})
    with pytest.raises(ValidationError):
        event("exchange_post_opened", {"reviewTitle": "content"})


def test_dating_events_record_behavior_not_identity():
    payload = event("dating_mode_opened", {"surface": "wavelength"})
    assert payload.properties == {"surface": "wavelength"}


def test_exchange_events_record_structure_not_content():
    payload = event("exchange_post_impression", {"feed": "following", "rankBucket": "1-5"})
    assert payload.event == "exchange_post_impression"


def test_unknown_event_is_rejected():
    with pytest.raises(ValidationError):
        event("user_everything_recorded")


def test_event_id_and_batch_are_required_and_bounded():
    with pytest.raises(ValidationError):
        TelemetryEvent(event="app_opened", properties={})
    with pytest.raises(ValidationError):
        TelemetryBatch(events=[])
