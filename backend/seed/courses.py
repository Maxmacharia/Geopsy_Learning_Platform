"""seed/courses.py — 5-course progressive GIS curriculum with modules, lessons, resources."""
from sqlalchemy.orm import Session
from app.models.course import Category, Course, Module, Lesson, Resource, EmbeddedMap
from seed.utils import sid, get_or_none, created, skipped, dt

def _html(key):
    CONTENT = {
        "fund_m1_l1": """<h2>Introduction to GIS</h2><p>A <strong>Geographic Information System (GIS)</strong> is a computer-based framework for capturing, storing, analysing, and visualising data that has a spatial component — data tied to a real-world location.</p><h3>The Five Components of a GIS</h3><ul><li><strong>Hardware</strong> — computers, GPS receivers</li><li><strong>Software</strong> — QGIS, ArcGIS, GEE</li><li><strong>Data</strong> — maps, satellite imagery, surveys</li><li><strong>People</strong> — analysts, field workers</li><li><strong>Methods</strong> — analytical procedures</li></ul><blockquote><p>"80% of all data has a geographic component." — Jack Dangermond</p></blockquote>""",
        "fund_m1_l2": """<h2>Vector and Raster Data Types</h2><p>GIS data is represented in two fundamental ways:</p><h3>Vector Data</h3><ul><li><strong>Points</strong> — a water borehole, GPS waypoint</li><li><strong>Lines</strong> — a road, river, power line</li><li><strong>Polygons</strong> — a land parcel, administrative boundary</li></ul><h3>Raster Data</h3><p>Raster data represents the world as a <strong>grid of cells (pixels)</strong>. Each cell holds a value, such as elevation or land-cover classification.</p><table><thead><tr><th>Property</th><th>Vector</th><th>Raster</th></tr></thead><tbody><tr><td>Best for</td><td>Discrete features</td><td>Continuous surfaces</td></tr><tr><td>Storage</td><td>Smaller</td><td>Can be large</td></tr></tbody></table>""",
        "fund_m1_l3": """<h2>Installing and Navigating QGIS</h2><p>QGIS 3.28 LTS is the recommended version. Download free from <a href="https://qgis.org">qgis.org</a>.</p><h3>Interface Components</h3><ol><li><strong>Menu Bar</strong> — access all commands</li><li><strong>Toolbars</strong> — quick access to tools</li><li><strong>Layers Panel</strong> — controls visibility and order</li><li><strong>Map Canvas</strong> — main visualisation area</li><li><strong>Status Bar</strong> — coordinates, scale, CRS</li></ol><pre><code>Drag-and-drop any .geojson, .shp, or .tif file\ndirectly onto the QGIS Map Canvas to load it.</code></pre>""",
        "fund_m2_l1": """<h2>Symbology and Cartographic Design</h2><p>The <strong>Symbology</strong> tab in Layer Properties controls how features are drawn.</p><ul><li><strong>Single Symbol</strong> — one style for all features</li><li><strong>Categorised</strong> — different style per unique value</li><li><strong>Graduated</strong> — colour ramp mapped to a numeric range</li></ul>""",
        "fund_m2_l2": """<h2>Attribute Queries and Select by Expression</h2><p>The <strong>Select by Expression</strong> tool (Ctrl+F3) lets you filter features using SQL-like expressions.</p><h3>Example</h3><pre><code>"water_access" = 'No' AND "population_est" &gt; 200</code></pre><p>This selects all settlements with no water access and more than 200 residents.</p>""",
        "fund_m2_l3": """<h2>Raster Analysis: DEM and Hillshade</h2><p>A <strong>Digital Elevation Model (DEM)</strong> stores ground elevation as a raster grid. Common analyses include hillshade, slope, aspect, and contours.</p><h3>Creating a Hillshade</h3><ol><li>Go to <em>Raster → Analysis → Hillshade</em></li><li>Set azimuth 315°, altitude 45°</li><li>Place hillshade beneath DEM in Layers Panel</li><li>Set DEM blending mode to <strong>Multiply</strong></li></ol>""",
        "fund_m3_l1": """<h2>Map Layout and PDF Export</h2><p>A professional map always includes: <strong>Title, Legend, Scale bar, North arrow, Data sources</strong>.</p><h3>Using the QGIS Print Layout</h3><p>Open via <em>Project → New Print Layout</em>. Use toolbar to add a map frame, legend, scale bar, and north arrow.</p><h3>Export Settings</h3><ul><li>Print: <strong>300 DPI</strong></li><li>Web: <strong>150 DPI</strong></li></ul>""",
        "fund_m3_l2": """<h2>Field Data Collection with QGIS and GPS</h2><p>Modern field data collection tools for Kenya:</p><ul><li><a href="https://qfield.org">QField</a> — offline QGIS on Android/iOS</li><li><a href="https://opendatakit.org">ODK Collect</a> — survey forms</li><li>Garmin handheld GPS receivers</li></ul>""",
        "fund_m3_l3": """<h2>Final Project: Community Water Access Map</h2><p>Produce a complete GIS map answering: <em>"Where should a new borehole be sited to serve the most underserved communities in Kibwezi Valley?"</em></p><h3>Deliverables</h3><ol><li>Styled QGIS project file (.qgz)</li><li>Priority sites layer as GeoJSON</li><li>A4 PDF map at 300 DPI</li><li>200-word methodology note</li></ol>""",
        "int_m1_l1": """<h2>Spatial Analysis: Buffer, Intersect, and Dissolve</h2><ul><li><strong>Buffer</strong> — creates a zone of specified distance around features</li><li><strong>Intersect</strong> — retains only the overlapping portions of two layers</li><li><strong>Dissolve</strong> — merges adjacent features sharing an attribute value</li></ul><pre><code>1. Buffer flood zone by 3 km\n2. Intersect with schools layer\n3. Export result → "schools_at_risk.geojson"</code></pre>""",
        "int_m1_l2": """<h2>Spatial Joins and Table Relationships</h2><p>A <strong>spatial join</strong> transfers attributes from one layer to another based on a spatial relationship.</p><pre><code>Vector → Data Management → Join Attributes by Location\n  Input: land_parcels.shp\n  Join: district_stats.shp\n  Method: intersects</code></pre>""",
        "int_m2_l1": """<h2>Google Earth Engine (GEE)</h2><p>Cloud-based geospatial analysis with a multi-petabyte data catalogue.</p><pre><code>var collection = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")\n  .filterBounds(geometry)\n  .filterDate("2023-01-01", "2023-12-31");\nMap.addLayer(collection.first(), {bands:["SR_B4","SR_B3","SR_B2"]}, "RGB");</code></pre>""",
        "int_m2_l2": """<h2>NDVI and Vegetation Analysis</h2><p>NDVI = (NIR − Red) / (NIR + Red). Values range from −1 to +1.</p><pre><code>var ndvi = image.normalizedDifference(["SR_B5", "SR_B4"]).rename("NDVI");\nMap.addLayer(ndvi, {min:-0.2, max:0.8, palette:["blue","white","darkgreen"]}, "NDVI");</code></pre>""",
        "int_m3_l1": """<h2>PostGIS: Spatial SQL Fundamentals</h2><pre><code>-- Distance between two points (metres)\nSELECT ST_Distance(\n  ST_Transform(geom_a, 32737),\n  ST_Transform(geom_b, 32737)\n) AS dist_m FROM features;\n\n-- Features within 500m of a reference point\nSELECT * FROM settlements\nWHERE ST_DWithin(geom,\n  ST_SetSRID(ST_MakePoint(38.02,-2.48),4326)::geography, 500);</code></pre>""",
    }
    return CONTENT.get(key, f"<p>Lesson content for <strong>{key}</strong>.</p>")

