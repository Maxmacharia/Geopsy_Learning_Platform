from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import json

from app.core.dependencies import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.course import Resource, Lesson
from app.models.analytics import Download
from app.utils.cloudinary import upload_file

router = APIRouter(prefix="/resources", tags=["resources"])

# Extension/MIME safety net — extends the original PDF/zip/image/pptx set
# from Part 6 of the LMS spec without removing anything previously allowed.
ALLOWED_EXTENSIONS = {
    "pdf": [".pdf"],
    "pptx": [".ppt", ".pptx"],
    "image": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
    "video": [".mp4", ".webm", ".mov"],
    "dataset": [".csv", ".xlsx", ".json"],
    "geojson": [".geojson", ".json"],
    "zip": [".zip"],
    "python": [".py"],
    "r_script": [".r", ".R"],
    "notebook": [".ipynb"],
    "markdown": [".md", ".markdown"],
    "sql": [".sql"],
    "shapefile": [".zip"],        # shapefiles are always distributed zipped
    "geopackage": [".gpkg"],
    "raster": [".tif", ".tiff", ".img"],
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB — unchanged from the original limit


def _validate_extension(filename: str, resource_type: str) -> None:
    allowed = ALLOWED_EXTENSIONS.get(resource_type)
    if not allowed:
        return  # unrecognised type falls through to generic upload — don't hard-block admins
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in allowed:
        raise HTTPException(400, f"File extension '{ext}' is not valid for resource type '{resource_type}'. Expected one of: {', '.join(allowed)}")


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

    _validate_extension(file.filename, resource_type)

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, "File exceeds 50MB limit")

    url = await upload_file(contents, file.filename, resource_type)

    # For code-bearing file types, also store the text content inline so the
    # frontend can render it with syntax highlighting without a second fetch.
    language_map = {"python": "python", "r_script": "r", "sql": "sql", "markdown": "markdown", "notebook": "json"}
    code_content = None
    if resource_type in language_map and len(contents) < 2 * 1024 * 1024:  # only inline small text files
        try:
            code_content = contents.decode("utf-8")
        except UnicodeDecodeError:
            code_content = None

    resource = Resource(
        lesson_id=lesson_id,
        title=title,
        type=resource_type,
        file_url=url,
        file_size_bytes=len(contents),
        language=language_map.get(resource_type),
        code_content=code_content,
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return {"id": resource.id, "file_url": url, "title": title, "type": resource.type}


@router.post("/code-snippet", status_code=201)
def add_code_snippet(
    lesson_id: str = Form(...),
    title: str = Form(...),
    language: str = Form(...),
    code: str = Form(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Paste-in code snippet — no file upload needed, stored directly as text."""
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(404, "Lesson not found")

    resource = Resource(
        lesson_id=lesson_id, title=title, type="code_snippet",
        language=language, code_content=code,
        file_size_bytes=len(code.encode("utf-8")),
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return {"id": resource.id, "title": title}


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


@router.get("/{resource_id}")
def get_resource(resource_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Full resource detail including code_content/metadata for the in-app viewer."""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(404, "Resource not found")
    return {
        "id": resource.id, "title": resource.title, "type": resource.type,
        "file_url": resource.file_url, "external_url": resource.external_url,
        "file_size_bytes": resource.file_size_bytes,
        "language": resource.language, "code_content": resource.code_content,
        "metadata_json": resource.metadata_json,
        "download_count": resource.download_count,
    }


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
