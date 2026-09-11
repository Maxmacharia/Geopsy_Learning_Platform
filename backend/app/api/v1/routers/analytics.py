"""
Comprehensive Admin Analytics Router.

All endpoints require admin authentication.
Covers:
  - Platform KPI overview
  - Course statistics (completion rates, progression, difficulty breakdown)
  - Learner activity (registrations, active users, enrollments)
  - Institution analytics
  - Payment/revenue analytics
  - Certificate analytics
  - Per-student drill-down (no passwords ever exposed)
  - Student quiz history
  - Recent activity feeds
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, case, and_

from app.core.dependencies import get_db, require_admin
from app.models.user import User
from app.models.course import Course, Module, Lesson, Resource
from app.models.quiz import Quiz, Question
from app.models.quiz_attempt import QuizAttempt, QuestionResponse, ManualGrade
from app.models.certificate import Certificate
from app.models.progress_extra import LearnerProgress
from app.models.analytics import Bookmark, ReadingProgress, Download, AnalyticsEvent
from app.models.enrollment import Enrollment, MpesaTransaction
from app.models.forum import ForumPost, Comment

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _utc_now():
    return datetime.now(timezone.utc)


def _days_ago(n):
    return _utc_now() - timedelta(days=n)


# ══════════════════════════════════════════════════════════════════════════════
# 1. PLATFORM OVERVIEW (Admin Dashboard KPIs)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/overview")
def platform_overview(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """High-level platform KPIs for the admin dashboard."""

    total_students  = db.query(User).filter(User.role == "student").count()
    active_students = db.query(distinct(AnalyticsEvent.user_id)).filter(
        AnalyticsEvent.created_at >= _days_ago(30)
    ).count()
    new_this_week   = db.query(User).filter(
        User.role == "student", User.created_at >= _days_ago(7)
    ).count()

    total_courses   = db.query(Course).count()
    published       = db.query(Course).filter(Course.is_published == True).count()
    total_modules   = db.query(Module).count()
    total_lessons   = db.query(Lesson).count()
    total_quizzes   = db.query(Quiz).count()
    total_resources = db.query(Resource).count()

    total_enrollments   = db.query(Enrollment).count()
    active_enrollments  = db.query(Enrollment).filter(
        Enrollment.status.in_(["enrolled", "in_progress", "retake_allowed"])
    ).count()
    completed_courses   = db.query(Enrollment).filter(
        Enrollment.status.in_(["passed", "completed"])
    ).count()
    failed_courses      = db.query(Enrollment).filter(Enrollment.status == "failed").count()

    certs_issued        = db.query(Certificate).filter(Certificate.revoked == False).count()

    # Revenue
    total_revenue = db.query(func.coalesce(func.sum(MpesaTransaction.amount), 0)).filter(
        MpesaTransaction.status == "success"
    ).scalar() or 0.0
    revenue_this_month = db.query(func.coalesce(func.sum(MpesaTransaction.amount), 0)).filter(
        MpesaTransaction.status == "success",
        MpesaTransaction.completed_at >= _days_ago(30),
    ).scalar() or 0.0

    # Quiz stats
    total_attempts = db.query(QuizAttempt).count()
    passed_attempts = db.query(QuizAttempt).filter(QuizAttempt.passed == True).count()
    avg_score = db.query(func.avg(QuizAttempt.percentage)).filter(
        QuizAttempt.status == "graded"
    ).scalar() or 0.0

    # Total downloads
    total_downloads = db.query(Download).count()
    total_forum_posts = db.query(ForumPost).count()

    return {
        "students": {
            "total": total_students,
            "active_30d": active_students,
            "new_this_week": new_this_week,
            "inactive": total_students - active_students,
        },
        "content": {
            "total_courses": total_courses,
            "published_courses": published,
            "draft_courses": total_courses - published,
            "total_modules": total_modules,
            "total_lessons": total_lessons,
            "total_quizzes": total_quizzes,
            "total_resources": total_resources,
        },
        "enrollments": {
            "total": total_enrollments,
            "active": active_enrollments,
            "completed": completed_courses,
            "failed": failed_courses,
            "completion_rate": round(completed_courses / total_enrollments * 100, 1) if total_enrollments else 0.0,
        },
        "certificates": {
            "total_issued": certs_issued,
        },
        "revenue": {
            "total_kes": round(total_revenue, 2),
            "this_month_kes": round(revenue_this_month, 2),
        },
        "quizzes": {
            "total_attempts": total_attempts,
            "passed_attempts": passed_attempts,
            "average_score_pct": round(avg_score, 1),
        },
        "engagement": {
            "total_downloads": total_downloads,
            "total_forum_posts": total_forum_posts,
        },
    }


# ══════════════════════════════════════════════════════════════════════════════
# 2. COURSE ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/courses")
def course_analytics(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    courses = db.query(Course).all()
    result = []
    for c in courses:
        enrolled = db.query(Enrollment).filter(Enrollment.course_id == c.id).count()
        completed = db.query(Enrollment).filter(
            Enrollment.course_id == c.id,
            Enrollment.status.in_(["passed", "completed"]),
        ).count()
        failed = db.query(Enrollment).filter(
            Enrollment.course_id == c.id, Enrollment.status == "failed"
        ).count()
        active = db.query(Enrollment).filter(
            Enrollment.course_id == c.id,
            Enrollment.status.in_(["enrolled", "in_progress", "retake_allowed"]),
        ).count()
        lesson_count = db.query(Lesson).join(Module).filter(Module.course_id == c.id).count()
        quiz_count   = db.query(Quiz).filter(Quiz.course_id == c.id).count()
        avg_score    = db.query(func.avg(QuizAttempt.percentage)).join(
            Quiz, QuizAttempt.quiz_id == Quiz.id
        ).filter(Quiz.course_id == c.id, QuizAttempt.status == "graded").scalar()

        result.append({
            "id": c.id,
            "title": c.title,
            "difficulty": c.difficulty,
            "is_published": c.is_published,
            "price_kes": c.price,
            "lesson_count": lesson_count,
            "quiz_count": quiz_count,
            "total_enrollments": enrolled,
            "active_enrollments": active,
            "completions": completed,
            "failures": failed,
            "completion_rate": round(completed / enrolled * 100, 1) if enrolled else 0.0,
            "avg_quiz_score": round(avg_score, 1) if avg_score else None,
        })
    result.sort(key=lambda x: x["total_enrollments"], reverse=True)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 3. STUDENT ANALYTICS (list + drill-down)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/students")
def students_overview(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    institution: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Paginated student list with progress metrics. Passwords never exposed."""
    q = db.query(User).filter(User.role == "student")
    if institution:
        q = q.filter(User.institution == institution)
    if search:
        q = q.filter(User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    total = q.count()
    students = q.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    results = []
    for s in students:
        enrollments = db.query(Enrollment).filter(Enrollment.user_id == s.id).all()
        active_e = next((e for e in enrollments if e.status in ("enrolled", "in_progress", "retake_allowed")), None)
        completed = [e for e in enrollments if e.status in ("passed", "completed")]
        failed    = [e for e in enrollments if e.status == "failed"]
        attempts  = db.query(QuizAttempt).filter(QuizAttempt.user_id == s.id).count()
        passed_q  = db.query(QuizAttempt).filter(QuizAttempt.user_id == s.id, QuizAttempt.passed == True).count()
        certs     = db.query(Certificate).filter(Certificate.user_id == s.id, Certificate.revoked == False).count()
        downloads = db.query(Download).filter(Download.user_id == s.id).count()
        last_event = db.query(func.max(AnalyticsEvent.created_at)).filter(
            AnalyticsEvent.user_id == s.id
        ).scalar()

        results.append({
            "id": s.id,
            "full_name": s.full_name,
            "email": s.email,
            "institution": s.institution,
            "registered_at": s.created_at.isoformat() if s.created_at else None,
            "is_active": s.is_active,
            "current_course": active_e.course.title if active_e and active_e.course else None,
            "current_course_id": active_e.course_id if active_e else None,
            "enrollment_status": active_e.status if active_e else None,
            "courses_completed": len(completed),
            "courses_failed": len(failed),
            "total_quiz_attempts": attempts,
            "quizzes_passed": passed_q,
            "quizzes_failed": attempts - passed_q,
            "certificates_earned": certs,
            "total_downloads": downloads,
            "last_activity": last_event.isoformat() if last_event else None,
        })

    return {"total": total, "page": page, "limit": limit, "items": results}


@router.get("/students/{student_id}")
def student_detail(
    student_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Full learner profile for admin — NO password field returned."""
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(404, "Student not found")

    enrollments = db.query(Enrollment).filter(Enrollment.user_id == student_id).all()
    enrollment_data = []
    for e in enrollments:
        course = db.query(Course).filter(Course.id == e.course_id).first()
        lp = db.query(LearnerProgress).filter_by(user_id=student_id, course_id=e.course_id).first()
        enrollment_data.append({
            "id": e.id,
            "course_id": e.course_id,
            "course_title": course.title if course else e.course_id,
            "status": e.status,
            "attempt_count": e.attempt_count,
            "max_retakes": e.max_retakes,
            "final_score_pct": e.final_score_pct,
            "passed": e.passed,
            "amount_paid": e.amount_paid,
            "progress_pct": lp.overall_progress_pct if lp else None,
            "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
            "completed_at": e.completed_at.isoformat() if e.completed_at else None,
        })

    certs = db.query(Certificate).filter(
        Certificate.user_id == student_id, Certificate.revoked == False
    ).all()
    cert_data = [{
        "certificate_number": c.certificate_number,
        "course_name": c.course_name,
        "final_score_pct": c.final_score_pct,
        "issued_at": c.issued_at.isoformat(),
        "pdf_url": c.pdf_url,
    } for c in certs]

    downloads = db.query(Download).filter(Download.user_id == student_id).count()
    last_event = db.query(func.max(AnalyticsEvent.created_at)).filter(
        AnalyticsEvent.user_id == student_id
    ).scalar()

    return {
        "id": student.id,
        "full_name": student.full_name,
        "email": student.email,
        "institution": student.institution,
        "bio": student.bio,
        "is_active": student.is_active,
        "registered_at": student.created_at.isoformat() if student.created_at else None,
        "last_activity": last_event.isoformat() if last_event else None,
        "total_downloads": downloads,
        "enrollments": enrollment_data,
        "certificates": cert_data,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 4. STUDENT QUIZ HISTORY
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/students/{student_id}/quiz-history")
def student_quiz_history(
    student_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Full quiz attempt history for a specific learner, including per-question breakdown."""
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == student_id
    ).order_by(QuizAttempt.started_at.desc()).all()

    history = []
    for attempt in attempts:
        quiz = attempt.quiz
        course_title = None
        if quiz and quiz.course_id:
            course = db.query(Course).filter(Course.id == quiz.course_id).first()
            course_title = course.title if course else None

        # Per-question breakdown
        responses = []
        for resp in attempt.responses:
            q = resp.question
            mg = resp.manual_grade
            responses.append({
                "question_id": q.id,
                "type": q.type,
                "prompt": q.prompt[:200],
                "marks": q.marks,
                "is_correct": resp.is_correct,
                "auto_marks_awarded": resp.auto_marks_awarded,
                "requires_manual": q.requires_manual_grading,
                "manual_marks_awarded": mg.marks_awarded if mg else None,
                "instructor_feedback": mg.feedback if mg else None,
            })

        history.append({
            "attempt_id": attempt.id,
            "quiz_id": attempt.quiz_id,
            "quiz_title": quiz.title if quiz else "Unknown",
            "course_title": course_title,
            "attempt_number": attempt.attempt_number,
            "status": attempt.status,
            "auto_score": attempt.auto_score,
            "manual_score": attempt.manual_score,
            "total_score": attempt.total_score,
            "max_score": attempt.max_score,
            "percentage": attempt.percentage,
            "passed": attempt.passed,
            "time_taken_seconds": attempt.time_taken_seconds,
            "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
            "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            "graded_at": attempt.graded_at.isoformat() if attempt.graded_at else None,
            "questions": responses,
        })

    return {"student_id": student_id, "full_name": student.full_name, "attempts": history}


# ══════════════════════════════════════════════════════════════════════════════
# 5. INSTITUTION ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/institutions")
def institution_analytics(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """Per-institution breakdown: learners, enrollments, completions, certs, quiz perf."""
    institutions = db.query(
        User.institution, func.count(User.id).label("learner_count")
    ).filter(
        User.role == "student", User.institution.isnot(None), User.institution != ""
    ).group_by(User.institution).order_by(func.count(User.id).desc()).all()

    result = []
    for inst, count in institutions:
        student_ids = [
            s.id for s in db.query(User.id).filter(
                User.institution == inst, User.role == "student"
            ).all()
        ]
        if not student_ids:
            continue

        enrollments = db.query(Enrollment).filter(
            Enrollment.user_id.in_(student_ids)
        ).count()
        completions = db.query(Enrollment).filter(
            Enrollment.user_id.in_(student_ids),
            Enrollment.status.in_(["passed", "completed"]),
        ).count()
        certs = db.query(Certificate).filter(
            Certificate.user_id.in_(student_ids), Certificate.revoked == False
        ).count()
        avg_score = db.query(func.avg(QuizAttempt.percentage)).filter(
            QuizAttempt.user_id.in_(student_ids),
            QuizAttempt.status == "graded",
        ).scalar()
        # Active in last 30 days
        active = db.query(distinct(AnalyticsEvent.user_id)).filter(
            AnalyticsEvent.user_id.in_(student_ids),
            AnalyticsEvent.created_at >= _days_ago(30),
        ).count()

        result.append({
            "institution": inst,
            "total_learners": count,
            "active_learners_30d": active,
            "total_enrollments": enrollments,
            "completions": completions,
            "completion_rate": round(completions / enrollments * 100, 1) if enrollments else 0.0,
            "certificates_earned": certs,
            "avg_quiz_score": round(avg_score, 1) if avg_score else None,
        })

    return result


# ══════════════════════════════════════════════════════════════════════════════
# 6. CERTIFICATE ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/certificates")
def certificate_analytics(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    total = db.query(Certificate).filter(Certificate.revoked == False).count()
    revoked = db.query(Certificate).filter(Certificate.revoked == True).count()
    this_month = db.query(Certificate).filter(
        Certificate.issued_at >= _days_ago(30), Certificate.revoked == False
    ).count()

    # By course
    by_course = db.query(
        Certificate.course_name, func.count(Certificate.id).label("count")
    ).filter(Certificate.revoked == False).group_by(
        Certificate.course_name
    ).order_by(func.count(Certificate.id).desc()).all()

    # By level
    by_level = db.query(
        Certificate.certification_level, func.count(Certificate.id).label("count")
    ).filter(Certificate.revoked == False).group_by(Certificate.certification_level).all()

    # Recent issues
    recent = db.query(Certificate).filter(
        Certificate.revoked == False
    ).order_by(Certificate.issued_at.desc()).limit(10).all()

    return {
        "total_issued": total,
        "revoked": revoked,
        "issued_this_month": this_month,
        "by_course": [{"course": r.course_name, "count": r.count} for r in by_course],
        "by_level": [{"level": r.certification_level or "Unspecified", "count": r.count} for r in by_level],
        "recent": [{
            "certificate_number": c.certificate_number,
            "learner_name": c.learner_name,
            "course_name": c.course_name,
            "final_score_pct": c.final_score_pct,
            "issued_at": c.issued_at.isoformat(),
        } for c in recent],
    }


# ══════════════════════════════════════════════════════════════════════════════
# 7. PAYMENT / REVENUE ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/payments")
def payment_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    cutoff = _days_ago(days)

    total_revenue = db.query(func.coalesce(func.sum(MpesaTransaction.amount), 0)).filter(
        MpesaTransaction.status == "success"
    ).scalar() or 0.0

    period_revenue = db.query(func.coalesce(func.sum(MpesaTransaction.amount), 0)).filter(
        MpesaTransaction.status == "success",
        MpesaTransaction.completed_at >= cutoff,
    ).scalar() or 0.0

    by_status = db.query(
        MpesaTransaction.status, func.count(MpesaTransaction.id).label("count")
    ).group_by(MpesaTransaction.status).all()

    recent_txns = db.query(MpesaTransaction).filter(
        MpesaTransaction.completed_at >= cutoff
    ).order_by(MpesaTransaction.initiated_at.desc()).limit(20).all()

    return {
        "total_revenue_all_time_kes": round(total_revenue, 2),
        "revenue_last_n_days_kes": round(period_revenue, 2),
        "period_days": days,
        "by_status": [{"status": r.status, "count": r.count} for r in by_status],
        "recent_transactions": [{
            "id": t.id,
            "mpesa_receipt_number": t.mpesa_receipt_number,
            "amount": t.amount,
            "phone_number": t.phone_number,
            "status": t.status,
            "initiated_at": t.initiated_at.isoformat(),
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        } for t in recent_txns],
    }


# ══════════════════════════════════════════════════════════════════════════════
# 8. ACTIVITY FEEDS (Admin Dashboard "Recent Activity")
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/recent-activity")
def recent_activity(
    limit: int = Query(20, ge=5, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Combined recent activity feed for the admin dashboard."""

    recent_enrollments = db.query(Enrollment).order_by(
        Enrollment.created_at.desc()
    ).limit(limit // 4).all()

    recent_attempts = db.query(QuizAttempt).filter(
        QuizAttempt.submitted_at.isnot(None)
    ).order_by(QuizAttempt.submitted_at.desc()).limit(limit // 4).all()

    recent_certs = db.query(Certificate).filter(
        Certificate.revoked == False
    ).order_by(Certificate.issued_at.desc()).limit(limit // 4).all()

    recent_payments = db.query(MpesaTransaction).filter(
        MpesaTransaction.status == "success"
    ).order_by(MpesaTransaction.completed_at.desc()).limit(limit // 4).all()

    activity = []

    for e in recent_enrollments:
        user = db.query(User).filter(User.id == e.user_id).first()
        activity.append({
            "type": "enrollment",
            "icon": "BookOpen",
            "message": f"{user.full_name if user else 'A learner'} enrolled in {e.course.title if e.course else 'a course'}",
            "status": e.status,
            "ts": e.created_at.isoformat(),
        })

    for a in recent_attempts:
        user = db.query(User).filter(User.id == a.user_id).first()
        quiz = a.quiz
        activity.append({
            "type": "quiz_attempt",
            "icon": "ClipboardList",
            "message": f"{user.full_name if user else 'A learner'} submitted '{quiz.title if quiz else 'a quiz'}' — {a.percentage:.0f}%",
            "status": "passed" if a.passed else "failed" if a.passed is False else "pending",
            "ts": a.submitted_at.isoformat() if a.submitted_at else a.started_at.isoformat(),
        })

    for c in recent_certs:
        activity.append({
            "type": "certificate",
            "icon": "Award",
            "message": f"Certificate issued: {c.learner_name} — {c.course_name}",
            "status": "issued",
            "ts": c.issued_at.isoformat(),
        })

    for p in recent_payments:
        activity.append({
            "type": "payment",
            "icon": "CreditCard",
            "message": f"M-Pesa payment {p.mpesa_receipt_number or ''} — KES {p.amount:,.0f}",
            "status": "success",
            "ts": p.completed_at.isoformat() if p.completed_at else p.initiated_at.isoformat(),
        })

    activity.sort(key=lambda x: x["ts"], reverse=True)
    return activity[:limit]


# ══════════════════════════════════════════════════════════════════════════════
# 9. WEEKLY TREND DATA (for line/bar charts)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/trends")
def weekly_trends(
    weeks: int = Query(8, ge=2, le=52),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Weekly enrollment, registration, and quiz attempt counts for trend charts."""
    result = []
    for w in range(weeks - 1, -1, -1):
        week_start = _days_ago(w * 7 + 7)
        week_end   = _days_ago(w * 7)
        label = week_start.strftime("%d %b")

        new_students = db.query(User).filter(
            User.role == "student",
            User.created_at >= week_start, User.created_at < week_end,
        ).count()
        new_enrollments = db.query(Enrollment).filter(
            Enrollment.created_at >= week_start, Enrollment.created_at < week_end,
        ).count()
        quiz_attempts = db.query(QuizAttempt).filter(
            QuizAttempt.started_at >= week_start, QuizAttempt.started_at < week_end,
        ).count()
        completions = db.query(Enrollment).filter(
            Enrollment.completed_at >= week_start, Enrollment.completed_at < week_end,
        ).count()

        result.append({
            "week": label,
            "new_students": new_students,
            "new_enrollments": new_enrollments,
            "quiz_attempts": quiz_attempts,
            "completions": completions,
        })

    return result


# ══════════════════════════════════════════════════════════════════════════════
# 10. MOST VIEWED / DOWNLOADED RESOURCES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/resources")
def resource_analytics(
    limit: int = Query(10, ge=5, le=50),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from app.models.course import Resource
    top_downloads = db.query(Resource).order_by(Resource.download_count.desc()).limit(limit).all()

    most_viewed = db.query(
        AnalyticsEvent.entity_id, func.count(AnalyticsEvent.id).label("views")
    ).filter(AnalyticsEvent.event_type == "lesson_view").group_by(
        AnalyticsEvent.entity_id
    ).order_by(func.count(AnalyticsEvent.id).desc()).limit(limit).all()

    return {
        "top_downloaded_resources": [{
            "id": r.id,
            "title": r.title,
            "type": r.type,
            "download_count": r.download_count,
        } for r in top_downloads],
        "most_viewed_lessons": [{"lesson_id": e.entity_id, "views": e.views} for e in most_viewed],
    }
