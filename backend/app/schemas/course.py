from pydantic import BaseModel
from typing import List, Optional


class CategoryOut(BaseModel):
    id: str
    name: str
    model_config = {"from_attributes": True}


class ResourceOut(BaseModel):
    id: str
    title: str
    type: str
    file_url: Optional[str]
    external_url: Optional[str]
    file_size_bytes: Optional[int]
    download_count: int
    model_config = {"from_attributes": True}


class EmbeddedMapOut(BaseModel):
    id: str
    title: str
    geojson_data: Optional[dict]
    center_lat: Optional[float]
    center_lng: Optional[float]
    zoom_level: int
    basemap: str
    model_config = {"from_attributes": True}


class LessonCreate(BaseModel):
    title: str
    content: Optional[str] = None
    content_preview: Optional[str] = None
    is_gated: bool = True
    order_index: int = 0


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    content_preview: Optional[str] = None
    is_gated: Optional[bool] = None
    order_index: Optional[int] = None


class LessonPublic(BaseModel):
    id: str
    title: str
    content_preview: Optional[str]
    is_gated: bool
    order_index: int
    model_config = {"from_attributes": True}


class LessonFull(LessonPublic):
    content: Optional[str]
    resources: List[ResourceOut] = []
    embedded_maps: List[EmbeddedMapOut] = []


class ModuleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: int = 0


class ModuleOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    order_index: int
    lessons: List[LessonPublic] = []
    model_config = {"from_attributes": True}


class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: str = "beginner"
    is_published: bool = False
    price: float = 0.0
    order_index: int = 0
    prerequisite_id: Optional[str] = None
    max_retakes: int = 3


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    is_published: Optional[bool] = None
    thumbnail_url: Optional[str] = None
    price: Optional[float] = None
    order_index: Optional[int] = None
    prerequisite_id: Optional[str] = None
    max_retakes: Optional[int] = None


class CourseListItem(BaseModel):
    id: str
    title: str
    slug: str
    description: Optional[str]
    category: Optional[str]
    difficulty: str
    thumbnail_url: Optional[str]
    is_published: bool
    module_count: int = 0
    created_at: str
    model_config = {"from_attributes": True}


class CourseDetail(CourseListItem):
    modules: List[ModuleOut] = []


class PaginatedCourses(BaseModel):
    items: List[CourseListItem]
    total: int
    page: int
    pages: int
