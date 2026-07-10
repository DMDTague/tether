"""Persistence for Tether's reviews, listening diary, and music lists.

Redis is used when available. Development and tests fall back to process-local
storage. Diary notes are private to their owner; only explicitly public reviews
and lists are eligible for the Exchange feed.
"""

from __future__ import annotations

import json
import logging
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

logger = logging.getLogger(__name__)


class MusicCultureStore:
    def __init__(self) -> None:
        self._redis = None
        self._reviews: dict[str, dict[str, Any]] = {}
        self._diaries: dict[str, list[dict[str, Any]]] = {}
        self._lists: dict[str, dict[str, Any]] = {}
        self._review_ratings: dict[str, dict[str, float]] = {}

    async def connect_redis(self, redis_url: str) -> None:
        try:
            import redis.asyncio as aioredis

            self._redis = aioredis.from_url(redis_url, decode_responses=True)
            await self._redis.ping()
            logger.info("Connected to Redis for music culture")
        except Exception as exc:
            logger.warning("Redis unavailable for music culture (%s); using memory", exc)
            self._redis = None

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _review_key(review_id: str) -> str:
        return f"music_culture:review:{review_id}"

    @staticmethod
    def _diary_key(user_id: str) -> str:
        return f"music_culture:diary:{user_id}"

    @staticmethod
    def _list_key(list_id: str) -> str:
        return f"music_culture:list:{list_id}"

    async def create_review(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        review = {
            "id": str(uuid4()),
            "userId": user_id,
            "createdAt": self._now(),
            "communityRating": None,
            "communityRatingCount": 0,
            **deepcopy(payload),
        }
        if self._redis:
            key = self._review_key(review["id"])
            await self._redis.set(key, json.dumps(review, separators=(",", ":")))
            await self._redis.zadd("music_culture:reviews", {review["id"]: datetime.now(timezone.utc).timestamp()})
        else:
            self._reviews[review["id"]] = deepcopy(review)
        return review

    async def get_review(self, review_id: str) -> dict[str, Any] | None:
        if self._redis:
            raw = await self._redis.get(self._review_key(review_id))
            return json.loads(raw) if raw else None
        review = self._reviews.get(review_id)
        return deepcopy(review) if review else None

    async def list_reviews(self, limit: int = 30, user_id: str | None = None) -> list[dict[str, Any]]:
        if self._redis:
            if user_id:
                ids = await self._redis.zrevrange(f"music_culture:user_reviews:{user_id}", 0, limit - 1)
            else:
                ids = await self._redis.zrevrange("music_culture:reviews", 0, limit - 1)
            reviews = []
            for review_id in ids:
                review = await self.get_review(review_id)
                if review:
                    reviews.append(review)
            return reviews
        reviews = [review for review in self._reviews.values() if not user_id or review["userId"] == user_id]
        reviews.sort(key=lambda review: review["createdAt"], reverse=True)
        return deepcopy(reviews[:limit])

    async def index_review_for_user(self, review: dict[str, Any]) -> None:
        if self._redis:
            timestamp = datetime.fromisoformat(review["createdAt"]).timestamp()
            await self._redis.zadd(f"music_culture:user_reviews:{review['userId']}", {review["id"]: timestamp})

    async def rate_review(self, review_id: str, user_id: str, score: float) -> dict[str, Any] | None:
        review = await self.get_review(review_id)
        if not review:
            return None
        if self._redis:
            await self._redis.hset(f"music_culture:review_ratings:{review_id}", user_id, score)
            values = [float(value) for value in (await self._redis.hvals(f"music_culture:review_ratings:{review_id}"))]
        else:
            self._review_ratings.setdefault(review_id, {})[user_id] = score
            values = list(self._review_ratings[review_id].values())
        review["communityRatingCount"] = len(values)
        review["communityRating"] = round(sum(values) / len(values), 2) if values else None
        if self._redis:
            await self._redis.set(self._review_key(review_id), json.dumps(review, separators=(",", ":")))
        else:
            self._reviews[review_id] = deepcopy(review)
        return review

    async def add_diary_entry(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        entry = {"id": str(uuid4()), "userId": user_id, "createdAt": self._now(), **deepcopy(payload)}
        if self._redis:
            key = self._diary_key(user_id)
            entries = json.loads(await self._redis.get(key) or "[]")
            entries.insert(0, entry)
            await self._redis.set(key, json.dumps(entries[:500], separators=(",", ":")))
        else:
            self._diaries.setdefault(user_id, []).insert(0, deepcopy(entry))
        return entry

    async def list_diary(self, user_id: str, limit: int = 100) -> list[dict[str, Any]]:
        if self._redis:
            entries = json.loads(await self._redis.get(self._diary_key(user_id)) or "[]")
            return entries[:limit]
        return deepcopy(self._diaries.get(user_id, [])[:limit])

    async def create_list(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        music_list = {
            "id": str(uuid4()),
            "userId": user_id,
            "createdAt": self._now(),
            "saveCount": 0,
            **deepcopy(payload),
        }
        if self._redis:
            await self._redis.set(self._list_key(music_list["id"]), json.dumps(music_list, separators=(",", ":")))
            await self._redis.zadd("music_culture:lists", {music_list["id"]: datetime.now(timezone.utc).timestamp()})
            await self._redis.zadd(f"music_culture:user_lists:{user_id}", {music_list["id"]: datetime.now(timezone.utc).timestamp()})
        else:
            self._lists[music_list["id"]] = deepcopy(music_list)
        return music_list

    async def get_list(self, list_id: str) -> dict[str, Any] | None:
        if self._redis:
            raw = await self._redis.get(self._list_key(list_id))
            return json.loads(raw) if raw else None
        music_list = self._lists.get(list_id)
        return deepcopy(music_list) if music_list else None

    async def list_lists(self, limit: int = 30, user_id: str | None = None, public_only: bool = False) -> list[dict[str, Any]]:
        if self._redis:
            index = f"music_culture:user_lists:{user_id}" if user_id else "music_culture:lists"
            ids = await self._redis.zrevrange(index, 0, limit - 1)
            lists = []
            for list_id in ids:
                item = await self.get_list(list_id)
                if item and (not public_only or item.get("visibility") == "public"):
                    lists.append(item)
            return lists
        lists = [item for item in self._lists.values() if (not user_id or item["userId"] == user_id) and (not public_only or item.get("visibility") == "public")]
        lists.sort(key=lambda item: item["createdAt"], reverse=True)
        return deepcopy(lists[:limit])


music_culture_store = MusicCultureStore()
