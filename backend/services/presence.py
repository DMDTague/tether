"""Privacy-preserving real-time presence storage.

Presence is intentionally short lived. Location is reduced to a coarse cell before
it enters Redis or the in-memory fallback; raw latitude and longitude are never
persisted by this service.
"""

import json
import logging
import math
import time
from typing import Optional

from config import get_settings
from services.geo import haversine_miles

logger = logging.getLogger(__name__)
settings = get_settings()


class PresenceStore:
    def __init__(self):
        self._store: dict[str, object] = {}
        self._locations: dict[str, dict] = {}
        self._redis = None

    async def connect_redis(self, redis_url: str):
        try:
            import redis.asyncio as aioredis
            self._redis = aioredis.from_url(redis_url, decode_responses=True)
            await self._redis.ping()
            logger.info("presence.redis_connected")
        except Exception as exc:
            logger.warning("presence.redis_unavailable", extra={"reason": str(exc)})
            self._redis = None

    async def set_presence(self, user_id: str, status: str, track: str = "", artist: str = "", album_art: str = "", provider: str = "spotify"):
        data = {"status": status, "track": track, "artist": artist, "albumArt": album_art, "provider": provider, "updatedAt": int(time.time() * 1000)}
        if self._redis:
            await self._redis.set(f"presence:{user_id}", json.dumps(data), ex=300)
        else:
            self._store[user_id] = data

    async def get_presence(self, user_id: str) -> Optional[dict]:
        if self._redis:
            raw = await self._redis.get(f"presence:{user_id}")
            return json.loads(raw) if raw else None
        value = self._store.get(user_id)
        return value if isinstance(value, dict) else None

    async def remove_presence(self, user_id: str):
        if self._redis:
            await self._redis.delete(f"presence:{user_id}")
        else:
            self._store.pop(user_id, None)

    async def set_user_session(self, user_id: str, session_id: str):
        if self._redis:
            await self._redis.set(f"user:session:{user_id}", session_id, ex=3600)
        else:
            self._store[f"session:{user_id}"] = {"sessionId": session_id}

    async def get_user_session(self, user_id: str) -> Optional[str]:
        if self._redis:
            return await self._redis.get(f"user:session:{user_id}")
        value = self._store.get(f"session:{user_id}")
        return value.get("sessionId") if isinstance(value, dict) else None

    async def remove_user_session(self, user_id: str):
        if self._redis:
            await self._redis.delete(f"user:session:{user_id}")
        else:
            self._store.pop(f"session:{user_id}", None)

    async def get_online_friends(self, user_id: str, friend_ids: list[str]) -> list[dict]:
        from db.database import async_session_maker
        from services.privacy import can_view_presence
        online = []
        async with async_session_maker() as db:
            for friend_id in friend_ids:
                if await can_view_presence(db, user_id, friend_id):
                    presence = await self.get_presence(friend_id)
                    if presence:
                        online.append({"userId": friend_id, **presence})
        return online

    async def set_vibe_vector(self, user_id: str, vector: list[float]):
        if self._redis:
            await self._redis.set(f"vibe:{user_id}", json.dumps(vector), ex=600)
        else:
            self._store[f"vibe:{user_id}"] = vector

    async def get_vibe_vector(self, user_id: str) -> Optional[list[float]]:
        if self._redis:
            raw = await self._redis.get(f"vibe:{user_id}")
            return json.loads(raw) if raw else None
        value = self._store.get(f"vibe:{user_id}")
        return value if isinstance(value, list) else None

    async def get_online_users_with_vectors(self) -> list[dict]:
        results = []
        if self._redis:
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
            for key, value in self._store.items():
                if not key.startswith(("session:", "vibe:", "pulse_cooldown:")) and isinstance(value, dict) and "status" in value:
                    vector = self._store.get(f"vibe:{key}")
                    if isinstance(vector, list):
                        results.append({"userId": key, "vector": vector})
        return results

    @staticmethod
    def _quantize(value: float, precision: float) -> int:
        return math.floor(value / precision)

    @staticmethod
    def _cell_center(cell: int, precision: float) -> float:
        return (cell + 0.5) * precision

    async def set_user_location(self, user_id: str, lat: float, lon: float):
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("Invalid coordinates")
        precision = settings.LOCATION_CELL_DEGREES
        data = {
            "latCell": self._quantize(lat, precision),
            "lonCell": self._quantize(lon, precision),
            "precisionDegrees": precision,
            "updatedAt": int(time.time() * 1000),
            "expiresAt": int(time.time()) + settings.LOCATION_TTL_SECONDS,
        }
        if self._redis:
            await self._redis.set(f"location-cell:{user_id}", json.dumps(data), ex=settings.LOCATION_TTL_SECONDS)
        else:
            self._locations[user_id] = data

    async def get_user_location(self, user_id: str) -> Optional[dict]:
        if self._redis:
            raw = await self._redis.get(f"location-cell:{user_id}")
            return json.loads(raw) if raw else None
        value = self._locations.get(user_id)
        if value and int(value.get("expiresAt", 0)) < int(time.time()):
            self._locations.pop(user_id, None)
            return None
        return value

    async def distance_band_between(self, first_user_id: str, second_user_id: str) -> str | None:
        first = await self.get_user_location(first_user_id)
        second = await self.get_user_location(second_user_id)
        if not first or not second:
            return None
        precision = max(float(first["precisionDegrees"]), float(second["precisionDegrees"]))
        first_lat = self._cell_center(int(first["latCell"]), precision)
        first_lon = self._cell_center(int(first["lonCell"]), precision)
        second_lat = self._cell_center(int(second["latCell"]), precision)
        second_lon = self._cell_center(int(second["lonCell"]), precision)
        distance = haversine_miles(first_lat, first_lon, second_lat, second_lon)
        if distance < 5:
            return "under_5_miles"
        if distance < 15:
            return "5_to_15_miles"
        if distance < 50:
            return "15_to_50_miles"
        return "over_50_miles"

    async def check_pulse_cooldown(self, session_id: str, user_id: str) -> bool:
        key = f"pulse_cooldown:{session_id}:{user_id}"
        cooldown = settings.PULSE_COOLDOWN_SECONDS
        if self._redis:
            exists = await self._redis.exists(key)
            if exists:
                return True
            await self._redis.set(key, "1", ex=cooldown)
            return False
        now = time.time()
        expires_at = self._store.get(key, 0)
        if isinstance(expires_at, (int, float)) and now < expires_at:
            return True
        self._store[key] = now + cooldown
        return False


presence_store = PresenceStore()
