"""Complete Dating profile, media, and exposure integrity.

Revision ID: e4d7b2a91c30
Revises: c7e2a91b4f60
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "e4d7b2a91c30"
down_revision: str | Sequence[str] | None = "c7e2a91b4f60"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    dating_columns = {
        column["name"] for column in sa.inspect(bind).get_columns("dating_profiles")
    }
    if "date_of_birth_declared" not in dating_columns:
        with op.batch_alter_table("dating_profiles") as batch:
            batch.add_column(sa.Column("date_of_birth_declared", sa.Date(), nullable=True))
            batch.add_column(
                sa.Column("adult_eligibility_calculated_at", sa.DateTime(timezone=True), nullable=True)
            )
            batch.add_column(sa.Column("age_verification_method", sa.String(length=32), nullable=True))
            batch.add_column(sa.Column("age_verification_provider", sa.String(length=64), nullable=True))
            batch.add_column(
                sa.Column(
                    "age_verification_status",
                    sa.String(length=24),
                    nullable=False,
                    server_default="not_verified",
                )
            )
            batch.add_column(sa.Column("age_verified_at", sa.DateTime(timezone=True), nullable=True))

        op.execute(
            sa.text(
                """
                UPDATE dating_profiles
                SET date_of_birth_declared = date_of_birth,
                    adult_eligibility_calculated_at = updated_at
                WHERE date_of_birth IS NOT NULL
                  AND date_of_birth_declared IS NULL
                """
            )
        )

    if "dating_profile_media" not in sa.inspect(bind).get_table_names():
        op.create_table(
            "dating_profile_media",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("media_id", sa.String(length=36), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["dating_profiles.user_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["media_id"], ["media_assets.id"], ondelete="CASCADE"),
            sa.UniqueConstraint("user_id", "media_id", name="uq_dating_profile_media_asset"),
            sa.UniqueConstraint("user_id", "position", name="uq_dating_profile_media_position"),
        )
        op.create_index("ix_dating_profile_media_user_id", "dating_profile_media", ["user_id"])

    exposure_columns = {
        column["name"] for column in sa.inspect(bind).get_columns("dating_exposures")
    }
    if "client_event_id" not in exposure_columns:
        with op.batch_alter_table("dating_exposures") as batch:
            batch.add_column(sa.Column("client_event_id", sa.String(length=64), nullable=True))
        op.execute(sa.text("UPDATE dating_exposures SET client_event_id = id WHERE client_event_id IS NULL"))
        with op.batch_alter_table("dating_exposures") as batch:
            batch.alter_column("client_event_id", existing_type=sa.String(length=64), nullable=False)
            batch.create_unique_constraint(
                "uq_dating_exposure_viewer_client_event",
                ["viewer_id", "client_event_id"],
            )


def downgrade() -> None:
    with op.batch_alter_table("dating_exposures") as batch:
        batch.drop_constraint("uq_dating_exposure_viewer_client_event", type_="unique")
        batch.drop_column("client_event_id")

    op.drop_index("ix_dating_profile_media_user_id", table_name="dating_profile_media")
    op.drop_table("dating_profile_media")

    with op.batch_alter_table("dating_profiles") as batch:
        batch.drop_column("age_verified_at")
        batch.drop_column("age_verification_status")
        batch.drop_column("age_verification_provider")
        batch.drop_column("age_verification_method")
        batch.drop_column("adult_eligibility_calculated_at")
        batch.drop_column("date_of_birth_declared")
