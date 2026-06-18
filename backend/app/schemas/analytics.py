from pydantic import BaseModel
from typing import List


class CoursePopularItem(BaseModel):
    course_id: str
    title: str
    view_count: int


class ResourceDownloadItem(BaseModel):
    resource_id: str
    title: str
    download_count: int


class InstitutionItem(BaseModel):
    institution: str
    student_count: int


class AnalyticsOverview(BaseModel):
    total_students: int
    total_courses: int
    total_resources: int
    total_downloads: int
    popular_courses: List[CoursePopularItem]
    top_institutions: List[InstitutionItem]
    recent_downloads: List[ResourceDownloadItem]