COURSES = [
    dict(id=sid("course:gis-fundamentals"), slug="gis-fundamentals",
         title="Introduction to GIS with QGIS: Mapping Kibwezi Valley",
         description="<p>Learn GIS foundations using QGIS. Through hands-on exercises in the fictional Kibwezi Valley, you will produce your first professional map in three progressive modules.</p>",
         category="GIS Fundamentals", difficulty="beginner", price=0.0,
         order_index=0, prerequisite_id=None, max_retakes=3,
         modules=[
             dict(id=sid("mod:fund-m1"), title="GIS Concepts and Data Types", order=0, lessons=[
                 dict(id=sid("les:fund-m1-l1"), title="What is GIS?", order=0, key="fund_m1_l1"),
                 dict(id=sid("les:fund-m1-l2"), title="Vector and Raster Data", order=1, key="fund_m1_l2"),
                 dict(id=sid("les:fund-m1-l3"), title="Installing and Navigating QGIS", order=2, key="fund_m1_l3"),
             ]),
             dict(id=sid("mod:fund-m2"), title="Working with GIS Data", order=1, lessons=[
                 dict(id=sid("les:fund-m2-l1"), title="Symbology and Cartographic Design", order=0, key="fund_m2_l1"),
                 dict(id=sid("les:fund-m2-l2"), title="Attribute Queries", order=1, key="fund_m2_l2"),
                 dict(id=sid("les:fund-m2-l3"), title="Raster Analysis and DEM", order=2, key="fund_m2_l3"),
             ]),
             dict(id=sid("mod:fund-m3"), title="Maps, Field Data, and Projects", order=2, lessons=[
                 dict(id=sid("les:fund-m3-l1"), title="Map Layout and PDF Export", order=0, key="fund_m3_l1"),
                 dict(id=sid("les:fund-m3-l2"), title="Field Data Collection", order=1, key="fund_m3_l2"),
                 dict(id=sid("les:fund-m3-l3"), title="Final Project: Community Water Map", order=2, key="fund_m3_l3"),
             ]),
         ]),
    dict(id=sid("course:intermediate-gis"), slug="intermediate-gis-spatial-analysis",
         title="Intermediate GIS and Spatial Analysis",
         description="<p>Deepen your GIS skills with spatial analysis, geoprocessing, Google Earth Engine, and PostGIS.</p>",
         category="GIS Fundamentals", difficulty="intermediate", price=1500.0,
         order_index=1, prerequisite_id=sid("course:gis-fundamentals"), max_retakes=2,
         modules=[
             dict(id=sid("mod:int-m1"), title="Geoprocessing and Spatial Analysis", order=0, lessons=[
                 dict(id=sid("les:int-m1-l1"), title="Buffer, Intersect, and Dissolve", order=0, key="int_m1_l1"),
                 dict(id=sid("les:int-m1-l2"), title="Spatial Joins", order=1, key="int_m1_l2"),
                 dict(id=sid("les:int-m1-l3"), title="Network Analysis", order=2, key="int_m1_l1"),
             ]),
             dict(id=sid("mod:int-m2"), title="Google Earth Engine and Remote Sensing", order=1, lessons=[
                 dict(id=sid("les:int-m2-l1"), title="Introduction to GEE", order=0, key="int_m2_l1"),
                 dict(id=sid("les:int-m2-l2"), title="NDVI and Vegetation Indices", order=1, key="int_m2_l2"),
                 dict(id=sid("les:int-m2-l3"), title="Land Cover Classification", order=2, key="int_m2_l1"),
             ]),
             dict(id=sid("mod:int-m3"), title="Introduction to PostGIS", order=2, lessons=[
                 dict(id=sid("les:int-m3-l1"), title="PostGIS: Spatial SQL Fundamentals", order=0, key="int_m3_l1"),
                 dict(id=sid("les:int-m3-l2"), title="Spatial Indexing and Optimisation", order=1, key="int_m3_l1"),
                 dict(id=sid("les:int-m3-l3"), title="Practical: Spatial DB Design", order=2, key="int_m3_l1"),
             ]),
         ]),
    dict(id=sid("course:advanced-gis"), slug="advanced-gis-remote-sensing",
         title="Advanced GIS and Remote Sensing",
         description="<p>Master advanced remote sensing techniques including SAR, change detection, and UAV photogrammetry.</p>",
         category="Remote Sensing", difficulty="advanced", price=2500.0,
         order_index=2, prerequisite_id=sid("course:intermediate-gis"), max_retakes=2,
         modules=[
             dict(id=sid("mod:adv-m1"), title="Advanced Remote Sensing", order=0, lessons=[
                 dict(id=sid("les:adv-m1-l1"), title="SAR Remote Sensing Basics", order=0, key="fund_m1_l1"),
                 dict(id=sid("les:adv-m1-l2"), title="Change Detection", order=1, key="fund_m2_l1"),
                 dict(id=sid("les:adv-m1-l3"), title="UAV Data Processing", order=2, key="fund_m3_l1"),
             ]),
             dict(id=sid("mod:adv-m2"), title="GIS Programming with Python", order=1, lessons=[
                 dict(id=sid("les:adv-m2-l1"), title="GeoPandas and Shapely", order=0, key="int_m1_l1"),
                 dict(id=sid("les:adv-m2-l2"), title="Raster Processing with Rasterio", order=1, key="int_m2_l1"),
                 dict(id=sid("les:adv-m2-l3"), title="Automating GIS Workflows", order=2, key="int_m3_l1"),
             ]),
             dict(id=sid("mod:adv-m3"), title="Spatial Data Science", order=2, lessons=[
                 dict(id=sid("les:adv-m3-l1"), title="Spatial Statistics and Clustering", order=0, key="int_m1_l2"),
                 dict(id=sid("les:adv-m3-l2"), title="Hotspot Analysis", order=1, key="int_m2_l2"),
                 dict(id=sid("les:adv-m3-l3"), title="Predictive Spatial Modelling", order=2, key="fund_m3_l3"),
             ]),
         ]),
    dict(id=sid("course:spatial-databases"), slug="spatial-databases-postgis",
         title="Spatial Databases and PostGIS",
         description="<p>Design, build, and query production PostGIS databases including pgRouting and web mapping.</p>",
         category="Spatial Databases", difficulty="advanced", price=2000.0,
         order_index=3, prerequisite_id=sid("course:advanced-gis"), max_retakes=2,
         modules=[
             dict(id=sid("mod:db-m1"), title="Database Design for GIS", order=0, lessons=[
                 dict(id=sid("les:db-m1-l1"), title="Spatial Schema Design", order=0, key="int_m3_l1"),
                 dict(id=sid("les:db-m1-l2"), title="Advanced PostGIS Functions", order=1, key="int_m3_l1"),
                 dict(id=sid("les:db-m1-l3"), title="pgRouting for Network Analysis", order=2, key="int_m3_l1"),
             ]),
             dict(id=sid("mod:db-m2"), title="Database-Driven Web Mapping", order=1, lessons=[
                 dict(id=sid("les:db-m2-l1"), title="GeoServer and WMS/WFS", order=0, key="int_m3_l1"),
                 dict(id=sid("les:db-m2-l2"), title="Tile Caching and Performance", order=1, key="fund_m2_l2"),
                 dict(id=sid("les:db-m2-l3"), title="Leaflet.js Frontend Integration", order=2, key="fund_m3_l1"),
             ]),
             dict(id=sid("mod:db-m3"), title="Performance and Production", order=2, lessons=[
                 dict(id=sid("les:db-m3-l1"), title="Query Optimisation and EXPLAIN", order=0, key="int_m3_l1"),
                 dict(id=sid("les:db-m3-l2"), title="Backup and Disaster Recovery", order=1, key="fund_m3_l2"),
                 dict(id=sid("les:db-m3-l3"), title="Project: Multi-Layer Geoplatform", order=2, key="fund_m3_l3"),
             ]),
         ]),
    dict(id=sid("course:spatial-data-science"), slug="spatial-data-science-python-r",
         title="Spatial Data Science with Python and R",
         description="<p>Apply data science tools to geospatial problems using GeoPandas, scikit-learn, sf, and terra.</p>",
         category="Data Science", difficulty="advanced", price=3000.0,
         order_index=4, prerequisite_id=sid("course:spatial-databases"), max_retakes=1,
         modules=[
             dict(id=sid("mod:ds-m1"), title="Python for Geospatial Analysis", order=0, lessons=[
                 dict(id=sid("les:ds-m1-l1"), title="GeoPandas and Spatial DataFrames", order=0, key="int_m1_l1"),
                 dict(id=sid("les:ds-m1-l2"), title="Rasterio and GDAL Workflows", order=1, key="int_m2_l1"),
                 dict(id=sid("les:ds-m1-l3"), title="ML for Land Cover", order=2, key="int_m2_l2"),
             ]),
             dict(id=sid("mod:ds-m2"), title="R for Spatial Statistics", order=1, lessons=[
                 dict(id=sid("les:ds-m2-l1"), title="sf and terra Packages", order=0, key="int_m1_l2"),
                 dict(id=sid("les:ds-m2-l2"), title="Spatial Autocorrelation", order=1, key="int_m2_l2"),
                 dict(id=sid("les:ds-m2-l3"), title="Kriging and Interpolation", order=2, key="int_m3_l1"),
             ]),
             dict(id=sid("mod:ds-m3"), title="Capstone Project", order=2, lessons=[
                 dict(id=sid("les:ds-m3-l1"), title="Project Scoping", order=0, key="fund_m3_l1"),
                 dict(id=sid("les:ds-m3-l2"), title="Analysis and Modelling", order=1, key="fund_m3_l2"),
                 dict(id=sid("les:ds-m3-l3"), title="Final Report", order=2, key="fund_m3_l3"),
             ]),
         ]),
]

