import pytest

from routes.profile_signal import DatingSignal
from services.profile_signal import ProfileSignalStore


@pytest.mark.asyncio
async def test_dating_fields_are_hidden_without_explicit_visibility():
    store = ProfileSignalStore()
    await store.set_profile(
        "user-1",
        {
            "atmosphere": {"statement": "liquid light"},
            "dating": {
                "enabled": True,
                "visible": False,
                "orientation": "Queer",
                "prompt": "A private prompt",
            },
        },
    )
    public = await store.public_profile("user-1", include_dating=True)
    assert "dating" not in public
    assert public["atmosphere"]["statement"] == "liquid light"


@pytest.mark.asyncio
async def test_visible_dating_signal_is_returned_only_in_dating_context():
    store = ProfileSignalStore()
    await store.set_profile(
        "user-2",
        {
            "dating": {
                "enabled": True,
                "visible": True,
                "identity": "Man",
                "orientation": "Queer",
                "prompt": "Play me something impossible",
            }
        },
    )
    assert "dating" not in await store.public_profile("user-2", include_dating=False)
    dating = (await store.public_profile("user-2", include_dating=True))["dating"]
    assert dating["orientation"] == "Queer"


def test_visibility_requires_dating_opt_in():
    with pytest.raises(ValueError):
        DatingSignal(enabled=False, visible=True)
