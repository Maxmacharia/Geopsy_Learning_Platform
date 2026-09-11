"""seed/utils.py — shared helpers for all seeder modules."""
import hashlib, logging, uuid, random as _random
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

log = logging.getLogger("geopsy.seeder")
_SEED_EPOCH: datetime = datetime.now(timezone.utc) - timedelta(days=90)

def dt(days_after_epoch: float = 0, hours: float = 0) -> datetime:
    return _SEED_EPOCH + timedelta(days=days_after_epoch, hours=hours)

def now() -> datetime:
    return datetime.now(timezone.utc)

def sid(label: str) -> str:
    h = hashlib.md5(f"geopsy:{label}".encode(), usedforsecurity=False).hexdigest()
    return str(uuid.UUID(h))

def get_or_none(db: Session, model, **kwargs):
    return db.query(model).filter_by(**kwargs).first()

def exists(db: Session, model, **kwargs) -> bool:
    return get_or_none(db, model, **kwargs) is not None

_COUNTER = {"created": 0, "skipped": 0}

def created(label: str) -> None:
    _COUNTER["created"] += 1
    log.debug(f"  ✓  {label}")

def skipped(label: str) -> None:
    _COUNTER["skipped"] += 1
    log.debug(f"  ·  {label} (already exists)")

def reset_counters():
    _COUNTER["created"] = 0
    _COUNTER["skipped"] = 0

_rng = _random.Random(42)

def rng() -> _random.Random:
    return _rng

def pick(lst: list):
    return _rng.choice(lst)

def spread(lo: float, hi: float) -> float:
    return round(_rng.uniform(lo, hi), 2)
