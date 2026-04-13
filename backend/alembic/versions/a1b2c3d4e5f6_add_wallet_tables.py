"""add_wallet_tables

Revision ID: a1b2c3d4e5f6
Revises: 4d7e8bb217ab
Create Date: 2026-04-12 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '4d7e8bb217ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'wallets',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('balance', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('escrow_balance', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )

    op.create_table(
        'wallet_transactions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('wallet_id', sa.UUID(), nullable=False),
        sa.Column('transaction_type', sa.Enum(
            'deposit', 'escrow_lock', 'release', 'refund',
            name='wallettransactiontype'
        ), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('invoice_id', sa.UUID(), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('status', sa.Enum(
            'completed', 'pending', 'failed',
            name='wallettransactionstatus'
        ), nullable=False, server_default='completed'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['wallet_id'], ['wallets.id']),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('wallet_transactions')
    op.drop_table('wallets')
    op.execute("DROP TYPE IF EXISTS wallettransactiontype")
    op.execute("DROP TYPE IF EXISTS wallettransactionstatus")
