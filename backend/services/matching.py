import inspect
from typing import Optional
from urllib.parse import quote_plus

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.models import CanonicalTrack, ProviderTrackMatch


async def _response_json(response) -> dict:
    """Read JSON from real HTTPX responses and async test doubles."""
    value = response.json()
    if inspect.isawaitable(value):
        value = await value
    return value


class TrackMatcher:
    async def canonicalize_spotify_track(
        self,
        db: AsyncSession,
        spotify_track_id: str,
        title: str,
        artist: str,
        duration_ms: int,
        isrc: Optional[str] = None,
        album: Optional[str] = None,
        explicit: bool = False,
        artwork_url: Optional[str] = None,
    ) -> str:
        result = await db.execute(
            select(ProviderTrackMatch).where(
                ProviderTrackMatch.provider == "spotify",
                ProviderTrackMatch.provider_track_id == spotify_track_id,
            )
        )
        match = result.scalar_one_or_none()
        canonical_id = match.canonical_track_id if match else None

        if not canonical_id and isrc:
            result = await db.execute(select(CanonicalTrack).where(CanonicalTrack.isrc == isrc))
            canonical_track = result.scalar_one_or_none()
            if canonical_track:
                canonical_id = canonical_track.id

        if not canonical_id:
            canonical_track = CanonicalTrack(
                isrc=isrc,
                title=title,
                artist=artist,
                album=album,
                duration_ms=duration_ms,
                explicit=explicit,
                artwork_url=artwork_url,
            )
            db.add(canonical_track)
            await db.flush()
            canonical_id = canonical_track.id

        if not match:
            match = ProviderTrackMatch(
                canonical_track_id=canonical_id,
                provider="spotify",
                provider_track_id=spotify_track_id,
                match_method="exact",
                confidence=1.0,
            )
            db.add(match)
            await db.flush()

        return canonical_id

    async def match_track_for_provider(
        self,
        db: AsyncSession,
        canonical_track_id: str,
        target_provider: str,
        storefront: str = "us",
    ) -> Optional[ProviderTrackMatch]:
        result = await db.execute(
            select(ProviderTrackMatch).where(
                ProviderTrackMatch.canonical_track_id == canonical_track_id,
                ProviderTrackMatch.provider == target_provider,
            )
        )
        existing_match = result.scalar_one_or_none()
        if existing_match:
            return existing_match

        result = await db.execute(select(CanonicalTrack).where(CanonicalTrack.id == canonical_track_id))
        canonical = result.scalar_one_or_none()
        if not canonical:
            return None

        if target_provider == "apple_music":
            return await self._match_apple_music(db, canonical, storefront)
        return None

    async def _match_apple_music(
        self,
        db: AsyncSession,
        canonical: CanonicalTrack,
        storefront: str,
    ) -> Optional[ProviderTrackMatch]:
        import httpx

        from services.apple_music import get_apple_music_developer_token

        token = get_apple_music_developer_token()
        headers = {"Authorization": f"Bearer {token}"}
        apple_track_id = None
        match_method = None
        confidence = 0.0

        async with httpx.AsyncClient() as client:
            if canonical.isrc:
                isrc_url = f"https://api.music.apple.com/v1/catalog/{storefront}/songs?filter[isrc]={canonical.isrc}"
                try:
                    response = await client.get(isrc_url, headers=headers)
                    if response.status_code == 200:
                        songs = (await _response_json(response)).get("data", [])
                        if songs:
                            apple_track_id = songs[0]["id"]
                            match_method = "isrc"
                            confidence = 1.0
                except Exception:
                    apple_track_id = None

            if not apple_track_id:
                term = quote_plus(f"{canonical.title} {canonical.artist}")
                search_url = f"https://api.music.apple.com/v1/catalog/{storefront}/search?types=songs&term={term}&limit=5"
                try:
                    response = await client.get(search_url, headers=headers)
                    if response.status_code == 200:
                        data = await _response_json(response)
                        songs = data.get("results", {}).get("songs", {}).get("data", [])
                        candidates = []
                        for song in songs:
                            attrs = song.get("attributes", {})
                            duration = attrs.get("durationInMillis", 0)
                            duration_diff = abs(duration - (canonical.duration_ms or 0))
                            if duration_diff > 2000:
                                continue
                            score = 0.8
                            is_explicit = attrs.get("contentRating") == "explicit"
                            score += 0.15 if canonical.explicit == is_explicit else -0.2
                            candidates.append({"id": song["id"], "score": score})

                        if candidates:
                            candidates.sort(key=lambda item: item["score"], reverse=True)
                            best = candidates[0]
                            ambiguous = best["score"] < 0.85
                            if len(candidates) > 1 and best["score"] - candidates[1]["score"] < 0.1:
                                ambiguous = True
                            apple_track_id = best["id"]
                            match_method = "ambiguous" if ambiguous else "title_artist_duration"
                            confidence = best["score"]
                except Exception:
                    apple_track_id = None

        if not apple_track_id:
            return None

        match = ProviderTrackMatch(
            canonical_track_id=canonical.id,
            provider="apple_music",
            provider_track_id=apple_track_id,
            match_method=match_method,
            confidence=confidence,
        )
        db.add(match)
        await db.flush()
        return match


matcher = TrackMatcher()
