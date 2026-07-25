"""Unified reporting, muting, and safety status endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.models import User
from models.safety_models import ContentReport, ModerationCase, UserMute, UserReport, UserBlock
from routes.auth import get_current_user_id
from services.safety_policy import apply_block_cleanup

router = APIRouter(prefix="/api/safety", tags=["safety"])
_CONTEXTS = {"profile", "dating", "message", "post", "comment", "session", "album"}
_CATEGORIES = {"harassment", "hate", "sexual_content", "minor_safety", "spam", "impersonation", "privacy", "self_harm", "other"}


class UserReportCreate(BaseModel):
    reported_user_id: str = Field(min_length=1, max_length=36)
    context_type: str
    context_id: str | None = Field(default=None, max_length=64)
    category: str
    details: str | None = Field(default=None, max_length=2000)
    block_after_reporting: bool = True


class ContentReportCreate(BaseModel):
    content_type: str
    content_id: str = Field(min_length=1, max_length=64)
    category: str
    details: str | None = Field(default=None, max_length=2000)


class MuteCreate(BaseModel):
    muted_user_id: str = Field(min_length=1, max_length=36)


def _validate(context: str, category: str) -> None:
    if context not in _CONTEXTS:
        raise HTTPException(status_code=422, detail="Unsupported report context")
    if category not in _CATEGORIES:
        raise HTTPException(status_code=422, detail="Unsupported report category")


@router.post("/reports/users", status_code=201)
async def report_user(payload: UserReportCreate, reporter_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    _validate(payload.context_type, payload.category)
    if payload.reported_user_id == reporter_id:
        raise HTTPException(status_code=400, detail="Cannot report yourself")
    if not (await db.execute(select(User.id).where(User.id == payload.reported_user_id))).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")
    report = UserReport(reporter_id=reporter_id, reported_user_id=payload.reported_user_id, context_type=payload.context_type, context_id=payload.context_id, category=payload.category, details=payload.details)
    db.add(report)
    await db.flush()
    db.add(ModerationCase(subject_user_id=payload.reported_user_id, source_type="user_report", source_id=report.id, risk_level="urgent" if payload.category == "minor_safety" else "standard"))
    if payload.block_after_reporting:
        existing = await db.execute(select(UserBlock).where(UserBlock.blocker_id == reporter_id, UserBlock.blocked_user_id == payload.reported_user_id))
        if not existing.scalar_one_or_none():
            db.add(UserBlock(blocker_id=reporter_id, blocked_user_id=payload.reported_user_id, reason="reported"))
            await db.flush()
        await apply_block_cleanup(db, reporter_id, payload.reported_user_id)
    return {"reportId": report.id, "status": report.status, "blocked": payload.block_after_reporting}


@router.post("/reports/content", status_code=201)
async def report_content(payload: ContentReportCreate, reporter_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    _validate(payload.content_type, payload.category)
    report = ContentReport(reporter_id=reporter_id, content_type=payload.content_type, content_id=payload.content_id, category=payload.category, details=payload.details)
    db.add(report)
    await db.flush()
    db.add(ModerationCase(source_type="content_report", source_id=report.id, risk_level="urgent" if payload.category == "minor_safety" else "standard"))
    return {"reportId": report.id, "status": report.status}


@router.post("/mutes", status_code=201)
async def mute_user(payload: MuteCreate, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    if payload.muted_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot mute yourself")
    mute = (await db.execute(select(UserMute).where(UserMute.muter_id == user_id, UserMute.muted_user_id == payload.muted_user_id))).scalar_one_or_none()
    if not mute:
        mute = UserMute(muter_id=user_id, muted_user_id=payload.muted_user_id)
        db.add(mute)
        await db.flush()
    return {"mutedUserId": payload.muted_user_id, "muted": True}
