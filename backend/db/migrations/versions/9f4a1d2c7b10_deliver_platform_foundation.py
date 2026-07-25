"""Deliver audit platform foundation.

Revision ID: 9f4a1d2c7b10
Revises: 8e2a4d7c19b0
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

from db.database import Base
import models.models  # noqa: F401
import models.session_models  # noqa: F401
import models.safety_models  # noqa: F401
import models.profile_models  # noqa: F401
import models.culture_models  # noqa: F401
import models.taste_models  # noqa: F401

revision: str = "9f4a1d2c7b10"
down_revision: str | Sequence[str] | None = "8e2a4d7c19b0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW_TABLES = [
    "provider_accounts", "session_events", "sync_measurements", "knocks",
    "user_blocks", "user_mutes", "user_reports", "content_reports",
    "moderation_cases", "moderation_actions", "public_profiles",
    "profile_fields", "media_assets", "profile_media", "private_albums",
    "private_album_grants", "dating_profiles", "dating_preferences",
    "swipe_decisions", "song_signals", "dating_matches", "dating_exposures",
    "communities", "community_memberships", "profile_stickers", "posts",
    "reviews", "ratings", "comments", "reactions", "votes", "saves",
    "review_usefulness", "music_lists", "music_list_items", "diary_entries",
    "feed_impressions", "listen_events", "user_track_aggregates",
    "user_artist_aggregates", "taste_embeddings", "recommendation_exposures",
    "recommendation_outcomes", "product_events", "conversations",
    "conversation_members", "messages",
]


def _columns(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def _add_column(table: str, column: sa.Column) -> None:
    if column.name not in _columns(table):
        with op.batch_alter_table(table) as batch:
            batch.add_column(column)


def upgrade() -> None:
    _add_column("friendships", sa.Column("muted_a", sa.Boolean(), nullable=False, server_default=sa.false()))
    _add_column("friendships", sa.Column("muted_b", sa.Boolean(), nullable=False, server_default=sa.false()))
    _add_column("friendships", sa.Column("severed_by", sa.String(length=36), nullable=True))
    _add_column("sessions", sa.Column("status", sa.String(length=16), nullable=False, server_default="active"))
    _add_column("sessions", sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True))
    _add_column("session_listeners", sa.Column("left_at", sa.DateTime(timezone=True), nullable=True))
    _add_column("session_listeners", sa.Column("relational_action", sa.Boolean(), nullable=False, server_default=sa.false()))
    _add_column("memory_anchors", sa.Column("session_id", sa.String(length=36), nullable=True))
    _add_column("memory_anchors", sa.Column("meaningful_session_verified", sa.Boolean(), nullable=False, server_default=sa.false()))

    bind = op.get_bind()
    for name in NEW_TABLES:
        Base.metadata.tables[name].create(bind=bind, checkfirst=True)

    inspector = sa.inspect(bind)
    if "blocks" in inspector.get_table_names():
        # Best-effort conversion from legacy contact-data blocks.
        bind.execute(sa.text("""
            INSERT INTO user_blocks (id, blocker_id, blocked_user_id, reason, created_at)
            SELECT b.id, b.blocker_id, u.id, 'migrated_from_phone_block', b.created_at
            FROM blocks b
            JOIN users u ON u.phone_number = b.blocked_phone_number
            WHERE NOT EXISTS (
                SELECT 1 FROM user_blocks ub
                WHERE ub.blocker_id = b.blocker_id AND ub.blocked_user_id = u.id
            )
        """))


def downgrade() -> None:
    bind = op.get_bind()
    for name in reversed(NEW_TABLES):
        Base.metadata.tables[name].drop(bind=bind, checkfirst=True)
    for table, column in [
        ("memory_anchors", "meaningful_session_verified"),
        ("memory_anchors", "session_id"),
        ("session_listeners", "relational_action"),
        ("session_listeners", "left_at"),
        ("sessions", "ended_at"),
        ("sessions", "status"),
        ("friendships", "severed_by"),
        ("friendships", "muted_b"),
        ("friendships", "muted_a"),
    ]:
        if column in _columns(table):
            with op.batch_alter_table(table) as batch:
                batch.drop_column(column)
