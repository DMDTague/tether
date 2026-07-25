"""Core SQLAlchemy models for authentication and live Tether sessions."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from db.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    username = Column(String(32), unique=True, nullable=False, index=True)
    display_name = Column(String(64), nullable=False)
    initials = Column(String(3), nullable=False)
    password_hash = Column(String(255), nullable=False)
    privacy_mode = Column(String(16), default="knock-first")
    ad_free_until = Column(DateTime(timezone=True), default=utcnow)
    streaming_service = Column(String(16), nullable=True)
    has_premium = Column(Boolean, default=False)
    push_token = Column(String(255), nullable=True)
    phone_number = Column(String(32), unique=True, nullable=True, index=True)
    bio = Column(String(160), nullable=True)
    profile_picture_url = Column(String(255), nullable=True)
    top_artists = Column(JSON, nullable=True)
    is_onboarded = Column(Boolean, default=False)
    is_sparked = Column(Boolean, default=False)
    spark_token = Column(String(64), nullable=True)
    theme_colors = Column(JSON, nullable=True)
    expo_push_token = Column(String(255), nullable=True)
    backdrop_type = Column(String(32), default="auto_mesh")
    backdrop_url = Column(String(255), nullable=True)
    primary_vibe = Column(String(32), default="chill")
    skia_style = Column(String(32), default="mesh")
    skia_speed = Column(Float, default=1.0)
    # Deprecated matching input retained only for backwards compatibility.
    vibe_vector = Column(JSON, nullable=True)
    vibe_updated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class CanonicalTrack(Base):
    __tablename__ = "canonical_tracks"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    isrc = Column(String(16), unique=True, index=True, nullable=True)
    title = Column(String(256), nullable=False)
    artist = Column(String(256), nullable=False)
    album = Column(String(256), nullable=True)
    duration_ms = Column(Integer)
    explicit = Column(Boolean, default=False)
    artwork_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class ProviderTrackMatch(Base):
    __tablename__ = "provider_track_matches"
    __table_args__ = (UniqueConstraint("provider", "provider_track_id"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    canonical_track_id = Column(String(36), ForeignKey("canonical_tracks.id"), nullable=False)
    provider = Column(String(32), nullable=False)
    provider_track_id = Column(String(256), nullable=False, index=True)
    match_method = Column(String(32))
    confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    canonical_track = relationship("CanonicalTrack", foreign_keys=[canonical_track_id])


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (UniqueConstraint("user_a", "user_b"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_a = Column(String(36), ForeignKey("users.id"), nullable=False)
    user_b = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(16), default="pending")  # pending | accepted | severed
    muted_a = Column(Boolean, default=False, nullable=False)
    muted_b = Column(Boolean, default=False, nullable=False)
    transparent_presence_a = Column(Boolean, default=False)
    transparent_presence_b = Column(Boolean, default=False)
    severed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user_a_rel = relationship("User", foreign_keys=[user_a])
    user_b_rel = relationship("User", foreign_keys=[user_b])


class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "following_id"),)

    follower_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    following_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    follower = relationship("User", foreign_keys=[follower_id])
    following = relationship("User", foreign_keys=[following_id])


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    host_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    track_id = Column(String(64))
    track_name = Column(String(256))
    artist_name = Column(String(256))
    track_isrc = Column(String(16))
    track_duration_ms = Column(Integer)
    canonical_track_id = Column(String(36), ForeignKey("canonical_tracks.id"), nullable=True)
    provider = Column(String(32), nullable=True)
    provider_track_id = Column(String(256), nullable=True)
    track_start_epoch = Column(BigInteger)
    is_paused = Column(Boolean, default=False)
    pause_position_ms = Column(Integer)
    next_track_name = Column(String(256))
    status = Column(String(16), default="active", nullable=False, index=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    host = relationship("User", foreign_keys=[host_id])
    canonical_track = relationship("CanonicalTrack", foreign_keys=[canonical_track_id])
    listeners = relationship("SessionListener", back_populates="session", cascade="all, delete-orphan")


class SessionListener(Base):
    __tablename__ = "session_listeners"

    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), primary_key=True)
    joined_at = Column(DateTime(timezone=True), default=utcnow)
    left_at = Column(DateTime(timezone=True), nullable=True)
    has_tethered = Column(Boolean, default=False)
    relational_action = Column(Boolean, default=False, nullable=False)

    session = relationship("Session", back_populates="listeners")
    user = relationship("User")


class TetherJoinGrant(Base):
    __tablename__ = "tether_join_grants"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    host_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    listener_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(32), default="active")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    session = relationship("Session", foreign_keys=[session_id])
    host = relationship("User", foreign_keys=[host_id])
    listener = relationship("User", foreign_keys=[listener_id])


class MemoryAnchor(Base):
    __tablename__ = "memory_anchors"
    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "user_id",
            "friend_id",
            name="uq_memory_anchor_session_owner_friend",
        ),
    )

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    friend_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=True, index=True)
    track_name = Column(String(256), nullable=False)
    artist_name = Column(String(256), nullable=False)
    duration_minutes = Column(Integer)
    pulse_count = Column(Integer, default=0)
    mood_tag = Column(String(32))
    city_a = Column(String(128))
    city_b = Column(String(128))
    session_date = Column(DateTime(timezone=True), nullable=False)
    last_tethered_at = Column(DateTime(timezone=True), default=utcnow)
    health = Column(Float, default=100.0)
    meaningful_session_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", foreign_keys=[user_id])
    friend = relationship("User", foreign_keys=[friend_id])


class TimeCapsule(Base):
    __tablename__ = "time_capsules"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    recipient_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    track_name = Column(String(256), nullable=False)
    artist_name = Column(String(256), nullable=False)
    track_id = Column(String(64))
    start_position_ms = Column(Integer, nullable=False)
    lock_type = Column(String(16))
    lock_value = Column(String(255), nullable=True)
    is_opened = Column(Boolean, default=False)
    unlocked_notified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])


class Sesh(Base):
    __tablename__ = "past_sessions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=True)
    caption = Column(String(500), nullable=True)
    tracks = Column(JSON, nullable=False)
    status = Column(String(16), default="pending", nullable=False, index=True)
    publish_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", foreign_keys=[user_id])


class Block(Base):
    """Legacy phone-number block retained only for migration compatibility."""

    __tablename__ = "blocks"
    __table_args__ = (UniqueConstraint("blocker_id", "blocked_phone_number"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    blocker_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    blocked_phone_number = Column(String(32), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    blocker = relationship("User", foreign_keys=[blocker_id])
