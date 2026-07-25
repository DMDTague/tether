"""Regression contracts for the architecture audit's Phase 0 requirements."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _source(relative: str) -> str:
    return (ROOT / relative).read_text()


def test_account_level_safety_models_exist():
    source = _source("models/safety_models.py")
    assert "class UserBlock" in source
    assert '__tablename__ = "user_blocks"' in source
    assert "blocked_user_id" in source
    assert "class ContentReport" in source
    assert "class ModerationCase" in source


def test_core_product_objects_are_durable():
    assert "class Knock" in _source("models/session_models.py")
    profile = _source("models/profile_models.py")
    assert "class DatingProfile" in profile and "class DatingMatch" in profile
    assert "class Post" in _source("models/culture_models.py")
    taste = _source("models/taste_models.py")
    assert "class ListenEvent" in taste
    assert "class RecommendationExposure" in taste
    assert "class ProductEvent" in taste


def test_friendship_mutations_are_participant_scoped():
    source = _source("routes/friends.py")
    assert "_friendship_for_participant" in source
    assert "user_id not in {friendship.user_a, friendship.user_b}" in source
    assert "Only the recipient can accept" in source
    assert "muted_a" in source and "muted_b" in source
    assert "muted_by_a" not in source


def test_websocket_messages_verify_authority_and_membership():
    source = _source("ws/handlers.py")
    assert "Session.host_id == user_id" in source
    assert "_participant" in source
    assert "UserBlock" in source
    assert 'Knock.status == "pending"' in source


def test_memory_contract_is_five_minutes_and_not_fabricated():
    terminator = _source("ws/terminator.py")
    anchors = _source("routes/anchors.py")
    assert "MEANINGFUL_SECONDS = 5 * 60" in terminator
    assert "relational action" in terminator
    assert "safety report" in terminator
    assert "* 100" not in anchors
    assert "distanceBridged" not in anchors
