from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

QUESTION_TYPES = [
    "multiple_choice", "multiple_select", "true_false", "fill_blank", "matching",
    "short_answer", "essay", "gis_workflow", "python_code", "r_code",
    "file_upload", "map_design",
]

# Question types that can be graded automatically without human review
AUTO_GRADABLE_TYPES = {"multiple_choice", "multiple_select", "true_false", "fill_blank", "matching"}


class QuestionCreate(BaseModel):
    type: str
    prompt: str
    options: Optional[Any] = None
    correct_answer: Optional[Any] = None
    marks: float = 1.0
    partial_credit: bool = False
    negative_marking: float = 0.0
    grading_rubric: Optional[str] = None
    order_index: int = 0


class QuestionUpdate(BaseModel):
    type: Optional[str] = None
    prompt: Optional[str] = None
    options: Optional[Any] = None
    correct_answer: Optional[Any] = None
    marks: Optional[float] = None
    partial_credit: Optional[bool] = None
    negative_marking: Optional[float] = None
    grading_rubric: Optional[str] = None
    order_index: Optional[int] = None


class QuestionAdminOut(BaseModel):
    """Full question detail — includes correct_answer. Admin only."""
    id: str
    quiz_id: str
    type: str
    prompt: str
    options: Optional[Any]
    correct_answer: Optional[Any]
    marks: float
    partial_credit: bool
    negative_marking: float
    requires_manual_grading: bool
    grading_rubric: Optional[str]
    order_index: int
    model_config = {"from_attributes": True}


class QuestionLearnerOut(BaseModel):
    """Question shown to a learner taking the quiz — correct_answer hidden."""
    id: str
    type: str
    prompt: str
    options: Optional[Any]
    marks: float
    order_index: int
    model_config = {"from_attributes": True}


class QuizCreate(BaseModel):
    title: str
    description: Optional[str] = None
    course_id: Optional[str] = None
    module_id: Optional[str] = None
    lesson_id: Optional[str] = None
    category: Optional[str] = None
    difficulty: str = "beginner"
    opens_at: Optional[datetime] = None
    closes_at: Optional[datetime] = None
    time_limit_minutes: Optional[int] = None
    max_attempts: int = 1
    passing_score_pct: float = 60.0
    randomize_questions: bool = False
    randomize_answers: bool = False


class QuizUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    course_id: Optional[str] = None
    module_id: Optional[str] = None
    lesson_id: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    status: Optional[str] = None
    opens_at: Optional[datetime] = None
    closes_at: Optional[datetime] = None
    time_limit_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    passing_score_pct: Optional[float] = None
    randomize_questions: Optional[bool] = None
    randomize_answers: Optional[bool] = None


class QuizListItem(BaseModel):
    id: str
    title: str
    description: Optional[str]
    course_id: Optional[str]
    category: Optional[str]
    difficulty: str
    status: str
    opens_at: Optional[str]
    closes_at: Optional[str]
    time_limit_minutes: Optional[int]
    max_attempts: int
    passing_score_pct: float
    total_marks: float
    question_count: int = 0
    created_at: str


class QuizAdminDetail(QuizListItem):
    randomize_questions: bool
    randomize_answers: bool
    questions: List[QuestionAdminOut] = []


class QuizLearnerDetail(BaseModel):
    """What a learner sees before/during an attempt — no answers exposed."""
    id: str
    title: str
    description: Optional[str]
    difficulty: str
    time_limit_minutes: Optional[int]
    max_attempts: int
    passing_score_pct: float
    total_marks: float
    attempts_used: int = 0
    can_attempt: bool = True
    questions: List[QuestionLearnerOut] = []


class DuplicateQuizRequest(BaseModel):
    new_title: Optional[str] = None
