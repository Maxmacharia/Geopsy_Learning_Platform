"""
Basic test suite for Geopsy API.
Run with:  pytest tests/ -v

DB setup, the `get_db` override, and the `client` fixture all live in
conftest.py and are shared across test files in this directory.
"""
import pytest
from app.core.security import hash_password, create_access_token


@pytest.fixture
def registered_user(client):
    import uuid
    unique_email = f"test-{uuid.uuid4().hex[:8]}@geopsy.co.ke"
    resp = client.post("/api/v1/auth/register", json={
        "email": unique_email,
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
    from tests.conftest import TestingSession
    import uuid
    db = TestingSession()
    email = f"admin-{uuid.uuid4().hex[:8]}@test.co.ke"
    admin = User(
        email=email,
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
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {registered_user['access_token']}"}).json()
    resp = client.post("/api/v1/auth/register", json={
        "email": me["email"],
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
    assert "@geopsy.co.ke" in resp.json()["email"]


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


def test_get_course_by_slug(client, admin_headers):
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
    # New comprehensive analytics returns nested structure
    assert "students" in data
    assert "total" in data["students"]
    assert "content" in data
    assert "enrollments" in data
    assert "certificates" in data
