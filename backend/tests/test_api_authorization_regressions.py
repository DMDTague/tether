from pathlib import Path

import pytest
from fastapi import HTTPException

from models.models import Friendship, User
from routes.friends import (
    accept_request,
    sever_connection,
    toggle_mute,
    toggle_transparent_presence,
)
from routes.charts import cache, cache_clear_times, clear_billboard_cache
from routes.sesh import get_user_seshs

ROOT = Path(__file__).resolve().parents[1]


async def create_user(db, username: str, *, privacy_mode: str = "knock-first") -> User:
    user = User(
        username=username,
        display_name=username.title(),
        initials=username[:2].upper(),
        password_hash="not-used",
        privacy_mode=privacy_mode,
    )
    db.add(user)
    await db.flush()
    return user


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "mutation",
    [accept_request, sever_connection, toggle_mute, toggle_transparent_presence],
)
async def test_stranger_cannot_mutate_someone_elses_friendship(db_session, mutation):
    alice = await create_user(db_session, "alice")
    bob = await create_user(db_session, "bob")
    mallory = await create_user(db_session, "mallory")
    friendship = Friendship(user_a=alice.id, user_b=bob.id, status="pending")
    db_session.add(friendship)
    await db_session.flush()

    with pytest.raises(HTTPException) as error:
        await mutation(friendship.id, user_id=mallory.id, db=db_session)
    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_only_pending_request_recipient_can_accept(db_session):
    alice = await create_user(db_session, "requester")
    bob = await create_user(db_session, "recipient")
    friendship = Friendship(user_a=alice.id, user_b=bob.id, status="pending")
    db_session.add(friendship)
    await db_session.flush()

    with pytest.raises(HTTPException) as error:
        await accept_request(friendship.id, user_id=alice.id, db=db_session)
    assert error.value.status_code == 403
    assert (await accept_request(friendship.id, user_id=bob.id, db=db_session))["status"] == "accepted"


@pytest.mark.asyncio
async def test_ghost_sesh_history_is_not_visible_to_another_account(db_session):
    owner = await create_user(db_session, "ghosthistory", privacy_mode="ghost")
    viewer = await create_user(db_session, "viewerhistory")

    with pytest.raises(HTTPException) as error:
        await get_user_seshs(owner.username, viewer_id=viewer.id, db=db_session)
    assert error.value.status_code == 404
    assert await get_user_seshs(owner.username, viewer_id=owner.id, db=db_session) == []


def test_cache_refresh_and_anchor_mutations_require_authentication():
    charts = (ROOT / "routes" / "charts.py").read_text()
    anchors = (ROOT / "routes" / "anchors.py").read_text()
    assert "force_refresh" not in charts
    assert "clear_billboard_cache(user_id: str = Depends(get_current_user_id))" in charts
    assert "retether_anchor(anchor_id: str, user_id: str = Depends(get_current_user_id)" in anchors


@pytest.mark.asyncio
async def test_authenticated_chart_cache_clear_has_a_cooldown():
    cache.clear()
    cache_clear_times.clear()
    cache["hot-100"] = {"time": 1, "data": []}
    assert (await clear_billboard_cache(user_id="account-1"))["message"] == "Billboard cache cleared"
    with pytest.raises(HTTPException) as error:
        await clear_billboard_cache(user_id="account-1")
    assert error.value.status_code == 429


def test_upload_dependency_fixes_remain_pinned():
    requirements = (ROOT / "requirements.txt").read_text()
    for requirement in (
        "pillow==12.3.0",
        "python-multipart==0.0.32",
        "starlette==1.3.1",
        "cryptography==49.0.0",
        "pyasn1==0.6.4",
        "pydantic-settings==2.14.2",
        "billboard.py==7.1.0",
    ):
        assert requirement in requirements
    assert "passlib" not in requirements
