"""seed/enrollments.py — complete lifecycle for all 20 learner scenarios.
All M-Pesa records use DEV-prefixed fake receipt numbers. Never calls Daraja.
"""
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func as _func

from app.models.enrollment import Enrollment, MpesaTransaction
from app.models.quiz import Quiz, Question
from app.models.quiz_attempt import QuizAttempt, QuestionResponse, ManualGrade
from app.models.certificate import Certificate
from app.models.progress_extra import LearnerProgress, Feedback
from app.models.analytics import Bookmark, ReadingProgress, Download, AnalyticsEvent
from seed.utils import sid, get_or_none, created, skipped, dt, rng


def _mock_receipt():
    return f"DEV{rng().randint(10000000, 99999999)}"


def _enroll(db, *, eid, uid, cid, status, amount, attempt_count=1, max_retakes=3,
            final_score=None, passed=None, days_e=0, days_c=None):
    e = get_or_none(db, Enrollment, id=eid)
    if not e:
        e = Enrollment(id=eid, user_id=uid, course_id=cid, status=status,
                       attempt_count=attempt_count, max_retakes=max_retakes,
                       final_score_pct=final_score, passed=passed, amount_paid=amount,
                       enrolled_at=dt(days_e) if status not in ("payment_pending",) else None,
                       completed_at=dt(days_c) if days_c else None,
                       created_at=dt(days_e - 0.5), updated_at=dt(days_e))
        db.add(e); db.flush()
        created(f"  enrollment {status} → {uid[:8]}…")
    return e


def _payment(db, *, txid, eid, uid, cid, status, amount, days):
    t = get_or_none(db, MpesaTransaction, id=txid)
    if not t:
        rc_map = {"success": 0, "pending": 1, "cancelled": 1032, "failed": 17}
        desc_map = {"success": "The service request is processed successfully.",
                    "pending": "Request is being processed.",
                    "failed": "DS timeout user cannot be reached.",
                    "cancelled": "Request cancelled by user."}
        t = MpesaTransaction(
            id=txid, enrollment_id=eid, user_id=uid, course_id=cid,
            checkout_request_id=f"ws_CO_DEV_{uuid.uuid4().hex[:12].upper()}",
            merchant_request_id=f"MR_DEV_{uuid.uuid4().hex[:8].upper()}",
            mpesa_receipt_number=_mock_receipt() if status == "success" else None,
            phone_number="2547" + str(rng().randint(10000000, 99999999)),
            amount=amount, status=status, result_code=rc_map.get(status, 1),
            result_description=desc_map.get(status, "Unknown"),
            initiated_at=dt(days),
            completed_at=dt(days + 0.01) if status in ("success","failed","cancelled") else None)
        db.add(t); db.flush()
        created(f"  payment {status} (DEV mock)")
    return t


def _attempt(db, *, aid, qid, uid, num, status, pct, passed, days, admin_id=None, quiz=None):
    a = get_or_none(db, QuizAttempt, id=aid)
    if a:
        return a
    max_score = quiz.total_marks if quiz else 20.0
    total = round(pct / 100 * max_score, 2)
    auto_score = round(total * 0.75, 2)
    manual_score = round(total * 0.25, 2)
    a = QuizAttempt(id=aid, quiz_id=qid, user_id=uid, attempt_number=num,
                    status=status, started_at=dt(days),
                    submitted_at=dt(days + 0.05) if status != "in_progress" else None,
                    graded_at=dt(days + 0.1) if status == "graded" else None,
                    time_taken_seconds=rng().randint(350, 900),
                    auto_score=auto_score, manual_score=manual_score,
                    total_score=total, max_score=max_score, percentage=pct, passed=passed)
    db.add(a); db.flush()
    created(f"  attempt #{num} {status} ({pct}%)")
    if quiz:
        for q in quiz.questions:
            _resp(db, attempt=a, question=q, pct=pct, admin_id=admin_id, days=days)
    return a


