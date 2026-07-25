"""Durable platform models extracted from the Tether architecture audit."""

from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime, Float, ForeignKey, Index,
    Integer, JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from models.models import gen_uuid, utcnow
from db.database import Base


class UserBlock(Base):
    __tablename__ = "user_blocks"
    __table_args__ = (UniqueConstraint("blocker_id", "blocked_user_id"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    blocker_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    blocked_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(String(120), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    blocker = relationship("User", foreign_keys=[blocker_id])
    blocked_user = relationship("User", foreign_keys=[blocked_user_id])


Block = UserBlock

class UserMute(Base):
    __tablename__ = "user_mutes"
    __table_args__ = (UniqueConstraint("muter_id", "muted_user_id"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    muter_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    muted_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class UserReport(Base):
    __tablename__ = "user_reports"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    reporter_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reported_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    context_type = Column(String(32), nullable=False)
    context_id = Column(String(64), nullable=True)
    category = Column(String(40), nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(20), default="open", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class ContentReport(Base):
    __tablename__ = "content_reports"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    reporter_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content_type = Column(String(32), nullable=False)
    content_id = Column(String(64), nullable=False)
    category = Column(String(40), nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(20), default="open", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class ModerationCase(Base):
    __tablename__ = "moderation_cases"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    subject_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    status = Column(String(20), default="open", nullable=False, index=True)
    risk_level = Column(String(16), default="standard", nullable=False)
    source_type = Column(String(32), nullable=False)
    source_id = Column(String(64), nullable=False)
    opened_at = Column(DateTime(timezone=True), default=utcnow)
    closed_at = Column(DateTime(timezone=True), nullable=True)

class ModerationAction(Base):
    __tablename__ = "moderation_actions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    case_id = Column(String(36), ForeignKey("moderation_cases.id", ondelete="CASCADE"), nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action_type = Column(String(32), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
