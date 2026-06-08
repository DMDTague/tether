from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from models.models import CanonicalTrack, ProviderTrackMatch

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
        artwork_url: Optional[str] = None
    ) -> str:
        """
        Upsert a CanonicalTrack and ProviderTrackMatch for a Spotify track.
        Returns the CanonicalTrack ID.
        """
        # 1. Try to find existing ProviderTrackMatch for Spotify
        result = await db.execute(
            select(ProviderTrackMatch).where(
                ProviderTrackMatch.provider == "spotify",
                ProviderTrackMatch.provider_track_id == spotify_track_id
            )
        )
        match = result.scalar_one_or_none()

        canonical_id = None

        if match:
            canonical_id = match.canonical_track_id
        else:
            # 2. Try to find existing CanonicalTrack by ISRC
            if isrc:
                result = await db.execute(
                    select(CanonicalTrack).where(CanonicalTrack.isrc == isrc)
                )
                canonical_track = result.scalar_one_or_none()
                if canonical_track:
                    canonical_id = canonical_track.id

        if not canonical_id:
            # 3. Create new CanonicalTrack
            canonical_track = CanonicalTrack(
                isrc=isrc,
                title=title,
                artist=artist,
                album=album,
                duration_ms=duration_ms,
                explicit=explicit,
                artwork_url=artwork_url
            )
            db.add(canonical_track)
            await db.flush()
            canonical_id = canonical_track.id

        if not match:
            # 4. Create ProviderTrackMatch
            match = ProviderTrackMatch(
                canonical_track_id=canonical_id,
                provider="spotify",
                provider_track_id=spotify_track_id,
                match_method="exact",
                confidence=1.0
            )
            db.add(match)
            await db.flush()

        return canonical_id

    async def match_track_for_provider(
        self,
        db: AsyncSession,
        canonical_track_id: str,
        target_provider: str,
        storefront: str = "us"
    ) -> Optional[ProviderTrackMatch]:
        """
        Attempt to find a ProviderTrackMatch for the target provider.
        First checks database cache. If not found, attempts Apple Music lookup.
        """
        # Check DB first
        result = await db.execute(
            select(ProviderTrackMatch).where(
                ProviderTrackMatch.canonical_track_id == canonical_track_id,
                ProviderTrackMatch.provider == target_provider
            )
        )
        existing_match = result.scalar_one_or_none()
        if existing_match:
            return existing_match

        # We need to look it up
        result = await db.execute(
            select(CanonicalTrack).where(CanonicalTrack.id == canonical_track_id)
        )
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
        storefront: str
    ) -> Optional[ProviderTrackMatch]:
        import httpx
        from urllib.parse import quote_plus
        from services.apple_music import get_apple_music_developer_token
        
        token = get_apple_music_developer_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        apple_track_id = None
        match_method = None
        confidence = 0.0

        async with httpx.AsyncClient() as client:
            # 1. Try ISRC first
            if canonical.isrc:
                isrc_url = f"https://api.music.apple.com/v1/catalog/{storefront}/songs?filter[isrc]={canonical.isrc}"
                try:
                    res = await client.get(isrc_url, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        songs = data.get("data", [])
                        if songs:
                            # In a real app we'd rank by explicit/clean/duration if multiple ISRCs
                            # For MVP, take the first ISRC match
                            apple_track_id = songs[0]["id"]
                            match_method = "isrc"
                            confidence = 1.0
                except Exception as e:
                    print(f"ISRC lookup failed: {e}")

            # 2. Fallback to metadata search
            if not apple_track_id:
                term = quote_plus(f"{canonical.title} {canonical.artist}")
                search_url = f"https://api.music.apple.com/v1/catalog/{storefront}/search?types=songs&term={term}&limit=5"
                try:
                    res = await client.get(search_url, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        songs = data.get("results", {}).get("songs", {}).get("data", [])
                        
                        candidates = []
                        
                        for song in songs:
                            attrs = song.get("attributes", {})
                            duration = attrs.get("durationInMillis", 0)
                            
                            score = 0.0
                            # Must be within 2000ms duration tolerance
                            duration_diff = abs(duration - (canonical.duration_ms or 0))
                            if duration_diff <= 2000:
                                score += 0.8
                                
                                # Exact explicit match
                                is_explicit = (attrs.get("contentRating") == "explicit")
                                if canonical.explicit == is_explicit:
                                    score += 0.15
                                else:
                                    # Penalty for explicit mismatch
                                    score -= 0.2
                                    
                                # Further string matching could go here
                                
                                candidates.append({
                                    "id": song["id"],
                                    "score": score
                                })
                                
                        if candidates:
                            candidates.sort(key=lambda x: x["score"], reverse=True)
                            best = candidates[0]
                            
                            # Check ambiguity
                            is_ambiguous = False
                            if best["score"] < 0.85:
                                is_ambiguous = True
                            elif len(candidates) > 1:
                                second_best = candidates[1]
                                # Margin must be safe
                                if (best["score"] - second_best["score"]) < 0.1:
                                    is_ambiguous = True
                                    
                            if is_ambiguous:
                                match_method = "ambiguous"
                                confidence = best["score"]
                                apple_track_id = best["id"] # we still store the best guess, but flag it
                            else:
                                apple_track_id = best["id"]
                                match_method = "title_artist_duration"
                                confidence = best["score"]
                except Exception as e:
                    print(f"Metadata search failed: {e}")

        # 3. Save match if found
        if apple_track_id:
            match = ProviderTrackMatch(
                canonical_track_id=canonical.id,
                provider="apple_music",
                provider_track_id=apple_track_id,
                match_method=match_method,
                confidence=confidence
            )
            db.add(match)
            await db.flush()
            return match
            
        return None

matcher = TrackMatcher()
