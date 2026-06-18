from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.analytics import Bookmark, ReadingProgress
from app.models.course import Course

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/me", response_model=dict)
def update_profile(
    full_name: str | None = None,
    institution: str | None = None,
    bio: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if full_name:
        current_user.full_name = full_name
    if institution:
        current_user.institution = institution
    if bio:
        current_user.bio = bio
    db.commit()
    return {"ok": True}


@router.get("/me/bookmarks")
def get_bookmarks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bookmarks = db.query(Bookmark).filter(Bookmark.user_id == current_user.id).all()
    result = []
    for b in bookmarks:
        course = db.query(Course).filter(Course.id == b.course_id).first()
        if course:
            result.append({
                "bookmark_id": b.id,
                "course_id": course.id,
                "title": course.title,
                "slug": course.slug,
                "category": course.category,
                "difficulty": course.difficulty,
                "thumbnail_url": course.thumbnail_url,
                "saved_at": b.created_at.isoformat(),
            })
    return result


@router.post("/me/bookmarks/{course_id}", status_code=201)
def add_bookmark(course_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Bookmark).filter(Bookmark.user_id == current_user.id, Bookmark.course_id == course_id).first()
    if existing:
        return {"ok": True, "already_bookmarked": True}
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")
    db.add(Bookmark(user_id=current_user.id, course_id=course_id))
    db.commit()
    return {"ok": True}


@router.delete("/me/bookmarks/{course_id}", status_code=204)
def remove_bookmark(course_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    b = db.query(Bookmark).filter(Bookmark.user_id == current_user.id, Bookmark.course_id == course_id).first()
    if b:
        db.delete(b)
        db.commit()


@router.get("/me/progress")
def get_progress(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    progress = db.query(ReadingProgress).filter(ReadingProgress.user_id == current_user.id).all()
    return [
        {
            "lesson_id": p.lesson_id,
            "percent_complete": p.percent_complete,
            "completed": p.completed_at is not None,
            "updated_at": p.updated_at.isoformat(),
        }
        for p in progress
    ]
