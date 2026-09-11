import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.quiz import Quiz, Question
from app.models.quiz_attempt import QuizAttempt, QuestionResponse, ManualGrade
from app.models.progress_extra import Feedback
from app.schemas.quiz import QuestionLearnerOut, QuizLearnerDetail
from app.schemas.assessment import (
    StartAttemptResponse, SubmitAttemptRequest, AttemptResult, AttemptResultItem,
    AttemptListItem,
)
from app.services.grading_engine import auto_grade_response, requires_manual_grading
from app.services.certificate_service import issue_certificate_if_eligible
from app.services.progress_service import recompute_learner_progress
from app.utils.datetime_utils import ensure_aware, utcnow

router = APIRouter(prefix="/quiz-attempts", tags=["quiz-attempts"])


def _quiz_to_learner_detail(quiz: Quiz, attempts_used: int) -> QuizLearnerDetail:
    questions = sorted(quiz.questions, key=lambda q: q.order_index)
    return QuizLearnerDetail(
        id=quiz.id, title=quiz.title, description=quiz.description,
        difficulty=quiz.difficulty, time_limit_minutes=quiz.time_limit_minutes,
        max_attempts=quiz.max_attempts, passing_score_pct=quiz.passing_score_pct,
        total_marks=quiz.total_marks,
        attempts_used=attempts_used,
        can_attempt=attempts_used < quiz.max_attempts,
        questions=[QuestionLearnerOut.model_validate(q) for q in questions],
    )


@router.get("/quiz/{quiz_id}/preview", response_model=QuizLearnerDetail)
def preview_quiz(quiz_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Learner views quiz info + question list before starting (no answers shown)."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.status == "published").first()
    if not quiz:
        raise HTTPException(404, "Quiz not found or not published")

    now = utcnow()
    if quiz.opens_at and now < ensure_aware(quiz.opens_at):
        raise HTTPException(403, "This quiz has not opened yet")
    if quiz.closes_at and now > ensure_aware(quiz.closes_at):
        raise HTTPException(403, "This quiz has closed")

    attempts_used = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == current_user.id
    ).count()

    return _quiz_to_learner_detail(quiz, attempts_used)


