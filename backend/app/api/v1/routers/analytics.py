from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.dependencies import get_db, require_admin
from app.models.user import User
from app.models.course import Course, Resource
from app.models.analytics import AnalyticsEvent, Download
from app.schemas.analytics import AnalyticsOverview

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
def analytics_overview(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    total_students = db.query(User).filter(User.role == "student").count()
    total_courses = db.query(Course).filter(Course.is_published == True).count()
    total_resources = db.query(Resource).count()
    total_downloads = db.query(Download).count()

    # Popular courses
    popular_raw = (
        db.query(AnalyticsEvent.entity_id, func.count(AnalyticsEvent.id).label("cnt"))
        .filter(AnalyticsEvent.event_type == "course_view")
        .group_by(AnalyticsEvent.entity_id)
        .order_by(func.count(AnalyticsEvent.id).desc())
        .limit(5).all()
    )
    popular_courses = []
    for row in popular_raw:
        course = db.query(Course).filter(Course.id == row.entity_id).first()
        if course:
            popular_courses.append({"course_id": course.id, "title": course.title, "view_count": row.cnt})

    # Top institutions
    inst_raw = (
        db.query(User.institution, func.count(User.id).label("cnt"))
        .filter(User.role == "student", User.institution != None)
        .group_by(User.institution)
        .order_by(func.count(User.id).desc())
        .limit(10).all()
    )
    top_institutions = [{"institution": r.institution, "student_count": r.cnt} for r in inst_raw]

    # Recent download stats
    dl_raw = (
        db.query(Resource.id, Resource.title, Resource.download_count)
        .order_by(Resource.download_count.desc())
        .limit(10).all()
    )
    recent_downloads = [{"resource_id": r.id, "title": r.title, "download_count": r.download_count} for r in dl_raw]

    return AnalyticsOverview(
        total_students=total_students,
        total_courses=total_courses,
        total_resources=total_resources,
        total_downloads=total_downloads,
        popular_courses=popular_courses,
        top_institutions=top_institutions,
        recent_downloads=recent_downloads,
    )
