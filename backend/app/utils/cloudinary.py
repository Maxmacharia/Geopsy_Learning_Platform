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
    "video": "geopsy/videos",
    "zip": "geopsy/archives",
    "python": "geopsy/code/python",
    "r_script": "geopsy/code/r",
    "notebook": "geopsy/code/notebooks",
    "markdown": "geopsy/markdown",
    "sql": "geopsy/code/sql",
    "shapefile": "geopsy/gis/shapefiles",
    "geopackage": "geopsy/gis/geopackages",
    "raster": "geopsy/gis/rasters",
    "certificate": "geopsy/certificates",
    "submission": "geopsy/submissions",
}


async def upload_file(contents: bytes, filename: str, resource_type: str) -> str:
    folder = FOLDER_MAP.get(resource_type, "geopsy/misc")
    result = cloudinary.uploader.upload(
        contents,
        folder=folder,
        resource_type="raw" if resource_type not in ("image", "video") else resource_type,
        use_filename=True,
        unique_filename=True,
    )
    return result["secure_url"]


async def upload_bytes(contents: bytes, public_id: str, folder: str, resource_type: str = "raw") -> str:
    """Lower-level upload used for generated files (e.g. certificate PDFs) where
    we want a predictable public_id rather than the original filename."""
    result = cloudinary.uploader.upload(
        contents,
        folder=folder,
        public_id=public_id,
        resource_type=resource_type,
        overwrite=True,
    )
    return result["secure_url"]
