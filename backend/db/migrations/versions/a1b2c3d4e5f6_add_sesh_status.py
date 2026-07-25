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
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'past_sessions' not in inspector.get_table_names():
        op.create_table(
            'past_sessions',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('user_id', sa.String(length=36), nullable=False),
            sa.Column('title', sa.String(length=255), nullable=True),
            sa.Column('caption', sa.String(length=500), nullable=True),
            sa.Column('tracks', sa.JSON(), nullable=False),
            sa.Column('status', sa.String(length=16), server_default='pending', nullable=False),
            sa.Column('publish_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        )
    else:
        columns = {column['name'] for column in inspector.get_columns('past_sessions')}
        with op.batch_alter_table('past_sessions') as batch:
            if 'status' not in columns:
                batch.add_column(sa.Column('status', sa.String(length=16), server_default='pending', nullable=False))
            if 'publish_at' not in columns:
                batch.add_column(sa.Column('publish_at', sa.DateTime(timezone=True), nullable=True))
            if 'published_at' not in columns:
                batch.add_column(sa.Column('published_at', sa.DateTime(timezone=True), nullable=True))
    indexes = {index['name'] for index in sa.inspect(bind).get_indexes('past_sessions')}
    if 'ix_past_sessions_status' not in indexes:
        op.create_index('ix_past_sessions_status', 'past_sessions', ['status'], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    if 'past_sessions' not in sa.inspect(bind).get_table_names():
        return
    indexes = {index['name'] for index in sa.inspect(bind).get_indexes('past_sessions')}
    if 'ix_past_sessions_status' in indexes:
        op.drop_index('ix_past_sessions_status', table_name='past_sessions')
    columns = {column['name'] for column in sa.inspect(bind).get_columns('past_sessions')}
    with op.batch_alter_table('past_sessions') as batch:
        for column in ('published_at', 'publish_at', 'status'):
            if column in columns:
                batch.drop_column(column)
