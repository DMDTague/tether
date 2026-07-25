"""Small static guardrails complementing behavioral second-audit tests."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _source(relative: str) -> str:
    return (ROOT / relative).read_text()


def test_physical_tether_requires_bound_one_time_proof():
    route = _source("routes/tethers.py")
    model = _source("models/safety_models.py")
    assert "class TapTetherToken" in model
    assert "token_hash" in model and "consumed_at" in model and "expires_at" in model
    assert 'TapTetherToken.initiator_id == req.target_user_id' in route
    assert 'TapTetherToken.target_id == user_id' in route
    assert "with_for_update()" in route
    assert "nfc_payload: str" in route


def test_memory_contract_is_pair_scoped_and_idempotent():
    terminator = _source("ws/terminator.py")
    models = _source("models/models.py")
    assert "MEANINGFUL_SECONDS = 5 * 60" in terminator
    assert "min(ended_at, _aware(listener.left_at))" in terminator
    assert 'DELIBERATE_RELATIONAL_EVENTS = ["pulse", "queue_add", "message", "song_signal"]' in terminator
    assert "tether_success" not in terminator
    assert "SyncMeasurement.drift_ms" in terminator
    assert "_has_pair_rejection" in terminator
    assert "uq_memory_anchor_session_owner_friend" in models


def test_dating_has_one_reconciling_state_machine():
    dating = _source("routes/dating.py")
    assert "async def _reconcile_match" in dating
    assert 'match.status = "active"' in dating
    assert 'match.status = "interest_withdrawn"' in dating
    assert 'decision.decision = "signal"' in dating
    assert "await _reconcile_match" in dating
    assert "record_dating_exposure" in dating


def test_block_and_profile_reads_share_one_policy():
    policy = _source("services/safety_policy.py")
    users = _source("routes/users.py")
    profile = _source("routes/profile_signal.py")
    assert "async def is_blocked" in policy
    assert "apply_block_cleanup" in _source("routes/blocks.py")
    assert "await is_blocked" in users
    assert "await is_blocked" in profile
    assert 'row.visibility == "after_match"' in profile
    assert 'row.visibility in {"filter_only", "do_not_use"}' in profile


def test_client_telemetry_cannot_claim_server_outcomes():
    telemetry = _source("routes/telemetry.py")
    model = _source("models/taste_models.py")
    assert "SERVER_OUTCOME_EVENTS" in telemetry
    assert "Server-authoritative outcomes cannot be submitted by clients" in telemetry
    assert "CLIENT_EVENT_PROPERTIES" in telemetry
    assert "event_id" in model and "journey_id" in model and "authority" in model


def test_realtime_core_is_connection_id_safe():
    manager = _source("ws/manager.py")
    main = _source("main.py")
    assert "connection_id" in manager
    assert "dict[str, dict[str, WebSocket]]" in manager
    assert "if account_connections:" in manager
    assert "consume_once" in main
    assert "WebSocket ticket already used" in main
