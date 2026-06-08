import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from services.matching import matcher
from models.models import CanonicalTrack, ProviderTrackMatch

@pytest.mark.asyncio
async def test_canonicalize_spotify_track(db_session):
    # Phase 3A Test
    canonical_id = await matcher.canonicalize_spotify_track(
        db=db_session,
        spotify_track_id="spotify123",
        title="Test Song",
        artist="Test Artist",
        duration_ms=200000,
        isrc="US1234567890"
    )
    assert canonical_id is not None
    
    # Verify DB
    from sqlalchemy import select
    res = await db_session.execute(select(CanonicalTrack).where(CanonicalTrack.id == canonical_id))
    ct = res.scalar_one()
    assert ct.isrc == "US1234567890"
    assert ct.title == "Test Song"
    
    res = await db_session.execute(select(ProviderTrackMatch).where(ProviderTrackMatch.canonical_track_id == canonical_id))
    match = res.scalar_one()
    assert match.provider == "spotify"
    assert match.provider_track_id == "spotify123"

@pytest.mark.asyncio
@patch('httpx.AsyncClient.get')
async def test_apple_music_isrc_match(mock_get, db_session):
    # Setup mock response
    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "data": [{"id": "apple123"}]
    }
    mock_get.return_value = mock_resp

    # Create Canonical Track
    canonical_id = await matcher.canonicalize_spotify_track(
        db=db_session,
        spotify_track_id="spotify_src",
        title="ISRC Song",
        artist="Artist",
        duration_ms=200000,
        isrc="US999"
    )

    # Phase 3B Test: Match for Apple Music
    match = await matcher.match_track_for_provider(db_session, canonical_id, "apple_music")
    
    assert match is not None
    assert match.provider == "apple_music"
    assert match.provider_track_id == "apple123"
    assert match.match_method == "isrc"

@pytest.mark.asyncio
@patch('httpx.AsyncClient.get')
async def test_apple_music_metadata_fallback(mock_get, db_session):
    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    # Simulate ISRC failing, but search returning results
    if "filter[isrc]" in mock_get.call_args[0][0]:
        mock_resp.json.return_value = {"data": []}
    else:
        mock_resp.json.return_value = {
            "results": {
                "songs": {
                    "data": [
                        {
                            "id": "apple456",
                            "attributes": {"durationInMillis": 201000, "contentRating": "clean"}
                        }
                    ]
                }
            }
        }
    mock_get.return_value = mock_resp

    canonical_id = await matcher.canonicalize_spotify_track(
        db=db_session,
        spotify_track_id="spotify_no_isrc",
        title="Metadata Song",
        artist="Artist",
        duration_ms=200000,
        isrc="BOGUS"
    )

    match = await matcher.match_track_for_provider(db_session, canonical_id, "apple_music")
    assert match is not None
    assert match.provider_track_id == "apple456"
    assert match.match_method == "title_artist_duration"

@pytest.mark.asyncio
@patch('httpx.AsyncClient.get')
async def test_apple_music_unavailable(mock_get, db_session):
    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"data": [], "results": {}}
    mock_get.return_value = mock_resp

    canonical_id = await matcher.canonicalize_spotify_track(
        db=db_session,
        spotify_track_id="spotify_exclusive",
        title="Missing Song",
        artist="Artist",
        duration_ms=200000,
        isrc=None
    )

    match = await matcher.match_track_for_provider(db_session, canonical_id, "apple_music")
    assert match is None
