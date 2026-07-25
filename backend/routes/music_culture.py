"""Durable Exchange routes for reviews, discussions, diary, and lists."""

from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import Integer, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import Follow, User
from models.culture_models import Comment, DiaryEntry, FeedImpression, MusicList, MusicListItem, Post, Reaction, Review, ReviewUsefulness, Save
from routes.auth import get_current_user_id

router = APIRouter(prefix="/api/culture", tags=["music-culture"])
SubjectType = Literal["track", "album", "artist", "concert", "playlist", "tether_session"]
Visibility = Literal["public", "followers", "private"]
FeedType = Literal["for_you", "following", "local", "rising", "new"]


class ReviewCreate(BaseModel):
    subjectType: SubjectType
    subjectId: str = Field(default="", max_length=128)
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
            raise ValueError("Ratings use half-point steps; 6.0 is Platinum")
        return value


class DiscussionCreate(BaseModel):
    subjectType: SubjectType
    subjectId: str = Field(default="", max_length=128)
    title: str = Field(min_length=1, max_length=180)
    artist: str = Field(default="", max_length=180)
    body: str = Field(min_length=1, max_length=6000)
    visibility: Visibility = "public"
    communityId: str | None = None


class ReviewRating(BaseModel):
    score: float = Field(ge=1.0, le=5.0)


class ReviewFeedback(BaseModel):
    useful: bool
    agrees: bool | None = None


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)
    parentId: str | None = None


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


async def _post_counts(db: AsyncSession, post_id: str) -> dict:
    comments = (await db.execute(select(func.count(Comment.id)).where(Comment.post_id == post_id))).scalar() or 0
    saves = (await db.execute(select(func.count(Save.id)).where(Save.object_type == "post", Save.object_id == post_id))).scalar() or 0
    reactions = (await db.execute(select(func.count(Reaction.id)).where(Reaction.object_type == "post", Reaction.object_id == post_id))).scalar() or 0
    outcomes = await db.execute(select(func.sum(FeedImpression.played.cast(Integer)), func.sum(FeedImpression.tethered.cast(Integer)), func.sum(FeedImpression.replied.cast(Integer))).where(FeedImpression.post_id == post_id))
    row = outcomes.first()
    return {"commentCount": int(comments), "saveCount": int(saves), "reactionCount": int(reactions), "playCount": int((row[0] if row else 0) or 0), "tetherCount": int((row[1] if row else 0) or 0), "replyOutcomeCount": int((row[2] if row else 0) or 0)}


async def _serialize_post(db: AsyncSession, post: Post) -> dict:
    author = (await db.execute(select(User).where(User.id == post.author_id))).scalar_one_or_none()
    review = (await db.execute(select(Review).where(Review.post_id == post.id))).scalar_one_or_none() if post.post_type == "review" else None
    return {"id": post.id, "userId": post.author_id, "author": author.display_name if author else "Unknown", "postType": post.post_type, "subjectType": post.subject_type, "subjectId": post.subject_id or "", "title": post.title, "artist": post.artist, "body": post.body, "score": review.music_score if review else None, "verifiedListen": bool(review and review.verified_listen), "spoiler": bool(review and review.spoiler), "visibility": post.visibility, "createdAt": post.created_at.isoformat(), **(await _post_counts(db, post.id)), "actions": ["listen", "send", "tether", "reply", "save"]}


