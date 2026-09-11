"""
Recomputes the LearnerProgress rollup row for a (user, course) pair by
combining the existing per-lesson ReadingProgress data with quiz attempt
results. This is intentionally a simple weighted average (50/50 lessons
vs quizzes when both exist) rather than a configurable formula — that
level of configurability wasn't specified and can be added later without
a schema change since the percentages are stored, not derived at read time.
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.course import Course, Module, Lesson
from app.models.analytics import ReadingProgress
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.progress_extra import LearnerProgress


def recompute_learner_progress(db: Session, user_id: str, course_id: str) -> LearnerProgress:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        return None

    # Lesson completion percentage
    lesson_ids = [
        l.id for m in course.modules for l in m.lessons
    ]
    lessons_pct = 0.0
    if lesson_ids:
        completed = db.query(ReadingProgress).filter(
            ReadingProgress.user_id == user_id,
            ReadingProgress.lesson_id.in_(lesson_ids),
            ReadingProgress.completed_at.isnot(None),
        ).count()
        lessons_pct = round((completed / len(lesson_ids)) * 100, 2)

    # Quiz completion + average score
    quiz_ids = [q.id for q in db.query(Quiz).filter(Quiz.course_id == course_id, Quiz.status == "published").all()]
    quizzes_pct = 0.0
    avg_score = None
    if quiz_ids:
        graded_attempts = db.query(QuizAttempt).filter(
            QuizAttempt.user_id == user_id,
            QuizAttempt.quiz_id.in_(quiz_ids),
            QuizAttempt.status == "graded",
        ).all()
        # Count a quiz as "complete" if the learner has at least one graded attempt
        completed_quiz_ids = {a.quiz_id for a in graded_attempts}
        quizzes_pct = round((len(completed_quiz_ids) / len(quiz_ids)) * 100, 2)
        if graded_attempts:
            avg_score = round(sum(a.percentage for a in graded_attempts) / len(graded_attempts), 2)

    # Combine — weighted average if both dimensions exist, else whichever exists
    if lesson_ids and quiz_ids:
        overall = round((lessons_pct + quizzes_pct) / 2, 2)
    elif lesson_ids:
        overall = lessons_pct
    elif quiz_ids:
        overall = quizzes_pct
    else:
        overall = 0.0

    record = db.query(LearnerProgress).filter(
        LearnerProgress.user_id == user_id, LearnerProgress.course_id == course_id
    ).first()
    if not record:
        record = LearnerProgress(user_id=user_id, course_id=course_id)
        db.add(record)

    record.lessons_completed_pct = lessons_pct
    record.quizzes_completed_pct = quizzes_pct
    record.overall_progress_pct = overall
    record.average_quiz_score = avg_score

    was_complete = record.is_course_complete
    record.is_course_complete = overall >= 100.0
    if record.is_course_complete and not was_complete:
        record.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(record)
    return record