def _resp(db, *, attempt, question, pct, admin_id, days):
    rid = sid(f"resp:{attempt.id}:{question.id}")
    r = get_or_none(db, QuestionResponse, id=rid)
    if r:
        return r
    correct_chance = pct / 100
    if question.requires_manual_grading:
        r = QuestionResponse(id=rid, attempt_id=attempt.id, question_id=question.id,
                             response_data="[DEV response] Realistic learner answer submitted for manual review.",
                             is_correct=None, auto_marks_awarded=0.0, submitted_at=dt(days + 0.04))
        db.add(r); db.flush()
        if attempt.status == "graded" and admin_id:
            mg = get_or_none(db, ManualGrade, response_id=rid)
            if not mg:
                awarded = round(question.marks * correct_chance, 1)
                db.add(ManualGrade(id=sid(f"mg:{rid}"), response_id=rid, grader_id=admin_id,
                                   marks_awarded=awarded,
                                   feedback="Good spatial reasoning." if correct_chance > 0.7 else "Review lesson notes.",
                                   graded_at=dt(days + 1)))
                db.flush()
    else:
        is_correct = rng().random() < correct_chance
        auto_marks = question.marks if is_correct else 0.0
        if question.type == "multiple_choice":
            answer = question.correct_answer if is_correct else "a"
        elif question.type == "multiple_select":
            answer = question.correct_answer if is_correct else ["a"]
        elif question.type == "true_false":
            answer = question.correct_answer if is_correct else (not question.correct_answer)
        elif question.type == "fill_blank":
            acc = question.correct_answer or []
            answer = (acc[0] if acc else "unknown") if is_correct else "wrong answer"
        else:
            answer = question.correct_answer if is_correct else "incorrect"
        r = QuestionResponse(id=rid, attempt_id=attempt.id, question_id=question.id,
                             response_data=answer, is_correct=is_correct,
                             auto_marks_awarded=auto_marks, submitted_at=dt(days + 0.04))
        db.add(r); db.flush()
    return r


def _cert(db, *, cert_id, uid, cid, course_name, learner_name, attempt_id, template_id,
          score_pct, days, seq):
    c = get_or_none(db, Certificate, id=cert_id)
    if not c:
        lvl_map = {sid("course:gis-fundamentals"): "Foundational",
                   sid("course:intermediate-gis"): "Intermediate",
                   sid("course:advanced-gis"): "Advanced",
                   sid("course:spatial-databases"): "Advanced",
                   sid("course:spatial-data-science"): "Expert"}
        c = Certificate(id=cert_id, user_id=uid, course_id=cid, attempt_id=attempt_id,
                        template_id=template_id, certificate_number=f"GEOPSY-2024-{seq:06d}",
                        verification_id=str(uuid.uuid4()), learner_name=learner_name,
                        course_name=course_name, competency_achieved="GIS Competency",
                        certification_level=lvl_map.get(cid, "Foundational"),
                        final_score_pct=score_pct, issued_at=dt(days), revoked=False)
        db.add(c); db.flush()
        created(f"  cert GEOPSY-2024-{seq:06d} → {learner_name}")
    return c


def _prog(db, uid, cid, lp, qp, overall, avg, complete, days_c=None):
    pid = sid(f"progress:{uid}:{cid}")
    if not get_or_none(db, LearnerProgress, id=pid):
        db.add(LearnerProgress(id=pid, user_id=uid, course_id=cid,
                               lessons_completed_pct=lp, quizzes_completed_pct=qp,
                               overall_progress_pct=overall, average_quiz_score=avg,
                               is_course_complete=complete,
                               completed_at=dt(days_c) if days_c else None,
                               updated_at=dt(days_c or 10)))
        db.flush()


def _bm(db, uid, cid, days):
    bid = sid(f"bookmark:{uid}:{cid}")
    if not get_or_none(db, Bookmark, id=bid):
        db.add(Bookmark(id=bid, user_id=uid, course_id=cid, created_at=dt(days))); db.flush()


