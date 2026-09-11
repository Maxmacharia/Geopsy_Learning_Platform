"""
Certificate generation: builds a branded PDF certificate, embeds a QR code
linking to the public verification page, and uploads the result to
Cloudinary (reusing the existing upload utility so file storage stays
consistent with the rest of the platform).
"""
import io
import qrcode
from datetime import datetime, timezone
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.lib.utils import ImageReader

from app.core.config import settings

# Brand colors matching the platform's semantic palette
INK   = HexColor("#080B14")
RING  = HexColor("#297AA4")
MUTED = HexColor("#4D6072")
BORDER = HexColor("#B9C6D0")
BG    = HexColor("#FFFFFF")


def generate_certificate_pdf(
    *,
    learner_name: str,
    course_name: str,
    competency_achieved: str | None,
    certification_level: str | None,
    certification_statement: str,
    final_score_pct: float | None,
    certificate_number: str,
    verification_id: str,
    issued_at: datetime,
    administrator_name: str | None = None,
    administrator_title: str | None = None,
    logo_path: str | None = None,
) -> bytes:
    """Returns raw PDF bytes for the certificate. Pure function — no I/O side effects."""

    buf = io.BytesIO()
    width, height = landscape(A4)
    c = pdf_canvas.Canvas(buf, pagesize=landscape(A4))

    # Background
    c.setFillColor(BG)
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # Decorative border
    margin = 14 * mm
    c.setStrokeColor(RING)
    c.setLineWidth(2)
    c.rect(margin, margin, width - 2 * margin, height - 2 * margin, fill=0, stroke=1)
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.rect(margin + 4 * mm, margin + 4 * mm, width - 2 * margin - 8 * mm, height - 2 * margin - 8 * mm, fill=0, stroke=1)

    center_x = width / 2

    # Logo (if available on disk)
    top_y = height - margin - 22 * mm
    if logo_path:
        try:
            img = ImageReader(logo_path)
            iw, ih = img.getSize()
            target_w = 50 * mm
            target_h = target_w * ih / iw
            c.drawImage(img, center_x - target_w / 2, top_y - target_h + 14 * mm, width=target_w, height=target_h, mask='auto')
        except Exception:
            pass  # degrade gracefully — certificate still generates without the logo

    # Title — pushed down to clear the full logo (which includes "RESEARCH" wordmark)
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(INK)
    c.drawCentredString(center_x, top_y - 28 * mm, "Certificate of Completion")

    # "This certifies that"
    c.setFont("Helvetica", 12)
    c.setFillColor(MUTED)
    c.drawCentredString(center_x, top_y - 44 * mm, "This certifies that")

    # Learner name
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(RING)
    c.drawCentredString(center_x, top_y - 56 * mm, learner_name)
    name_width = c.stringWidth(learner_name, "Helvetica-Bold", 24)
    c.setStrokeColor(RING)
    c.setLineWidth(1)
    c.line(center_x - name_width / 2 - 6 * mm, top_y - 59 * mm, center_x + name_width / 2 + 6 * mm, top_y - 59 * mm)

    # Statement
    c.setFont("Helvetica", 11)
    c.setFillColor(MUTED)
    statement_y = top_y - 70 * mm
    for line in _wrap_text(certification_statement, 95):
        c.drawCentredString(center_x, statement_y, line)
        statement_y -= 5.5 * mm

    # Course name
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(INK)
    c.drawCentredString(center_x, statement_y - 4 * mm, course_name)

    # Competency / level / score row
    detail_y = statement_y - 14 * mm
    c.setFont("Helvetica", 10)
    c.setFillColor(MUTED)
    details = []
    if competency_achieved:
        details.append(f"Competency: {competency_achieved}")
    if certification_level:
        details.append(f"Level: {certification_level}")
    if final_score_pct is not None:
        details.append(f"Score: {final_score_pct:.1f}%")
    c.drawCentredString(center_x, detail_y, "   ·   ".join(details))

    # Footer: date, cert number, signature, QR
    footer_y = margin + 18 * mm

    # Date + cert number (left)
    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED)
    c.drawString(margin + 16 * mm, footer_y + 6 * mm, f"Issued: {issued_at.strftime('%d %B %Y')}")
    c.drawString(margin + 16 * mm, footer_y, f"Certificate No: {certificate_number}")

    # Signature (center-right)
    if administrator_name:
        sig_x = center_x + 20 * mm
        c.setStrokeColor(BORDER)
        c.line(sig_x - 25 * mm, footer_y + 9 * mm, sig_x + 25 * mm, footer_y + 9 * mm)
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(INK)
        c.drawCentredString(sig_x, footer_y + 4 * mm, administrator_name)
        if administrator_title:
            c.setFont("Helvetica", 8)
            c.setFillColor(MUTED)
            c.drawCentredString(sig_x, footer_y - 1 * mm, administrator_title)

    # QR code (right) — links to verification page
    qr_data = f"{settings.FRONTEND_URL}/verify/{verification_id}"
    qr_img = qrcode.make(qr_data)
    qr_buf = io.BytesIO()
    qr_img.save(qr_buf, format="PNG")
    qr_buf.seek(0)
    qr_size = 22 * mm
    c.drawImage(
        ImageReader(qr_buf),
        width - margin - 16 * mm - qr_size, footer_y - 4 * mm,
        width=qr_size, height=qr_size, mask='auto',
    )
    c.setFont("Helvetica", 7)
    c.setFillColor(MUTED)
    c.drawCentredString(
        width - margin - 16 * mm - qr_size / 2, footer_y - 7 * mm,
        "Scan to verify"
    )

    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()


def _wrap_text(text: str, max_chars: int) -> list[str]:
    """Simple word-wrap for the certification statement paragraph."""
    words = text.split()
    lines, current = [], ""
    for word in words:
        if len(current) + len(word) + 1 <= max_chars:
            current = f"{current} {word}".strip()
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def generate_certificate_number(sequence: int) -> str:
    """e.g. GEOPSY-2025-000042"""
    year = datetime.now(timezone.utc).year
    return f"GEOPSY-{year}-{sequence:06d}"
