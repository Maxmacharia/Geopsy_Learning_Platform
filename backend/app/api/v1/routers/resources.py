from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.course import Resource, Lesson
from app.models.analytics import Download
from app.utils.cloudinary import upload_file

router = APIRouter(prefix="/resources", tags=["resources"])

ALLOWED_TYPES = {"application/pdf", "application/zip", "application/json",
                 "image/png", "image/jpeg", "image/webp",
                 "application/vnd.ms-powerpoint",
                 "application/vnd.openxmlformats-officedocument.presentationml.presentation"}


@router.post("/upload", status_code=201)
async def upload_resource(
    lesson_id: str = Form(...),
    title: str = Form(...),
    resource_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(404, "Lesson not found")

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(400, "File exceeds 50MB limit")

    url = await upload_file(contents, file.filename, resource_type)

    resource = Resource(
        lesson_id=lesson_id,
        title=title,
        type=resource_type,
        file_url=url,
        file_size_bytes=len(contents),
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return {"id": resource.id, "file_url": url, "title": title}


@router.post("/link", status_code=201)
def add_external_link(
    lesson_id: str,
    title: str,
    url: str,
    resource_type: str = "link",
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    resource = Resource(lesson_id=lesson_id, title=title, type=resource_type, external_url=url)
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return {"id": resource.id}


@router.get("/{resource_id}/download")
def download_resource(
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(404, "Resource not found")
    resource.download_count += 1
    db.add(Download(user_id=current_user.id, resource_id=resource_id))
    db.commit()
    url = resource.file_url or resource.external_url
    return {"download_url": url, "title": resource.title}


@router.delete("/{resource_id}", status_code=204)
def delete_resource(resource_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(404, "Resource not found")
    db.delete(resource)
    db.commit()
