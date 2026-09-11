import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class LearnerProgress(Base):
    """
    Course-level rollup of a learner's progress, distinct from the existing
    per-lesson ReadingProgress table. Aggregates lesson completion + quiz
    performance into a single course-level percentage for dashboards.
    """
    __tablename__ = "learner_progress"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id:   Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[str] = mapped_column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)

    lessons_completed_pct: Mapped[float] = mapped_column(Float, default=0.0)
    quizzes_completed_pct: Mapped[float] = mapped_column(Float, default=0.0)
    overall_progress_pct:  Mapped[float] = mapped_column(Float, default=0.0)

    average_quiz_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_course_complete:  Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user   = relationship("User")
    course = relationship("Course")


class Badge(Base):
    """
    Future-ready achievement badge definitions. Awarding logic is left as
    a stub (see services/badges.py) since gamification rules were not
    specified in detail — this establishes the schema so it can be
    extended without migration churn later.
    """
    __tablename__ = "badges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    criteria: Mapped[str | None] = mapped_column(Text, nullable=True)  # human-readable rule description

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class LearnerBadge(Base):
    """Join table: which learners have earned which badges."""
    __tablename__ = "learner_badges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id:  Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    badge_id: Mapped[str] = mapped_column(String, ForeignKey("badges.id", ondelete="CASCADE"), nullable=False)
    awarded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user  = relationship("User")
    badge = relationship("Badge")


class Feedback(Base):
    """
    Instructor feedback on a quiz attempt, separate from per-question
    ManualGrade.feedback — this is a single overall comment on the attempt.
    """
    __tablename__ = "feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    attempt_id: Mapped[str] = mapped_column(String, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    author_id:  Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    attempt = relationship("QuizAttempt")
    author  = relationship("User")