def _rp(db, uid, lid, pct, days):
    rid = sid(f"rp:{uid}:{lid}")
    if not get_or_none(db, ReadingProgress, id=rid):
        db.add(ReadingProgress(id=rid, user_id=uid, lesson_id=lid, percent_complete=pct,
                               completed_at=dt(days) if pct >= 100 else None, updated_at=dt(days)))
        db.flush()


def _dl(db, uid, rid, days):
    did = sid(f"dl:{uid}:{rid}")
    if not get_or_none(db, Download, id=did):
        db.add(Download(id=did, user_id=uid, resource_id=rid, downloaded_at=dt(days))); db.flush()


def _event(db, uid, etype, entity_id, institution, days, event_key=None):
    if event_key:
        eid = sid(f"event:{event_key}")
        if get_or_none(db, AnalyticsEvent, id=eid):
            return
    else:
        eid = str(uuid.uuid4())
    db.add(AnalyticsEvent(id=eid, user_id=uid, event_type=etype,
                          entity_id=entity_id, institution=institution, created_at=dt(days)))


FUND  = sid("course:gis-fundamentals")
INT   = sid("course:intermediate-gis")
ADV   = sid("course:advanced-gis")
FUND_QID = sid("quiz:fundamentals")
INT_QID  = sid("quiz:intermediate")
ADV_QID  = sid("quiz:advanced")

LS_FUND = [sid(f"les:fund-m{m}-l{l}") for m in (1,2,3) for l in (1,2,3)]
LS_INT  = [sid(f"les:int-m{m}-l{l}") for m in (1,2,3) for l in (1,2,3)]
RS_FUND = [sid("res:fund-geojson-settlements"), sid("res:fund-geojson-rivers"),
           sid("res:fund-dem"), sid("res:fund-pdf-crs"), sid("res:fund-pdf-design")]
RS_INT  = [sid("res:int-python-geopandas"), sid("res:int-r-sf"), sid("res:int-sql-postgis")]

COURSE_NAMES = {
    FUND: "Introduction to GIS with QGIS: Mapping Kibwezi Valley",
    INT:  "Intermediate GIS and Spatial Analysis",
    ADV:  "Advanced GIS and Remote Sensing",
    sid("course:spatial-databases"):   "Spatial Databases and PostGIS",
    sid("course:spatial-data-science"): "Spatial Data Science with Python and R",
}


