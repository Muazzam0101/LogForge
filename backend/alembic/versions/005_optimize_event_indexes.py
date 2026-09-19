"""optimize event indexes for high-throughput queries and pagination

Revision ID: 005_optimize_event_indexes
Revises: 004_create_auth_rbac_audit_tables
Create Date: 2026-09-20 01:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '005_optimize_event_indexes'
down_revision: Union[str, None] = '004_create_auth_rbac_audit_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Composite index for newest-first pagination ordering
    try:
        op.create_index('ix_events_created_at_id', 'events', ['created_at', 'id'], unique=False)
    except Exception:
        pass

    # 2. Composite index for severity filtering + created_at ordering
    try:
        op.create_index('ix_events_severity_created_at', 'events', ['severity', 'created_at'], unique=False)
    except Exception:
        pass

    # 3. Composite index for action filtering + created_at ordering
    try:
        op.create_index('ix_events_action_created_at', 'events', ['action', 'created_at'], unique=False)
    except Exception:
        pass

    # 4. Composite index for source IP queries + created_at ordering
    try:
        op.create_index('ix_events_source_ip_created_at', 'events', ['source_ip', 'created_at'], unique=False)
    except Exception:
        pass

    # 5. Composite index for destination IP queries + created_at ordering
    try:
        op.create_index('ix_events_dest_ip_created_at', 'events', ['destination_ip', 'created_at'], unique=False)
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_index('ix_events_dest_ip_created_at', table_name='events')
    except Exception:
        pass
    try:
        op.drop_index('ix_events_source_ip_created_at', table_name='events')
    except Exception:
        pass
    try:
        op.drop_index('ix_events_action_created_at', table_name='events')
    except Exception:
        pass
    try:
        op.drop_index('ix_events_severity_created_at', table_name='events')
    except Exception:
        pass
    try:
        op.drop_index('ix_events_created_at_id', table_name='events')
    except Exception:
        pass
