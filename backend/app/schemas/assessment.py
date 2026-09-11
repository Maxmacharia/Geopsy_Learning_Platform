from pydantic import BaseModel
from typing import Optional, List, Any


class StartAttemptResponse(BaseModel):
    attempt_id: str
    quiz: dict  # QuizLearnerDetail-shaped, embedded to avoid double round-trip


class AnswerSubmit(BaseModel):
    question_id: str
    response_data: Optional[Any] = None
    file_url: Optional[str] = None


class SubmitAttemptRequest(BaseModel):
    answers: List[AnswerSubmit]


class AttemptResultItem(BaseModel):
    question_id: str
    type: str
    prompt: str
    marks: float
    is_correct: Optional[bool]
    auto_marks_awarded: float
    requires_manual_grading: bool
    manual_marks_awarded: Optional[float] = None
    manual_feedback: Optional[str] = None
    your_answer: Optional[Any] = None
    correct_answer: Optional[Any] = None  # only shown after grading is complete


class AttemptResult(BaseModel):
    attempt_id: str
    quiz_id: str
    quiz_title: str
    status: str
    auto_score: float
    manual_score: float
    total_score: float
    max_score: float
    percentage: float
    passed: Optional[bool]
    time_taken_seconds: Optional[int]
    submitted_at: Optional[str]
    graded_at: Optional[str]
    items: List[AttemptResultItem] = []


class AttemptListItem(BaseModel):
    id: str
    quiz_id: str
    quiz_title: str
    attempt_number: int
    status: str
    percentage: float
    passed: Optional[bool]
    started_at: str
    submitted_at: Optional[str]


# ── Manual grading ──────────────────────────────────────────────────────────

class GradingQueueItem(BaseModel):
    response_id: str
    attempt_id: str
    question_id: str
    question_type: str
    question_prompt: str
    max_marks: float
    learner_name: str
    quiz_title: str
    response_data: Optional[Any]
    file_url: Optional[str]
    submitted_at: str


class ManualGradeSubmit(BaseModel):
    marks_awarded: float
    feedback: Optional[str] = None


# ── Certificates ─────────────────────────────────────────────────────────────

class CertificateTemplateCreate(BaseModel):
    name: str
    qualification_title: str
    competency_level: str = "Foundational"
    certification_statement: Optional[str] = None
    passing_percentage: float = 60.0
    administrator_name: Optional[str] = None
    administrator_title: Optional[str] = None
    signature_image_url: Optional[str] = None
    course_id: Optional[str] = None


class CertificateOut(BaseModel):
    id: str
    certificate_number: str
    verification_id: str
    learner_name: str
    course_name: str
    competency_achieved: Optional[str]
    certification_level: Optional[str]
    final_score_pct: Optional[float]
    issued_at: str
    revoked: bool
    pdf_url: Optional[str]
    model_config = {"from_attributes": True}


class CertificateVerifyResponse(BaseModel):
    valid: bool
    certificate: Optional[CertificateOut] = None
    message: str
