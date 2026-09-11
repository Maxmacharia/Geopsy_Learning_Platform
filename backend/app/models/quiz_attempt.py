import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class QuizAttempt(Base):
    """
    One learner's attempt at a quiz. Tracks timing, auto-graded score,
    manual-graded score, and final combined result.
    """
    __tablename__ = "quiz_attempts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id: Mapped[str] = mapped_column(String, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    attempt_number: Mapped[int] = mapped_column(Integer, default=1)

    status: Mapped[str] = mapped_column(String(50), default="in_progress")
    # in_progress | submitted | auto_graded | awaiting_manual_grading | graded

    started_at:   Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    graded_at:    Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    time_taken_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    auto_score:     Mapped[float] = mapped_column(Float, default=0.0)
    manual_score:   Mapped[float] = mapped_column(Float, default=0.0)
    total_score:    Mapped[float] = mapped_column(Float, default=0.0)   # auto + manual
    max_score:      Mapped[float] = mapped_column(Float, default=0.0)   # snapshot of quiz.total_marks at attempt time
    percentage:     Mapped[float] = mapped_column(Float, default=0.0)
    passed:         Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Snapshot of question order shown to this learner (for randomization reproducibility)
    question_order: Mapped[list | None] = mapped_column(JSON, nullable=True)

    quiz = relationship("Quiz", back_populates="attempts")
    user = relationship("User")
    responses = relationship("QuestionResponse", back_populates="attempt", cascade="all, delete-orphan")
    certificate = relationship("Certificate", back_populates="attempt", uselist=False, cascade="all, delete-orphan")


class QuestionResponse(Base):
    """
    A learner's answer to a single question within an attempt.
    `response_data` shape mirrors the question's `correct_answer` shape.
    For file_upload / map_design types, response_data holds the file URL.
    """
    __tablename__ = "question_responses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    attempt_id:  Mapped[str] = mapped_column(String, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[str] = mapped_column(String, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)

    response_data: Mapped[dict | list | str | bool | None] = mapped_column(JSON, nullable=True)
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)  # for file_upload / map_design / code submissions

    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # null until graded
    auto_marks_awarded: Mapped[float] = mapped_column(Float, default=0.0)

    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    attempt  = relationship("QuizAttempt", back_populates="responses")
    question = relationship("Question", back_populates="responses")
    manual_grade = relationship("ManualGrade", back_populates="response", uselist=False, cascade="all, delete-orphan")


class ManualGrade(Base):
    """
    Human review of a single question response that requires manual grading
    (essays, code, map design, file uploads). One row per graded response.
    """
    __tablename__ = "manual_grades"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    response_id: Mapped[str] = mapped_column(String, ForeignKey("question_responses.id", ondelete="CASCADE"), nullable=False, unique=True)
    grader_id:   Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    marks_awarded: Mapped[float] = mapped_column(Float, default=0.0)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    graded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    response = relationship("QuestionResponse", back_populates="manual_grade")
    grader   = relationship("User")
