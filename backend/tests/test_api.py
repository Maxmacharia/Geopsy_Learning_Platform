"""
Basic test suite for Geopsy API.
Run with:  pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.base import Base
from app.db.session import SessionLocal
from app.core.dependencies import get_db

# Use an in-memory SQLite DB for tests
SQLITE_URL = "sqlite:///./test.db"
engine_test = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)
    import os
    if os.path.exists("test.db"):
        os.remove("test.db")


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def registered_user(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "test@geopsy.co.ke",
        "full_name": "Test User",
        "password": "Test1234!",
        "institution": "Test University",
    })
    return resp.json()


@pytest.fixture
def auth_headers(registered_user):
    return {"Authorization": f"Bearer {registered_user['access_token']}"}


@pytest.fixture
def admin_headers(client):
    """Create an admin user directly and get tokens."""
    from app.models.user import User
    from app.core.security import hash_password, create_access_token
    db = TestingSession()
    admin = db.query(User).filter(User.email == "admin@test.co.ke").first()
    if not admin:
        admin = User(
            email="admin@test.co.ke",
            full_name="Admin",
            hashed_password=hash_password("Admin1234!"),
            role="admin",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
    token = create_access_token(admin.id, "admin")
    db.close()
    return {"Authorization": f"Bearer {token}"}


# ── Health ────────────────────────────────────────────────────────────────

def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ── Auth ──────────────────────────────────────────────────────────────────

def test_register(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "new@geopsy.co.ke",
        "full_name": "New User",
        "password": "NewPass1!",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_register_duplicate_email(client, registered_user):
    resp = client.post("/api/v1/auth/register", json={
        "email": "test@geopsy.co.ke",
        "full_name": "Dup",
        "password": "Test1234!",
    })
    assert resp.status_code == 400


def test_login(client):
    client.post("/api/v1/auth/register", json={
        "email": "login@geopsy.co.ke",
        "full_name": "Login User",
        "password": "Login1234!",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": "login@geopsy.co.ke",
        "password": "Login1234!",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client):
    resp = client.post("/api/v1/auth/login", json={
        "email": "login@geopsy.co.ke",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


def test_get_me(client, auth_headers):
    resp = client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@geopsy.co.ke"


def test_get_me_unauthenticated(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


# ── Courses ───────────────────────────────────────────────────────────────

def test_list_courses_public(client):
    resp = client.get("/api/v1/courses")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data


def test_create_course_requires_admin(client, auth_headers):
    resp = client.post("/api/v1/courses", json={
        "title": "Test Course",
        "difficulty": "beginner",
    }, headers=auth_headers)
    assert resp.status_code == 403


def test_create_course_as_admin(client, admin_headers):
    resp = client.post("/api/v1/courses", json={
        "title": "GIS Fundamentals Test",
        "description": "A test course",
        "difficulty": "beginner",
        "is_published": True,
    }, headers=admin_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "GIS Fundamentals Test"
    assert "slug" in data
    return data


def test_get_course_by_slug(client, admin_headers):
    # Create first
    create_resp = client.post("/api/v1/courses", json={
        "title": "Slug Test Course",
        "difficulty": "intermediate",
        "is_published": True,
    }, headers=admin_headers)
    slug = create_resp.json()["slug"]

    resp = client.get(f"/api/v1/courses/{slug}")
    assert resp.status_code == 200
    assert resp.json()["slug"] == slug


def test_get_categories(client):
    resp = client.get("/api/v1/courses/categories")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ── Forums ────────────────────────────────────────────────────────────────

def test_list_forums(client):
    resp = client.get("/api/v1/forums")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_create_forum_requires_admin(client, auth_headers):
    resp = client.post("/api/v1/forums", json={"title": "Test Forum"}, headers=auth_headers)
    assert resp.status_code == 403


def test_create_forum_as_admin(client, admin_headers):
    resp = client.post("/api/v1/forums", json={
        "title": "QGIS Discussion",
        "description": "Talk about QGIS",
        "category": "QGIS",
    }, headers=admin_headers)
    assert resp.status_code == 201
    assert resp.json()["title"] == "QGIS Discussion"


# ── Bookmarks ─────────────────────────────────────────────────────────────

def test_bookmarks_requires_auth(client):
    resp = client.get("/api/v1/users/me/bookmarks")
    assert resp.status_code == 401


def test_get_bookmarks(client, auth_headers):
    resp = client.get("/api/v1/users/me/bookmarks", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ── Analytics ─────────────────────────────────────────────────────────────

def test_analytics_requires_admin(client, auth_headers):
    resp = client.get("/api/v1/analytics/overview", headers=auth_headers)
    assert resp.status_code == 403


def test_analytics_overview(client, admin_headers):
    resp = client.get("/api/v1/analytics/overview", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_students" in data
    assert "total_courses" in data