@router.post("/quiz/{quiz_id}/start", response_model=StartAttemptResponse, status_code=201)
def start_attempt(quiz_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.status == "published").first()
    if not quiz:
        raise HTTPException(404, "Quiz not found or not published")

    now = utcnow()
    if quiz.opens_at and now < ensure_aware(quiz.opens_at):
        raise HTTPException(403, "This quiz has not opened yet")
    if quiz.closes_at and now > ensure_aware(quiz.closes_at):
        raise HTTPException(403, "This quiz has closed")

    existing_count = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == current_user.id
    ).count()
    if existing_count >= quiz.max_attempts:
        raise HTTPException(403, f"Maximum attempts ({quiz.max_attempts}) reached for this quiz")

    if not quiz.questions:
        raise HTTPException(400, "This quiz has no questions yet")

    question_ids = [q.id for q in quiz.questions]
    if quiz.randomize_questions:
        random.shuffle(question_ids)

    attempt = QuizAttempt(
        quiz_id=quiz_id, user_id=current_user.id,
        attempt_number=existing_count + 1,
        max_score=quiz.total_marks,
        question_order=question_ids,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    detail = _quiz_to_learner_detail(quiz, existing_count + 1)
    return StartAttemptResponse(attempt_id=attempt.id, quiz=detail.model_dump())


@router.post("/{attempt_id}/submit", response_model=AttemptResult)
def submit_attempt(
    attempt_id: str,
    body: SubmitAttemptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(404, "Attempt not found")
    if attempt.user_id != current_user.id:
        raise HTTPException(403, "This is not your attempt")
    if attempt.status != "in_progress":
        raise HTTPException(400, "This attempt has already been submitted")

    quiz = attempt.quiz
    questions_by_id = {q.id: q for q in quiz.questions}

    auto_score = 0.0
    has_manual_pending = False

    for ans in body.answers:
        question = questions_by_id.get(ans.question_id)
        if not question:
            continue  # ignore answers for questions that don't belong to this quiz

        response = QuestionResponse(
            attempt_id=attempt.id, question_id=question.id,
            response_data=ans.response_data, file_url=ans.file_url,
        )

        if requires_manual_grading(question.type):
            response.is_correct = None
            response.auto_marks_awarded = 0.0
            has_manual_pending = True
        else:
            is_correct, marks = auto_grade_response(question, ans.response_data)
            response.is_correct = is_correct
            response.auto_marks_awarded = marks
            auto_score += marks

        db.add(response)

    attempt.auto_score = round(auto_score, 2)
    attempt.submitted_at = datetime.now(timezone.utc)

    # SQLite (used in tests, and by default if no Postgres DATABASE_URL is set)
    # does not preserve timezone info on round-trip, so started_at may come
    # back as a naive datetime even though it was stored as UTC-aware. Normalize
    # before subtracting to avoid "can't subtract offset-naive and offset-aware
    # datetimes" — this has no effect on Postgres, which preserves tzinfo correctly.
    attempt.time_taken_seconds = int((attempt.submitted_at - ensure_aware(attempt.started_at)).total_seconds())

    if has_manual_pending:
        attempt.status = "awaiting_manual_grading"
        # total_score / percentage / passed stay pending until manual grading completes
    else:
        attempt.status = "graded"
        attempt.total_score = attempt.auto_score
        attempt.percentage = round((attempt.total_score / attempt.max_score) * 100, 2) if attempt.max_score else 0.0
        attempt.passed = attempt.percentage >= quiz.passing_score_pct
        attempt.graded_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(attempt)

    # Auto-issue certificate + update progress if fully graded and passed
    if attempt.status == "graded":
        issue_certificate_if_eligible(db, attempt)
        if quiz.course_id:
            recompute_learner_progress(db, current_user.id, quiz.course_id)

    return _build_attempt_result(db, attempt, reveal_answers=(attempt.status == "graded"))


@router.get("/{attempt_id}/result", response_model=AttemptResult)
def get_attempt_result(attempt_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(404, "Attempt not found")
    if attempt.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Not authorized to view this attempt")
    return _build_attempt_result(db, attempt, reveal_answers=(attempt.status == "graded"))


@router.get("/my-attempts", response_model=list[AttemptListItem])
def my_attempts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).order_by(QuizAttempt.started_at.desc()).all()
    return [
        AttemptListItem(
            id=a.id, quiz_id=a.quiz_id, quiz_title=a.quiz.title,
            attempt_number=a.attempt_number, status=a.status,
            percentage=a.percentage, passed=a.passed,
            started_at=a.started_at.isoformat(),
            submitted_at=a.submitted_at.isoformat() if a.submitted_at else None,
        )
        for a in attempts
    ]


def _build_attempt_result(db: Session, attempt: QuizAttempt, reveal_answers: bool) -> AttemptResult:
    items = []
    for resp in attempt.responses:
        question = resp.question
        manual = resp.manual_grade
        items.append(AttemptResultItem(
            question_id=question.id, type=question.type, prompt=question.prompt,
            marks=question.marks, is_correct=resp.is_correct,
            auto_marks_awarded=resp.auto_marks_awarded,
            requires_manual_grading=question.requires_manual_grading,
            manual_marks_awarded=manual.marks_awarded if manual else None,
            manual_feedback=manual.feedback if manual else None,
            your_answer=resp.response_data if resp.response_data is not None else resp.file_url,
            correct_answer=question.correct_answer if reveal_answers else None,
        ))

    feedback_entries = db.query(Feedback).filter(Feedback.attempt_id == attempt.id).all()
    overall_feedback = " ".join(f.content for f in feedback_entries) if feedback_entries else None

    return AttemptResult(
        attempt_id=attempt.id, quiz_id=attempt.quiz_id, quiz_title=attempt.quiz.title,
        status=attempt.status,
        auto_score=attempt.auto_score, manual_score=attempt.manual_score,
        total_score=attempt.total_score, max_score=attempt.max_score,
        percentage=attempt.percentage, passed=attempt.passed,
        time_taken_seconds=attempt.time_taken_seconds,
        submitted_at=attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        graded_at=attempt.graded_at.isoformat() if attempt.graded_at else None,
        items=items,
    )