def seed_enrollments(db: Session, users: dict, courses: dict, quizzes: dict,
                     admin_id: str, cert_template_id: str | None):
    FQ = quizzes.get(FUND_QID)
    IQ = quizzes.get(INT_QID)
    AQ = quizzes.get(ADV_QID)

    def lu(scenario):
        return next((u for u in users.values() if getattr(u,"_scenario","") == scenario), None)

    cert_seq = 1

    # 1. new_reg — no records needed
    # 2. no_enroll — bookmarks + browsing events
    u = lu("no_enroll")
    if u:
        _bm(db, u.id, FUND, 9)
        for i in range(5):
            _event(db, u.id, "course_view", FUND, u.institution, 9+i*0.1, f"noenroll:{u.id}:{i}")

    # 3. pay_pending
    u = lu("pay_pending")
    if u:
        eid = sid(f"enroll:pp:{u.id}")
        e = _enroll(db, eid=eid, uid=u.id, cid=FUND, status="payment_pending", amount=0.0, days_e=8)
        _payment(db, txid=sid(f"tx:pp:{u.id}"), eid=e.id, uid=u.id, cid=FUND,
                 status="pending", amount=0.0, days=8)

    # 4. enrolled — in-progress beginner
    u = lu("enrolled")
    if u:
        eid = sid(f"enroll:en:{u.id}")
        e = _enroll(db, eid=eid, uid=u.id, cid=FUND, status="in_progress", amount=0.0, days_e=18)
        for i, lid in enumerate(LS_FUND[:4]):
            _rp(db, u.id, lid, 100.0, 18+i)
        for rid in RS_FUND[:2]:
            _dl(db, u.id, rid, 19)
        _prog(db, u.id, FUND, 44.4, 0.0, 22.2, None, False)
        for i in range(8):
            _event(db, u.id, "lesson_view", LS_FUND[i%4], u.institution, 18+i*0.3, f"enroll_view:{u.id}:{i}")

    # 5. failed_beg
    u = lu("failed_beg")
    if u:
        eid = sid(f"enroll:fb:{u.id}")
        e = _enroll(db, eid=eid, uid=u.id, cid=FUND, status="failed", amount=0.0,
                    final_score=42.0, passed=False, days_e=30)
        for lid in LS_FUND:
            _rp(db, u.id, lid, 100.0, 31+LS_FUND.index(lid)*0.5)
        _attempt(db, aid=sid(f"att:fb:{u.id}:1"), qid=FUND_QID, uid=u.id, num=1,
                 status="graded", pct=42.0, passed=False, days=34, admin_id=admin_id, quiz=FQ)
        _prog(db, u.id, FUND, 100.0, 100.0, 42.0, 42.0, False)

    # 6. retake_beg
    u = lu("retake_beg")
    if u:
        eid = sid(f"enroll:rb:{u.id}")
        e = _enroll(db, eid=eid, uid=u.id, cid=FUND, status="retake_allowed",
                    amount=0.0, attempt_count=2, days_e=36)
        _attempt(db, aid=sid(f"att:rb:{u.id}:1"), qid=FUND_QID, uid=u.id, num=1,
                 status="graded", pct=48.0, passed=False, days=38, admin_id=admin_id, quiz=FQ)
        _attempt(db, aid=sid(f"att:rb:{u.id}:2"), qid=FUND_QID, uid=u.id, num=2,
                 status="awaiting_manual_grading", pct=0.0, passed=None, days=41, quiz=FQ)
        for lid in LS_FUND:
            _rp(db, u.id, lid, 100.0, 37+LS_FUND.index(lid)*0.4)

    # 7. passed_beg
    u = lu("passed_beg")
    if u:
        eid = sid(f"enroll:pb:{u.id}")
        e = _enroll(db, eid=eid, uid=u.id, cid=FUND, status="passed", amount=0.0,
                    final_score=78.0, passed=True, days_e=45, days_c=50)
        for lid in LS_FUND:
            _rp(db, u.id, lid, 100.0, 46+LS_FUND.index(lid)*0.3)
        att = _attempt(db, aid=sid(f"att:pb:{u.id}:1"), qid=FUND_QID, uid=u.id, num=1,
                       status="graded", pct=78.0, passed=True, days=49, admin_id=admin_id, quiz=FQ)
        _cert(db, cert_id=sid(f"cert:pb:{u.id}"), uid=u.id, cid=FUND,
              course_name=COURSE_NAMES[FUND], learner_name=u.full_name,
              attempt_id=att.id, template_id=cert_template_id, score_pct=78.0, days=50, seq=cert_seq)
        cert_seq += 1
        _prog(db, u.id, FUND, 100.0, 100.0, 100.0, 78.0, True, 50)
        for rid in RS_FUND:
            _dl(db, u.id, rid, 47)
        _bm(db, u.id, INT, 51)

    # 8. enrolled_int
    u = lu("enrolled_int")
    if u:
        eid0 = sid(f"enroll:ei_pre:{u.id}")
        e0 = _enroll(db, eid=eid0, uid=u.id, cid=FUND, status="passed", amount=0.0,
                     final_score=82.0, passed=True, days_e=40, days_c=44)
        _attempt(db, aid=sid(f"att:ei_pre:{u.id}:1"), qid=FUND_QID, uid=u.id, num=1,
                 status="graded", pct=82.0, passed=True, days=43, admin_id=admin_id, quiz=FQ)
        eid1 = sid(f"enroll:ei:{u.id}")
        e1 = _enroll(db, eid=eid1, uid=u.id, cid=INT, status="in_progress", amount=1500.0, days_e=50)
        _payment(db, txid=sid(f"tx:ei:{u.id}"), eid=e1.id, uid=u.id, cid=INT,
                 status="success", amount=1500.0, days=49.5)
        for lid in LS_INT[:5]:
            _rp(db, u.id, lid, 100.0, 51+LS_INT.index(lid)*0.5)
        _prog(db, u.id, INT, 55.6, 0.0, 27.8, None, False)
        for rid in RS_INT[:2]:
            _dl(db, u.id, rid, 52)

    # 9. failed_int
    u = lu("failed_int")
    if u:
        eid0 = sid(f"enroll:fi_pre:{u.id}")
        e0 = _enroll(db, eid=eid0, uid=u.id, cid=FUND, status="passed", amount=0.0,
                     final_score=70.0, passed=True, days_e=40, days_c=45)
        _attempt(db, aid=sid(f"att:fi_pre:{u.id}:1"), qid=FUND_QID, uid=u.id, num=1,
                 status="graded", pct=70.0, passed=True, days=44, admin_id=admin_id, quiz=FQ)
        eid1 = sid(f"enroll:fi:{u.id}")
        e1 = _enroll(db, eid=eid1, uid=u.id, cid=INT, status="failed", amount=1500.0,
                     final_score=55.0, passed=False, days_e=48, days_c=58)
        _payment(db, txid=sid(f"tx:fi:{u.id}"), eid=e1.id, uid=u.id, cid=INT,
                 status="success", amount=1500.0, days=47.5)
        _attempt(db, aid=sid(f"att:fi:{u.id}:1"), qid=INT_QID, uid=u.id, num=1,
                 status="graded", pct=55.0, passed=False, days=57, admin_id=admin_id, quiz=IQ)
        for lid in LS_INT:
            _rp(db, u.id, lid, 100.0, 49+LS_INT.index(lid)*0.5)
        _prog(db, u.id, INT, 100.0, 100.0, 55.0, 55.0, False)

    # 10. passed_int
    u = lu("passed_int")
    if u:
        for cid, qid, score, de, dc, amt, quiz in [
            (FUND, FUND_QID, 85.0, 40, 44, 0.0, FQ),
            (INT,  INT_QID,  74.0, 47, 55, 1500.0, IQ),
        ]:
            eid = sid(f"enroll:pi_{cid[:8]}:{u.id}")
            e = _enroll(db, eid=eid, uid=u.id, cid=cid, status="passed", amount=amt,
                        final_score=score, passed=True, days_e=de, days_c=dc)
            if amt > 0:
                _payment(db, txid=sid(f"tx:pi_{cid[:8]}:{u.id}"), eid=e.id, uid=u.id,
                         cid=cid, status="success", amount=amt, days=de-0.5)
            att = _attempt(db, aid=sid(f"att:pi_{cid[:8]}:{u.id}:1"), qid=qid, uid=u.id,
                           num=1, status="graded", pct=score, passed=True,
                           days=dc-1, admin_id=admin_id, quiz=quiz)
            _cert(db, cert_id=sid(f"cert:pi_{cid[:8]}:{u.id}"), uid=u.id, cid=cid,
                  course_name=COURSE_NAMES[cid], learner_name=u.full_name,
                  attempt_id=att.id, template_id=cert_template_id, score_pct=score, days=dc, seq=cert_seq)
            cert_seq += 1
            _prog(db, u.id, cid, 100.0, 100.0, 100.0, score, True, dc)
        _bm(db, u.id, ADV, 56)

    # 11. enrolled_adv
    u = lu("enrolled_adv")
    if u:
        for cid, qid, score, de, dc, amt, quiz in [
            (FUND, FUND_QID, 80.0, 40, 44, 0.0,    FQ),
            (INT,  INT_QID,  75.0, 47, 55, 1500.0,  IQ),
        ]:
            eid = sid(f"enroll:ea_pre_{cid[:8]}:{u.id}")
            e = _enroll(db, eid=eid, uid=u.id, cid=cid, status="passed", amount=amt,
                        final_score=score, passed=True, days_e=de, days_c=dc)
            if amt > 0:
                _payment(db, txid=sid(f"tx:ea_{cid[:8]}:{u.id}"), eid=e.id, uid=u.id,
                         cid=cid, status="success", amount=amt, days=de-0.5)
            _attempt(db, aid=sid(f"att:ea_{cid[:8]}:{u.id}:1"), qid=qid, uid=u.id,
                     num=1, status="graded", pct=score, passed=True,
                     days=dc-1, admin_id=admin_id, quiz=quiz)
        eid_adv = sid(f"enroll:ea_adv:{u.id}")
        e_adv = _enroll(db, eid=eid_adv, uid=u.id, cid=ADV, status="in_progress",
                        amount=2500.0, days_e=58)
        _payment(db, txid=sid(f"tx:ea_adv:{u.id}"), eid=e_adv.id, uid=u.id, cid=ADV,
                 status="success", amount=2500.0, days=57.5)

    # 12. passed_adv — 3 certificates
    u = lu("passed_adv")
    if u:
        for cid, qid, score, de, dc, amt, quiz in [
            (FUND, FUND_QID, 91.0, 40, 43, 0.0,    FQ),
            (INT,  INT_QID,  88.0, 46, 52, 1500.0,  IQ),
            (ADV,  ADV_QID,  79.0, 55, 65, 2500.0,  AQ),
        ]:
            eid = sid(f"enroll:pa_{cid[:8]}:{u.id}")
            e = _enroll(db, eid=eid, uid=u.id, cid=cid, status="passed", amount=amt,
                        final_score=score, passed=True, days_e=de, days_c=dc)
            if amt > 0:
                _payment(db, txid=sid(f"tx:pa_{cid[:8]}:{u.id}"), eid=e.id, uid=u.id,
                         cid=cid, status="success", amount=amt, days=de-0.5)
            att = _attempt(db, aid=sid(f"att:pa_{cid[:8]}:{u.id}:1"), qid=qid, uid=u.id,
                           num=1, status="graded", pct=score, passed=True,
                           days=dc-1, admin_id=admin_id, quiz=quiz)
            _cert(db, cert_id=sid(f"cert:pa_{cid[:8]}:{u.id}"), uid=u.id, cid=cid,
                  course_name=COURSE_NAMES[cid], learner_name=u.full_name,
                  attempt_id=att.id, template_id=cert_template_id, score_pct=score, days=dc, seq=cert_seq)
            cert_seq += 1
            _prog(db, u.id, cid, 100.0, 100.0, 100.0, score, True, dc)

    # 13. multi_cert — 2 certs
    u = lu("multi_cert")
    if u:
        for cid, qid, score, de, dc, amt, quiz in [
            (FUND, FUND_QID, 88.0, 45, 49, 0.0,    FQ),
            (INT,  INT_QID,  76.0, 52, 60, 1500.0,  IQ),
        ]:
            eid = sid(f"enroll:mc_{cid[:8]}:{u.id}")
            e = _enroll(db, eid=eid, uid=u.id, cid=cid, status="passed", amount=amt,
                        final_score=score, passed=True, days_e=de, days_c=dc)
            if amt > 0:
                _payment(db, txid=sid(f"tx:mc_{cid[:8]}:{u.id}"), eid=e.id, uid=u.id,
                         cid=cid, status="success", amount=amt, days=de-0.5)
            att = _attempt(db, aid=sid(f"att:mc_{cid[:8]}:{u.id}:1"), qid=qid, uid=u.id,
                           num=1, status="graded", pct=score, passed=True,
                           days=dc-1, admin_id=admin_id, quiz=quiz)
            _cert(db, cert_id=sid(f"cert:mc_{cid[:8]}:{u.id}"), uid=u.id, cid=cid,
                  course_name=COURSE_NAMES[cid], learner_name=u.full_name,
                  attempt_id=att.id, template_id=cert_template_id, score_pct=score, days=dc, seq=cert_seq)
            cert_seq += 1

    # 14. manual_grade — submitted, awaiting grader
    u = lu("manual_grade")
    if u:
        eid = sid(f"enroll:mg:{u.id}")
        e = _enroll(db, eid=eid, uid=u.id, cid=FUND, status="in_progress", amount=0.0, days_e=20)
        for lid in LS_FUND[:6]:
            _rp(db, u.id, lid, 100.0, 21+LS_FUND.index(lid)*0.4)
        _attempt(db, aid=sid(f"att:mg:{u.id}:1"), qid=FUND_QID, uid=u.id, num=1,
                 status="awaiting_manual_grading", pct=0.0, passed=None, days=23, quiz=FQ)

    # 15. low_activity — enrolled, 1 lesson view, no quiz
    u = lu("low_activity")
    if u:
        eid = sid(f"enroll:la:{u.id}")
        e = _enroll(db, eid=eid, uid=u.id, cid=FUND, status="enrolled", amount=0.0, days_e=28)
        _rp(db, u.id, LS_FUND[0], 25.0, 29)

    # 16. high_activity — max engagement
    u = lu("high_activity")
    if u:
        eid = sid(f"enroll:ha:{u.id}")
        e = _enroll(db, eid=eid, uid=u.id, cid=FUND, status="passed", amount=0.0,
                    final_score=95.0, passed=True, days_e=40, days_c=48)
        for i, lid in enumerate(LS_FUND):
            _rp(db, u.id, lid, 100.0, 40+i*0.5)
        for rid in RS_FUND:
            _dl(db, u.id, rid, 41+RS_FUND.index(rid)*0.2)
        _dl(db, u.id, sid("res:int-python-geopandas"), 42)
        _dl(db, u.id, sid("res:int-r-sf"), 43)
        att = _attempt(db, aid=sid(f"att:ha:{u.id}:1"), qid=FUND_QID, uid=u.id, num=1,
                       status="graded", pct=95.0, passed=True, days=47, admin_id=admin_id, quiz=FQ)
        _cert(db, cert_id=sid(f"cert:ha:{u.id}"), uid=u.id, cid=FUND,
              course_name=COURSE_NAMES[FUND], learner_name=u.full_name,
              attempt_id=att.id, template_id=cert_template_id, score_pct=95.0, days=48, seq=cert_seq)
        cert_seq += 1
        _prog(db, u.id, FUND, 100.0, 100.0, 100.0, 95.0, True, 48)
        for i in range(20):
            _event(db, u.id, "lesson_view", LS_FUND[i%len(LS_FUND)], u.institution,
                   41+i*0.4, f"ha_view:{u.id}:{i}")
        _bm(db, u.id, INT, 49)

    # 17. retake2 — failed intermediate twice, third attempt in progress
    u = lu("retake2")
    if u:
        eid0 = sid(f"enroll:r2_pre:{u.id}")
        e0 = _enroll(db, eid=eid0, uid=u.id, cid=FUND, status="passed", amount=0.0,
                     final_score=72.0, passed=True, days_e=40, days_c=45)
        _attempt(db, aid=sid(f"att:r2_fund:{u.id}:1"), qid=FUND_QID, uid=u.id, num=1,
                 status="graded", pct=72.0, passed=True, days=44, admin_id=admin_id, quiz=FQ)
        eid1 = sid(f"enroll:r2_int:{u.id}")
        e1 = _enroll(db, eid=eid1, uid=u.id, cid=INT, status="retake_allowed", amount=1500.0,
                     attempt_count=3, max_retakes=3, days_e=48)
        _payment(db, txid=sid(f"tx:r2:{u.id}"), eid=e1.id, uid=u.id, cid=INT,
                 status="success", amount=1500.0, days=47.5)
        for att_n, score, days in [(1, 52.0, 52), (2, 57.0, 55)]:
            _attempt(db, aid=sid(f"att:r2_int:{u.id}:{att_n}"), qid=INT_QID, uid=u.id,
                     num=att_n, status="graded", pct=score, passed=False,
                     days=days, admin_id=admin_id, quiz=IQ)
        _attempt(db, aid=sid(f"att:r2_int:{u.id}:3"), qid=INT_QID, uid=u.id, num=3,
                 status="awaiting_manual_grading", pct=0.0, passed=None, days=58, quiz=IQ)

    # 18. mixed_grade — auto + manual partially graded
    u = lu("mixed_grade")
    if u:
        eid = sid(f"enroll:mix:{u.id}")
        e = _enroll(db, eid=eid, uid=u.id, cid=FUND, status="in_progress", amount=0.0, days_e=22)
        for lid in LS_FUND[:7]:
            _rp(db, u.id, lid, 100.0, 23+LS_FUND.index(lid)*0.4)
        _attempt(db, aid=sid(f"att:mix:{u.id}:1"), qid=FUND_QID, uid=u.id, num=1,
                 status="awaiting_manual_grading", pct=0.0, passed=None, days=26, quiz=FQ)

    # 19. prereq_test — enrolled in beginner (cannot access intermediate)
    u = lu("prereq_test")
    if u:
        eid = sid(f"enroll:pt:{u.id}")
        e = _enroll(db, eid=eid, uid=u.id, cid=FUND, status="in_progress", amount=0.0, days_e=14)
        _rp(db, u.id, LS_FUND[0], 60.0, 15)
        _rp(db, u.id, LS_FUND[1], 30.0, 15)
        _event(db, u.id, "course_view", INT, u.institution, 14.5, f"pt_view:{u.id}")

    # 20. inactive — minimal trace
    u = lu("inactive")
    if u:
        _event(db, u.id, "course_view", FUND, u.institution, 80, f"inactive_view:{u.id}")

    # ── Failed payment scenario ───────────────────────────────────────────────
    u = lu("low_activity")
    if u:
        failed_eid = sid(f"enroll:failed_pay:{u.id}")
        fe = get_or_none(db, Enrollment, id=failed_eid)
        if not fe:
            fe = Enrollment(id=failed_eid, user_id=u.id, course_id=INT,
                            status="payment_pending", amount_paid=0.0,
                            created_at=dt(27), updated_at=dt(27))
            db.add(fe); db.flush()
        _payment(db, txid=sid(f"tx:fp:{u.id}"), eid=fe.id, uid=u.id, cid=INT,
                 status="failed", amount=1500.0, days=27)
        _payment(db, txid=sid(f"tx:fc:{u.id}"), eid=fe.id, uid=u.id, cid=INT,
                 status="cancelled", amount=1500.0, days=28)

    # ── Bulk analytics events — only if DB is fresh ───────────────────────────
    existing = db.query(_func.count(AnalyticsEvent.id)).scalar() or 0
    if existing < 250:
        active_users = [v for v in users.values()
                        if getattr(v, "_scenario", "") not in ("inactive", "new_reg")]
        cids = [FUND, INT, ADV]
        lids = LS_FUND + LS_INT
        for i in range(250):
            u_evt = rng().choice(active_users)
            etype = rng().choice(["course_view", "lesson_view", "course_view"])
            entity = rng().choice(cids if etype == "course_view" else lids)
            _event(db, u_evt.id, etype, entity, u_evt.institution, rng().uniform(0, 85))

    db.flush()
    return cert_seq
