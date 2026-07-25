"""Durable platform models extracted from the Tether architecture audit."""

from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime, Float, ForeignKey, Index,
    Integer, JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from models.models import gen_uuid, utcnow
from db.database import Base


class ListenEvent(Base):
    __tablename__ = "listen_events"
    __table_args__ = (Index("ix_listen_events_user_time", "user_id", "occurred_at"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    canonical_track_id = Column(String(36), ForeignKey("canonical_tracks.id"), nullable=True)
    provider = Column(String(32), nullable=False)
    provider_track_id = Column(String(256), nullable=False)
    event_type = Column(String(24), nullable=False)
    progress_ms = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    source = Column(String(24), default="observed", nullable=False)
    occurred_at = Column(DateTime(timezone=True), default=utcnow)

class UserTrackAggregate(Base):
    __tablename__ = "user_track_aggregates"
    __table_args__ = (UniqueConstraint("user_id", "canonical_track_id"),)

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    canonical_track_id = Column(String(36), ForeignKey("canonical_tracks.id", ondelete="CASCADE"), primary_key=True)
    play_count = Column(Integer, default=0, nullable=False)
    completion_count = Column(Integer, default=0, nullable=False)
    skip_count = Column(Integer, default=0, nullable=False)
    save_count = Column(Integer, default=0, nullable=False)
    tether_count = Column(Integer, default=0, nullable=False)
    last_played_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class UserArtistAggregate(Base):
    __tablename__ = "user_artist_aggregates"
    __table_args__ = (UniqueConstraint("user_id", "artist_key"),)

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    artist_key = Column(String(256), primary_key=True)
    artist_name = Column(String(256), nullable=False)
    play_count = Column(Integer, default=0, nullable=False)
    completion_count = Column(Integer, default=0, nullable=False)
    save_count = Column(Integer, default=0, nullable=False)
    tether_count = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class TasteEmbedding(Base):
    __tablename__ = "taste_embeddings"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    model_version = Column(String(40), primary_key=True)
    vector = Column(JSON, nullable=False)
    evidence_count = Column(Integer, default=0, nullable=False)
    generated_at = Column(DateTime(timezone=True), default=utcnow)

class RecommendationExposure(Base):
    __tablename__ = "recommendation_exposures"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    object_type = Column(String(24), nullable=False)
    object_id = Column(String(128), nullable=False)
    surface = Column(String(24), nullable=False)
    provenance = Column(String(24), nullable=False)
    confidence = Column(Float, nullable=False)
    explanation = Column(JSON, nullable=False)
    no_observed_listen = Column(Boolean, default=False, nullable=False)
    shown_at = Column(DateTime(timezone=True), default=utcnow)

class RecommendationOutcome(Base):
    __tablename__ = "recommendation_outcomes"
    __table_args__ = (UniqueConstraint("exposure_id", "outcome_type"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    exposure_id = Column(String(36), ForeignKey("recommendation_exposures.id", ondelete="CASCADE"), nullable=False)
    outcome_type = Column(String(24), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class ProductEvent(Base):
    __tablename__ = "product_events"
    __table_args__ = (Index("ix_product_events_name_occurred", "event_name", "occurred_at"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_name = Column(String(64), nullable=False, index=True)
    schema_version = Column(Integer, default=1, nullable=False)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    properties = Column(JSON, nullable=False, default=dict)
    received_at = Column(DateTime(timezone=True), default=utcnow)
