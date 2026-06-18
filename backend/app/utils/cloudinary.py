import cloudinary
import cloudinary.uploader
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)

FOLDER_MAP = {
    "pdf": "geopsy/pdfs",
    "image": "geopsy/images",
    "dataset": "geopsy/datasets",
    "geojson": "geopsy/geojson",
    "pptx": "geopsy/slides",
}


async def upload_file(contents: bytes, filename: str, resource_type: str) -> str:
    folder = FOLDER_MAP.get(resource_type, "geopsy/misc")
    result = cloudinary.uploader.upload(
        contents,
        folder=folder,
        resource_type="raw" if resource_type not in ("image",) else "image",
        use_filename=True,
        unique_filename=True,
    )
    return result["secure_url"]