RESOURCES = [
    dict(id=sid("res:fund-geojson-settlements"), lesson_id=sid("les:fund-m1-l3"),
         title="Kibwezi Valley Settlements", type="geojson",
         external_url="https://geopsyresearch.org/datasets/kibwezi_settlements.geojson",
         language="json", file_size_bytes=46080, download_count=247),
    dict(id=sid("res:fund-geojson-rivers"), lesson_id=sid("les:fund-m1-l3"),
         title="Kibwezi Valley Rivers", type="geojson",
         external_url="https://geopsyresearch.org/datasets/kibwezi_rivers.geojson",
         language="json", file_size_bytes=28672, download_count=198),
    dict(id=sid("res:fund-dem"), lesson_id=sid("les:fund-m2-l3"),
         title="Kibwezi DEM (30m)", type="raster",
         external_url="https://geopsyresearch.org/datasets/kibwezi_dem.tif",
         metadata_json={"resolution_m": 30, "crs": "EPSG:4326"},
         file_size_bytes=4300800, download_count=142),
    dict(id=sid("res:fund-pdf-crs"), lesson_id=sid("les:fund-m1-l2"),
         title="CRS Quick Reference — Kenya", type="pdf",
         external_url="https://geopsyresearch.org/docs/crs_cheatsheet_kenya.pdf",
         file_size_bytes=215040, download_count=315),
    dict(id=sid("res:fund-pdf-design"), lesson_id=sid("les:fund-m3-l1"),
         title="Map Design Principles", type="pdf",
         external_url="https://geopsyresearch.org/docs/map_design_principles.pdf",
         file_size_bytes=634880, download_count=201),
    dict(id=sid("res:fund-landcover"), lesson_id=sid("les:fund-m2-l1"),
         title="Kibwezi Land Cover (5 classes)", type="geojson",
         external_url="https://geopsyresearch.org/datasets/kibwezi_landcover.geojson",
         language="json", metadata_json={"classes": 5, "crs": "EPSG:4326"},
         file_size_bytes=184320, download_count=163),
    dict(id=sid("res:int-python-geopandas"), lesson_id=sid("les:adv-m2-l1"),
         title="GeoPandas Spatial Join Example", type="python", language="python",
         code_content='import geopandas as gpd\n\nsettlements = gpd.read_file("kibwezi_settlements.geojson")\ndistricts = gpd.read_file("kibwezi_districts.geojson")\nsettlements = settlements.to_crs(districts.crs)\njoined = gpd.sjoin(settlements, districts[["district_name","geometry"]], how="left", predicate="within")\nprint(joined[["name","population_est","district_name"]].head())\n',
         file_size_bytes=512, download_count=88),
    dict(id=sid("res:int-r-sf"), lesson_id=sid("les:ds-m2-l1"),
         title="sf Package: Load and Transform Example", type="r_script", language="r",
         code_content='library(sf)\nlibrary(dplyr)\nsettlements <- st_read("kibwezi_settlements.geojson")\nsettlements_utm <- st_transform(settlements, 32737)\nbuffers <- st_buffer(settlements_utm, dist = 500)\ncat(nrow(buffers), "buffered settlement polygons created\\n")\n',
         file_size_bytes=480, download_count=61),
    dict(id=sid("res:int-sql-postgis"), lesson_id=sid("les:int-m3-l1"),
         title="PostGIS Example Queries", type="sql", language="sql",
         code_content='-- Settlements within 5 km of a river\nSELECT s.name, ST_Distance(s.geom::geography, r.geom::geography) AS dist_m\nFROM settlements s\nJOIN rivers r ON r.name = \'Kibwezi Main\'\nWHERE ST_DWithin(s.geom::geography, r.geom::geography, 5000)\nORDER BY dist_m;\n',
         file_size_bytes=320, download_count=74),
    dict(id=sid("res:ext-qgis-download"), lesson_id=sid("les:fund-m1-l3"),
         title="Download QGIS 3.28 LTS", type="link",
         external_url="https://qgis.org/en/site/forusers/download.html",
         file_size_bytes=None, download_count=389),
    dict(id=sid("res:ext-gee-signup"), lesson_id=sid("les:int-m2-l1"),
         title="Sign Up for Google Earth Engine", type="link",
         external_url="https://signup.earthengine.google.com",
         file_size_bytes=None, download_count=156),
    dict(id=sid("res:fund-qpt-layout"), lesson_id=sid("les:fund-m3-l1"),
         title="A4 Print Layout Template (.qpt)", type="dataset",
         external_url="https://geopsyresearch.org/datasets/map_layout_template_a4.qpt",
         file_size_bytes=46080, download_count=118),
]

