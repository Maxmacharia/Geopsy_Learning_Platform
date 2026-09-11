"""
Auto-grading engine for objective question types.

Each grade_* function takes (question, response_data) and returns
(is_correct: bool | None, marks_awarded: float).

`is_correct` is None for question types that need manual grading —
those are routed to the manual grading queue instead of being scored here.
"""
from typing import Any, Optional, Tuple
from app.models.quiz import Question

AUTO_GRADABLE_TYPES = {"multiple_choice", "multiple_select", "true_false", "fill_blank", "matching"}


def grade_multiple_choice(question: Question, response: Any) -> Tuple[bool, float]:
    correct = question.correct_answer
    is_correct = response is not None and str(response) == str(correct)
    marks = question.marks if is_correct else (-question.negative_marking if question.negative_marking else 0.0)
    return is_correct, max(marks, -question.marks)  # never lose more than the question is worth


def grade_multiple_select(question: Question, response: Any) -> Tuple[bool, float]:
    correct = set(question.correct_answer or [])
    chosen = set(response or [])

    if chosen == correct:
        return True, question.marks

    if question.partial_credit and correct:
        # Partial credit: fraction of correct selections minus penalty for wrong ones
        true_positives = len(chosen & correct)
        false_positives = len(chosen - correct)
        raw = (true_positives - false_positives) / len(correct)
        raw = max(0.0, raw)
        return False, round(raw * question.marks, 2)

    penalty = -question.negative_marking if question.negative_marking else 0.0
    return False, max(penalty, -question.marks)


def grade_true_false(question: Question, response: Any) -> Tuple[bool, float]:
    is_correct = response is not None and bool(response) == bool(question.correct_answer)
    marks = question.marks if is_correct else (-question.negative_marking if question.negative_marking else 0.0)
    return is_correct, max(marks, -question.marks)


def grade_fill_blank(question: Question, response: Any) -> Tuple[bool, float]:
    """correct_answer is a list of accepted strings; comparison is case-insensitive and trimmed."""
    accepted = [str(a).strip().lower() for a in (question.correct_answer or [])]
    given = str(response or "").strip().lower()
    is_correct = given in accepted
    marks = question.marks if is_correct else (-question.negative_marking if question.negative_marking else 0.0)
    return is_correct, max(marks, -question.marks)


def grade_matching(question: Question, response: Any) -> Tuple[bool, float]:
    """correct_answer and response are both dicts like {"1": "a", "2": "b"}."""
    correct = question.correct_answer or {}
    given = response or {}

    if not correct:
        return False, 0.0

    total_pairs = len(correct)
    matched = sum(1 for k, v in correct.items() if given.get(k) == v)

    if matched == total_pairs:
        return True, question.marks

    if question.partial_credit:
        return False, round((matched / total_pairs) * question.marks, 2)

    return False, 0.0


GRADERS = {
    "multiple_choice": grade_multiple_choice,
    "multiple_select": grade_multiple_select,
    "true_false":      grade_true_false,
    "fill_blank":      grade_fill_blank,
    "matching":        grade_matching,
}


def auto_grade_response(question: Question, response_data: Any) -> Tuple[Optional[bool], float]:
    """
    Dispatch to the correct grading function for this question's type.
    Returns (is_correct, marks_awarded). For non-auto-gradable types,
    returns (None, 0.0) — the caller is responsible for routing these
    to the manual grading queue.
    """
    if question.type not in AUTO_GRADABLE_TYPES:
        return None, 0.0

    grader = GRADERS.get(question.type)
    if not grader:
        return None, 0.0

    is_correct, marks = grader(question, response_data)
    return is_correct, marks


def requires_manual_grading(question_type: str) -> bool:
    return question_type not in AUTO_GRADABLE_TYPES
