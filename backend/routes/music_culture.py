"""The Exchange: reviews, listening diary, and music lists.

Tether sessions remain the product's unique center. These endpoints provide the
persistent cultural layer that makes the app useful between live sessions.
"""

from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from routes.auth import get_current_user_id
from services.music_culture import music_culture_store

router = APIRouter(prefix="/api/culture", tags=["music-culture"])

SubjectType = Literal["track", "album", "artist", "concert", "playlist", "tether_session"]
Visibility = Literal["public", "followers", "private"]


class ReviewCreate(BaseModel):
    subjectType: SubjectType
    title: str = Field(min_length=1, max_length=180)
    artist: str = Field(default="", max_length=180)
    body: str = Field(min_length=1, max_length=4000)
    score: float = Field(ge=0.5, le=6.0)
    visibility: Visibility = "public"
    verifiedListen: bool = False
    spoiler: bool = False

    @field_validator("score")
    @classmethod
    def half_steps_or_platinum(cls, value: float) -> float:
        if value != 6.0 and round(value * 2) != value * 2:
            raise ValueError("Ratings use half-point steps; 6.0 is the intentional Platinum rating")
        return value


class ReviewRating(BaseModel):
    score: float = Field(ge=1.0, le=5.0)

    @field_validator("score")
    @classmethod
    def half_steps(cls, value: float) -> float:
        if round(value * 2) != value * 2:
            raise ValueError("Review ratings use half-point steps")
        return value


class DiaryEntryCreate(BaseModel):
    subjectType: SubjectType
    title: str = Field(min_length=1, max_length=180)
    artist: str = Field(default="", max_length=180)
    listenedOn: date
    score: float | None = Field(default=None, ge=0.5, le=6.0)
    privateNote: str = Field(default="", max_length=2000)
    provider: Literal["spotify", "apple_music", "manual", "tether"] = "manual"
    providerItemId: str = Field(default="", max_length=300)
    sessionId: str = Field(default="", max_length=64)

    @field_validator("score")
    @classmethod
    def diary_half_steps(cls, value: float | None) -> float | None:
        if value is not None and value != 6.0 and round(value * 2) != value * 2:
            raise ValueError("Ratings use half-point steps")
        return value


class MusicListEntry(BaseModel):
    subjectType: SubjectType
    title: str = Field(min_length=1, max_length=180)
    artist: str = Field(default="", max_length=180)
    note: str = Field(default="", max_length=500)
    rank: int | None = Field(default=None, ge=1, le=1000)


class MusicListCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=1000)
    visibility: Visibility = "public"
    ranked: bool = False
    entries: list[MusicListEntry] = Field(default_factory=list, max_length=100)


@router.get("/feed")
async def exchange_feed(limit: int = Query(default=20, ge=1, le=50)):
    reviews = [review for review in await music_culture_store.list_reviews(limit=limit * 2) if review.get("visibility") == "public"][:limit]
    lists = await music_culture_store.list_lists(limit=8, public_only=True)
    return {"reviews": reviews, "lists": lists}


@router.get("/reviews")
async def list_reviews(
    mine: bool = False,
    limit: int = Query(default=30, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
):
    reviews = await music_culture_store.list_reviews(limit=limit, user_id=user_id if mine else None)
    if mine:
        return reviews
    return [review for review in reviews if review.get("visibility") == "public"]


@router.post("/reviews", status_code=201)
async def create_review(review: ReviewCreate, user_id: str = Depends(get_current_user_id)):
    created = await music_culture_store.create_review(user_id, review.model_dump())
    await music_culture_store.index_review_for_user(created)
    return created


@router.post("/reviews/{review_id}/rating")
async def rate_review(review_id: str, rating: ReviewRating, user_id: str = Depends(get_current_user_id)):
    review = await music_culture_store.rate_review(review_id, user_id, rating.score)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.get("/diary")
async def list_diary(limit: int = Query(default=100, ge=1, le=500), user_id: str = Depends(get_current_user_id)):
    return await music_culture_store.list_diary(user_id, limit=limit)


@router.post("/diary", status_code=201)
async def add_diary_entry(entry: DiaryEntryCreate, user_id: str = Depends(get_current_user_id)):
    return await music_culture_store.add_diary_entry(user_id, entry.model_dump(mode="json"))


@router.get("/lists")
async def list_music_lists(
    mine: bool = False,
    limit: int = Query(default=30, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
):
    return await music_culture_store.list_lists(limit=limit, user_id=user_id if mine else None, public_only=not mine)


@router.post("/lists", status_code=201)
async def create_music_list(music_list: MusicListCreate, user_id: str = Depends(get_current_user_id)):
    return await music_culture_store.create_list(user_id, music_list.model_dump())


@router.get("/lists/{list_id}")
async def get_music_list(list_id: str, user_id: str = Depends(get_current_user_id)):
    music_list = await music_culture_store.get_list(list_id)
    if not music_list:
        raise HTTPException(status_code=404, detail="List not found")
    if music_list.get("visibility") == "private" and music_list.get("userId") != user_id:
        raise HTTPException(status_code=404, detail="List not found")
    return music_list