MAPS = [
    dict(id=sid("map:kibwezi-overview"), lesson_id=sid("les:fund-m1-l1"),
         title="Kibwezi Valley Overview",
         geojson_data={"type":"FeatureCollection","features":[
             {"type":"Feature","geometry":{"type":"Point","coordinates":[38.020,-2.470]},"properties":{"name":"Kibwezi Market","population_est":820,"water_access":"Yes"}},
             {"type":"Feature","geometry":{"type":"Point","coordinates":[38.045,-2.495]},"properties":{"name":"Nguu Homestead","population_est":145,"water_access":"No"}},
             {"type":"Feature","geometry":{"type":"Point","coordinates":[38.030,-2.530]},"properties":{"name":"Mutomo Junction","population_est":312,"water_access":"No"}},
         ]},
         center_lat=-2.480, center_lng=38.020, zoom_level=11, basemap="osm"),
    dict(id=sid("map:kibwezi-priority"), lesson_id=sid("les:fund-m2-l2"),
         title="Priority Borehole Sites",
         geojson_data={"type":"FeatureCollection","features":[
             {"type":"Feature","geometry":{"type":"Point","coordinates":[38.045,-2.495]},"properties":{"name":"Nguu Homestead","priority":"HIGH"}},
             {"type":"Feature","geometry":{"type":"Point","coordinates":[38.030,-2.530]},"properties":{"name":"Mutomo Junction","priority":"HIGH"}},
         ]},
         center_lat=-2.480, center_lng=38.020, zoom_level=11, basemap="osm"),
]


