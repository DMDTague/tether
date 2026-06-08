import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from services.privacy import can_join_session, can_request_tether, can_view_presence, AuthDecision
from models.models import User, Friendship, Session, TetherJoinGrant
from datetime import datetime, timedelta, timezone

@pytest.mark.asyncio
async def test_ghost_mode_enforcement(db_session):
    # Setup Host in Ghost Mode
    host = User(username="ghost_host", display_name="Ghost", initials="G", password_hash="hash", privacy_mode="ghost")
    db_session.add(host)
    
    # Setup Listener (Friend)
    listener = User(username="listener", display_name="Listener", initials="L", password_hash="hash")
    db_session.add(listener)
    await db_session.flush()

    friendship = Friendship(user_a=host.id, user_b=listener.id, status="accepted")
    db_session.add(friendship)

    sesh = Session(host_id=host.id, track_id="track1")
    db_session.add(sesh)
    await db_session.flush()

    # Assertions
    assert await can_view_presence(db_session, listener.id, host.id) == False
    assert await can_request_tether(db_session, listener.id, host.id, sesh.id) == AuthDecision.HOST_UNAVAILABLE
    assert await can_join_session(db_session, listener.id, sesh.id) == AuthDecision.HOST_UNAVAILABLE

@pytest.mark.asyncio
async def test_knock_first_enforcement(db_session):
    # Setup Host in Knock First Mode
    host = User(username="knock_host", display_name="Knock", initials="K", password_hash="hash", privacy_mode="knock-first")
    db_session.add(host)
    
    listener = User(username="knocker", display_name="Knocker", initials="K", password_hash="hash")
    db_session.add(listener)
    await db_session.flush()

    friendship = Friendship(user_a=host.id, user_b=listener.id, status="accepted")
    db_session.add(friendship)

    sesh = Session(host_id=host.id, track_id="track1")
    db_session.add(sesh)
    await db_session.flush()

    # Assertions
    assert await can_view_presence(db_session, listener.id, host.id) == True # Can see they are listening
    assert await can_request_tether(db_session, listener.id, host.id, sesh.id) == AuthDecision.ALLOW # Allowed to knock
    assert await can_join_session(db_session, listener.id, sesh.id) == AuthDecision.KNOCK_REQUIRED

    # Grant creation
    grant = TetherJoinGrant(session_id=sesh.id, host_id=host.id, listener_id=listener.id, expires_at=datetime.now(timezone.utc) + timedelta(minutes=2))
    db_session.add(grant)
    await db_session.flush()

    # Now they can join
    assert await can_join_session(db_session, listener.id, sesh.id) == AuthDecision.ALLOW

@pytest.mark.asyncio
async def test_expired_grant_enforcement(db_session):
    host = User(username="exp_host", display_name="Host", initials="H", password_hash="hash", privacy_mode="knock-first")
    listener = User(username="exp_knocker", display_name="Knocker", initials="K", password_hash="hash")
    db_session.add_all([host, listener])
    await db_session.flush()

    friendship = Friendship(user_a=host.id, user_b=listener.id, status="accepted")
    sesh = Session(host_id=host.id, track_id="track1")
    db_session.add_all([friendship, sesh])
    await db_session.flush()

    # Create expired grant
    grant = TetherJoinGrant(session_id=sesh.id, host_id=host.id, listener_id=listener.id, expires_at=datetime.now(timezone.utc) - timedelta(minutes=1))
    db_session.add(grant)
    await db_session.flush()

    assert await can_join_session(db_session, listener.id, sesh.id) == AuthDecision.KNOCK_REQUIRED

@pytest.mark.asyncio
async def test_grant_bound_to_correct_listener(db_session):
    host = User(username="bound_host", display_name="Host", initials="H", password_hash="hash", privacy_mode="knock-first")
    listener_a = User(username="listener_a", display_name="A", initials="A", password_hash="hash")
    listener_b = User(username="listener_b", display_name="B", initials="B", password_hash="hash")
    db_session.add_all([host, listener_a, listener_b])
    await db_session.flush()

    db_session.add_all([
        Friendship(user_a=host.id, user_b=listener_a.id, status="accepted"),
        Friendship(user_a=host.id, user_b=listener_b.id, status="accepted")
    ])
    sesh = Session(host_id=host.id, track_id="track1")
    db_session.add(sesh)
    await db_session.flush()

    # Grant for A
    grant = TetherJoinGrant(session_id=sesh.id, host_id=host.id, listener_id=listener_a.id, expires_at=datetime.now(timezone.utc) + timedelta(minutes=2))
    db_session.add(grant)
    await db_session.flush()

    # A can join, B requires knock
    assert await can_join_session(db_session, listener_a.id, sesh.id) == AuthDecision.ALLOW
    assert await can_join_session(db_session, listener_b.id, sesh.id) == AuthDecision.KNOCK_REQUIRED

@pytest.mark.asyncio
async def test_reconnect_enforces_privacy(db_session):
    host = User(username="rec_host", display_name="Host", initials="H", password_hash="hash", privacy_mode="open-door")
    listener = User(username="rec_listener", display_name="L", initials="L", password_hash="hash")
    db_session.add_all([host, listener])
    await db_session.flush()

    db_session.add(Friendship(user_a=host.id, user_b=listener.id, status="accepted"))
    sesh = Session(host_id=host.id, track_id="track1")
    db_session.add(sesh)
    await db_session.flush()

    # Initially allowed
    assert await can_join_session(db_session, listener.id, sesh.id) == AuthDecision.ALLOW

    # Host switches to ghost mode
    host.privacy_mode = "ghost"
    await db_session.flush()

    # Reconnect should fail
    assert await can_join_session(db_session, listener.id, sesh.id) == AuthDecision.HOST_UNAVAILABLE
