"""create events table

Revision ID: 001_create_events_table
Revises: 
Create Date: 2026-09-06 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_create_events_table'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Dialect-specific JSON/JSONB type
    json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")

    op.create_table(
        'events',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), "sqlite"), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('event_id', sa.String(length=36), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('detected_format', sa.String(length=32), nullable=False),
        sa.Column('source_ip', sa.String(length=64), nullable=True),
        sa.Column('destination_ip', sa.String(length=64), nullable=True),
        sa.Column('source_port', sa.Integer(), nullable=True),
        sa.Column('destination_port', sa.Integer(), nullable=True),
        sa.Column('protocol', sa.String(length=32), nullable=True),
        sa.Column('action', sa.String(length=64), nullable=True),
        sa.Column('severity', sa.String(length=32), nullable=True),
        sa.Column('raw_event', sa.Text(), nullable=False),
        sa.Column('normalized_event', json_type, nullable=True),
        sa.Column('additional_fields', json_type, nullable=True),
        sa.Column('sha256_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index('ix_events_event_id', 'events', ['event_id'], unique=True)
    op.create_index('ix_events_timestamp', 'events', ['timestamp'], unique=False)
    op.create_index('ix_events_detected_format', 'events', ['detected_format'], unique=False)
    op.create_index('ix_events_source_ip', 'events', ['source_ip'], unique=False)
    op.create_index('ix_events_destination_ip', 'events', ['destination_ip'], unique=False)
    op.create_index('ix_events_action', 'events', ['action'], unique=False)
    op.create_index('ix_events_severity', 'events', ['severity'], unique=False)
    op.create_index('ix_events_created_at', 'events', ['created_at'], unique=False)
    op.create_index('ix_events_timestamp_severity', 'events', ['timestamp', 'severity'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_events_timestamp_severity', table_name='events')
    op.drop_index('ix_events_created_at', table_name='events')
    op.drop_index('ix_events_severity', table_name='events')
    op.drop_index('ix_events_action', table_name='events')
    op.drop_index('ix_events_destination_ip', table_name='events')
    op.drop_index('ix_events_source_ip', table_name='events')
    op.drop_index('ix_events_detected_format', table_name='events')
    op.drop_index('ix_events_timestamp', table_name='events')
    op.drop_index('ix_events_event_id', table_name='events')
    op.drop_table('events')
