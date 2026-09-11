"""add enrollment, mpesa_transactions, and course progression columns

Revision ID: 0003_enrollment_payment
Revises: 0002_assessments
Create Date: 2025-08-20 00:00:00.000000

Purely additive migration:
- Adds price, order_index, prerequisite_id, max_retakes to courses table
- Creates enrollments table (full enrollment state machine)
- Creates mpesa_transactions table (Daraja payment records)

All new columns on courses are nullable or have server defaults, so
existing course rows are not affected and existing APIs continue to work.
"""
from alembic import op
import sqlalchemy as sa

revision = '0003_enrollment_payment'
down_revision = '0002_assessments'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Extend courses table ─────────────────────────────────────────────────
    op.add_column('courses', sa.Column('price',           sa.Float(),   nullable=False, server_default='0.0'))
    op.add_column('courses', sa.Column('order_index',     sa.Integer(), nullable=False, server_default='0'))
    op.add_column('courses', sa.Column('prerequisite_id', sa.String(),  nullable=True))
    op.add_column('courses', sa.Column('max_retakes',     sa.Integer(), nullable=False, server_default='3'))
    op.create_foreign_key(
        'fk_courses_prerequisite', 'courses', 'courses',
        ['prerequisite_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index('ix_courses_order_index', 'courses', ['order_index'])

    # ── enrollments ──────────────────────────────────────────────────────────
    op.create_table(
        'enrollments',
        sa.Column('id',              sa.String(),  primary_key=True),
        sa.Column('user_id',         sa.String(),  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('course_id',       sa.String(),  sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status',          sa.String(30), nullable=False, server_default='payment_pending'),
        sa.Column('attempt_count',   sa.Integer(), nullable=False, server_default='1'),
        sa.Column('max_retakes',     sa.Integer(), nullable=False, server_default='3'),
        sa.Column('final_score_pct', sa.Float(),   nullable=True),
        sa.Column('passed',          sa.Boolean(), nullable=True),
        sa.Column('amount_paid',     sa.Float(),   nullable=False, server_default='0.0'),
        sa.Column('enrolled_at',     sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at',    sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at',      sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at',      sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_enrollments_user_id',   'enrollments', ['user_id'])
    op.create_index('ix_enrollments_course_id', 'enrollments', ['course_id'])
    op.create_index('ix_enrollments_status',    'enrollments', ['status'])
    op.create_index('ix_enrollments_user_course', 'enrollments', ['user_id', 'course_id'])

    # ── mpesa_transactions ───────────────────────────────────────────────────
    op.create_table(
        'mpesa_transactions',
        sa.Column('id',                   sa.String(),  primary_key=True),
        sa.Column('enrollment_id',        sa.String(),  sa.ForeignKey('enrollments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id',              sa.String(),  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('course_id',            sa.String(),  sa.ForeignKey('courses.id', ondelete='SET NULL'), nullable=True),
        sa.Column('checkout_request_id',  sa.String(100), nullable=True, unique=True),
        sa.Column('merchant_request_id',  sa.String(100), nullable=True),
        sa.Column('mpesa_receipt_number', sa.String(50),  nullable=True, unique=True),
        sa.Column('phone_number',         sa.String(20),  nullable=True),
        sa.Column('amount',               sa.Float(),     nullable=False, server_default='0.0'),
        sa.Column('status',               sa.String(20),  nullable=False, server_default='pending'),
        sa.Column('result_code',          sa.Integer(),   nullable=True),
        sa.Column('result_description',   sa.Text(),      nullable=True),
        sa.Column('initiated_at',         sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at',         sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_mpesa_enrollment_id', 'mpesa_transactions', ['enrollment_id'])
    op.create_index('ix_mpesa_checkout_id',   'mpesa_transactions', ['checkout_request_id'])


def downgrade() -> None:
    op.drop_table('mpesa_transactions')
    op.drop_table('enrollments')
    op.drop_constraint('fk_courses_prerequisite', 'courses', type_='foreignkey')
    op.drop_index('ix_courses_order_index', 'courses')
    op.drop_column('courses', 'max_retakes')
    op.drop_column('courses', 'prerequisite_id')
    op.drop_column('courses', 'order_index')
    op.drop_column('courses', 'price')
