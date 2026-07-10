import pytest

from services.music_culture import MusicCultureStore


@pytest.mark.asyncio
async def test_review_creation_and_community_rating():
    store = MusicCultureStore()
    review = await store.create_review(
        "writer",
        {
            "subjectType": "album",
            "title": "Imaginal Disk",
            "artist": "Magdalena Bay",
            "body": "A complete world.",
            "score": 4.5,
            "visibility": "public",
            "verifiedListen": True,
            "spoiler": False,
        },
    )
    await store.index_review_for_user(review)
    rated = await store.rate_review(review["id"], "reader", 5.0)
    assert rated is not None
    assert rated["communityRating"] == 5.0
    assert rated["communityRatingCount"] == 1
    assert (await store.list_reviews(user_id="writer"))[0]["title"] == "Imaginal Disk"


@pytest.mark.asyncio
async def test_diary_is_partitioned_by_owner():
    store = MusicCultureStore()
    await store.add_diary_entry(
        "one",
        {
            "subjectType": "track",
            "title": "Eusexua",
            "artist": "FKA twigs",
            "listenedOn": "2026-07-10",
            "score": 5.0,
            "privateNote": "This note must remain private.",
            "provider": "manual",
            "providerItemId": "",
            "sessionId": "",
        },
    )
    assert len(await store.list_diary("one")) == 1
    assert await store.list_diary("two") == []


@pytest.mark.asyncio
async def test_public_list_filter_excludes_private_lists():
    store = MusicCultureStore()
    await store.create_list("one", {"title": "Public", "description": "Shared", "visibility": "public", "ranked": False, "entries": []})
    await store.create_list("one", {"title": "Private", "description": "Mine", "visibility": "private", "ranked": False, "entries": []})
    public = await store.list_lists(public_only=True)
    assert [item["title"] for item in public] == ["Public"]
    mine = await store.list_lists(user_id="one")
    assert {item["title"] for item in mine} == {"Public", "Private"}
