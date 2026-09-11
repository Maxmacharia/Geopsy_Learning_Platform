#!/usr/bin/env python3
"""
GeoPsy Comprehensive Development Seeder
Usage:
  python -m seed.seed             # idempotent seed
  python -m seed.seed --reset     # wipe seeded data then re-seed
  python -m seed.seed --verbose   # debug logging
"""
import argparse, logging, os, sys, time, uuid

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base
from app.models import *  # noqa

from seed.utils import reset_counters, _COUNTER, sid, dt
from seed.users import seed_users, ADMINS, LEARNERS, ADMIN_PASSWORD, LEARNER_PASSWORD
from seed.courses import seed_courses
from seed.quizzes import seed_quizzes
from seed.enrollments import seed_enrollments
from seed.forums import seed_forums

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-7s  %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("geopsy.seeder")


def _is_safe(url: str) -> bool:
    url_lower = url.lower()
    if "prod" in url_lower or "production" in url_lower:
        return False
    return any(m in url_lower for m in ("localhost","127.0.0.1","sqlite","test","dev","seed"))


def _ensure_cert_template(db, admin_id: str) -> str:
    from app.models.certificate import CertificateTemplate
    from seed.utils import get_or_none, created
    tpl_id = sid("cert-template:geopsy-default")
    t = get_or_none(db, CertificateTemplate, id=tpl_id)
    if not t:
        t = CertificateTemplate(id=tpl_id, name="GeoPsy Standard Certificate",
            qualification_title="Certificate of Completion", competency_level="Foundational",
            certification_statement=(
                "This certifies that the above-named learner has successfully completed "
                "the requirements of this course on the GeoPsy Learning Platform, "
                "demonstrating competency in Geographic Information Systems."),
            passing_percentage=60.0, administrator_name="Dr. Amina Wanjiru Kariuki",
            administrator_title="GIS Curriculum Lead, GeoPsy Research", created_at=dt(0))
        db.add(t); db.flush()
        created("certificate template")
    return tpl_id


def _reset(db):
    log.info("Resetting seeded data…")
    from app.models.certificate import Certificate, CertificateTemplate
    from app.models.progress_extra import LearnerProgress, Feedback
    from app.models.quiz_attempt import QuizAttempt, QuestionResponse, ManualGrade
    from app.models.enrollment import Enrollment, MpesaTransaction
    from app.models.analytics import Bookmark, ReadingProgress, Download, AnalyticsEvent
    from app.models.forum import Forum, ForumPost, Comment
    from app.models.quiz import Quiz, Question
    from app.models.course import Category, Course, Module, Lesson, Resource, EmbeddedMap
    from app.models.user import User
    from seed.quizzes import QUIZZES
    from seed.courses import COURSES, MAPS

    seeded_ids = [d["id"] for d in ADMINS + LEARNERS]

    for model in [AnalyticsEvent, Download, ReadingProgress, Bookmark]:
        db.query(model).filter(model.user_id.in_(seeded_ids)).delete(synchronize_session=False)
    db.query(Feedback).filter(Feedback.author_id.in_(seeded_ids)).delete(synchronize_session=False)

    attempt_ids = [a.id for a in db.query(QuizAttempt).filter(QuizAttempt.user_id.in_(seeded_ids)).all()]
    if attempt_ids:
        resp_ids = [r.id for r in db.query(QuestionResponse).filter(QuestionResponse.attempt_id.in_(attempt_ids)).all()]
        if resp_ids:
            db.query(ManualGrade).filter(ManualGrade.response_id.in_(resp_ids)).delete(synchronize_session=False)
        db.query(QuestionResponse).filter(QuestionResponse.attempt_id.in_(attempt_ids)).delete(synchronize_session=False)
    db.query(QuizAttempt).filter(QuizAttempt.user_id.in_(seeded_ids)).delete(synchronize_session=False)
    db.query(MpesaTransaction).filter(MpesaTransaction.user_id.in_(seeded_ids)).delete(synchronize_session=False)
    db.query(Enrollment).filter(Enrollment.user_id.in_(seeded_ids)).delete(synchronize_session=False)
    db.query(Certificate).filter(Certificate.user_id.in_(seeded_ids)).delete(synchronize_session=False)
    db.query(LearnerProgress).filter(LearnerProgress.user_id.in_(seeded_ids)).delete(synchronize_session=False)

    forum_ids = [sid("forum:gis-fundamentals"), sid("forum:intermediate-advanced"), sid("forum:community")]
    for fid in forum_ids:
        for post in db.query(ForumPost).filter(ForumPost.forum_id == fid).all():
            db.query(Comment).filter(Comment.post_id == post.id).delete(synchronize_session=False)
        db.query(ForumPost).filter(ForumPost.forum_id == fid).delete(synchronize_session=False)
    db.query(Forum).filter(Forum.id.in_(forum_ids)).delete(synchronize_session=False)

    quiz_ids = [q["id"] for q in QUIZZES]
    db.query(Question).filter(Question.quiz_id.in_(quiz_ids)).delete(synchronize_session=False)
    db.query(Quiz).filter(Quiz.id.in_(quiz_ids)).delete(synchronize_session=False)
    db.query(CertificateTemplate).filter(CertificateTemplate.id == sid("cert-template:geopsy-default")).delete(synchronize_session=False)

    map_ids = [m["id"] for m in MAPS]
    db.query(EmbeddedMap).filter(EmbeddedMap.id.in_(map_ids)).delete(synchronize_session=False)

    res_ids = [sid("res:fund-geojson-settlements"), sid("res:fund-geojson-rivers"), sid("res:fund-dem"),
               sid("res:fund-pdf-crs"), sid("res:fund-pdf-design"), sid("res:fund-landcover"),
               sid("res:int-python-geopandas"), sid("res:int-r-sf"), sid("res:int-sql-postgis"),
               sid("res:ext-qgis-download"), sid("res:ext-gee-signup"), sid("res:fund-qpt-layout")]
    db.query(Resource).filter(Resource.id.in_(res_ids)).delete(synchronize_session=False)

    for cdef in COURSES:
        for mdef in cdef["modules"]:
            for ldef in mdef["lessons"]:
                db.query(Lesson).filter(Lesson.id == ldef["id"]).delete(synchronize_session=False)
            db.query(Module).filter(Module.id == mdef["id"]).delete(synchronize_session=False)
        db.query(Course).filter(Course.id == cdef["id"]).delete(synchronize_session=False)

    db.query(User).filter(User.id.in_(seeded_ids)).delete(synchronize_session=False)
    db.commit()
    log.info("Reset complete.")


