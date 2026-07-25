from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from models.models import Follow, Friendship, Session, SessionListener, TetherJoinGrant, User
from models.profile_models import (
    DatingMatch,
    DatingPreference,
    DatingProfile,
    PrivateAlbum,
    PrivateAlbumGrant,
    ProfileField,
    PublicProfile,
    SwipeDecision,
)
from models.safety_models import TapTetherToken, UserBlock
from routes.dating import _reconcile_match
from routes.profile_signal import _serialize
from routes.tethers import TapTetherRequest, TapTokenRequest, create_tap_token, tap_to_tether
from services.safety_policy import apply_block_cleanup
from ws.manager import ConnectionManager


async def create_user(db, username: str) -> User:
    user = User(
        username=username,
        display_name=username.title(),
        initials=username[:2].upper(),
        password_hash="not-used-in-this-test",
    )
    db.add(user)
    await db.flush()
    return user


@pytest.mark.asyncio
async def test_dating_withdrawal_and_rematch_reuse_one_pair_row(db_session):
    first = await create_user(db_session, "first")
    second = await create_user(db_session, "second")
    first_decision = SwipeDecision(actor_id=first.id, target_id=second.id, decision="like")
    second_decision = SwipeDecision(actor_id=second.id, target_id=first.id, decision="signal")
    db_session.add_all([first_decision, second_decision])
    await db_session.flush()

    original = await _reconcile_match(db_session, first.id, second.id)
    assert original is not None
    original_id = original.id
    assert original.status == "active"

    second_decision.decision = "pass"
    await db_session.flush()
    assert await _reconcile_match(db_session, second.id, first.id, ended_by=second.id) is None
    assert original.status == "interest_withdrawn"
    assert original.ended_by == second.id

    second_decision.decision = "like"
    await db_session.flush()
    rematch = await _reconcile_match(db_session, second.id, first.id)
    assert rematch is not None
    assert rematch.id == original_id
    assert rematch.status == "active"
    assert rematch.ended_at is None


@pytest.mark.asyncio
async def test_tap_token_is_bound_consumed_once_and_creates_consent_friendship(db_session):
    initiator = await create_user(db_session, "initiator")
    target = await create_user(db_session, "target")

    issued = await create_tap_token(
        TapTokenRequest(target_user_id=target.id),
        user_id=initiator.id,
        db=db_session,
    )
    assert issued["oneTime"] is True
    assert issued["targetUserId"] == target.id

    result = await tap_to_tether(
        TapTetherRequest(target_user_id=initiator.id, nfc_payload=issued["nfcPayload"]),
        user_id=target.id,
        db=db_session,
    )
    assert result["success"] is True
    assert result["consentProof"] == "one_time_physical_token"

    friendship = (
        await db_session.execute(
            select(Friendship).where(
                Friendship.user_a.in_([initiator.id, target.id]),
                Friendship.user_b.in_([initiator.id, target.id]),
            )
        )
    ).scalar_one()
    assert friendship.status == "accepted"

    token = (await db_session.execute(select(TapTetherToken))).scalar_one()
    assert token.consumed_at is not None
    assert token.consumed_by == target.id

    with pytest.raises(HTTPException) as error:
        await tap_to_tether(
            TapTetherRequest(target_user_id=initiator.id, nfc_payload=issued["nfcPayload"]),
            user_id=target.id,
            db=db_session,
        )
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_block_cleanup_revokes_pair_scoped_access_without_restoring_on_unblock(db_session):
    blocker = await create_user(db_session, "blocker")
    blocked = await create_user(db_session, "blocked")
    user_a, user_b = sorted((blocker.id, blocked.id))

    friendship = Friendship(user_a=user_a, user_b=user_b, status="accepted")
    match = DatingMatch(user_a=user_a, user_b=user_b, status="active")
    session = Session(host_id=blocker.id, status="active", track_name="Test", artist_name="Artist")
    album = PrivateAlbum(owner_id=blocker.id, title="Private", media_ids=[])
    db_session.add_all(
        [
            friendship,
            match,
            session,
            album,
            Follow(follower_id=blocker.id, following_id=blocked.id),
            Follow(follower_id=blocked.id, following_id=blocker.id),
        ]
    )
    await db_session.flush()
    listener = SessionListener(session_id=session.id, user_id=blocked.id, has_tethered=True)
    grant = TetherJoinGrant(
        session_id=session.id,
        host_id=blocker.id,
        listener_id=blocked.id,
        status="active",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=2),
    )
    album_grant = PrivateAlbumGrant(
        album_id=album.id,
        grantee_id=blocked.id,
        granted_by=blocker.id,
    )
    db_session.add_all([listener, grant, album_grant, UserBlock(blocker_id=blocker.id, blocked_user_id=blocked.id)])
    await db_session.flush()

    await apply_block_cleanup(db_session, blocker.id, blocked.id)
    await db_session.flush()

    assert friendship.status == "severed"
    assert friendship.severed_by == blocker.id
    assert match.status == "blocked"
    assert match.ended_by == blocker.id
    assert listener.left_at is not None
    assert grant.status == "revoked"
    assert album_grant.revoked_at is not None
    assert (await db_session.execute(select(Follow))).scalars().all() == []


@pytest.mark.asyncio
async def test_match_only_profile_fields_require_an_active_match(db_session):
    owner = await create_user(db_session, "owner")
    viewer = await create_user(db_session, "viewer")
    db_session.add(PublicProfile(user_id=owner.id, statement="Public statement"))
    db_session.add_all(
        [
            ProfileField(user_id=owner.id, field_key="public", value="yes", visibility="public"),
            ProfileField(user_id=owner.id, field_key="after", value="matched", visibility="after_match"),
            ProfileField(user_id=owner.id, field_key="filter", value="secret", visibility="filter_only", use_for_filtering=True),
        ]
    )
    await db_session.flush()

    public_projection = await _serialize(db_session, owner.id, viewer.id)
    assert set(public_projection["fields"]) == {"public"}

    user_a, user_b = sorted((owner.id, viewer.id))
    db_session.add(DatingMatch(user_a=user_a, user_b=user_b, status="active"))
    await db_session.flush()
    matched_projection = await _serialize(db_session, owner.id, viewer.id)
    assert set(matched_projection["fields"]) == {"public", "after"}
    assert "filter" not in matched_projection["fields"]


class FakeWebSocket:
    def __init__(self):
        self.accepted = False
        self.messages = []

    async def accept(self):
        self.accepted = True

    async def send_json(self, message):
        self.messages.append(message)


@pytest.mark.asyncio
async def test_old_socket_disconnect_cannot_remove_new_connection():
    manager = ConnectionManager()
    first = FakeWebSocket()
    second = FakeWebSocket()
    first_id = await manager.connect("user", first)
    second_id = await manager.connect("user", second)
    assert first_id != second_id
    assert manager.active_connections == 2

    await manager.disconnect("user", first_id)
    assert manager.is_connected("user")
    assert manager.active_connections == 1
    await manager.send_to_user("user", {"type": "still_connected"})
    assert second.messages == [{"type": "still_connected"}]

    await manager.disconnect("user", second_id)
    pending = manager._disconnect_tasks.pop("user")
    pending.cancel()
    with pytest.raises(BaseException):
        await pending
