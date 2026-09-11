from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import copy

from app.core.dependencies import get_db, require_admin, get_current_user
from app.models.user import User
from app.models.quiz import Quiz, Question
from app.models.quiz_attempt import QuizAttempt
from app.schemas.quiz import (
    QuizCreate, QuizUpdate, QuizListItem, QuizAdminDetail,
    QuestionCreate, QuestionUpdate, QuestionAdminOut, DuplicateQuizRequest,
)
from app.schemas.assessment import AttemptListItem
from app.services.grading_engine import requires_manual_grading

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


def _quiz_list_item(q: Quiz) -> dict:
    return {
        "id": q.id, "title": q.title, "description": q.description,
        "course_id": q.course_id, "category": q.category, "difficulty": q.difficulty,
        "status": q.status,
        "opens_at": q.opens_at.isoformat() if q.opens_at else None,
        "closes_at": q.closes_at.isoformat() if q.closes_at else None,
        "time_limit_minutes": q.time_limit_minutes, "max_attempts": q.max_attempts,
        "passing_score_pct": q.passing_score_pct, "total_marks": q.total_marks,
        "question_count": len(q.questions), "created_at": q.created_at.isoformat(),
    }


def _recompute_total_marks(db: Session, quiz: Quiz) -> None:
    quiz.total_marks = sum(q.marks for q in quiz.questions)
    db.commit()


# ── Admin: Quiz CRUD ─────────────────────────────────────────────────────────

@router.get("", response_model=list[QuizListItem])
def list_quizzes(
    course_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user), # ✅ Allows all authenticated users
):
    q = db.query(Quiz)
    if course_id:
        q = q.filter(Quiz.course_id == course_id)
        
    # Non-admins can strictly only retrieve published quizzes
    if current_user.role != "admin":
        q = q.filter(Quiz.status == "published")
    elif status_filter:
        q = q.filter(Quiz.status == status_filter)

    quizzes = q.order_by(Quiz.created_at.desc()).all()
    return [QuizListItem(**_quiz_list_item(qz)) for qz in quizzes]


@router.post("", response_model=QuizAdminDetail, status_code=201)
def create_quiz(body: QuizCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    quiz = Quiz(**body.model_dump(), created_by=admin.id)
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return QuizAdminDetail(**_quiz_list_item(quiz), randomize_questions=quiz.randomize_questions, randomize_answers=quiz.randomize_answers, questions=[])


@router.get("/{quiz_id}", response_model=QuizAdminDetail)
def get_quiz_admin(quiz_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    questions = [QuestionAdminOut.model_validate(qn) for qn in quiz.questions]
    return QuizAdminDetail(
        **_quiz_list_item(quiz),
        randomize_questions=quiz.randomize_questions,
        randomize_answers=quiz.randomize_answers,
        questions=questions,
    )


@router.patch("/{quiz_id}", response_model=QuizListItem)
def update_quiz(quiz_id: str, body: QuizUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(quiz, k, v)
    db.commit()
    db.refresh(quiz)
    return QuizListItem(**_quiz_list_item(quiz))


@router.delete("/{quiz_id}", status_code=204)
def delete_quiz(quiz_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    db.delete(quiz)
    db.commit()


@router.patch("/{quiz_id}/publish", response_model=QuizListItem)
def publish_quiz(quiz_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    if not quiz.questions:
        raise HTTPException(400, "Cannot publish a quiz with no questions")
    quiz.status = "published"
    db.commit()
    db.refresh(quiz)
    return QuizListItem(**_quiz_list_item(quiz))


@router.patch("/{quiz_id}/unpublish", response_model=QuizListItem)
def unpublish_quiz(quiz_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    quiz.status = "draft"
    db.commit()
    db.refresh(quiz)
    return QuizListItem(**_quiz_list_item(quiz))


@router.patch("/{quiz_id}/archive", response_model=QuizListItem)
def archive_quiz(quiz_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    quiz.status = "archived"
    db.commit()
    db.refresh(quiz)
    return QuizListItem(**_quiz_list_item(quiz))


@router.post("/{quiz_id}/duplicate", response_model=QuizAdminDetail, status_code=201)
def duplicate_quiz(quiz_id: str, body: DuplicateQuizRequest, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    original = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not original:
        raise HTTPException(404, "Quiz not found")

    new_quiz = Quiz(
        title=body.new_title or f"{original.title} (Copy)",
        description=original.description,
        course_id=original.course_id, module_id=original.module_id, lesson_id=original.lesson_id,
        category=original.category, difficulty=original.difficulty,
        status="draft",
        time_limit_minutes=original.time_limit_minutes, max_attempts=original.max_attempts,
        passing_score_pct=original.passing_score_pct,
        randomize_questions=original.randomize_questions, randomize_answers=original.randomize_answers,
        created_by=admin.id,
    )
    db.add(new_quiz)
    db.flush()

    for qn in original.questions:
        db.add(Question(
            quiz_id=new_quiz.id, type=qn.type, prompt=qn.prompt,
            options=copy.deepcopy(qn.options), correct_answer=copy.deepcopy(qn.correct_answer),
            marks=qn.marks, partial_credit=qn.partial_credit, negative_marking=qn.negative_marking,
            requires_manual_grading=qn.requires_manual_grading, grading_rubric=qn.grading_rubric,
            order_index=qn.order_index,
        ))
    db.commit()
    _recompute_total_marks(db, new_quiz)
    db.refresh(new_quiz)

    questions = [QuestionAdminOut.model_validate(qn) for qn in new_quiz.questions]
    return QuizAdminDetail(**_quiz_list_item(new_quiz), randomize_questions=new_quiz.randomize_questions, randomize_answers=new_quiz.randomize_answers, questions=questions)


# ── Admin: Question CRUD ──────────────────────────────────────────────────────

@router.post("/{quiz_id}/questions", response_model=QuestionAdminOut, status_code=201)
def add_question(quiz_id: str, body: QuestionCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")

    question = Question(
        quiz_id=quiz_id,
        **body.model_dump(),
        requires_manual_grading=requires_manual_grading(body.type),
    )
    db.add(question)
    db.commit()
    _recompute_total_marks(db, quiz)
    db.refresh(question)
    return QuestionAdminOut.model_validate(question)


@router.patch("/questions/{question_id}", response_model=QuestionAdminOut)
def update_question(question_id: str, body: QuestionUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(404, "Question not found")
    updates = body.model_dump(exclude_none=True)
    for k, v in updates.items():
        setattr(question, k, v)
    if "type" in updates:
        question.requires_manual_grading = requires_manual_grading(updates["type"])
    db.commit()
    _recompute_total_marks(db, question.quiz)
    db.refresh(question)
    return QuestionAdminOut.model_validate(question)


@router.delete("/questions/{question_id}", status_code=204)
def delete_question(question_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(404, "Question not found")
    quiz = question.quiz
    db.delete(question)
    db.commit()
    _recompute_total_marks(db, quiz)


# ── Admin: attempts overview for a quiz ────────────────────────────────────────

@router.get("/{quiz_id}/attempts", response_model=list[AttemptListItem])
def list_quiz_attempts(quiz_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).order_by(QuizAttempt.started_at.desc()).all()
    return [
        AttemptListItem(
            id=a.id, quiz_id=a.quiz_id, quiz_title=quiz.title,
            attempt_number=a.attempt_number, status=a.status,
            percentage=a.percentage, passed=a.passed,
            started_at=a.started_at.isoformat(),
            submitted_at=a.submitted_at.isoformat() if a.submitted_at else None,
        )
        for a in attempts
    ]
