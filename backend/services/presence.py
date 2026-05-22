"""
Tether Presence Service

Manages real-time user presence state.

In production, this is backed by Redis for fast reads.
For development without Redis, falls back to in-memory storage.
"""

import time
import json
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class PresenceStore:
    """In-memory presence store (Redis-compatible interface)."""

    def __init__(self):
        self._store: dict[str, dict] = {}
        self._locations: dict[str, dict] = {}  # user_id -> { lat, lon, updatedAt }
        self._redis = None

    async def connect_redis(self, redis_url: str):
        """Attempt to connect to Redis. Falls back to in-memory if unavailable."""
        try:
            import redis.asyncio as aioredis
            self._redis = aioredis.from_url(redis_url, decode_responses=True)
            await self._redis.ping()
            logger.info("Connected to Redis for presence tracking")
        except Exception as e:
            logger.warning(f"Redis unavailable ({e}), using in-memory presence store")
            self._redis = None

    async def set_presence(self, user_id: str, status: str, track: str = "", artist: str = "", album_art: str = ""):
        """Set a user's presence state."""
        data = {
            "status": status,
            "track": track,
            "artist": artist,
            "albumArt": album_art,
            "updatedAt": int(time.time() * 1000),
        }

        if self._redis:
            await self._redis.set(f"presence:{user_id}", json.dumps(data), ex=300)  # 5 min TTL
        else:
            self._store[user_id] = data

    async def get_presence(self, user_id: str) -> Optional[dict]:
        """Get a user's current presence state."""
        if self._redis:
            raw = await self._redis.get(f"presence:{user_id}")
            return json.loads(raw) if raw else None
        return self._store.get(user_id)

    async def remove_presence(self, user_id: str):
        """Remove a user's presence (they went offline)."""
        if self._redis:
            await self._redis.delete(f"presence:{user_id}")
        else:
            self._store.pop(user_id, None)

    async def set_user_session(self, user_id: str, session_id: str):
        """Track which session a user is in."""
        if self._redis:
            await self._redis.set(f"user:session:{user_id}", session_id, ex=3600)
        else:
            self._store[f"session:{user_id}"] = {"sessionId": session_id}

    async def get_user_session(self, user_id: str) -> Optional[str]:
        """Get which session a user is currently in."""
        if self._redis:
            return await self._redis.get(f"user:session:{user_id}")
        data = self._store.get(f"session:{user_id}")
        return data["sessionId"] if data else None

    async def remove_user_session(self, user_id: str):
        """Remove a user's session tracking."""
        if self._redis:
            await self._redis.delete(f"user:session:{user_id}")
        else:
            self._store.pop(f"session:{user_id}", None)

    async def get_online_friends(self, friend_ids: list[str]) -> list[dict]:
        """Get presence state for a list of friend IDs."""
        online = []
        for fid in friend_ids:
            presence = await self.get_presence(fid)
            if presence:
                online.append({"userId": fid, **presence})
        return online

    async def set_vibe_vector(self, user_id: str, vector: list[float]):
        """Store a user's current vibe vector for matching."""
        import json as _json
        if self._redis:
            await self._redis.set(
                f"vibe:{user_id}",
                _json.dumps(vector),
                ex=600  # 10 min TTL — refreshed on each track change
            )
        else:
            self._store[f"vibe:{user_id}"] = vector

    async def get_vibe_vector(self, user_id: str) -> Optional[list[float]]:
        """Get a user's current vibe vector."""
        import json as _json
        if self._redis:
            raw = await self._redis.get(f"vibe:{user_id}")
            return _json.loads(raw) if raw else None
        return self._store.get(f"vibe:{user_id}")

    async def get_online_users_with_vectors(self) -> list[dict]:
        """
        Get all currently online users who have vibe vectors set.
        
        Returns list of { userId, vector } dicts for cosine similarity matching.
        """
        results = []
        if self._redis:
            # Scan for all presence keys to find online users
            cursor = 0
            while True:
                cursor, keys = await self._redis.scan(cursor, match="presence:*", count=100)
                for key in keys:
                    user_id = key.replace("presence:", "")
                    vector = await self.get_vibe_vector(user_id)
                    if vector:
                        results.append({"userId": user_id, "vector": vector})
                if cursor == 0:
                    break
        else:
            # In-memory: iterate presence entries
            for key, val in self._store.items():
                if not key.startswith(("session:", "vibe:", "pulse_cooldown:")) and isinstance(val, dict) and "status" in val:
                    user_id = key
                    vector = self._store.get(f"vibe:{user_id}")
                    if vector:
                        results.append({"userId": user_id, "vector": vector})
        return results

    async def set_user_location(self, user_id: str, lat: float, lon: float):
        """Store coarse location for discovery radius matching."""
        data = {"lat": lat, "lon": lon, "updatedAt": int(time.time() * 1000)}
        if self._redis:
            import json as _json
            await self._redis.set(f"location:{user_id}", _json.dumps(data), ex=3600)
        else:
            self._locations[user_id] = data

    async def get_user_location(self, user_id: str) -> Optional[dict]:
        import json as _json
        if self._redis:
            raw = await self._redis.get(f"location:{user_id}")
            return _json.loads(raw) if raw else None
        return self._locations.get(user_id)

    async def get_all_user_locations(self) -> dict[str, dict]:
        """Return all known user locations (in-memory or Redis scan)."""
        if self._redis:
            import json as _json
            result = {}
            cursor = 0
            while True:
                cursor, keys = await self._redis.scan(cursor, match="location:*", count=100)
                for key in keys:
                    uid = key.replace("location:", "")
                    raw = await self._redis.get(key)
                    if raw:
                        result[uid] = _json.loads(raw)
                if cursor == 0:
                    break
            return result
        return dict(self._locations)

    async def check_pulse_cooldown(self, session_id: str, user_id: str) -> bool:
        """
        Check if a pulse is allowed. If allowed, sets the cooldown and returns False.
        If not allowed (cooldown active), returns True.
        """
        key = f"pulse_cooldown:{session_id}:{user_id}"
        if self._redis:
            exists = await self._redis.exists(key)
            if exists:
                return True
            await self._redis.set(key, "1", ex=300)  # 5 min cooldown
            return False
        else:
            now = time.time()
            cooldown_expires = self._store.get(key, 0)
            if now < cooldown_expires:
                return True
            self._store[key] = now + 300
            return False


# Singleton
presence_store = PresenceStore()
