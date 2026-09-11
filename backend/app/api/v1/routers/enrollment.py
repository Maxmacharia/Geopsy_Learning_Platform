"""
Enrollment API router.

Endpoints:
  POST /enrollments/              — start enrollment (initiates M-Pesa STK push for paid courses)
  GET  /enrollments/my            — learner's own enrollments
  GET  /enrollments/check/{course_id} — can this learner access this course?
  POST /enrollments/mpesa/callback — Daraja webhook (no auth required — validated internally)
  POST /enrollments/{id}/mark-in-progress — called when learner first opens a lesson
  POST /enrollments/{id}/record-result    — called when final quiz is graded
  GET  /enrollments/             — admin: all enrollments (paginated)
  GET  /enrollments/students     — admin: per-student drill-down
  PATCH /enrollments/{id}/grant-retake   — admin: grant extra retake
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment, MpesaTransaction
from app.models.progress_extra import LearnerProgress
from app.services.mpesa import initiate_stk_push, process_stk_callback

router = APIRouter(prefix="/enrollments", tags=["enrollments"])
logger = logging.getLogger(__name__)

ACTIVE_STATUSES = {"enrolled", "in_progress", "retake_allowed"}


# ── Pydantic schemas (inline for conciseness) ─────────────────────────────────

class EnrollRequest(BaseModel):
    course_id: str
    phone_number: Optional[str] = None   # required for paid courses


class EnrollmentOut(BaseModel):
    id: str
    course_id: str
    course_title: str
    status: str
    attempt_count: int
    max_retakes: int
    final_score_pct: Optional[float]
    passed: Optional[bool]
    amount_paid: float
    enrolled_at: Optional[str]
    completed_at: Optional[str]
    created_at: str


class AccessCheck(BaseModel):
    has_access: bool
    enrollment_id: Optional[str] = None
    status: Optional[str] = None
    message: str


def _enroll_out(e: Enrollment) -> EnrollmentOut:
    return EnrollmentOut(
        id=e.id, course_id=e.course_id,
        course_title=e.course.title if e.course else "",
        status=e.status, attempt_count=e.attempt_count, max_retakes=e.max_retakes,
        final_score_pct=e.final_score_pct, passed=e.passed,
        amount_paid=e.amount_paid,
        enrolled_at=e.enrolled_at.isoformat() if e.enrolled_at else None,
        completed_at=e.completed_at.isoformat() if e.completed_at else None,
        created_at=e.created_at.isoformat(),
    )


def _check_prerequisites(db: Session, user_id: str, course: Course) -> None:
    """Raise 403 if the learner has not completed all prerequisites."""
    if not course.prerequisite_id:
        return
    prereq_enrollment = db.query(Enrollment).filter_by(
        user_id=user_id, course_id=course.prerequisite_id
    ).filter(Enrollment.status.in_(["passed", "completed"])).first()
    if not prereq_enrollment:
        prereq = db.query(Course).filter_by(id=course.prerequisite_id).first()
        prereq_title = prereq.title if prereq else course.prerequisite_id
        raise HTTPException(
            403,
            f"You must complete '{prereq_title}' before enrolling in this course."
        )


def _get_active_enrollment(db: Session, user_id: str) -> Optional[Enrollment]:
    """Return any enrollment currently blocking a new one (active = ENROLLED or IN_PROGRESS)."""
    return db.query(Enrollment).filter(
        Enrollment.user_id == user_id,
        Enrollment.status.in_(ACTIVE_STATUSES),
    ).first()


# ── Learner endpoints ─────────────────────────────────────────────────────────

@router.post("", status_code=201)
def enroll_in_course(
    body: EnrollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start the enrollment flow for a course.

    For free courses (price == 0): immediately creates an 'enrolled' enrollment.
    For paid courses: creates a 'payment_pending' enrollment, initiates STK push,
    and returns the checkout_request_id so the frontend can poll for status.

    Backend enforces:
      - prerequisite completion
      - one-active-enrollment-at-a-time
      - no duplicate enrollment for the same course
    """
    course = db.query(Course).filter_by(id=body.course_id, is_published=True).first()
    if not course:
        raise HTTPException(404, "Course not found")

    # Check prerequisites
    _check_prerequisites(db, current_user.id, course)

    # Enforce one-course-at-a-time (ignores payment_pending — those can time out)
    active = _get_active_enrollment(db, current_user.id)
    if active and active.course_id != body.course_id:
        raise HTTPException(
            409,
            f"You already have an active enrollment in '{active.course.title}'. "
            "Complete or withdraw from that course before enrolling in another."
        )

    # Prevent duplicate enrollment in the same course
    existing = db.query(Enrollment).filter_by(
        user_id=current_user.id, course_id=body.course_id
    ).filter(Enrollment.status.in_([*ACTIVE_STATUSES, "payment_pending"])).first()
    if existing:
        return {"enrollment_id": existing.id, "status": existing.status,
                "message": "Already enrolled or payment pending"}

    # Create enrollment record
    enrollment = Enrollment(
        user_id=current_user.id,
        course_id=course.id,
        max_retakes=course.max_retakes,
        amount_paid=0.0,
        status="payment_pending" if course.price > 0 else "enrolled",
        enrolled_at=None if course.price > 0 else datetime.now(timezone.utc),
    )
    db.add(enrollment)
    db.flush()

    if course.price <= 0:
        db.commit()
        return {"enrollment_id": enrollment.id, "status": "enrolled",
                "message": "Enrolled successfully — this is a free course"}

    # Paid course — initiate STK push
    if not body.phone_number:
        db.rollback()
        raise HTTPException(422, "phone_number is required for paid courses")

    try:
        daraja_response = initiate_stk_push(
            phone=body.phone_number,
            amount=course.price,
            account_ref=f"GP-{enrollment.id[:8].upper()}",
            description=f"GeoPsy: {course.title[:13]}",
        )
    except ValueError as e:
        db.rollback()
        raise HTTPException(503, f"Payment service unavailable: {e}")
    except Exception as e:
        db.rollback()
        logger.error(f"Daraja STK push failed: {e}")
        raise HTTPException(502, "Payment gateway error. Please try again.")

    checkout_id  = daraja_response.get("CheckoutRequestID")
    merchant_id  = daraja_response.get("MerchantRequestID")
    response_code = daraja_response.get("ResponseCode", "1")

    if response_code != "0":
        db.rollback()
        raise HTTPException(502, f"M-Pesa error: {daraja_response.get('ResponseDescription','Unknown error')}")

    tx = MpesaTransaction(
        enrollment_id=enrollment.id,
        user_id=current_user.id,
        course_id=course.id,
        checkout_request_id=checkout_id,
        merchant_request_id=merchant_id,
        amount=course.price,
        phone_number=body.phone_number,
        status="pending",
    )
    db.add(tx)
    db.commit()

    return {
        "enrollment_id": enrollment.id,
        "status": "payment_pending",
        "checkout_request_id": checkout_id,
        "message": "M-Pesa payment prompt sent to your phone. Enter your PIN to complete enrollment.",
    }


