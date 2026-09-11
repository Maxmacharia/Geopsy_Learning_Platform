import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class CertificateTemplate(Base):
    """
    Admin-configurable certificate template. A course (or quiz) can reference
    a template to control the qualification title / competency wording shown
    on issued certificates.
    """
    __tablename__ = "certificate_templates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    qualification_title: Mapped[str] = mapped_column(String(255), nullable=False)   # e.g. "Certificate of Completion"
    competency_level:    Mapped[str] = mapped_column(String(100), default="Foundational")
    certification_statement: Mapped[str] = mapped_column(
        Text,
        default="This certifies that the above-named learner has successfully completed the requirements of this course on the GeoPsy Learning Platform."
    )

    passing_percentage: Mapped[float] = mapped_column(Float, default=60.0)
    administrator_name:     Mapped[str | None] = mapped_column(String(255), nullable=True)
    administrator_title:    Mapped[str | None] = mapped_column(String(255), nullable=True)
    signature_image_url:    Mapped[str | None] = mapped_column(Text, nullable=True)

    course_id: Mapped[str | None] = mapped_column(String, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    certificates = relationship("Certificate", back_populates="template")


class Certificate(Base):
    """
    An issued certificate for a learner who passed a quiz/course.
    `certificate_number` and `verification_id` are both unique and
    independently usable for the public verification page.
    """
    __tablename__ = "certificates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    user_id:     Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id:   Mapped[str | None] = mapped_column(String, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    attempt_id:  Mapped[str | None] = mapped_column(String, ForeignKey("quiz_attempts.id", ondelete="SET NULL"), nullable=True, unique=True)
    template_id: Mapped[str | None] = mapped_column(String, ForeignKey("certificate_templates.id", ondelete="SET NULL"), nullable=True)

    certificate_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    verification_id:    Mapped[str] = mapped_column(String(64), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))

    learner_name: Mapped[str] = mapped_column(String(255), nullable=False)   # snapshot at issue time
    course_name:  Mapped[str] = mapped_column(String(255), nullable=False)   # snapshot at issue time
    competency_achieved: Mapped[str | None] = mapped_column(String(255), nullable=True)
    certification_level: Mapped[str | None] = mapped_column(String(100), nullable=True)
    final_score_pct:     Mapped[float] = mapped_column(Float, nullable=True)

    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    revoked:   Mapped[bool] = mapped_column(Boolean, default=False)

    pdf_url: Mapped[str | None] = mapped_column(Text, nullable=True)  # Cloudinary URL of generated PDF

    user     = relationship("User")
    template = relationship("CertificateTemplate", back_populates="certificates")
    attempt  = relationship("QuizAttempt", back_populates="certificate")
