"""
SQLite (used in the test suite) does not preserve timezone info on
round-trip, so a DateTime(timezone=True) column can come back naive
after a fetch even though it was stored as UTC-aware. PostgreSQL
(production) does not have this problem. `ensure_aware` normalizes
either case so comparisons never raise
"can't compare offset-naive and offset-aware datetimes".
"""
from datetime import datetime, timezone


def ensure_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
