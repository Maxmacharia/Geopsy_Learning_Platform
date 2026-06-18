from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from math import ceil
import re
import uuid

from app.core.dependencies import get_db, get_current_user, require_admin, get_optional_user
from app.models.user import User
from app.models.course import Course, Module, Lesson, Category, Resource
from app.models.analytics import AnalyticsEvent
from app.schemas.course import (
    CourseCreate, CourseUpdate, CourseDetail, CourseListItem, PaginatedCourses,
    ModuleCreate, ModuleOut, LessonCreate, LessonUpdate, LessonPublic, LessonFull,
    CategoryOut, ResourceOut,
)

router = APIRouter(prefix="/courses", tags=["courses"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text


def course_to_list_item(c: Course) -> dict:
    return {
        "id": c.id, "title": c.title, "slug": c.slug,
        "description": c.description, "category": c.category,
        "difficulty": c.difficulty, "thumbnail_url": c.thumbnail_url,
        "is_published": c.is_published,
        "module_count": len(c.modules),
        "created_at": c.created_at.isoformat(),
    }


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()


@router.get("", response_model=PaginatedCourses)
def list_courses(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    q = db.query(Course)
    if not (current_user and current_user.role == "admin"):
        q = q.filter(Course.is_published == True)
    if search:
        q = q.filter(Course.title.ilike(f"%{search}%"))
    if category:
        q = q.filter(Course.category == category)
    if difficulty:
        q = q.filter(Course.difficulty == difficulty)

    total = q.count()
    courses = q.order_by(Course.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return PaginatedCourses(
        items=[CourseListItem(**course_to_list_item(c)) for c in courses],
        total=total, page=page, pages=ceil(total / limit) if total else 1,
    )


@router.get("/{slug}", response_model=CourseDetail)
def get_course(
    slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    course = db.query(Course).filter(Course.slug == slug).first()
    if not course:
        raise HTTPException(404, "Course not found")
    if not course.is_published and not (current_user and current_user.role == "admin"):
        raise HTTPException(404, "Course not found")

    # log analytics
    if current_user:
        db.add(AnalyticsEvent(
            user_id=current_user.id, event_type="course_view",
            entity_id=course.id, institution=current_user.institution,
        ))
        db.commit()

    # Build modules with gated lesson filtering
    modules_out = []
    for mod in course.modules:
        lessons_out = []
        for les in mod.lessons:
            lessons_out.append(LessonPublic(
                id=les.id, title=les.title,
                content_preview=les.content_preview,
                is_gated=les.is_gated, order_index=les.order_index,
            ))
        modules_out.append(ModuleOut(
            id=mod.id, title=mod.title, description=mod.description,
            order_index=mod.order_index, lessons=lessons_out,
        ))

    return CourseDetail(
        **course_to_list_item(course), modules=modules_out,
    )


@router.post("", response_model=CourseDetail, status_code=201)
def create_course(body: CourseCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    slug = slugify(body.title)
    # ensure unique slug
    existing = db.query(Course).filter(Course.slug == slug).first()
    if existing:
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"
    import uuid as _uuid
    if db.query(Course).filter(Course.slug == slug).first():
        slug = f"{slug}-{str(_uuid.uuid4())[:8]}"

    course = Course(**body.model_dump(), slug=slug, created_by=admin.id)
    db.add(course)
    db.commit()
    db.refresh(course)
    return CourseDetail(**course_to_list_item(course), modules=[])


@router.patch("/{course_id}", response_model=CourseListItem)
def update_course(course_id: str, body: CourseUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(course, k, v)
    db.commit()
    db.refresh(course)
    return CourseListItem(**course_to_list_item(course))


@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")
    db.delete(course)
    db.commit()


# --- Modules ---
@router.post("/{course_id}/modules", response_model=ModuleOut, status_code=201)
def add_module(course_id: str, body: ModuleCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")
    module = Module(course_id=course_id, **body.model_dump())
    db.add(module)
    db.commit()
    db.refresh(module)
    return ModuleOut(id=module.id, title=module.title, description=module.description, order_index=module.order_index, lessons=[])


# --- Lessons ---
@router.post("/modules/{module_id}/lessons", response_model=LessonPublic, status_code=201)
def add_lesson(module_id: str, body: LessonCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(404, "Module not found")
    lesson = Lesson(module_id=module_id, **body.model_dump())
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return LessonPublic(id=lesson.id, title=lesson.title, content_preview=lesson.content_preview, is_gated=lesson.is_gated, order_index=lesson.order_index)


@router.get("/lessons/{lesson_id}", response_model=LessonFull)
def get_lesson(
    lesson_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(404, "Lesson not found")

    if lesson.is_gated and not current_user:
        # Return preview only
        return LessonFull(
            id=lesson.id, title=lesson.title,
            content_preview=lesson.content_preview,
            content=None, is_gated=True, order_index=lesson.order_index,
            resources=[], embedded_maps=[],
        )

    resources = [ResourceOut(
        id=r.id, title=r.title, type=r.type, file_url=r.file_url,
        external_url=r.external_url, file_size_bytes=r.file_size_bytes,
        download_count=r.download_count,
    ) for r in lesson.resources]

    return LessonFull(
        id=lesson.id, title=lesson.title,
        content_preview=lesson.content_preview, content=lesson.content,
        is_gated=lesson.is_gated, order_index=lesson.order_index,
        resources=resources, embedded_maps=lesson.embedded_maps,
    )


@router.patch("/lessons/{lesson_id}")
def update_lesson(lesson_id: str, body: LessonUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(lesson, k, v)
    db.commit()
    return {"ok": True}


@router.patch("/lessons/{lesson_id}/progress")
def update_progress(lesson_id: str, percent: float, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.analytics import ReadingProgress
    from datetime import datetime, timezone
    rp = db.query(ReadingProgress).filter(
        ReadingProgress.user_id == current_user.id,
        ReadingProgress.lesson_id == lesson_id,
    ).first()
    if rp:
        rp.percent_complete = percent
        if percent >= 100:
            rp.completed_at = datetime.now(timezone.utc)
    else:
        rp = ReadingProgress(user_id=current_user.id, lesson_id=lesson_id, percent_complete=percent)
        db.add(rp)
    db.commit()
    return {"ok": True}
