"""
Shared test configuration. Centralizing the test database and the
`get_db` dependency override here (rather than duplicating it per-file)
avoids two test modules each overriding `app.dependency_overrides`
independently and stepping on each other's tables when run in the same
pytest session.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.base import Base
from app.core.dependencies import get_db

SQLITE_URL = "sqlite:///./test_shared.db"
engine_test = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


def _override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)
    if os.path.exists("test_shared.db"):
        os.remove("test_shared.db")


@pytest.fixture
def client():
    return TestClient(app)
