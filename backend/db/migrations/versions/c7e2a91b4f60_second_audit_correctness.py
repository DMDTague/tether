"""Second audit correctness constraints.

Revision ID: c7e2a91b4f60
Revises: 9f4a1d2c7b10
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "c7e2a91b4f60"
down_revision: str | Sequence[str] | None = "9f4a1d2c7b10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tap_tether_tokens",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("initiator_id", sa.String(length=36), nullable=False),
        sa.Column("target_id", sa.String(length=36), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consumed_by", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("initiator_id <> target_id", name="ck_tap_tether_distinct_accounts"),
        sa.ForeignKeyConstraint(["initiator_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["consumed_by"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("token_hash", name="uq_tap_tether_tokens_token_hash"),
    )
    op.create_index("ix_tap_tether_tokens_token_hash", "tap_tether_tokens", ["token_hash"], unique=True)
    op.create_index("ix_tap_tether_tokens_initiator_id", "tap_tether_tokens", ["initiator_id"])
    op.create_index("ix_tap_tether_tokens_target_id", "tap_tether_tokens", ["target_id"])
    op.create_index("ix_tap_tether_tokens_expires_at", "tap_tether_tokens", ["expires_at"])

    with op.batch_alter_table("product_events") as batch:
        batch.add_column(sa.Column("event_id", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("authority", sa.String(length=20), nullable=False, server_default="client_intent"))
        batch.add_column(sa.Column("journey_id", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("session_id", sa.String(length=36), nullable=True))
        batch.add_column(sa.Column("exposure_id", sa.String(length=64), nullable=True))

    op.execute(sa.text("UPDATE product_events SET event_id = id WHERE event_id IS NULL"))

    with op.batch_alter_table("product_events") as batch:
        batch.alter_column("event_id", existing_type=sa.String(length=64), nullable=False)
        batch.create_unique_constraint("uq_product_events_event_id", ["event_id"])
        batch.create_check_constraint(
            "ck_product_events_authority",
            "authority IN ('client_intent', 'server_outcome')",
        )
        batch.create_foreign_key(
            "fk_product_events_session_id_sessions",
            "sessions",
            ["session_id"],
            ["id"],
            ondelete="SET NULL",
        )
    op.create_index("ix_product_events_event_id", "product_events", ["event_id"], unique=True)
    op.create_index("ix_product_events_journey_id", "product_events", ["journey_id"])
    op.create_index("ix_product_events_session_id", "product_events", ["session_id"])
    op.create_index("ix_product_events_exposure_id", "product_events", ["exposure_id"])

    # Keep one historical row per owner/friend/session before enforcing the
    # invariant. This is deterministic and does not fabricate missing Anchors.
    op.execute(sa.text("""
        DELETE FROM memory_anchors
        WHERE session_id IS NOT NULL
          AND id NOT IN (
            SELECT MIN(id)
            FROM memory_anchors
            WHERE session_id IS NOT NULL
            GROUP BY session_id, user_id, friend_id
          )
    """))
    with op.batch_alter_table("memory_anchors") as batch:
        batch.create_unique_constraint(
            "uq_memory_anchor_session_owner_friend",
            ["session_id", "user_id", "friend_id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("memory_anchors") as batch:
        batch.drop_constraint("uq_memory_anchor_session_owner_friend", type_="unique")

    op.drop_index("ix_product_events_exposure_id", table_name="product_events")
    op.drop_index("ix_product_events_session_id", table_name="product_events")
    op.drop_index("ix_product_events_journey_id", table_name="product_events")
    op.drop_index("ix_product_events_event_id", table_name="product_events")
    with op.batch_alter_table("product_events") as batch:
        batch.drop_constraint("fk_product_events_session_id_sessions", type_="foreignkey")
        batch.drop_constraint("ck_product_events_authority", type_="check")
        batch.drop_constraint("uq_product_events_event_id", type_="unique")
        batch.drop_column("exposure_id")
        batch.drop_column("session_id")
        batch.drop_column("journey_id")
        batch.drop_column("authority")
        batch.drop_column("event_id")

    op.drop_index("ix_tap_tether_tokens_expires_at", table_name="tap_tether_tokens")
    op.drop_index("ix_tap_tether_tokens_target_id", table_name="tap_tether_tokens")
    op.drop_index("ix_tap_tether_tokens_initiator_id", table_name="tap_tether_tokens")
    op.drop_index("ix_tap_tether_tokens_token_hash", table_name="tap_tether_tokens")
    op.drop_table("tap_tether_tokens")