@router.get("/feed")
async def exchange_feed(feed: FeedType = Query(default="for_you"), limit: int = Query(default=20, ge=1, le=50), user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    query = select(Post).where(Post.visibility == "public", Post.moderation_state == "visible")
    if feed == "following":
        query = query.where(Post.author_id.in_(select(Follow.following_id).where(Follow.follower_id == user_id)))
    posts = (await db.execute(query.order_by(Post.created_at.desc()).limit(limit * 4))).scalars().all()
    ranked: list[tuple[float, Post]] = []
    for post in posts:
        counts = await _post_counts(db, post.id)
        age_hours = max(1.0, (date.today() - post.created_at.date()).days * 24 + 1)
        meaningful = counts["tetherCount"] * 6 + counts["playCount"] * 3 + counts["replyOutcomeCount"] * 2.5 + counts["saveCount"] * 2 + counts["commentCount"] * 1.5 + counts["reactionCount"] * 0.25
        score = -post.created_at.timestamp() if feed == "new" else (-(meaningful / age_hours) if feed == "rising" else -(meaningful + max(0, 10 - sum(counts.values())) * 0.1))
        ranked.append((score, post))
    ranked.sort(key=lambda item: (item[0], -item[1].created_at.timestamp()))
    output = []
    for rank, (_, post) in enumerate(ranked[:limit], start=1):
        reason = {"feed": feed, "signals": ["meaningful_outcomes", "freshness", "creator_diversity"], "provenance": "observed"}
        db.add(FeedImpression(user_id=user_id, post_id=post.id, feed=feed, rank=rank, reason=reason))
        serialized = await _serialize_post(db, post)
        serialized["rankingExplanation"] = reason
        output.append(serialized)
    return {"posts": output, "feed": feed}


@router.get("/reviews")
async def list_reviews(mine: bool = False, limit: int = Query(default=30, ge=1, le=100), user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    query = select(Post).where(Post.post_type == "review")
    query = query.where(Post.author_id == user_id) if mine else query.where(Post.visibility == "public", Post.moderation_state == "visible")
    return [await _serialize_post(db, post) for post in (await db.execute(query.order_by(Post.created_at.desc()).limit(limit))).scalars().all()]


@router.post("/reviews", status_code=201)
async def create_review(review: ReviewCreate, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    post = Post(author_id=user_id, post_type="review", subject_type=review.subjectType, subject_id=review.subjectId or None, title=review.title, artist=review.artist, body=review.body, visibility=review.visibility)
    db.add(post)
    await db.flush()
    db.add(Review(post_id=post.id, music_score=review.score, verified_listen=review.verifiedListen, spoiler=review.spoiler))
    await db.flush()
    return await _serialize_post(db, post)


@router.post("/discussions", status_code=201)
async def create_discussion(discussion: DiscussionCreate, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    post = Post(author_id=user_id, post_type="discussion", subject_type=discussion.subjectType, subject_id=discussion.subjectId or None, title=discussion.title, artist=discussion.artist, body=discussion.body, visibility=discussion.visibility, community_id=discussion.communityId)
    db.add(post)
    await db.flush()
    return await _serialize_post(db, post)


@router.post("/reviews/{review_id}/rating")
async def rate_review(review_id: str, rating: ReviewRating, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    return await review_feedback(review_id, ReviewFeedback(useful=rating.score >= 3.0, agrees=None), user_id, db)


@router.post("/reviews/{review_id}/feedback")
async def review_feedback(review_id: str, feedback: ReviewFeedback, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    post = (await db.execute(select(Post).where(Post.id == review_id, Post.post_type == "review"))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Review not found")
    record = (await db.execute(select(ReviewUsefulness).where(ReviewUsefulness.review_post_id == review_id, ReviewUsefulness.user_id == user_id))).scalar_one_or_none()
    if not record:
        record = ReviewUsefulness(review_post_id=review_id, user_id=user_id, useful=feedback.useful)
        db.add(record)
    record.useful, record.agrees = feedback.useful, feedback.agrees
    return {"reviewId": review_id, "useful": feedback.useful, "agrees": feedback.agrees}


@router.post("/posts/{post_id}/comments", status_code=201)
async def create_comment(post_id: str, payload: CommentCreate, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    post = (await db.execute(select(Post).where(Post.id == post_id, Post.moderation_state == "visible"))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comment = Comment(post_id=post_id, author_id=user_id, parent_id=payload.parentId, body=payload.body)
    db.add(comment)
    await db.flush()
    return {"id": comment.id, "body": comment.body, "createdAt": comment.created_at.isoformat()}


@router.post("/posts/{post_id}/save", status_code=201)
async def save_post(post_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    if not (await db.execute(select(Post.id).where(Post.id == post_id, Post.moderation_state == "visible"))).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")
    existing = (await db.execute(select(Save).where(Save.user_id == user_id, Save.object_type == "post", Save.object_id == post_id))).scalar_one_or_none()
    if not existing:
        db.add(Save(user_id=user_id, object_type="post", object_id=post_id))
    return {"saved": True}


@router.get("/diary")
async def list_diary(limit: int = Query(default=100, ge=1, le=500), user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    entries = (await db.execute(select(DiaryEntry).where(DiaryEntry.user_id == user_id).order_by(DiaryEntry.listened_on.desc(), DiaryEntry.created_at.desc()).limit(limit))).scalars().all()
    return [{"id": entry.id, "subjectType": entry.subject_type, "title": entry.title, "artist": entry.artist, "listenedOn": entry.listened_on.isoformat(), "score": entry.score, "privateNote": entry.private_note, "provider": entry.provider, "providerItemId": entry.provider_item_id, "sessionId": entry.session_id or ""} for entry in entries]


@router.post("/diary", status_code=201)
async def add_diary_entry(entry: DiaryEntryCreate, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    model = DiaryEntry(user_id=user_id, subject_type=entry.subjectType, title=entry.title, artist=entry.artist, listened_on=entry.listenedOn, score=entry.score, private_note=entry.privateNote, provider=entry.provider, provider_item_id=entry.providerItemId, session_id=entry.sessionId or None)
    db.add(model)
    await db.flush()
    return {"id": model.id, **entry.model_dump(mode="json")}


@router.get("/lists")
async def list_music_lists(mine: bool = False, limit: int = Query(default=30, ge=1, le=100), user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    query = select(MusicList)
    query = query.where(MusicList.user_id == user_id) if mine else query.where(MusicList.visibility == "public")
    lists = (await db.execute(query.order_by(MusicList.created_at.desc()).limit(limit))).scalars().all()
    return [{"id": item.id, "userId": item.user_id, "title": item.title, "description": item.description, "visibility": item.visibility, "ranked": item.ranked, "actions": ["listen", "send", "tether", "save"]} for item in lists]


@router.post("/lists", status_code=201)
async def create_music_list(music_list: MusicListCreate, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    model = MusicList(user_id=user_id, title=music_list.title, description=music_list.description, visibility=music_list.visibility, ranked=music_list.ranked)
    db.add(model)
    await db.flush()
    for index, entry in enumerate(music_list.entries, start=1):
        db.add(MusicListItem(list_id=model.id, subject_type=entry.subjectType, title=entry.title, artist=entry.artist, note=entry.note, position=entry.rank or index))
    return {"id": model.id, "userId": user_id, **music_list.model_dump(), "actions": ["listen", "send", "tether", "save"]}


@router.get("/lists/{list_id}")
async def get_music_list(list_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    model = (await db.execute(select(MusicList).where(MusicList.id == list_id))).scalar_one_or_none()
    if not model or (model.visibility == "private" and model.user_id != user_id):
        raise HTTPException(status_code=404, detail="List not found")
    entries = (await db.execute(select(MusicListItem).where(MusicListItem.list_id == list_id).order_by(MusicListItem.position))).scalars().all()
    return {"id": model.id, "userId": model.user_id, "title": model.title, "description": model.description, "visibility": model.visibility, "ranked": model.ranked, "entries": [{"subjectType": entry.subject_type, "title": entry.title, "artist": entry.artist, "note": entry.note, "rank": entry.position} for entry in entries], "actions": ["listen", "send", "tether", "save"]}
