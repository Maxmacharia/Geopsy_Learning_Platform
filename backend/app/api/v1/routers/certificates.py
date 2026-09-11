from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_admin, get_current_user
from app.models.user import User
from app.models.certificate import Certificate, CertificateTemplate
from app.schemas.assessment import (
    CertificateTemplateCreate, CertificateOut, CertificateVerifyResponse,
)

router = APIRouter(prefix="/certificates", tags=["certificates"])


def _cert_out(c: Certificate) -> CertificateOut:
    return CertificateOut(
        id=c.id, certificate_number=c.certificate_number, verification_id=c.verification_id,
        learner_name=c.learner_name, course_name=c.course_name,
        competency_achieved=c.competency_achieved, certification_level=c.certification_level,
        final_score_pct=c.final_score_pct, issued_at=c.issued_at.isoformat(),
        revoked=c.revoked, pdf_url=c.pdf_url,
    )


# ── Admin: certificate templates ────────────────────────────────────────────

@router.post("/templates", status_code=201)
def create_template(body: CertificateTemplateCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    template = CertificateTemplate(**body.model_dump(exclude_none=True))
    db.add(template)
    db.commit()
    db.refresh(template)
    return {"id": template.id, "name": template.name}


@router.get("/templates")
def list_templates(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    templates = db.query(CertificateTemplate).all()
    return [
        {
            "id": t.id, "name": t.name, "qualification_title": t.qualification_title,
            "competency_level": t.competency_level, "passing_percentage": t.passing_percentage,
            "course_id": t.course_id, "administrator_name": t.administrator_name,
        }
        for t in templates
    ]


@router.delete("/templates/{template_id}", status_code=204)
def delete_template(template_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    template = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")
    db.delete(template)
    db.commit()


# ── Learner: my certificates ────────────────────────────────────────────────

@router.get("/me", response_model=list[CertificateOut])
def my_certificates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    certs = db.query(Certificate).filter(Certificate.user_id == current_user.id, Certificate.revoked == False).all()
    return [_cert_out(c) for c in certs]


# ── Admin: all certificates issued ──────────────────────────────────────────

@router.get("", response_model=list[CertificateOut])
def list_all_certificates(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    certs = db.query(Certificate).order_by(Certificate.issued_at.desc()).all()
    return [_cert_out(c) for c in certs]


@router.patch("/{certificate_id}/revoke", status_code=200)
def revoke_certificate(certificate_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(404, "Certificate not found")
    cert.revoked = True
    db.commit()
    return {"ok": True}


# ── Public: verification page (no auth required — this is the point) ──────────

@router.get("/verify/{verification_id}", response_model=CertificateVerifyResponse)
def verify_certificate(verification_id: str, db: Session = Depends(get_db)):
    cert = db.query(Certificate).filter(Certificate.verification_id == verification_id).first()
    if not cert:
        return CertificateVerifyResponse(valid=False, message="No certificate found with this verification ID.")
    if cert.revoked:
        return CertificateVerifyResponse(valid=False, certificate=_cert_out(cert), message="This certificate has been revoked.")
    return CertificateVerifyResponse(valid=True, certificate=_cert_out(cert), message="This certificate is valid.")
