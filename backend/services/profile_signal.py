"""Persist the aesthetic profile and explicit opt-in dating signal.

The store uses Redis when available and a process-local fallback for development.
Sensitive dating fields are never returned by ``public_profile`` unless the owner
has explicitly enabled and exposed their dating signal.
"""

from __future__ import annotations

import json
import logging
from copy import deepcopy
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_PROFILE: dict[str, Any] = {
    "atmosphere": {
        "statement": "",
        "palette": ["#a7a0ff", "#63e4c0", "#ff7ea8"],
        "motion": "liquid-signal",
        "topFive": [],
    },
    "dating": {
        "enabled": False,
        "visible": False,
        "identity": "",
        "orientation": "",
        "intent": "Open to the signal",
        "height": "",
        "bodyDescription": "",
        "priorityArtist": "",
        "dealbreakerArtist": "",
        "prompt": "",
    },
}


class ProfileSignalStore:
    def __init__(self) -> None:
        self._profiles: dict[str, dict[str, Any]] = {}
        self._redis = None

    async def connect_redis(self, redis_url: str) -> None:
        try:
            import redis.asyncio as aioredis

            self._redis = aioredis.from_url(redis_url, decode_responses=True)
            await self._redis.ping()
            logger.info("Connected to Redis for profile signals")
        except Exception as exc:
            logger.warning("Redis unavailable for profile signals (%s); using memory", exc)
            self._redis = None

    @staticmethod
    def _key(user_id: str) -> str:
        return f"profile_signal:{user_id}"

    async def get_profile(self, user_id: str) -> dict[str, Any]:
        raw = await self._redis.get(self._key(user_id)) if self._redis else None
        stored = json.loads(raw) if raw else deepcopy(self._profiles.get(user_id, {}))
        profile = deepcopy(DEFAULT_PROFILE)
        profile["atmosphere"].update(stored.get("atmosphere") or {})
        profile["dating"].update(stored.get("dating") or {})
        return profile

    async def set_profile(self, user_id: str, profile: dict[str, Any]) -> dict[str, Any]:
        normalized = deepcopy(DEFAULT_PROFILE)
        normalized["atmosphere"].update(profile.get("atmosphere") or {})
        normalized["dating"].update(profile.get("dating") or {})
        if self._redis:
            await self._redis.set(self._key(user_id), json.dumps(normalized, separators=(",", ":")))
        else:
            self._profiles[user_id] = deepcopy(normalized)
        return normalized

    async def public_profile(self, user_id: str, include_dating: bool = False) -> dict[str, Any]:
        profile = await self.get_profile(user_id)
        public: dict[str, Any] = {"atmosphere": profile["atmosphere"]}
        dating = profile["dating"]
        if include_dating and dating.get("enabled") and dating.get("visible"):
            public["dating"] = {
                key: dating.get(key)
                for key in (
                    "identity",
                    "orientation",
                    "intent",
                    "height",
                    "bodyDescription",
                    "priorityArtist",
                    "dealbreakerArtist",
                    "prompt",
                )
            }
        return public


profile_signal_store = ProfileSignalStore()
