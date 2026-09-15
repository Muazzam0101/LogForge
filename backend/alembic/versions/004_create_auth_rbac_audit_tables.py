"""create auth, rbac, and audit tables

Revision ID: 004_create_auth_rbac_audit_tables
Revises: 003_create_event_integrity_tables
Create Date: 2026-09-16 02:00:00.000000

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = '004_create_auth_rbac_audit_tables'
down_revision: Union[str, None] = '003_create_event_integrity_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

JsonType = sa.JSON().with_variant(JSONB, "postgresql")


def upgrade() -> None:
    # 1. Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=64), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=128), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('1'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    op.create_index('ix_users_is_active', 'users', ['is_active'], unique=False)

    # 2. Create roles table
    op.create_table(
        'roles',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
    )
    op.create_index('ix_roles_name', 'roles', ['name'], unique=True)

    # 3. Create permissions table
    op.create_table(
        'permissions',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
    )
    op.create_index('ix_permissions_name', 'permissions', ['name'], unique=True)

    # 4. Create user_roles association table
    op.create_table(
        'user_roles',
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True, nullable=False),
        sa.Column('role_id', sa.String(length=36), sa.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True, nullable=False),
    )

    # 5. Create role_permissions association table
    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.String(length=36), sa.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True, nullable=False),
        sa.Column('permission_id', sa.String(length=36), sa.ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True, nullable=False),
    )

    # 6. Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('username', sa.String(length=64), nullable=True),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('resource_type', sa.String(length=64), nullable=False),
        sa.Column('resource_id', sa.String(length=255), nullable=True),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=32), server_default='SUCCESS', nullable=False),
        sa.Column('details', JsonType, nullable=True),
    )
    op.create_index('ix_audit_logs_timestamp', 'audit_logs', ['timestamp'], unique=False)
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'], unique=False)
    op.create_index('ix_audit_logs_username', 'audit_logs', ['username'], unique=False)
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'], unique=False)
    op.create_index('ix_audit_logs_resource_type', 'audit_logs', ['resource_type'], unique=False)
    op.create_index('ix_audit_logs_status', 'audit_logs', ['status'], unique=False)
    op.create_index('idx_audit_logs_action_timestamp', 'audit_logs', ['action', 'timestamp'])
    op.create_index('idx_audit_logs_user_timestamp', 'audit_logs', ['user_id', 'timestamp'])
    op.create_index('idx_audit_logs_resource', 'audit_logs', ['resource_type', 'resource_id'])

    # 7. Seed Initial Permissions & Roles
    permissions_meta = [
        ("logs:read", "View raw and normalized security logs"),
        ("logs:ingest", "Submit and stream raw logs into ingestion pipeline"),
        ("logs:search", "Search and query logs via MySQL / OpenSearch"),
        ("analytics:read", "View security analytics and distribution dashboards"),
        ("anomalies:read", "View AI/ML anomaly detection results and scores"),
        ("integrity:read", "Inspect cryptographic SHA-256 hash chains and batch Merkle trees"),
        ("integrity:verify", "Trigger on-demand cryptographic hash and chain verification"),
        ("blockchain:read", "View blockchain anchoring receipts and transaction proofs"),
        ("blockchain:anchor", "Initiate on-chain cryptographic anchor transactions"),
        ("reports:read", "View system security summaries and analytical reports"),
        ("reports:create", "Generate ad-hoc analytical and compliance reports"),
        ("reports:export", "Export forensic event logs and integrity certificates"),
        ("users:read", "View user accounts and role assignments"),
        ("users:manage", "Create, update, and deactivate user accounts and roles"),
        ("settings:read", "View platform configuration and schema preferences"),
        ("settings:manage", "Modify framework retention, schemas, and system settings"),
        ("audit:read", "Inspect immutable security audit log trail"),
        ("system:health", "Monitor subsystem health, socket listeners, and Kafka brokers"),
        ("search:reindex", "Execute administrative reindexing into OpenSearch"),
    ]

    perm_id_map = {}
    for p_name, p_desc in permissions_meta:
        p_id = str(uuid.uuid4())
        perm_id_map[p_name] = p_id
        op.execute(
            sa.text("INSERT INTO permissions (id, name, description) VALUES (:id, :name, :desc)").bindparams(
                id=p_id, name=p_name, desc=p_desc
            )
        )

    roles_definition = {
        "ADMIN": {
            "desc": "System administrator with full administrative, security, and audit privileges",
            "perms": list(perm_id_map.keys()),  # All permissions
        },
        "ANALYST": {
            "desc": "Security analyst: investigate events, review anomalies, verify integrity",
            "perms": [
                "logs:read", "logs:search", "analytics:read", "anomalies:read",
                "integrity:read", "integrity:verify", "blockchain:read",
                "reports:read", "reports:create", "reports:export",
                "system:health", "settings:read",
            ],
        },
        "OPERATOR": {
            "desc": "SOC Operator: stream log ingestion, monitor pipelines, view events",
            "perms": [
                "logs:read", "logs:ingest", "logs:search",
                "analytics:read", "system:health", "settings:read",
            ],
        },
        "VIEWER": {
            "desc": "Read-only access: view dashboards, reports, and public system status",
            "perms": [
                "logs:read", "analytics:read", "reports:read", "system:health",
            ],
        },
    }

    for r_name, r_info in roles_definition.items():
        r_id = str(uuid.uuid4())
        op.execute(
            sa.text("INSERT INTO roles (id, name, description) VALUES (:id, :name, :desc)").bindparams(
                id=r_id, name=r_name, desc=r_info["desc"]
            )
        )
        for p_name in r_info["perms"]:
            p_id = perm_id_map[p_name]
            op.execute(
                sa.text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:rid, :pid)").bindparams(
                    rid=r_id, pid=p_id
                )
            )


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('role_permissions')
    op.drop_table('user_roles')
    op.drop_table('permissions')
    op.drop_table('roles')
    op.drop_table('users')
