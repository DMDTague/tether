"""Durable platform models extracted from the Tether architecture audit."""

from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime, Float, ForeignKey, Index,
    Integer, JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from models.models import gen_uuid, utcnow
from db.database import Base


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = (Index("ix_posts_feed", "visibility", "created_at"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    author_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    post_type = Column(String(32), nullable=False)
    subject_type = Column(String(32), nullable=False)
    subject_id = Column(String(128), nullable=True)
    title = Column(String(180), nullable=False)
    artist = Column(String(180), default="")
    body = Column(Text, nullable=False)
    visibility = Column(String(20), default="public", nullable=False)
    community_id = Column(String(36), ForeignKey("communities.id"), nullable=True)
    moderation_state = Column(String(20), default="visible", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class Review(Base):
    __tablename__ = "reviews"
    post_id = Column(String(36), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    music_score = Column(Float, nullable=False)
    verified_listen = Column(Boolean, default=False, nullable=False)
    spoiler = Column(Boolean, default=False, nullable=False)

class Rating(Base):
    __tablename__ = "ratings"
    __table_args__ = (UniqueConstraint("user_id", "subject_type", "subject_id"),)
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_type = Column(String(32), nullable=False)
    subject_id = Column(String(128), nullable=False)
    score = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class Comment(Base):
    __tablename__ = "comments"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    post_id = Column(String(36), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(String(36), ForeignKey("comments.id"), nullable=True)
    body = Column(Text, nullable=False)
    moderation_state = Column(String(20), default="visible", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (UniqueConstraint("user_id", "object_type", "object_id", "reaction_type"),)
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    object_type = Column(String(24), nullable=False)
    object_id = Column(String(36), nullable=False)
    reaction_type = Column(String(24), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("user_id", "object_type", "object_id"),)
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    object_type = Column(String(24), nullable=False)
    object_id = Column(String(36), nullable=False)
    value = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class Save(Base):
    __tablename__ = "saves"
    __table_args__ = (UniqueConstraint("user_id", "object_type", "object_id"),)
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    object_type = Column(String(24), nullable=False)
    object_id = Column(String(36), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class ReviewUsefulness(Base):
    __tablename__ = "review_usefulness"
    __table_args__ = (UniqueConstraint("review_post_id", "user_id"),)
    review_post_id = Column(String(36), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    useful = Column(Boolean, nullable=False)
    agrees = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class MusicList(Base):
    __tablename__ = "music_lists"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, default="")
    visibility = Column(String(20), default="public", nullable=False)
    ranked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class MusicListItem(Base):
    __tablename__ = "music_list_items"
    __table_args__ = (UniqueConstraint("list_id", "position"),)
    id = Column(String(36), primary_key=True, default=gen_uuid)
    list_id = Column(String(36), ForeignKey("music_lists.id", ondelete="CASCADE"), nullable=False)
    subject_type = Column(String(32), nullable=False)
    title = Column(String(180), nullable=False)
    artist = Column(String(180), default="")
    note = Column(String(500), default="")
    position = Column(Integer, nullable=False)

class DiaryEntry(Base):
    __tablename__ = "diary_entries"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_type = Column(String(32), nullable=False)
    title = Column(String(180), nullable=False)
    artist = Column(String(180), default="")
    listened_on = Column(Date, nullable=False)
    score = Column(Float, nullable=True)
    private_note = Column(Text, default="")
    provider = Column(String(32), default="manual")
    provider_item_id = Column(String(300), default="")
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class FeedImpression(Base):
    __tablename__ = "feed_impressions"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(String(36), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    feed = Column(String(24), nullable=False)
    rank = Column(Integer, nullable=False)
    reason = Column(JSON, nullable=False)
    shown_at = Column(DateTime(timezone=True), default=utcnow)
    opened = Column(Boolean, default=False, nullable=False)
    played = Column(Boolean, default=False, nullable=False)
    replied = Column(Boolean, default=False, nullable=False)
    saved = Column(Boolean, default=False, nullable=False)
    tethered = Column(Boolean, default=False, nullable=False)

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    conversation_type = Column(String(20), default="direct", nullable=False)
    dating_match_id = Column(String(36), ForeignKey("dating_matches.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class ConversationMember(Base):
    __tablename__ = "conversation_members"
    __table_args__ = (UniqueConstraint("conversation_id", "user_id"),)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    joined_at = Column(DateTime(timezone=True), default=utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body = Column(Text, nullable=False)
    music_object = Column(JSON, nullable=True)
    moderation_state = Column(String(20), default="visible", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