@router.get("/my", response_model=list[EnrollmentOut])
def my_enrollments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enrollments = db.query(Enrollment).filter_by(user_id=current_user.id).order_by(
        Enrollment.created_at.desc()
    ).all()
    return [_enroll_out(e) for e in enrollments]


@router.get("/check/{course_id}", response_model=AccessCheck)
def check_access(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns whether the learner currently has access to a course's protected content."""
    enrollment = db.query(Enrollment).filter_by(
        user_id=current_user.id, course_id=course_id
    ).filter(Enrollment.status.in_([*ACTIVE_STATUSES, "passed", "completed"])).first()

    if enrollment:
        return AccessCheck(
            has_access=True, enrollment_id=enrollment.id,
            status=enrollment.status, message="You have access to this course",
        )
    return AccessCheck(
        has_access=False, enrollment_id=None, status=None,
        message="You are not enrolled in this course",
    )


@router.post("/mpesa/callback", include_in_schema=False)
async def mpesa_callback(request: Request, db: Session = Depends(get_db)):
    """
    Daraja callback endpoint — Safaricom POSTs here after payment.
    This endpoint has NO authentication (Daraja cannot send Bearer tokens).
    Security is provided by validating the CheckoutRequestID against our DB.
    """
    try:
        body = await request.json()
        logger.info(f"M-Pesa callback received: {body}")
        process_stk_callback(db, body)
    except Exception as e:
        logger.error(f"Error processing M-Pesa callback: {e}")
    # Always return 200 to Daraja — even on internal errors — to prevent retries
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@router.post("/{enrollment_id}/mark-in-progress")
def mark_in_progress(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enrollment = db.query(Enrollment).filter_by(id=enrollment_id, user_id=current_user.id).first()
    if not enrollment:
        raise HTTPException(404, "Enrollment not found")
    if enrollment.status == "enrolled":
        enrollment.status = "in_progress"
        db.commit()
    return {"status": enrollment.status}


@router.post("/{enrollment_id}/record-result")
def record_result(
    enrollment_id: str,
    score_pct: float,
    passed: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Called by the grading finalization flow to update enrollment after quiz completion."""
    enrollment = db.query(Enrollment).filter_by(id=enrollment_id, user_id=current_user.id).first()
    if not enrollment:
        raise HTTPException(404, "Enrollment not found")

    enrollment.final_score_pct = score_pct
    enrollment.passed = passed

    if passed:
        enrollment.status = "passed"
        enrollment.completed_at = datetime.now(timezone.utc)
    else:
        retakes_used = enrollment.attempt_count
        max_retakes = enrollment.max_retakes
        if max_retakes == 0 or retakes_used < max_retakes:
            enrollment.status = "retake_allowed"
        else:
            enrollment.status = "failed"

    db.commit()
    return {"status": enrollment.status}


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("", response_model=list[EnrollmentOut])
def list_all_enrollments(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    course_id: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = db.query(Enrollment)
    if status_filter:
        q = q.filter(Enrollment.status == status_filter)
    if course_id:
        q = q.filter(Enrollment.course_id == course_id)
    total = q.count()
    enrollments = q.order_by(Enrollment.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return [_enroll_out(e) for e in enrollments]


@router.patch("/{enrollment_id}/grant-retake")
def grant_retake(
    enrollment_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    enrollment = db.query(Enrollment).filter_by(id=enrollment_id).first()
    if not enrollment:
        raise HTTPException(404, "Enrollment not found")
    if enrollment.status not in ("failed", "retake_allowed"):
        raise HTTPException(400, f"Cannot grant retake for enrollment in status '{enrollment.status}'")
    enrollment.status = "retake_allowed"
    enrollment.attempt_count += 1
    db.commit()
    return {"status": enrollment.status, "attempt_count": enrollment.attempt_count}


@router.get("/payments")
def list_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = db.query(MpesaTransaction)
    if status_filter:
        q = q.filter(MpesaTransaction.status == status_filter)
    total = q.count()
    txns = q.order_by(MpesaTransaction.initiated_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": t.id,
                "enrollment_id": t.enrollment_id,
                "checkout_request_id": t.checkout_request_id,
                "mpesa_receipt_number": t.mpesa_receipt_number,
                "phone_number": t.phone_number,
                "amount": t.amount,
                "status": t.status,
                "result_description": t.result_description,
                "initiated_at": t.initiated_at.isoformat(),
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            }
            for t in txns
        ],
    }
