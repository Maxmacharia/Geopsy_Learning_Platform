from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_admin
from app.models.user import User
from app.models.quiz import Question
from app.models.quiz_attempt import QuizAttempt, QuestionResponse, ManualGrade
from app.schemas.assessment import GradingQueueItem, ManualGradeSubmit
from app.services.certificate_service import issue_certificate_if_eligible
from app.services.progress_service import recompute_learner_progress

router = APIRouter(prefix="/grading", tags=["grading"])


@router.get("/queue", response_model=list[GradingQueueItem])
def get_grading_queue(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """All ungraded responses to manually-gradable questions, across all quizzes."""
    pending = (
        db.query(QuestionResponse)
        .join(Question, QuestionResponse.question_id == Question.id)
        .filter(Question.requires_manual_grading == True)
        .filter(~QuestionResponse.manual_grade.has())
        .all()
    )

    items = []
    for resp in pending:
        attempt = resp.attempt
        question = resp.question
        items.append(GradingQueueItem(
            response_id=resp.id, attempt_id=attempt.id, question_id=question.id,
            question_type=question.type, question_prompt=question.prompt,
            max_marks=question.marks,
            learner_name=attempt.user.full_name, quiz_title=attempt.quiz.title,
            response_data=resp.response_data, file_url=resp.file_url,
            submitted_at=resp.submitted_at.isoformat(),
        ))
    return items


@router.post("/responses/{response_id}/grade", status_code=200)
def grade_response(
    response_id: str,
    body: ManualGradeSubmit,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    response = db.query(QuestionResponse).filter(QuestionResponse.id == response_id).first()
    if not response:
        raise HTTPException(404, "Response not found")

    question = response.question
    if body.marks_awarded > question.marks:
        raise HTTPException(400, f"Marks awarded cannot exceed question's max marks ({question.marks})")

    existing = response.manual_grade
    if existing:
        existing.marks_awarded = body.marks_awarded
        existing.feedback = body.feedback
        existing.grader_id = admin.id
        existing.graded_at = datetime.now(timezone.utc)
    else:
        db.add(ManualGrade(
            response_id=response.id, grader_id=admin.id,
            marks_awarded=body.marks_awarded, feedback=body.feedback,
        ))
        response.is_correct = body.marks_awarded >= question.marks * 0.5  # heuristic for display purposes only

    db.commit()

    # Check whether the whole attempt is now fully graded
    attempt = response.attempt
    _finalize_attempt_if_complete(db, attempt)

    return {"ok": True}


def _finalize_attempt_if_complete(db: Session, attempt: QuizAttempt) -> None:
    """If every manually-gradable response on this attempt now has a ManualGrade,
    compute the final combined score, mark the attempt graded, and trigger
    certificate issuance + progress recompute."""
    manual_responses = [r for r in attempt.responses if r.question.requires_manual_grading]
    if not manual_responses:
        return  # nothing to finalize here

    all_graded = all(r.manual_grade is not None for r in manual_responses)
    if not all_graded:
        return

    manual_total = sum(r.manual_grade.marks_awarded for r in manual_responses)
    attempt.manual_score = round(manual_total, 2)
    attempt.total_score = round(attempt.auto_score + attempt.manual_score, 2)
    attempt.percentage = round((attempt.total_score / attempt.max_score) * 100, 2) if attempt.max_score else 0.0
    attempt.passed = attempt.percentage >= attempt.quiz.passing_score_pct
    attempt.status = "graded"
    attempt.graded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(attempt)

    issue_certificate_if_eligible(db, attempt)
    if attempt.quiz.course_id:
        recompute_learner_progress(db, attempt.user_id, attempt.quiz.course_id)


@router.get("/attempts/{attempt_id}/pending-count")
def pending_count_for_attempt(attempt_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(404, "Attempt not found")
    manual_responses = [r for r in attempt.responses if r.question.requires_manual_grading]
    pending = sum(1 for r in manual_responses if r.manual_grade is None)
    return {"total_manual": len(manual_responses), "pending": pending}
