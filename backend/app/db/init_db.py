from sqlalchemy.orm import Session
from app.models.user import User
from app.models.course import Category
from app.core.security import hash_password


GIS_CATEGORIES = [
    "GIS Fundamentals", "Remote Sensing", "Cartography", "Spatial Databases",
    "QGIS", "ArcGIS", "Web GIS", "Python for GIS", "GeoServer",
    "PostGIS", "GPS & Surveying", "Drone Mapping", "Spatial Analysis", "OpenStreetMap",
]


def init_db(db: Session) -> None:
    # Seed categories
    for name in GIS_CATEGORIES:
        exists = db.query(Category).filter(Category.name == name).first()
        if not exists:
            db.add(Category(name=name))

    # Seed default admin
    admin = db.query(User).filter(User.email == "admin@geopsy.co.ke").first()
    if not admin:
        db.add(User(
            email="admin@geopsy.co.ke",
            full_name="Geopsy Admin",
            hashed_password=hash_password("Admin@1234!"),
            role="admin",
            is_active=True,
            institution="Geopsy",
        ))

    db.commit()
