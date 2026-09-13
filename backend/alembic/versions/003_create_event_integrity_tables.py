"""create event_integrity and integrity_batches tables

Revision ID: 003_create_event_integrity_tables
Revises: 002_create_event_anomalies_table
Create Date: 2026-09-13 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003_create_event_integrity_tables'
down_revision: Union[str, None] = '002_create_event_anomalies_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create integrity_batches table
    op.create_table(
        'integrity_batches',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), "sqlite"), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('batch_id', sa.String(length=36), nullable=False),
        sa.Column('root_hash', sa.String(length=64), nullable=False),
        sa.Column('event_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='PENDING'),
        sa.Column('blockchain_status', sa.String(length=32), nullable=False, server_default='PENDING'),
        sa.Column('blockchain_tx_hash', sa.String(length=66), nullable=True),
        sa.Column('blockchain_network', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('anchored_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_integrity_batches_batch_id', 'integrity_batches', ['batch_id'], unique=True)
    op.create_index('ix_integrity_batches_root_hash', 'integrity_batches', ['root_hash'], unique=False)
    op.create_index('ix_integrity_batches_blockchain_status', 'integrity_batches', ['blockchain_status'], unique=False)

    # 2. Create event_integrity table
    op.create_table(
        'event_integrity',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), "sqlite"), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('event_id', sa.String(length=36), nullable=False),
        sa.Column('sha256_hash', sa.String(length=64), nullable=False),
        sa.Column('hash_algorithm', sa.String(length=16), nullable=False, server_default='SHA-256'),
        sa.Column('previous_hash', sa.String(length=64), nullable=True),
        sa.Column('chain_hash', sa.String(length=64), nullable=True),
        sa.Column('batch_id', sa.String(length=36), nullable=True),
        sa.Column('verification_status', sa.String(length=32), nullable=False, server_default='UNVERIFIED'),
        sa.Column('blockchain_status', sa.String(length=32), nullable=False, server_default='PENDING'),
        sa.Column('blockchain_tx_hash', sa.String(length=66), nullable=True),
        sa.Column('blockchain_network', sa.String(length=64), nullable=True),
        sa.Column('blockchain_anchor', sa.String(length=66), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['events.event_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['batch_id'], ['integrity_batches.batch_id'], ondelete='SET NULL'),
    )
    op.create_index('ix_event_integrity_event_id', 'event_integrity', ['event_id'], unique=True)
    op.create_index('ix_event_integrity_sha256_hash', 'event_integrity', ['sha256_hash'], unique=False)
    op.create_index('ix_event_integrity_created_at', 'event_integrity', ['created_at'], unique=False)
    op.create_index('ix_event_integrity_verification_status', 'event_integrity', ['verification_status'], unique=False)
    op.create_index('ix_event_integrity_blockchain_status', 'event_integrity', ['blockchain_status'], unique=False)
    op.create_index('ix_event_integrity_batch_id', 'event_integrity', ['batch_id'], unique=False)
    op.create_index('ix_event_integrity_verification_created', 'event_integrity', ['verification_status', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_event_integrity_verification_created', table_name='event_integrity')
    op.drop_index('ix_event_integrity_batch_id', table_name='event_integrity')
    op.drop_index('ix_event_integrity_blockchain_status', table_name='event_integrity')
    op.drop_index('ix_event_integrity_verification_status', table_name='event_integrity')
    op.drop_index('ix_event_integrity_created_at', table_name='event_integrity')
    op.drop_index('ix_event_integrity_sha256_hash', table_name='event_integrity')
    op.drop_index('ix_event_integrity_event_id', table_name='event_integrity')
    op.drop_table('event_integrity')

    op.drop_index('ix_integrity_batches_blockchain_status', table_name='integrity_batches')
    op.drop_index('ix_integrity_batches_root_hash', table_name='integrity_batches')
    op.drop_index('ix_integrity_batches_batch_id', table_name='integrity_batches')
    op.drop_table('integrity_batches')
