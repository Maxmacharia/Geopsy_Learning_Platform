"""
Certificate issuance orchestration. Called after a quiz attempt is fully
graded (auto + manual) and the final score is known. Decides pass/fail
against the template's passing_percentage, generates the PDF, uploads it,
and creates the Certificate row.
"""
import os
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.certificate import Certificate, CertificateTemplate
from app.models.quiz_attempt import QuizAttempt
from app.models.course import Course
from app.models.user import User
from app.services.certificate_pdf import generate_certificate_pdf, generate_certificate_number
from app.utils.cloudinary import upload_bytes

LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "static", "geopsy-logo.png")


def issue_certificate_if_eligible(db: Session, attempt: QuizAttempt) -> Certificate | None:
    """
    Checks whether this graded attempt qualifies for a certificate and, if so,
    creates one. Returns the Certificate if issued, None if not eligible or
    one already exists for this attempt.
    """
    if attempt.certificate is not None:
        return attempt.certificate  # idempotent — don't double-issue

    if not attempt.passed:
        return None

    quiz = attempt.quiz
    course = db.query(Course).filter(Course.id == quiz.course_id).first() if quiz.course_id else None
    user = db.query(User).filter(User.id == attempt.user_id).first()
    if not user:
        return None

    template = (
        db.query(CertificateTemplate).filter(CertificateTemplate.course_id == quiz.course_id).first()
        if quiz.course_id else None
    )

    course_name = course.title if course else quiz.title
    qualification_title = template.qualification_title if template else "Certificate of Completion"
    competency_level = template.competency_level if template else "Foundational"
    statement = template.certification_statement if template else (
        "This certifies that the above-named learner has successfully completed "
        "the requirements of this course on the GeoPsy Learning Platform."
    )
    admin_name  = template.administrator_name if template else None
    admin_title = template.administrator_title if template else None

    next_seq = (db.query(func.count(Certificate.id)).scalar() or 0) + 1
    cert_number = generate_certificate_number(next_seq)

    cert = Certificate(
        user_id=user.id,
        course_id=quiz.course_id,
        attempt_id=attempt.id,
        template_id=template.id if template else None,
        certificate_number=cert_number,
        learner_name=user.full_name,
        course_name=course_name,
        competency_achieved=qualification_title,
        certification_level=competency_level,
        final_score_pct=attempt.percentage,
        issued_at=datetime.now(timezone.utc),
    )
    db.add(cert)
    db.flush()  # get cert.id / verification_id populated before PDF generation

    pdf_bytes = generate_certificate_pdf(
        learner_name=user.full_name,
        course_name=course_name,
        competency_achieved=qualification_title,
        certification_level=competency_level,
        certification_statement=statement,
        final_score_pct=attempt.percentage,
        certificate_number=cert_number,
        verification_id=cert.verification_id,
        issued_at=cert.issued_at,
        administrator_name=admin_name,
        administrator_title=admin_title,
        logo_path=LOGO_PATH if os.path.exists(LOGO_PATH) else None,
    )

    try:
        pdf_url = _upload_pdf_sync(pdf_bytes, cert.certificate_number)
        cert.pdf_url = pdf_url
    except Exception:
        # Certificate record still exists even if upload fails — admin can retry
        # generation later; we don't want a Cloudinary outage to block grading.
        pass

    db.commit()
    db.refresh(cert)
    return cert


def _upload_pdf_sync(pdf_bytes: bytes, public_id: str) -> str:
    """upload_bytes is async (matches the rest of the codebase's Cloudinary calls);
    this sync wrapper lets certificate issuance run inside non-async grading code."""
    import asyncio
    return asyncio.run(upload_bytes(pdf_bytes, public_id, folder="geopsy/certificates", resource_type="raw"))
