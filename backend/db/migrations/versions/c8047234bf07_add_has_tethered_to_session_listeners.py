"""add has_tethered to session_listeners

Revision ID: c8047234bf07
Revises: 1787f2cb2a8e
Create Date: 2026-06-08 16:55:02.224277

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8047234bf07'
down_revision: Union[str, Sequence[str], None] = '1787f2cb2a8e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('session_listeners', sa.Column('has_tethered', sa.Boolean(), nullable=True))
    op.execute("UPDATE session_listeners SET has_tethered = 0")

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('session_listeners', 'has_tethered')
