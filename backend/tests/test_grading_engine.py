"""
Unit tests for app/services/grading_engine.py — these are pure functions
operating on a lightweight stand-in object, so no database or app
fixtures are needed. Fast and deterministic.
"""
import pytest
from types import SimpleNamespace
from app.services.grading_engine import (
    grade_multiple_choice, grade_multiple_select, grade_true_false,
    grade_fill_blank, grade_matching, auto_grade_response, requires_manual_grading,
)


def make_question(**kwargs):
    defaults = dict(marks=5.0, negative_marking=0.0, partial_credit=False, correct_answer=None, type="multiple_choice")
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


# ── Multiple choice ──────────────────────────────────────────────────────────

def test_multiple_choice_correct():
    q = make_question(correct_answer="b", marks=4.0)
    is_correct, marks = grade_multiple_choice(q, "b")
    assert is_correct is True
    assert marks == 4.0


def test_multiple_choice_incorrect_no_penalty():
    q = make_question(correct_answer="b", marks=4.0, negative_marking=0.0)
    is_correct, marks = grade_multiple_choice(q, "a")
    assert is_correct is False
    assert marks == 0.0


def test_multiple_choice_incorrect_with_negative_marking():
    q = make_question(correct_answer="b", marks=4.0, negative_marking=1.0)
    is_correct, marks = grade_multiple_choice(q, "a")
    assert is_correct is False
    assert marks == -1.0


def test_multiple_choice_no_answer():
    q = make_question(correct_answer="b", marks=4.0)
    is_correct, marks = grade_multiple_choice(q, None)
    assert is_correct is False


# ── Multiple select ──────────────────────────────────────────────────────────

def test_multiple_select_exact_match():
    q = make_question(correct_answer=["a", "c"], marks=6.0)
    is_correct, marks = grade_multiple_select(q, ["a", "c"])
    assert is_correct is True
    assert marks == 6.0


def test_multiple_select_order_independent():
    q = make_question(correct_answer=["a", "c"], marks=6.0)
    is_correct, marks = grade_multiple_select(q, ["c", "a"])
    assert is_correct is True


def test_multiple_select_partial_credit():
    q = make_question(correct_answer=["a", "b", "c"], marks=6.0, partial_credit=True)
    # 2 of 3 correct, 0 wrong selections -> 2/3 of marks
    is_correct, marks = grade_multiple_select(q, ["a", "b"])
    assert is_correct is False
    assert marks == 4.0


def test_multiple_select_partial_credit_with_wrong_selection():
    q = make_question(correct_answer=["a", "b", "c"], marks=6.0, partial_credit=True)
    # 1 correct (a), 1 wrong (d) -> (1-1)/3 = 0
    is_correct, marks = grade_multiple_select(q, ["a", "d"])
    assert marks == 0.0


def test_multiple_select_no_partial_credit_wrong():
    q = make_question(correct_answer=["a", "b"], marks=6.0, partial_credit=False)
    is_correct, marks = grade_multiple_select(q, ["a"])
    assert is_correct is False
    assert marks == 0.0


# ── True/False ───────────────────────────────────────────────────────────────

def test_true_false_correct():
    q = make_question(correct_answer=True, marks=2.0)
    is_correct, marks = grade_true_false(q, True)
    assert is_correct is True
    assert marks == 2.0


def test_true_false_incorrect():
    q = make_question(correct_answer=True, marks=2.0)
    is_correct, marks = grade_true_false(q, False)
    assert is_correct is False
    assert marks == 0.0


# ── Fill in the blank ─────────────────────────────────────────────────────────

def test_fill_blank_case_insensitive():
    q = make_question(correct_answer=["Nairobi", "nairobi city"], marks=3.0)
    is_correct, marks = grade_fill_blank(q, "  NAIROBI  ")
    assert is_correct is True
    assert marks == 3.0


def test_fill_blank_no_match():
    q = make_question(correct_answer=["Nairobi"], marks=3.0)
    is_correct, marks = grade_fill_blank(q, "Mombasa")
    assert is_correct is False
    assert marks == 0.0


# ── Matching ───────────────────────────────────────────────────────────────────

def test_matching_full_match():
    q = make_question(correct_answer={"1": "a", "2": "b"}, marks=4.0)
    is_correct, marks = grade_matching(q, {"1": "a", "2": "b"})
    assert is_correct is True
    assert marks == 4.0


def test_matching_partial_with_credit():
    q = make_question(correct_answer={"1": "a", "2": "b"}, marks=4.0, partial_credit=True)
    is_correct, marks = grade_matching(q, {"1": "a", "2": "c"})
    assert is_correct is False
    assert marks == 2.0  # 1 of 2 correct


def test_matching_partial_without_credit():
    q = make_question(correct_answer={"1": "a", "2": "b"}, marks=4.0, partial_credit=False)
    is_correct, marks = grade_matching(q, {"1": "a", "2": "c"})
    assert is_correct is False
    assert marks == 0.0


# ── Dispatcher ─────────────────────────────────────────────────────────────────

def test_auto_grade_response_dispatches_correctly():
    q = make_question(type="true_false", correct_answer=True, marks=1.0)
    is_correct, marks = auto_grade_response(q, True)
    assert is_correct is True


def test_auto_grade_response_essay_returns_none():
    q = make_question(type="essay", correct_answer=None, marks=10.0)
    is_correct, marks = auto_grade_response(q, "some essay text")
    assert is_correct is None
    assert marks == 0.0


@pytest.mark.parametrize("qtype,expected", [
    ("multiple_choice", False),
    ("multiple_select", False),
    ("true_false", False),
    ("fill_blank", False),
    ("matching", False),
    ("short_answer", True),
    ("essay", True),
    ("python_code", True),
    ("r_code", True),
    ("file_upload", True),
    ("map_design", True),
    ("gis_workflow", True),
])
def test_requires_manual_grading(qtype, expected):
    assert requires_manual_grading(qtype) == expected
