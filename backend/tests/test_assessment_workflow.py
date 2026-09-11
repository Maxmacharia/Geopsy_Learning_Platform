"""
End-to-end integration tests for the assessment system. DB setup, the
`get_db` override, and the `client` fixture live in conftest.py and are
shared with test_api.py.
"""
import pytest
from app.core.security import hash_password, create_access_token


@pytest.fixture
def auth_headers(client):
    import uuid
    email = f"learner-{uuid.uuid4().hex[:8]}@geopsy.co.ke"
    resp = client.post("/api/v1/auth/register", json={
        "email": email, "full_name": "Quiz Learner", "password": "Learner123!",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers():
    from app.models.user import User
    from tests.conftest import TestingSession
    import uuid
    db = TestingSession()
    email = f"quizadmin-{uuid.uuid4().hex[:8]}@geopsy.co.ke"
    admin = User(email=email, full_name="Quiz Admin", hashed_password=hash_password("Admin123!"), role="admin")
    db.add(admin)
    db.commit()
    db.refresh(admin)
    token = create_access_token(admin.id, "admin")
    db.close()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def published_quiz(client, admin_headers):
    """Creates a quiz with one auto-gradable and one manually-graded question, published."""
    quiz_resp = client.post("/api/v1/quizzes", json={
        "title": "GIS Fundamentals Quiz",
        "description": "Basic concepts check",
        "difficulty": "beginner",
        "max_attempts": 2,
        "passing_score_pct": 50.0,
    }, headers=admin_headers)
    assert quiz_resp.status_code == 201
    quiz_id = quiz_resp.json()["id"]

    # Auto-gradable: multiple choice
    q1 = client.post(f"/api/v1/quizzes/{quiz_id}/questions", json={
        "type": "multiple_choice",
        "prompt": "What does GIS stand for?",
        "options": [
            {"id": "a", "text": "Geographic Information System"},
            {"id": "b", "text": "General Internet Service"},
        ],
        "correct_answer": "a",
        "marks": 5.0,
    }, headers=admin_headers)
    assert q1.status_code == 201

    # Manually-graded: essay
    q2 = client.post(f"/api/v1/quizzes/{quiz_id}/questions", json={
        "type": "essay",
        "prompt": "Explain the difference between raster and vector data.",
        "marks": 10.0,
    }, headers=admin_headers)
    assert q2.status_code == 201
    assert q2.json()["requires_manual_grading"] is True

    pub = client.patch(f"/api/v1/quizzes/{quiz_id}/publish", headers=admin_headers)
    assert pub.status_code == 200
    assert pub.json()["status"] == "published"

    detail = client.get(f"/api/v1/quizzes/{quiz_id}", headers=admin_headers).json()
    return {
        "quiz_id": quiz_id,
        "mc_question_id": detail["questions"][0]["id"],
        "essay_question_id": detail["questions"][1]["id"],
    }


def test_quiz_creation_and_publish_flow(client, admin_headers, published_quiz):
    quiz_id = published_quiz["quiz_id"]
    detail = client.get(f"/api/v1/quizzes/{quiz_id}", headers=admin_headers).json()
    assert detail["status"] == "published"
    assert detail["total_marks"] == 15.0
    assert len(detail["questions"]) == 2


def test_non_admin_cannot_create_quiz(client, auth_headers):
    resp = client.post("/api/v1/quizzes", json={"title": "Hack Quiz"}, headers=auth_headers)
    assert resp.status_code == 403


def test_cannot_publish_quiz_with_no_questions(client, admin_headers):
    resp = client.post("/api/v1/quizzes", json={"title": "Empty Quiz"}, headers=admin_headers)
    quiz_id = resp.json()["id"]
    pub = client.patch(f"/api/v1/quizzes/{quiz_id}/publish", headers=admin_headers)
    assert pub.status_code == 400


def test_learner_can_preview_published_quiz(client, auth_headers, published_quiz):
    resp = client.get(f"/api/v1/quiz-attempts/quiz/{published_quiz['quiz_id']}/preview", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_attempt"] is True
    # Correct answers must NOT be exposed to learners
    for q in data["questions"]:
        assert "correct_answer" not in q


def test_full_attempt_with_mixed_grading(client, auth_headers, published_quiz):
    quiz_id = published_quiz["quiz_id"]

    # Start attempt
    start = client.post(f"/api/v1/quiz-attempts/quiz/{quiz_id}/start", headers=auth_headers)
    assert start.status_code == 201
    attempt_id = start.json()["attempt_id"]

    # Submit: correct MC answer + essay response
    submit = client.post(f"/api/v1/quiz-attempts/{attempt_id}/submit", json={
        "answers": [
            {"question_id": published_quiz["mc_question_id"], "response_data": "a"},
            {"question_id": published_quiz["essay_question_id"], "response_data": "Raster is grid-based, vector is geometry-based."},
        ]
    }, headers=auth_headers)
    assert submit.status_code == 200
    result = submit.json()

    # Auto-graded portion should already be scored
    assert result["auto_score"] == 5.0
    # But the attempt as a whole is awaiting manual grading because of the essay
    assert result["status"] == "awaiting_manual_grading"
    assert result["passed"] is None  # not finalized yet


def test_manual_grading_completes_attempt(client, admin_headers, auth_headers, published_quiz):
    quiz_id = published_quiz["quiz_id"]
    start = client.post(f"/api/v1/quiz-attempts/quiz/{quiz_id}/start", headers=auth_headers)
    attempt_id = start.json()["attempt_id"]

    client.post(f"/api/v1/quiz-attempts/{attempt_id}/submit", json={
        "answers": [
            {"question_id": published_quiz["mc_question_id"], "response_data": "a"},
            {"question_id": published_quiz["essay_question_id"], "response_data": "Good explanation."},
        ]
    }, headers=auth_headers)

    # Admin grading queue should now contain the essay response
    queue = client.get("/api/v1/grading/queue", headers=admin_headers)
    assert queue.status_code == 200
    pending = [item for item in queue.json() if item["attempt_id"] == attempt_id]
    assert len(pending) == 1
    response_id = pending[0]["response_id"]

    # Admin grades the essay
    grade_resp = client.post(f"/api/v1/grading/responses/{response_id}/grade", json={
        "marks_awarded": 8.0,
        "feedback": "Solid understanding, could mention topology.",
    }, headers=admin_headers)
    assert grade_resp.status_code == 200

    # Attempt should now be fully graded: 5 (auto) + 8 (manual) = 13 / 15 = 86.67%
    result = client.get(f"/api/v1/quiz-attempts/{attempt_id}/result", headers=auth_headers).json()
    assert result["status"] == "graded"
    assert result["total_score"] == 13.0
    assert result["percentage"] == pytest.approx(86.67, abs=0.1)
    assert result["passed"] is True


def test_certificate_issued_after_passing(client, admin_headers, auth_headers, published_quiz):
    quiz_id = published_quiz["quiz_id"]
    start = client.post(f"/api/v1/quiz-attempts/quiz/{quiz_id}/start", headers=auth_headers)
    attempt_id = start.json()["attempt_id"]

    client.post(f"/api/v1/quiz-attempts/{attempt_id}/submit", json={
        "answers": [
            {"question_id": published_quiz["mc_question_id"], "response_data": "a"},
            {"question_id": published_quiz["essay_question_id"], "response_data": "Answer."},
        ]
    }, headers=auth_headers)

    queue = client.get("/api/v1/grading/queue", headers=admin_headers).json()
    response_id = [i for i in queue if i["attempt_id"] == attempt_id][0]["response_id"]
    client.post(f"/api/v1/grading/responses/{response_id}/grade", json={"marks_awarded": 10.0}, headers=admin_headers)

    certs = client.get("/api/v1/certificates/me", headers=auth_headers)
    assert certs.status_code == 200
    assert len(certs.json()) == 1
    cert = certs.json()[0]
    assert cert["certificate_number"].startswith("GEOPSY-")

    # Public verification should work without auth
    verify = client.get(f"/api/v1/certificates/verify/{cert['verification_id']}")
    assert verify.status_code == 200
    assert verify.json()["valid"] is True


def test_max_attempts_enforced(client, auth_headers, published_quiz):
    quiz_id = published_quiz["quiz_id"]
    # max_attempts was set to 2 in the fixture
    for _ in range(2):
        start = client.post(f"/api/v1/quiz-attempts/quiz/{quiz_id}/start", headers=auth_headers)
        assert start.status_code == 201
        attempt_id = start.json()["attempt_id"]
        client.post(f"/api/v1/quiz-attempts/{attempt_id}/submit", json={"answers": []}, headers=auth_headers)

    third = client.post(f"/api/v1/quiz-attempts/quiz/{quiz_id}/start", headers=auth_headers)
    assert third.status_code == 403


def test_quiz_duplication(client, admin_headers, published_quiz):
    quiz_id = published_quiz["quiz_id"]
    dup = client.post(f"/api/v1/quizzes/{quiz_id}/duplicate", json={}, headers=admin_headers)
    assert dup.status_code == 201
    data = dup.json()
    assert data["title"] == "GIS Fundamentals Quiz (Copy)"
    assert data["status"] == "draft"  # duplicates always start as draft
    assert len(data["questions"]) == 2
