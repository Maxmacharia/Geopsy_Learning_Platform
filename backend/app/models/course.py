import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Text, Integer, ForeignKey, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    courses = relationship("Course", back_populates="category_obj")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), ForeignKey("categories.name"), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), default="beginner")  # beginner | intermediate | advanced
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    price: Mapped[float] = mapped_column(Float, default=0.0)                  # 0 = free
    order_index: Mapped[int] = mapped_column(Integer, default=0)               # progression order
    prerequisite_id: Mapped[str | None] = mapped_column(String, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    max_retakes: Mapped[int] = mapped_column(Integer, default=3)               # 0 = unlimited
    created_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    category_obj = relationship("Category", back_populates="courses")
    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan", order_by="Module.order_index")
    bookmarks = relationship("Bookmark", back_populates="course", cascade="all, delete-orphan")


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id: Mapped[str] = mapped_column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    course = relationship("Course", back_populates="modules")
    lessons = relationship("Lesson", back_populates="module", cascade="all, delete-orphan", order_by="Lesson.order_index")


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    module_id: Mapped[str] = mapped_column(String, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)          # full content (gated)
    content_preview: Mapped[str | None] = mapped_column(Text, nullable=True)  # public snippet
    is_gated: Mapped[bool] = mapped_column(Boolean, default=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    module = relationship("Module", back_populates="lessons")
    resources = relationship("Resource", back_populates="lesson", cascade="all, delete-orphan")
    embedded_maps = relationship("EmbeddedMap", back_populates="lesson", cascade="all, delete-orphan")
    reading_progress = relationship("ReadingProgress", back_populates="lesson", cascade="all, delete-orphan")


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    lesson_id: Mapped[str] = mapped_column(String, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    # pdf | geojson | pptx | link | image | dataset | video | zip |
    # python | r_script | notebook | markdown | sql | shapefile | geopackage | raster | code_snippet
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    download_count: Mapped[int] = mapped_column(Integer, default=0)

    # Added for code/notebook viewer support — all nullable, no impact on existing rows
    language: Mapped[str | None] = mapped_column(String(30), nullable=True)       # python | r | sql | json | markdown
    code_content: Mapped[str | None] = mapped_column(Text, nullable=True)          # inline-pasted snippet body
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)         # CRS, feature count, etc. for GIS datasets

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    lesson = relationship("Lesson", back_populates="resources")
    downloads = relationship("Download", back_populates="resource", cascade="all, delete-orphan")


class EmbeddedMap(Base):
    __tablename__ = "embedded_maps"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    lesson_id: Mapped[str] = mapped_column(String, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    geojson_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    center_lat: Mapped[float | None] = mapped_column(nullable=True)
    center_lng: Mapped[float | None] = mapped_column(nullable=True)
    zoom_level: Mapped[int] = mapped_column(Integer, default=10)
    basemap: Mapped[str] = mapped_column(String(50), default="osm")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    lesson = relationship("Lesson", back_populates="embedded_maps")
