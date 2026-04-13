"""add_applications_table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-12 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'applications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('invoice_id', sa.UUID(), nullable=False),
        sa.Column('freelancer_id', sa.UUID(), nullable=False),
        sa.Column('proposal_text', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum(
            'pending', 'accepted', 'rejected',
            name='applicationstatus'
        ), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id']),
        sa.ForeignKeyConstraint(['freelancer_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    # Unique constraint: one application per freelancer per invoice
    op.create_unique_constraint(
        'uq_application_freelancer_invoice',
        'applications',
        ['invoice_id', 'freelancer_id'],
    )


def downgrade() -> None:
    op.drop_table('applications')
    op.execute("DROP TYPE IF EXISTS applicationstatus")
