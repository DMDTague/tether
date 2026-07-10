import time

import pytest

from services.presence import PresenceStore


@pytest.mark.asyncio
async def test_location_is_quantized_and_raw_coordinates_are_not_stored():
    store = PresenceStore()
    await store.set_user_location("one", 39.9525839, -75.1652215)
    location = await store.get_user_location("one")
    assert location is not None
    assert "lat" not in location
    assert "lon" not in location
    assert "latitude" not in location
    assert "longitude" not in location
    assert isinstance(location["latCell"], int)
    assert isinstance(location["lonCell"], int)


@pytest.mark.asyncio
async def test_distance_returns_only_a_band():
    store = PresenceStore()
    await store.set_user_location("one", 39.9526, -75.1652)
    await store.set_user_location("two", 39.9550, -75.1700)
    band = await store.distance_band_between("one", "two")
    assert band in {"under_5_miles", "5_to_15_miles", "15_to_50_miles", "over_50_miles"}


@pytest.mark.asyncio
async def test_in_memory_location_expires():
    store = PresenceStore()
    await store.set_user_location("one", 39.9526, -75.1652)
    store._locations["one"]["expiresAt"] = int(time.time()) - 1
    assert await store.get_user_location("one") is None
