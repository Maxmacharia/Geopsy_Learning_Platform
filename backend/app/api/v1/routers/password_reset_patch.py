"""
Password-reset endpoints — append these to app/api/v1/routers/auth.py
by importing and including them. They are kept here as a separate patch
to avoid duplicating the full auth router.

To activate: add these two imports at the top of auth.py

    from app.utils.email import send_password_reset_email
    from app.core.security import decode_token, hash_password

Then add the two route functions below to the router.
"""

# ── Paste into auth.py ─────────────────────────────────────────────────────

# @router.post("/forgot-password", status_code=202)
# def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
#     user = db.query(User).filter(User.email == body.email).first()
#     if user:
#         from app.utils.email import send_password_reset_email
#         send_password_reset_email(user.email, user.id)
#     # Always return 202 to avoid email enumeration
#     return {"message": "If that email exists, a reset link has been sent."}


# @router.post("/reset-password", status_code=200)
# def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
#     payload = decode_token(body.token)
#     if not payload or payload.get("role") != "reset":
#         raise HTTPException(status_code=400, detail="Invalid or expired token")
#     user = db.query(User).filter(User.id == payload["sub"]).first()
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")
#     user.hashed_password = hash_password(body.new_password)
#     db.commit()
#     return {"message": "Password updated successfully."}
