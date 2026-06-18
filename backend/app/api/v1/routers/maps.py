from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, require_admin, get_optional_user
from app.models.user import User
from app.models.course import EmbeddedMap, Lesson

router = APIRouter(prefix="/maps", tags=["maps"])


@router.get("/{map_id}")
def get_map(map_id: str, db: Session = Depends(get_db)):
    m = db.query(EmbeddedMap).filter(EmbeddedMap.id == map_id).first()
    if not m:
        raise HTTPException(404, "Map not found")
    return {
        "id": m.id, "title": m.title,
        "geojson_data": m.geojson_data,
        "center_lat": m.center_lat, "center_lng": m.center_lng,
        "zoom_level": m.zoom_level, "basemap": m.basemap,
    }


@router.post("", status_code=201)
def create_map(
    lesson_id: str,
    title: str,
    geojson_data: dict | None = None,
    center_lat: float | None = None,
    center_lng: float | None = None,
    zoom_level: int = 10,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    m = EmbeddedMap(
        lesson_id=lesson_id, title=title, geojson_data=geojson_data,
        center_lat=center_lat, center_lng=center_lng, zoom_level=zoom_level,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"id": m.id}


@router.delete("/{map_id}", status_code=204)
def delete_map(map_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    m = db.query(EmbeddedMap).filter(EmbeddedMap.id == map_id).first()
    if not m:
        raise HTTPException(404, "Map not found")
    db.delete(m)
    db.commit()
