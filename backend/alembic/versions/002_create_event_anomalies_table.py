"""create event_anomalies table

Revision ID: 002_create_event_anomalies_table
Revises: 001_create_events_table
Create Date: 2026-09-12 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_create_event_anomalies_table'
down_revision: Union[str, None] = '001_create_events_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")

    op.create_table(
        'event_anomalies',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), "sqlite"), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('event_id', sa.String(length=36), nullable=False),
        sa.Column('anomaly_score', sa.Float(), nullable=False),
        sa.Column('classification', sa.String(length=32), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('model_name', sa.String(length=64), nullable=False),
        sa.Column('model_version', sa.String(length=32), nullable=False),
        sa.Column('features_snapshot', json_type, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index('ix_event_anomalies_event_id', 'event_anomalies', ['event_id'], unique=True)
    op.create_index('ix_event_anomalies_anomaly_score', 'event_anomalies', ['anomaly_score'], unique=False)
    op.create_index('ix_event_anomalies_classification', 'event_anomalies', ['classification'], unique=False)
    op.create_index('ix_anomalies_score_created', 'event_anomalies', ['anomaly_score', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_anomalies_score_created', table_name='event_anomalies')
    op.drop_index('ix_event_anomalies_classification', table_name='event_anomalies')
    op.drop_index('ix_event_anomalies_anomaly_score', table_name='event_anomalies')
    op.drop_index('ix_event_anomalies_event_id', table_name='event_anomalies')
    op.drop_table('event_anomalies')