def main():
    parser = argparse.ArgumentParser(description="GeoPsy development seeder")
    parser.add_argument("--reset", action="store_true")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    db_url = settings.DATABASE_URL
    if args.reset:
        if not _is_safe(db_url):
            log.error("❌  RESET REFUSED: DATABASE_URL does not appear to be a dev/local database.")
            sys.exit(1)
        print(f"\n⚠️   This will delete all seeded dev data from: {db_url[:60]}…")
        if input("   Type 'yes' to continue: ").strip().lower() != "yes":
            print("   Cancelled."); sys.exit(0)

    print("\n" + "═"*55 + "\n  GeoPsy Development Seeder\n" + "═"*55 + "\n")
    engine = create_engine(db_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    start = time.time()
    reset_counters()

    with Session() as db:
        try:
            if args.reset:
                _reset(db)

            log.info("[1/6] Users…")
            users = seed_users(db); db.commit()
            admin_id = sid("user:amina.kariuki")

            log.info("[2/6] Courses, modules, lessons, resources, maps…")
            courses = seed_courses(db, admin_id); db.commit()

            log.info("[3/6] Quizzes and questions…")
            quizzes_raw = seed_quizzes(db, admin_id); db.commit()
            from app.models.quiz import Quiz as QuizModel
            quiz_ids = list(quizzes_raw.keys())
            quizzes = {q.id: q for q in db.query(QuizModel).filter(QuizModel.id.in_(quiz_ids)).all()}

            log.info("[4/6] Certificate template…")
            cert_template_id = _ensure_cert_template(db, admin_id); db.commit()

            log.info("[5/6] Enrollments, payments, attempts, certs, progress…")
            seed_enrollments(db, users, courses, quizzes, admin_id, cert_template_id); db.commit()

            log.info("[6/6] Forum activity…")
            seed_forums(db, users); db.commit()

        except Exception as exc:
            db.rollback()
            log.error(f"Seeding failed: {exc}")
            import traceback; traceback.print_exc()
            sys.exit(1)

    elapsed = round(time.time() - start, 1)

    # Summary
    with Session() as db:
        from app.models.user import User
        from app.models.course import Course, Module, Lesson, Resource
        from app.models.quiz import Quiz, Question
        from app.models.quiz_attempt import QuizAttempt, ManualGrade
        from app.models.enrollment import Enrollment, MpesaTransaction
        from app.models.certificate import Certificate
        from app.models.forum import Forum, ForumPost, Comment
        from app.models.analytics import AnalyticsEvent, Download

        def n(model): return db.query(model).count()

        print("═"*55 + "\n  Seeding Complete ✅\n" + "═"*55)
        print(f"  Administrators:      {n(User.role == 'admin') if False else db.query(User).filter(User.role=='admin').count()}")
        print(f"  Learners:            {db.query(User).filter(User.role=='student').count()}  (20 scenarios)")
        print(f"  Courses:             {n(Course)}")
        print(f"  Modules:             {n(Module)}")
        print(f"  Lessons:             {n(Lesson)}")
        print(f"  Resources:           {n(Resource)}")
        print(f"  Quizzes:             {n(Quiz)}")
        print(f"  Questions:           {n(Question)}")
        print(f"  Enrollments:         {n(Enrollment)}")
        print(f"  Payments (DEV mock): {n(MpesaTransaction)}")
        print(f"  Quiz Attempts:       {n(QuizAttempt)}")
        print(f"  Manual Grades:       {n(ManualGrade)}")
        print(f"  Certificates:        {n(Certificate)}")
        print(f"  Forums:              {n(Forum)}")
        print(f"  Forum Posts:         {n(ForumPost)}")
        print(f"  Comments:            {n(Comment)}")
        print(f"  Analytics Events:    {n(AnalyticsEvent)}")
        print(f"  Downloads:           {n(Download)}")
        print(f"  Time:                {elapsed}s\n")

    print("─"*55 + "\n  Dev Credentials\n" + "─"*55)
    print(f"  Admin password:    {ADMIN_PASSWORD}")
    print(f"  Learner password:  {LEARNER_PASSWORD}\n")
    print("  Admins:")
    for a in ADMINS:
        print(f"    {a['email']}")
    print("\n  Key learner scenarios:")
    for ld in LEARNERS:
        print(f"    {ld['email']:<42} [{ld['scenario']}]")
    print("\n  Run 'python -m seed.seed --reset' to wipe and re-seed.")
    print("═"*55 + "\n")


if __name__ == "__main__":
    main()
