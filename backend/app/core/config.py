from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/geopsy_db"
    SECRET_KEY: str = "changeme-in-production-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM: str = "noreply@geopsy.co.ke"

    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:3000"]'

    # ── M-Pesa / Safaricom Daraja ───────────────────────────────────────────
    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_SHORTCODE: str = ""          # Till or Paybill number
    MPESA_PASSKEY: str = ""            # Lipa Na M-Pesa passkey
    MPESA_ENV: str = "sandbox"         # sandbox | production
    MPESA_CALLBACK_URL: str = ""       # public HTTPS URL for Daraja callbacks
    MPESA_ACCOUNT_REF: str = "GeoPsy"
    MPESA_TRANSACTION_DESC: str = "GeoPsy Course Fee"

    @property
    def cors_origins(self) -> List[str]:
        return json.loads(self.BACKEND_CORS_ORIGINS)

    @property
    def daraja_base_url(self) -> str:
        if self.MPESA_ENV == "production":
            return "https://api.safaricom.co.ke"
        return "https://sandbox.safaricom.co.ke"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
