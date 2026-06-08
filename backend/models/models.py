"""
Tether SQLAlchemy Models

All database models for the Tether backend:
- User (profiles + auth)
- Friendship (bidirectional connections)
- Session (active listening sessions)
- SessionListener (session membership)
- MemoryAnchor (completed session artifacts)
- TimeCapsule (async tethers with env locks)
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, Integer, BigInteger, DateTime,
    ForeignKey, UniqueConstraint, Text, JSON, Float
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
    privacy_mode = Column(String(16), default="knock-first")  # open-door | knock-first | ghost
    ad_free_until = Column(DateTime(timezone=True), default=utcnow)  # Tollbooth ad pass expiration
    streaming_service = Column(String(16), nullable=True)  # 'spotify' | 'apple' | NULL
    has_premium = Column(Boolean, default=False)  # True if user has a premium streaming subscription
    push_token = Column(String(255), nullable=True)  # Expo Push Token
    phone_number = Column(String(32), unique=True, nullable=True, index=True)
    bio = Column(String(160), nullable=True)
    profile_picture_url = Column(String(255), nullable=True)
    top_artists = Column(JSON, nullable=True)
    is_onboarded = Column(Boolean, default=False)
    is_sparked = Column(Boolean, default=False)
    spark_token = Column(String(64), nullable=True)
    theme_colors = Column(JSON, nullable=True)
    expo_push_token = Column(String(255), nullable=True)
    backdrop_type = Column(String(32), default="auto_mesh") # auto_gradient | auto_mesh | custom_upload
    backdrop_url = Column(String(255), nullable=True)
    primary_vibe = Column(String(32), default="chill") # EDM, Lo-Fi, Pop, Rock, chill
    skia_style = Column(String(32), default="mesh") # aura | waves | mesh
    skia_speed = Column(Float, default=1.0)
    # Spotify Audio Features vector [valence, energy, danceability, acousticness]
    vibe_vector = Column(JSON, nullable=True)  # e.g. [0.3, 0.7, 0.5, 0.8]
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
    provider = Column(String(32), nullable=False)  # e.g., 'spotify', 'apple_music'
    provider_track_id = Column(String(256), nullable=False, index=True)
    match_method = Column(String(32))  # 'isrc' | 'title_artist_duration' | 'manual'
    confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    canonical_track = relationship("CanonicalTrack", foreign_keys=[canonical_track_id])


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (UniqueConstraint("user_a", "user_b"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_a = Column(String(36), ForeignKey("users.id"), nullable=False)
    user_b = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(16), default="pending")  # pending | accepted | severed | muted_by_a | muted_by_b
    transparent_presence_a = Column(Boolean, default=False)
    transparent_presence_b = Column(Boolean, default=False)
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
    
    # --- Legacy / Spotify Fields (Do not remove yet to avoid breaking Phase 1) ---
    track_id = Column(String(64))
    track_name = Column(String(256))
    artist_name = Column(String(256))
    track_isrc = Column(String(16))
    track_duration_ms = Column(Integer)
    
    # --- New Canonical Identity Fields ---
    canonical_track_id = Column(String(36), ForeignKey("canonical_tracks.id"), nullable=True)
    provider = Column(String(32), nullable=True)
    provider_track_id = Column(String(256), nullable=True)
    
    # --- State Fields ---
    track_start_epoch = Column(BigInteger)  # ms since epoch when track started
    is_paused = Column(Boolean, default=False)
    pause_position_ms = Column(Integer)
    next_track_name = Column(String(256))
    created_at = Column(DateTime(timezone=True), default=utcnow)

    host = relationship("User", foreign_keys=[host_id])
    canonical_track = relationship("CanonicalTrack", foreign_keys=[canonical_track_id])
    listeners = relationship("SessionListener", back_populates="session", cascade="all, delete-orphan")


class SessionListener(Base):
    __tablename__ = "session_listeners"

    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), primary_key=True)
    joined_at = Column(DateTime(timezone=True), default=utcnow)
    has_tethered = Column(Boolean, default=False)

    session = relationship("Session", back_populates="listeners")
    user = relationship("User")


class TetherJoinGrant(Base):
    __tablename__ = "tether_join_grants"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    host_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    listener_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(32), default="active")  # active, consumed, expired, revoked
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    session = relationship("Session", foreign_keys=[session_id])
    host = relationship("User", foreign_keys=[host_id])
    listener = relationship("User", foreign_keys=[listener_id])


class MemoryAnchor(Base):
    __tablename__ = "memory_anchors"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    friend_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    track_name = Column(String(256), nullable=False)
    artist_name = Column(String(256), nullable=False)
    duration_minutes = Column(Integer)
    pulse_count = Column(Integer, default=0)
    mood_tag = Column(String(32))  # nostalgic | heavy | calm | discovery | night-drive
    city_a = Column(String(128))
    city_b = Column(String(128))
    session_date = Column(DateTime(timezone=True), nullable=False)
    last_tethered_at = Column(DateTime(timezone=True), default=utcnow)
    health = Column(Float, default=100.0)
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
    lock_type = Column(String(16))  # NULL | midnight | rain | date
    lock_value = Column(String(255), nullable=True) # E.g., 'raining', 'midnight', '2025-01-01'
    is_opened = Column(Boolean, default=False)
    unlocked_notified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])

class Sesh(Base):
    __tablename__ = "past_sessions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=True)  # AI Vibe Title
    caption = Column(String(500), nullable=True)  # AI Caption
    tracks = Column(JSON, nullable=False)
    # active → ended live session; pending → awaiting AI; published → on profile
    status = Column(String(16), default="pending", nullable=False, index=True)
    publish_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", foreign_keys=[user_id])


class Block(Base):
    __tablename__ = "blocks"
    __table_args__ = (UniqueConstraint("blocker_id", "blocked_phone_number"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    blocker_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    blocked_phone_number = Column(String(32), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    blocker = relationship("User", foreign_keys=[blocker_id])
