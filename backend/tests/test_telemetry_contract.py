import pytest
from pydantic import ValidationError

from routes.telemetry import TelemetryBatch, TelemetryEvent


def test_known_event_is_accepted():
    event = TelemetryEvent(event="join_succeeded", properties={"latencyMs": 420, "initialDriftBucket": "0-100ms"})
    assert event.schemaVersion == 1


@pytest.mark.parametrize("property_name", ["messageBody", "searchQuery", "latitude", "phoneNumber", "accessToken"])
def test_sensitive_properties_are_rejected(property_name):
    with pytest.raises(ValidationError):
        TelemetryEvent(event="error_shown", properties={property_name: "secret"})


def test_unknown_event_is_rejected():
    with pytest.raises(ValidationError):
        TelemetryEvent(event="user_everything_recorded", properties={})


def test_batch_is_bounded():
    with pytest.raises(ValidationError):
        TelemetryBatch(events=[])
