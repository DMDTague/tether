"""add sesh status and publish timestamps

Revision ID: a1b2c3d4e5f6
Revises: 36dd620005e8
Create Date: 2026-05-21

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '36dd620005e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('past_sessions', sa.Column('status', sa.String(length=16), server_default='pending', nullable=False))
    op.add_column('past_sessions', sa.Column('publish_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('past_sessions', sa.Column('published_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_past_sessions_status', 'past_sessions', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_past_sessions_status', table_name='past_sessions')
    op.drop_column('past_sessions', 'published_at')
    op.drop_column('past_sessions', 'publish_at')
    op.drop_column('past_sessions', 'status')
