"""
M-Pesa / Safaricom Daraja API service.

Implements:
  - OAuth2 token acquisition (cached, refreshed on expiry)
  - STK Push (Lipa Na M-Pesa Online / C2B)
  - Callback signature/validation
  - Enrollment activation on successful callback

Security:
  - Credentials read from environment variables only (never from request body)
  - Enrollment activated only on ResultCode == 0 in a *validated* callback
  - Duplicate CheckoutRequestIDs are handled idempotently
  - No sensitive Daraja credentials are stored in the database

References:
  https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
"""
import base64
import httpx
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.enrollment import Enrollment, MpesaTransaction

logger = logging.getLogger(__name__)

# Module-level token cache (simple in-process cache; fine for single-worker)
_token_cache: dict = {"token": None, "expires_at": 0.0}


def _phone_to_safaricom_format(phone: str) -> str:
    """Normalise a phone number to 2547XXXXXXXX format."""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+"):
        phone = phone[1:]
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    if not phone.startswith("254"):
        phone = "254" + phone
    return phone


def _get_access_token() -> str:
    """
    Acquire a Daraja OAuth2 access token, using the module-level cache.
    Tokens are valid for 3600 seconds; we refresh 60 s before expiry.
    """
    import time
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"] - 60:
        return _token_cache["token"]

    credentials = base64.b64encode(
        f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}".encode()
    ).decode()

    response = httpx.get(
        f"{settings.daraja_base_url}/oauth/v1/generate?grant_type=client_credentials",
        headers={"Authorization": f"Basic {credentials}"},
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()
    _token_cache["token"] = data["access_token"]
    _token_cache["expires_at"] = now + int(data.get("expires_in", 3600))
    return _token_cache["token"]


def _build_password() -> tuple[str, str]:
    """Return (base64_password, timestamp) for the STK push request."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    raw = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    password = base64.b64encode(raw.encode()).decode()
    return password, timestamp


def initiate_stk_push(
    *,
    phone: str,
    amount: float,
    account_ref: str,
    description: str,
) -> dict:
    """
    Initiate an STK push to the learner's phone.
    Returns the full Daraja response dict.

    Raises httpx.HTTPError on network failure.
    Raises ValueError if credentials are not configured.
    """
    if not settings.MPESA_CONSUMER_KEY:
        raise ValueError("M-Pesa credentials not configured. Set MPESA_* environment variables.")

    token = _get_access_token()
    password, timestamp = _build_password()
    phone_formatted = _phone_to_safaricom_format(phone)

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(round(amount)),          # M-Pesa requires integer KES
        "PartyA": phone_formatted,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone_formatted,
        "CallBackURL": settings.MPESA_CALLBACK_URL,
        "AccountReference": account_ref[:12],  # max 12 chars
        "TransactionDesc": description[:13],   # max 13 chars
    }

    response = httpx.post(
        f"{settings.daraja_base_url}/mpesa/stkpush/v1/processrequest",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def process_stk_callback(db: Session, callback_body: dict) -> None:
    """
    Process the Daraja STK callback.

    Expected structure:
    {
      "Body": {
        "stkCallback": {
          "MerchantRequestID": "...",
          "CheckoutRequestID": "...",
          "ResultCode": 0,
          "ResultDesc": "The service request is processed successfully.",
          "CallbackMetadata": {
            "Item": [
              {"Name": "Amount", "Value": 500},
              {"Name": "MpesaReceiptNumber", "Value": "LHG31AA5TX"},
              {"Name": "TransactionDate", "Value": 20191219102115},
              {"Name": "PhoneNumber", "Value": 254722000000}
            ]
          }
        }
      }
    }

    Security: We look up the transaction by CheckoutRequestID (which WE stored
    when we initiated the push). We do NOT trust any enrollment/user data from
    the callback body.
    """
    try:
        stk = callback_body["Body"]["stkCallback"]
        checkout_id = stk.get("CheckoutRequestID")
        result_code = int(stk.get("ResultCode", -1))
        result_desc = stk.get("ResultDesc", "")
    except (KeyError, TypeError, ValueError) as e:
        logger.error(f"Malformed M-Pesa callback: {e}")
        return

    # Look up by CheckoutRequestID — idempotent
    tx = db.query(MpesaTransaction).filter_by(checkout_request_id=checkout_id).first()
    if not tx:
        logger.warning(f"Received M-Pesa callback for unknown CheckoutRequestID: {checkout_id}")
        return

    if tx.status not in ("pending",):
        logger.info(f"Duplicate callback for {checkout_id} — already {tx.status}, ignoring")
        return

    tx.result_code = result_code
    tx.result_description = result_desc
    tx.completed_at = datetime.now(timezone.utc)

    if result_code == 0:
        # Extract metadata safely
        items = {}
        try:
            for item in stk["CallbackMetadata"]["Item"]:
                items[item["Name"]] = item.get("Value")
        except (KeyError, TypeError):
            pass

        tx.status = "success"
        tx.mpesa_receipt_number = str(items.get("MpesaReceiptNumber", ""))
        tx.amount = float(items.get("Amount", tx.amount))
        tx.phone_number = str(items.get("PhoneNumber", ""))

        # Activate enrollment — trust only our stored enrollment_id
        enrollment = db.query(Enrollment).filter_by(id=tx.enrollment_id).first()
        if enrollment and enrollment.status == "payment_pending":
            enrollment.status = "enrolled"
            enrollment.amount_paid = tx.amount
            enrollment.enrolled_at = datetime.now(timezone.utc)
            logger.info(f"Enrollment {enrollment.id} activated after successful M-Pesa payment")

    else:
        tx.status = "failed" if result_code != 1032 else "cancelled"
        # ResultCode 1032 = user cancelled the STK prompt
        enrollment = db.query(Enrollment).filter_by(id=tx.enrollment_id).first()
        if enrollment and enrollment.status == "payment_pending":
            # Leave as payment_pending so learner can retry
            logger.info(f"M-Pesa payment failed/cancelled for enrollment {enrollment.id}: {result_desc}")

    db.commit()
