"""Coarsen persisted geofence capsule targets.

Revision ID: 8e2a4d7c19b0
Revises: c8047234bf07
"""

from collections.abc import Sequence
import json
import math

from alembic import op
import sqlalchemy as sa


revision: str = "8e2a4d7c19b0"
down_revision: str | Sequence[str] | None = "c8047234bf07"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CELL_DEGREES = 0.1


def upgrade() -> None:
    connection = op.get_bind()
    capsules = sa.table(
        "time_capsules",
        sa.column("id", sa.String()),
        sa.column("lock_type", sa.String()),
        sa.column("lock_value", sa.String()),
    )
    rows = connection.execute(
        sa.select(capsules.c.id, capsules.c.lock_value).where(capsules.c.lock_type == "geofence")
    ).all()
    for capsule_id, lock_value in rows:
        try:
            params = json.loads(lock_value)
            lat = float(params["lat"])
            lon = float(params["lon"])
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                continue
            coarse = json.dumps(
                {
                    "cell": [math.floor(lat / CELL_DEGREES), math.floor(lon / CELL_DEGREES)],
                    "precision": CELL_DEGREES,
                    "radiusM": max(int(params.get("radius_m", 500)), 0),
                },
                separators=(",", ":"),
            )
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            continue
        connection.execute(
            capsules.update().where(capsules.c.id == capsule_id).values(lock_value=coarse)
        )


def downgrade() -> None:
    # Exact coordinates cannot and should not be reconstructed.
    pass
