from fastapi import APIRouter
from app.api.v1.routers import auth, courses, resources, forums, users, analytics, maps

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(courses.router)
api_router.include_router(resources.router)
api_router.include_router(forums.router)
api_router.include_router(users.router)
api_router.include_router(analytics.router)
api_router.include_router(maps.router)
