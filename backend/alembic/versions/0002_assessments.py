"""add quiz, assessment, certification, and progress tables

Revision ID: 0002_assessments
Revises: 0001_initial
Create Date: 2025-02-01 00:00:00.000000

This migration is purely additive — it creates new tables and adds
nullable columns to the existing `resources` table. No existing table
is dropped, renamed, or has a column removed, so all current
functionality continues to work unmodified.
"""
from alembic import op
import sqlalchemy as sa

revision = '0002_assessments'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Extend existing resources table (additive, nullable — safe) ───────
    op.add_column('resources', sa.Column('language', sa.String(30), nullable=True))
    op.add_column('resources', sa.Column('code_content', sa.Text(), nullable=True))
    op.add_column('resources', sa.Column('metadata_json', sa.JSON(), nullable=True))

    # ── quizzes ─────────────────────────────────────────────────────────────
    op.create_table(
        'quizzes',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('course_id', sa.String(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=True),
        sa.Column('module_id', sa.String(), sa.ForeignKey('modules.id', ondelete='CASCADE'), nullable=True),
        sa.Column('lesson_id', sa.String(), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('difficulty', sa.String(20), nullable=False, server_default='beginner'),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('opens_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closes_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('time_limit_minutes', sa.Integer(), nullable=True),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('passing_score_pct', sa.Float(), nullable=False, server_default='60.0'),
        sa.Column('total_marks', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('randomize_questions', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('randomize_answers', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_by', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_quizzes_course_id', 'quizzes', ['course_id'])
    op.create_index('ix_quizzes_status', 'quizzes', ['status'])

    # ── questions ───────────────────────────────────────────────────────────
    op.create_table(
        'questions',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('quiz_id', sa.String(), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(30), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('correct_answer', sa.JSON(), nullable=True),
        sa.Column('marks', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('partial_credit', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('negative_marking', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('requires_manual_grading', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('grading_rubric', sa.Text(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_questions_quiz_id', 'questions', ['quiz_id'])

    # ── quiz_attempts ───────────────────────────────────────────────────────
    op.create_table(
        'quiz_attempts',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('quiz_id', sa.String(), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('attempt_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', sa.String(20), nullable=False, server_default='in_progress'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('graded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('time_taken_seconds', sa.Integer(), nullable=True),
        sa.Column('auto_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('manual_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('total_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('max_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('percentage', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('passed', sa.Boolean(), nullable=True),
        sa.Column('question_order', sa.JSON(), nullable=True),
    )
    op.create_index('ix_quiz_attempts_quiz_user', 'quiz_attempts', ['quiz_id', 'user_id'])
    op.create_index('ix_quiz_attempts_status', 'quiz_attempts', ['status'])

    # ── question_responses ──────────────────────────────────────────────────
    op.create_table(
        'question_responses',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('attempt_id', sa.String(), sa.ForeignKey('quiz_attempts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question_id', sa.String(), sa.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('response_data', sa.JSON(), nullable=True),
        sa.Column('file_url', sa.Text(), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
        sa.Column('auto_marks_awarded', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_question_responses_attempt_id', 'question_responses', ['attempt_id'])

    # ── manual_grades ───────────────────────────────────────────────────────
    op.create_table(
        'manual_grades',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('response_id', sa.String(), sa.ForeignKey('question_responses.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('grader_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('marks_awarded', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('graded_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── certificate_templates ───────────────────────────────────────────────
    op.create_table(
        'certificate_templates',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('qualification_title', sa.String(255), nullable=False),
        sa.Column('competency_level', sa.String(100), nullable=False, server_default='Foundational'),
        sa.Column('certification_statement', sa.Text(), nullable=False,
                  server_default='This certifies that the above-named learner has successfully completed the requirements of this course on the GeoPsy Learning Platform.'),
        sa.Column('passing_percentage', sa.Float(), nullable=False, server_default='60.0'),
        sa.Column('administrator_name', sa.String(255), nullable=True),
        sa.Column('administrator_title', sa.String(255), nullable=True),
        sa.Column('signature_image_url', sa.Text(), nullable=True),
        sa.Column('course_id', sa.String(), sa.ForeignKey('courses.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── certificates ─────────────────────────────────────────────────────────
    op.create_table(
        'certificates',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('course_id', sa.String(), sa.ForeignKey('courses.id', ondelete='SET NULL'), nullable=True),
        sa.Column('attempt_id', sa.String(), sa.ForeignKey('quiz_attempts.id', ondelete='SET NULL'), nullable=True, unique=True),
        sa.Column('template_id', sa.String(), sa.ForeignKey('certificate_templates.id', ondelete='SET NULL'), nullable=True),
        sa.Column('certificate_number', sa.String(50), nullable=False, unique=True),
        sa.Column('verification_id', sa.String(64), nullable=False, unique=True),
        sa.Column('learner_name', sa.String(255), nullable=False),
        sa.Column('course_name', sa.String(255), nullable=False),
        sa.Column('competency_achieved', sa.String(255), nullable=True),
        sa.Column('certification_level', sa.String(100), nullable=True),
        sa.Column('final_score_pct', sa.Float(), nullable=True),
        sa.Column('issued_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('revoked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('pdf_url', sa.Text(), nullable=True),
    )
    op.create_index('ix_certificates_verification_id', 'certificates', ['verification_id'])
    op.create_index('ix_certificates_user_id', 'certificates', ['user_id'])

    # ── learner_progress ─────────────────────────────────────────────────────
    op.create_table(
        'learner_progress',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('course_id', sa.String(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lessons_completed_pct', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('quizzes_completed_pct', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('overall_progress_pct', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('average_quiz_score', sa.Float(), nullable=True),
        sa.Column('is_course_complete', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_learner_progress_user_course', 'learner_progress', ['user_id', 'course_id'], unique=True)

    # ── badges + learner_badges ──────────────────────────────────────────────
    op.create_table(
        'badges',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon_url', sa.Text(), nullable=True),
        sa.Column('criteria', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        'learner_badges',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('badge_id', sa.String(), sa.ForeignKey('badges.id', ondelete='CASCADE'), nullable=False),
        sa.Column('awarded_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── feedback ──────────────────────────────────────────────────────────────
    op.create_table(
        'feedback',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('attempt_id', sa.String(), sa.ForeignKey('quiz_attempts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('author_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('feedback')
    op.drop_table('learner_badges')
    op.drop_table('badges')
    op.drop_table('learner_progress')
    op.drop_table('certificates')
    op.drop_table('certificate_templates')
    op.drop_table('manual_grades')
    op.drop_table('question_responses')
    op.drop_table('quiz_attempts')
    op.drop_table('questions')
    op.drop_table('quizzes')
    op.drop_column('resources', 'metadata_json')
    op.drop_column('resources', 'code_content')
    op.drop_column('resources', 'language')
