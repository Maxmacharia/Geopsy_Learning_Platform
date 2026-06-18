import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
from app.core.security import create_access_token
import logging

logger = logging.getLogger(__name__)


def send_password_reset_email(email: str, user_id: str) -> bool:
    """Send a password-reset email. Returns True on success."""
    token = create_access_token(user_id, role="reset")
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    html = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px">
      <div style="text-align:center;margin-bottom:30px">
        <h2 style="color:#1d4ed8">🌍 Geopsy Learning Platform</h2>
      </div>
      <h3>Reset your password</h3>
      <p>We received a request to reset the password for your Geopsy account.</p>
      <p>Click the button below to set a new password. This link expires in 30 minutes.</p>
      <div style="text-align:center;margin:30px 0">
        <a href="{reset_url}"
           style="background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px">
        If you didn't request this, you can safely ignore this email.
        Your password will not be changed.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="color:#9ca3af;font-size:12px;text-align:center">
        Geopsy Learning Platform · Nairobi, Kenya
      </p>
    </body></html>
    """

    if not settings.SMTP_USER:
        logger.warning("SMTP not configured — password reset email not sent to %s", email)
        logger.info("Reset URL (dev only): %s", reset_url)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Reset your Geopsy password"
        msg["From"]    = settings.EMAILS_FROM
        msg["To"]      = email
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAILS_FROM, email, msg.as_string())
        return True
    except Exception as exc:
        logger.error("Failed to send reset email to %s: %s", email, exc)
        return False
