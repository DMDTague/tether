"""Durable platform models extracted from the Tether architecture audit."""

from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime, Float, ForeignKey, Index,
    Integer, JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from models.models import gen_uuid, utcnow
from db.database import Base


class PublicProfile(Base):
    __tablename__ = "public_profiles"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    statement = Column(String(240), default="")
    palette = Column(JSON, nullable=True)
    motion = Column(String(32), default="liquid-signal")
    top_five = Column(JSON, nullable=True)
    pronouns = Column(String(80), nullable=True)
    hometown = Column(String(120), nullable=True)
    work = Column(String(160), nullable=True)
    school = Column(String(160), nullable=True)
    concert_habits = Column(Text, nullable=True)
    favorite_venues = Column(JSON, nullable=True)
    completeness = Column(Float, default=0.0, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class ProfileField(Base):
    __tablename__ = "profile_fields"
    __table_args__ = (UniqueConstraint("user_id", "field_key"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    field_key = Column(String(64), nullable=False)
    value = Column(JSON, nullable=True)
    provenance = Column(String(24), default="self_declared", nullable=False)
    visibility = Column(String(24), default="public", nullable=False)
    use_for_filtering = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    storage_key = Column(String(512), nullable=False, unique=True)
    mime_type = Column(String(100), nullable=False)
    byte_size = Column(BigInteger, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    moderation_state = Column(String(24), default="pending", nullable=False)
    metadata_stripped = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class ProfileMedia(Base):
    __tablename__ = "profile_media"
    __table_args__ = (UniqueConstraint("user_id", "position"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    media_id = Column(String(36), ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, nullable=False)
    visibility = Column(String(24), default="public", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class PrivateAlbum(Base):
    __tablename__ = "private_albums"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    media_ids = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class PrivateAlbumGrant(Base):
    __tablename__ = "private_album_grants"
    __table_args__ = (UniqueConstraint("album_id", "grantee_id"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    album_id = Column(String(36), ForeignKey("private_albums.id", ondelete="CASCADE"), nullable=False)
    grantee_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    granted_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class DatingProfile(Base):
    __tablename__ = "dating_profiles"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    enabled = Column(Boolean, default=False, nullable=False)
    visible = Column(Boolean, default=False, nullable=False)
    first_name = Column(String(64), default="")
    date_of_birth = Column(Date, nullable=True)
    adult_verified_at = Column(DateTime(timezone=True), nullable=True)
    gender_identity = Column(String(120), default="")
    show_me = Column(JSON, default=list, nullable=False)
    orientations = Column(JSON, default=list, nullable=False)
    intent = Column(String(120), default="")
    relationship_structure = Column(String(120), default="")
    bio = Column(Text, default="")
    prompt = Column(String(180), default="")
    prompt_answer = Column(String(500), default="")
    city = Column(String(120), default="")
    location_consent = Column(Boolean, default=False, nullable=False)
    safety_acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    completion = Column(Float, default=0.0, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class DatingPreference(Base):
    __tablename__ = "dating_preferences"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    age_min = Column(Integer, default=18, nullable=False)
    age_max = Column(Integer, default=99, nullable=False)
    proximity_bands = Column(JSON, default=lambda: ["very_nearby", "nearby", "city", "region"], nullable=False)
    intents = Column(JSON, default=list, nullable=False)
    identities = Column(JSON, default=list, nullable=False)
    orientations = Column(JSON, default=list, nullable=False)
    relationship_structures = Column(JSON, default=list, nullable=False)
    communities = Column(JSON, default=list, nullable=False)
    genres = Column(JSON, default=list, nullable=False)
    body_filters = Column(JSON, default=dict, nullable=False)
    dealbreakers = Column(JSON, default=dict, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class SwipeDecision(Base):
    __tablename__ = "swipe_decisions"
    __table_args__ = (UniqueConstraint("actor_id", "target_id"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    decision = Column(String(20), nullable=False)
    reason = Column(String(32), nullable=True)
    undo_until = Column(DateTime(timezone=True), nullable=True)
    resurface_after = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class SongSignal(Base):
    __tablename__ = "song_signals"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    canonical_track_id = Column(String(36), ForeignKey("canonical_tracks.id"), nullable=True)
    provider = Column(String(32), nullable=True)
    provider_track_id = Column(String(256), nullable=True)
    message = Column(String(500), default="")
    created_at = Column(DateTime(timezone=True), default=utcnow)

class DatingMatch(Base):
    __tablename__ = "dating_matches"
    __table_args__ = (UniqueConstraint("user_a", "user_b"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_a = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_b = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="active", nullable=False)
    matched_at = Column(DateTime(timezone=True), default=utcnow)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    ended_by = Column(String(36), ForeignKey("users.id"), nullable=True)

class DatingExposure(Base):
    __tablename__ = "dating_exposures"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    viewer_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    proximity_band = Column(String(24), nullable=True)
    explanation = Column(JSON, nullable=False)
    shown_at = Column(DateTime(timezone=True), default=utcnow)
    profile_opened = Column(Boolean, default=False, nullable=False)

class Community(Base):
    __tablename__ = "communities"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    slug = Column(String(80), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    description = Column(Text, default="")
    category = Column(String(40), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class CommunityMembership(Base):
    __tablename__ = "community_memberships"
    __table_args__ = (UniqueConstraint("community_id", "user_id"),)

    community_id = Column(String(36), ForeignKey("communities.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(20), default="member", nullable=False)
    pinned = Column(Boolean, default=False, nullable=False)
    joined_at = Column(DateTime(timezone=True), default=utcnow)

class ProfileSticker(Base):
    __tablename__ = "profile_stickers"
    __table_args__ = (UniqueConstraint("user_id", "community_id"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    community_id = Column(String(36), ForeignKey("communities.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