def seed_courses(db: Session, admin_id: str) -> dict:
    for cat_name in ["GIS Fundamentals","Remote Sensing","Spatial Databases","Data Science"]:
        if not get_or_none(db, Category, name=cat_name):
            db.add(Category(id=sid(f"cat:{cat_name}"), name=cat_name)); db.flush()

    courses_by_slug = {}
    for cdef in COURSES:
        c = get_or_none(db, Course, id=cdef["id"])
        if not c:
            c = Course(id=cdef["id"], title=cdef["title"], slug=cdef["slug"],
                       description=cdef["description"], category=cdef["category"],
                       difficulty=cdef["difficulty"], price=cdef["price"],
                       order_index=cdef["order_index"], prerequisite_id=cdef["prerequisite_id"],
                       max_retakes=cdef["max_retakes"], is_published=True,
                       created_by=admin_id, created_at=dt(0), updated_at=dt(0))
            db.add(c); db.flush()
            created(f"course {c.slug}")
        else:
            skipped(f"course {c.slug}")
        courses_by_slug[c.slug] = c

        for mdef in cdef["modules"]:
            m = get_or_none(db, Module, id=mdef["id"])
            if not m:
                m = Module(id=mdef["id"], course_id=c.id, title=mdef["title"],
                           description=f"Module: {mdef['title']}", order_index=mdef["order"],
                           created_at=dt(1))
                db.add(m); db.flush()
            for ldef in mdef["lessons"]:
                l = get_or_none(db, Lesson, id=ldef["id"])
                if not l:
                    full_html = _html(ldef["key"])
                    preview = "<p>" + full_html.replace("<", " <").split(">")[1][:200].strip() + "…</p>"
                    l = Lesson(id=ldef["id"], module_id=m.id, title=ldef["title"],
                               content=full_html, content_preview=preview,
                               is_gated=True, order_index=ldef["order"], created_at=dt(2))
                    db.add(l); db.flush()
                    created(f"  lesson {l.title}")

    for rdef in RESOURCES:
        r = get_or_none(db, Resource, id=rdef["id"])
        if not r:
            r = Resource(id=rdef["id"], lesson_id=rdef["lesson_id"],
                         title=rdef["title"], type=rdef["type"],
                         external_url=rdef.get("external_url"),
                         language=rdef.get("language"), code_content=rdef.get("code_content"),
                         metadata_json=rdef.get("metadata_json"),
                         file_size_bytes=rdef.get("file_size_bytes"),
                         download_count=rdef.get("download_count", 0), created_at=dt(3))
            db.add(r); db.flush()
            created(f"  resource {r.title}")

    for mdef in MAPS:
        em = get_or_none(db, EmbeddedMap, id=mdef["id"])
        if not em:
            em = EmbeddedMap(id=mdef["id"], lesson_id=mdef["lesson_id"], title=mdef["title"],
                             geojson_data=mdef["geojson_data"], center_lat=mdef["center_lat"],
                             center_lng=mdef["center_lng"], zoom_level=mdef["zoom_level"],
                             basemap=mdef["basemap"], created_at=dt(3))
            db.add(em); db.flush()
            created(f"  map {em.title}")

    return courses_by_slug
