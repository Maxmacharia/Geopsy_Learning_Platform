"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        'users',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=True),
        sa.Column('role', sa.String(20), nullable=False, server_default='student'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('institution', sa.String(255), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('google_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # categories
    op.create_table(
        'categories',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
    )

    # courses
    op.create_table(
        'courses',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(255), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(100), sa.ForeignKey('categories.name'), nullable=True),
        sa.Column('difficulty', sa.String(20), nullable=False, server_default='beginner'),
        sa.Column('thumbnail_url', sa.Text(), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_by', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_courses_slug', 'courses', ['slug'])

    # modules
    op.create_table(
        'modules',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('course_id', sa.String(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # lessons
    op.create_table(
        'lessons',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('module_id', sa.String(), sa.ForeignKey('modules.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('content_preview', sa.Text(), nullable=True),
        sa.Column('is_gated', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # resources
    op.create_table(
        'resources',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('lesson_id', sa.String(), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('type', sa.String(30), nullable=False),
        sa.Column('file_url', sa.Text(), nullable=True),
        sa.Column('external_url', sa.Text(), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('download_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # embedded_maps
    op.create_table(
        'embedded_maps',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('lesson_id', sa.String(), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('geojson_data', sa.JSON(), nullable=True),
        sa.Column('center_lat', sa.Float(), nullable=True),
        sa.Column('center_lng', sa.Float(), nullable=True),
        sa.Column('zoom_level', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('basemap', sa.String(50), nullable=False, server_default='osm'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # forums
    op.create_table(
        'forums',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # forum_posts
    op.create_table(
        'forum_posts',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('forum_id', sa.String(), sa.ForeignKey('forums.id', ondelete='CASCADE'), nullable=False),
        sa.Column('author_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_announcement', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_forum_posts_forum_id', 'forum_posts', ['forum_id'])

    # comments
    op.create_table(
        'comments',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('post_id', sa.String(), sa.ForeignKey('forum_posts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('author_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # bookmarks
    op.create_table(
        'bookmarks',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('course_id', sa.String(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # reading_progress
    op.create_table(
        'reading_progress',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lesson_id', sa.String(), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('percent_complete', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_reading_progress_user_lesson', 'reading_progress', ['user_id', 'lesson_id'])

    # downloads
    op.create_table(
        'downloads',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resource_id', sa.String(), sa.ForeignKey('resources.id', ondelete='CASCADE'), nullable=False),
        sa.Column('downloaded_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # analytics_events
    op.create_table(
        'analytics_events',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.String(), nullable=True),
        sa.Column('institution', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_analytics_events_type', 'analytics_events', ['event_type'])


def downgrade() -> None:
    for table in [
        'analytics_events', 'downloads', 'reading_progress', 'bookmarks',
        'comments', 'forum_posts', 'forums', 'embedded_maps', 'resources',
        'lessons', 'modules', 'courses', 'categories', 'users',
    ]:
        op.drop_table(table)
