import httpx
from config import get_settings

settings = get_settings()

async def get_spotify_client_token() -> str:
    """Fetch a client credentials token from Spotify."""
    if not settings.SPOTIFY_CLIENT_ID or not settings.SPOTIFY_CLIENT_SECRET:
        return ""
        
    auth_str = f"{settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}"
    import base64
    b64_auth = base64.b64encode(auth_str.encode()).decode()
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://accounts.spotify.com/api/token",
            headers={
                "Authorization": f"Basic {b64_auth}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={"grant_type": "client_credentials"}
        )
        if response.status_code == 200:
            return response.json().get("access_token", "")
        return ""

async def get_audio_features(track_id: str) -> dict:
    """Fetch Spotify audio features for a given track ID."""
    token = await get_spotify_client_token()
    if not token:
        # Return fallback if not configured
        return {"valence": 0.5, "acousticness": 0.5, "danceability": 0.5, "energy": 0.5}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.spotify.com/v1/audio-features/{track_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            return response.json()
        return {"valence": 0.5, "acousticness": 0.5, "danceability": 0.5, "energy": 0.5}


async def get_audio_features_batch(track_ids: list[str]) -> list[dict]:
    """
    Fetch Spotify audio features for multiple track IDs in one call.
    
    The Spotify API supports up to 100 track IDs per request.
    Returns a list of feature dicts in the same order as input IDs.
    """
    if not track_ids:
        return []

    token = await get_spotify_client_token()
    if not token:
        return [{"valence": 0.5, "acousticness": 0.5, "danceability": 0.5, "energy": 0.5}
                for _ in track_ids]

    fallback = {"valence": 0.5, "acousticness": 0.5, "danceability": 0.5, "energy": 0.5}

    # Spotify batch endpoint accepts max 100 IDs
    ids_param = ",".join(track_ids[:100])
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.spotify.com/v1/audio-features?ids={ids_param}",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            data = response.json()
            features = data.get("audio_features", [])
            # Replace None entries (tracks without features) with fallback
            return [f if f else fallback for f in features]

    return [fallback for _ in track_ids]


async def get_audio_features_for_user_token(track_id: str, user_token: str) -> dict:
    """
    Fetch Spotify audio features using the user's own OAuth token.
    
    Used when we need to access features on behalf of a specific user
    (e.g., for their currently playing track).
    """
    fallback = {"valence": 0.5, "acousticness": 0.5, "danceability": 0.5, "energy": 0.5}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.spotify.com/v1/audio-features/{track_id}",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        if response.status_code == 200:
            return response.json()
        return fallback

async def search_track(title: str, artist: str) -> dict:
    """Search for a track by title and artist and return basic info including art and preview."""
    token = await get_spotify_client_token()
    if not token:
        print(f"⚠️  No Spotify token available - credentials not configured")
        return {}

    # Try multiple query formats for better matching
    queries = [
        f'track:"{title}" artist:"{artist}"',  # Exact match with quotes
        f'{title} {artist}',  # Simple query
        f'track:{title} artist:{artist}',  # Original format
    ]
    
    async with httpx.AsyncClient() as client:
        for query in queries:
            try:
                response = await client.get(
                    f"https://api.spotify.com/v1/search",
                    params={"q": query, "type": "track", "limit": 1},
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    items = data.get("tracks", {}).get("items", [])
                    if items:
                        track = items[0]
                        album_images = track.get("album", {}).get("images", [])
                        album_art = album_images[0].get("url", "") if album_images else ""
                        
                        print(f"✅ Found Spotify match for '{title}' by {artist}")
                        return {
                            "trackId": track.get("id"),
                            "name": track.get("name"),
                            "artist": track.get("artists", [{}])[0].get("name", artist),
                            "albumArt": album_art,
                            "previewUrl": track.get("preview_url", ""),
                            "uri": track.get("uri", "")
                        }
                else:
                    print(f"❌ Spotify search failed with status {response.status_code}")
            except Exception as e:
                print(f"❌ Spotify search error: {e}")
                continue
    
    print(f"⚠️  No Spotify match found for '{title}' by {artist}")
    return {}
