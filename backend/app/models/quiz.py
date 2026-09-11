import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String, Boolean, DateTime, Text, Integer, Float, ForeignKey, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Quiz(Base):
    """
    A quiz/assessment that can be attached to a course, module, or lesson.
    Supports scheduling, attempt limits, randomization, and grading config.
    """
    __tablename__ = "quizzes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Assignment scope — a quiz can be attached at any one of these levels (all optional/nullable)
    course_id: Mapped[str | None] = mapped_column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    module_id: Mapped[str | None] = mapped_column(String, ForeignKey("modules.id", ondelete="CASCADE"), nullable=True)
    lesson_id: Mapped[str | None] = mapped_column(String, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=True)
    category:  Mapped[str | None] = mapped_column(String(100), nullable=True)

    difficulty: Mapped[str] = mapped_column(String(20), default="beginner")  # beginner|intermediate|advanced

    # Status lifecycle
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft|published|archived

    # Scheduling
    opens_at:  Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Attempt configuration
    time_limit_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_attempts:        Mapped[int] = mapped_column(Integer, default=1)
    passing_score_pct:   Mapped[float] = mapped_column(Float, default=60.0)
    total_marks:         Mapped[float] = mapped_column(Float, default=0.0)  # computed from questions, cached here

    randomize_questions: Mapped[bool] = mapped_column(Boolean, default=False)
    randomize_answers:   Mapped[bool] = mapped_column(Boolean, default=False)

    created_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan", order_by="Question.order_index")
    attempts  = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class Question(Base):
    """
    A single question within a quiz. `options` and `correct_answer` are stored
    as JSON to support the wide variety of question types without needing
    a separate table per type.

    Shape of `options` / `correct_answer` by question type:
      multiple_choice  -> options: [{"id":"a","text":"..."}], correct_answer: "a"
      multiple_select  -> options: [{"id":"a","text":"..."}], correct_answer: ["a","c"]
      true_false       -> options: null,                      correct_answer: true|false
      fill_blank       -> options: null,                      correct_answer: ["accepted","strings"]
      matching         -> options: {"left":[...], "right":[...]}, correct_answer: {"1":"a","2":"b"}
      short_answer     -> options: null,                      correct_answer: null (manual grading)
      essay            -> options: null,                      correct_answer: null (manual grading)
      gis_workflow     -> options: {"instructions": "..."},   correct_answer: null (manual grading)
      python_code      -> options: {"starter_code": "...", "test_cases": [...]}, correct_answer: null
      r_code           -> options: {"starter_code": "..."},   correct_answer: null
      file_upload      -> options: {"allowed_types": [...]},  correct_answer: null (manual grading)
      map_design       -> options: {"requirements": "..."},   correct_answer: null (manual grading)
    """
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id: Mapped[str] = mapped_column(String, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)

    type: Mapped[str] = mapped_column(String(30), nullable=False)
    # multiple_choice | multiple_select | true_false | fill_blank | matching |
    # short_answer | essay | gis_workflow | python_code | r_code | file_upload | map_design

    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    options:        Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    correct_answer: Mapped[dict | list | str | bool | None] = mapped_column(JSON, nullable=True)

    marks: Mapped[float] = mapped_column(Float, default=1.0)
    partial_credit: Mapped[bool] = mapped_column(Boolean, default=False)
    negative_marking: Mapped[float] = mapped_column(Float, default=0.0)  # marks deducted on wrong answer

    requires_manual_grading: Mapped[bool] = mapped_column(Boolean, default=False)
    grading_rubric: Mapped[str | None] = mapped_column(Text, nullable=True)  # admin-facing guidance for manual grading

    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    quiz = relationship("Quiz", back_populates="questions")
    responses = relationship("QuestionResponse", back_populates="question", cascade="all, delete-orphan")
