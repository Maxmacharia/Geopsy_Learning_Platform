"""seed/forums.py — 3 forums with realistic posts and peer/instructor replies."""
import random as _r
_rng = _r.Random(99)
from sqlalchemy.orm import Session
from app.models.forum import Forum, ForumPost, Comment
from seed.utils import sid, get_or_none, created, skipped, dt

FORUMS_DATA = [
    dict(id=sid("forum:gis-fundamentals"), title="GIS Fundamentals — General Discussion",
         description="Ask questions, share tips, connect with fellow learners.", category="GIS Fundamentals"),
    dict(id=sid("forum:intermediate-advanced"), title="Intermediate & Advanced GIS Discussion",
         description="Spatial analysis, GEE, PostGIS, Python deep dives.", category="Intermediate/Advanced"),
    dict(id=sid("forum:community"), title="GeoPsy Community Hub",
         description="Career advice, GIS news, job postings, announcements.", category="Community"),
]

POSTS_DATA = [
    # ── Fundamentals forum ────────────────────────────────────────────────────
    dict(id=sid("post:welcome"), forum_id=sid("forum:gis-fundamentals"),
         author_email="amina.kariuki@geopsyresearch.org",
         title="Welcome to GIS Fundamentals! 🗺️", is_pinned=True, is_announcement=False, days=0,
         content="<p>Karibu sana! I am Dr. Amina, your instructor. This forum is your community space — ask questions, share discoveries, support each other.</p><ul><li>All datasets are fictional but realistic Kenyan landscapes.</li><li>QGIS sometimes crashes — save with <strong>Ctrl+S</strong> often.</li><li>Describe your issue in detail when asking for help.</li></ul><p>Introduce yourself below — your name, institution, and one GIS goal.</p>",
         comments=[
             dict(author_email="mercy.wanjiku@machakos.ac.ke", days=1,
                  content="<p>Hello! I am Mercy from Machakos University. I want to map water access in my county. Excited to be here!</p>"),
             dict(author_email="eric.waweru@mmu.ac.ke", days=1,
                  content="<p>Eric from Multimedia University. Planning to use GIS for urban tree canopy mapping in my final year project.</p>"),
             dict(author_email="amina.kariuki@geopsyresearch.org", days=2,
                  content="<p>Karibu sana Mercy and Eric! Both use-cases are excellent. You're in the right place.</p>"),
         ]),
    dict(id=sid("post:qgis-slow"), forum_id=sid("forum:gis-fundamentals"),
         author_email="diana.mugo@coast.ac.ke",
         title="QGIS very slow on 4GB RAM laptop", is_pinned=False, is_announcement=False, days=5,
         content="<p>Hello everyone. I am Diana from Coast Institute. QGIS becomes very slow when I load the DEM raster. My laptop has 4GB RAM and Windows 10. Has anyone found a way to speed this up?</p>",
         comments=[
             dict(author_email="mercy.wanjiku@machakos.ac.ke", days=5,
                  content="<p>Diana, I had the same problem! I unzipped the file first and closed all other browser tabs. It improved a lot.</p>"),
             dict(author_email="amina.kariuki@geopsyresearch.org", days=6,
                  content="<p>Tips for 4GB RAM: (1) Close other applications. (2) In QGIS Settings → Options → Rendering, set max cache to 64MB. (3) Export the DEM with LZW compression to reduce file size. (4) Load only the layers you actively need.</p>"),
         ]),
    dict(id=sid("post:select-by-expression"), forum_id=sid("forum:gis-fundamentals"),
         author_email="susan.njoki@machakos.ac.ke",
         title="Select by Expression returning 0 features", is_pinned=False, is_announcement=False, days=12,
         content='<p>I am trying to select settlements with no water access and population > 200 using:</p><pre><code>"water_access" = \'No\' AND "population" > 200</code></pre><p>But it returns 0 features. What am I missing?</p>',
         comments=[
             dict(author_email="amina.kariuki@geopsyresearch.org", days=12,
                  content='<p>Susan, the field name is <code>population_est</code> not <code>population</code>. Field names in QGIS are case-sensitive. Try:<br><code>"water_access" = \'No\' AND "population_est" &gt; 200</code></p>'),
             dict(author_email="susan.njoki@machakos.ac.ke", days=12,
                  content="<p>That was exactly it! <code>population_est</code> not <code>population</code>. Thank you Dr. Amina!</p>"),
         ]),
    dict(id=sid("post:live-qa"), forum_id=sid("forum:gis-fundamentals"),
         author_email="amina.kariuki@geopsyresearch.org",
         title="📢 Live Q&A — This Friday 5 PM EAT", is_pinned=True, is_announcement=True, days=14,
         content="<p>Dr. Amina will host a live Q&A this <strong>Friday at 5:00 PM EAT</strong>.</p><ul><li>QGIS installation and performance</li><li>CRS and projection questions</li><li>Select by Expression syntax</li><li>Final project guidance</li></ul>",
         comments=[]),
    dict(id=sid("post:export-selected"), forum_id=sid("forum:gis-fundamentals"),
         author_email="patricia.wambua@coast.ac.ke",
         title="How to export only the SELECTED features?", is_pinned=False, is_announcement=False, days=16,
         content="<p>I selected 4 priority borehole sites. Now how do I export only those 4 features as a new GeoJSON? I tried Layer > Export but it exports all 47 settlements.</p>",
         comments=[
             dict(author_email="susan.njoki@machakos.ac.ke", days=16,
                  content="<p>Patricia — RIGHT-click the layer in the Layers Panel → Export → <strong>Save Selected Features As</strong>. The key is to right-click, not use the top menu!</p>"),
             dict(author_email="amina.kariuki@geopsyresearch.org", days=17,
                  content="<p>Susan is exactly right. Right-click → Export → <strong>Save Selected Features As…</strong> — 'Only selected features' will be automatically ticked. Well done Susan for helping!</p>"),
         ]),
    # ── Intermediate/Advanced forum ────────────────────────────────────────────
    dict(id=sid("post:gee-welcome"), forum_id=sid("forum:intermediate-advanced"),
         author_email="brian.odhiambo@geopsyresearch.org",
         title="Welcome to Intermediate GIS! Remote Sensing starts here.", is_pinned=True, is_announcement=False, days=2,
         content="<p>Welcome! I am Brian — leading the GEE and remote sensing modules.</p><p>GEE access: sign up at <a href='https://signup.earthengine.google.com'>earthengine.google.com</a>. Approval usually takes 1–3 days.</p>",
         comments=[
             dict(author_email="faith.njeri@maseno.ac.ke", days=3,
                  content="<p>Thank you Brian! I signed up yesterday and still waiting for approval.</p>"),
             dict(author_email="brian.odhiambo@geopsyresearch.org", days=3,
                  content="<p>Faith — that's normal. Explore the GEE Code Editor documentation while you wait.</p>"),
         ]),
    dict(id=sid("post:ndvi-cloud"), forum_id=sid("forum:intermediate-advanced"),
         author_email="kevin.mutua@knp.ac.ke",
         title="NDVI result looks wrong — cloudy pixels included?", is_pinned=False, is_announcement=False, days=20,
         content="<p>I computed NDVI over Tana River basin but the result has very low values in patches that don't look like bare ground. I think cloud shadow may be included. How do I filter these out in GEE?</p>",
         comments=[
             dict(author_email="brian.odhiambo@geopsyresearch.org", days=21,
                  content="<p>Kevin — great observation. For Landsat 8 Collection 2, use the QA_PIXEL band:</p><pre><code>function maskL8sr(image) {\n  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);\n  return image.updateMask(qaMask);\n}\nvar masked = collection.map(maskL8sr);</code></pre>"),
         ]),
    dict(id=sid("post:postgis-units"), forum_id=sid("forum:intermediate-advanced"),
         author_email="lydia.akinyi@machakos.ac.ke",
         title="ST_Distance returning wrong units?", is_pinned=False, is_announcement=False, days=35,
         content="<p>I am running <code>SELECT ST_Distance(geom_a, geom_b) FROM settlements;</code> and the result is 0.003 — I expected metres. What is wrong?</p>",
         comments=[
             dict(author_email="grace.njoroge@geopsyresearch.org", days=35,
                  content="<p>Lydia — your geometries are in geographic coordinates (degrees). Cast to geography type to get metres:<br><code>SELECT ST_Distance(geom_a::geography, geom_b::geography) FROM settlements;</code></p>"),
             dict(author_email="lydia.akinyi@machakos.ac.ke", days=36,
                  content="<p>The ::geography cast worked perfectly! 347 metres as expected. Thank you Grace!</p>"),
         ]),
    # ── Community forum ────────────────────────────────────────────────────────
    dict(id=sid("post:gis-careers"), forum_id=sid("forum:community"),
         author_email="amina.kariuki@geopsyresearch.org",
         title="GIS Career Paths in Kenya — A Guide", is_pinned=True, is_announcement=False, days=3,
         content="<p>Many learners ask about GIS careers. A practical guide:</p><table><thead><tr><th>Title</th><th>Level</th><th>Typical Employer</th></tr></thead><tbody><tr><td>GIS Officer</td><td>Entry</td><td>NGOs, County Governments</td></tr><tr><td>GIS Analyst</td><td>Mid</td><td>Consulting firms, national agencies</td></tr><tr><td>Spatial Data Analyst</td><td>Mid-Senior</td><td>Tech companies, data NGOs</td></tr><tr><td>Remote Sensing Scientist</td><td>Specialist</td><td>Research institutions, UN agencies</td></tr></tbody></table>",
         comments=[
             dict(author_email="eric.waweru@mmu.ac.ke", days=4,
                  content="<p>Do you need a degree or can a diploma graduate apply for GIS Officer roles?</p>"),
             dict(author_email="amina.kariuki@geopsyresearch.org", days=4,
                  content="<p>Eric — many GIS Officer roles accept a Diploma plus demonstrated QGIS skills. Your GeoPsy certificate plus a portfolio of your maps will strengthen any application significantly.</p>"),
         ]),
    dict(id=sid("post:map-challenge"), forum_id=sid("forum:community"),
         author_email="amina.kariuki@geopsyresearch.org",
         title="🏆 GeoPsy Map Challenge #1: Map Your Campus", is_pinned=False, is_announcement=True, days=20,
         content="<p>Create a QGIS map of any feature on your campus or neighbourhood using GPS points you collect yourself. Submit your PNG map and a 100-word description to this thread. The three most creative and technically accurate submissions will be featured on the GeoPsy homepage.</p>",
         comments=[
             dict(author_email="susan.njoki@machakos.ac.ke", days=21,
                  content="<p>I will map the water taps and handwashing stations on the Machakos University campus!</p>"),
         ]),
]


def seed_forums(db: Session, users: dict) -> None:
    for fdata in FORUMS_DATA:
        f = get_or_none(db, Forum, id=fdata["id"])
        if not f:
            f = Forum(id=fdata["id"], title=fdata["title"],
                      description=fdata["description"], category=fdata["category"],
                      created_at=dt(0))
            db.add(f); db.flush()
            created(f"forum {f.title}")

    for pdata in POSTS_DATA:
        author = users.get(pdata["author_email"])
        if not author:
            continue
        p = get_or_none(db, ForumPost, id=pdata["id"])
        if not p:
            p = ForumPost(id=pdata["id"], forum_id=pdata["forum_id"],
                          author_id=author.id, title=pdata["title"],
                          content=pdata["content"], is_pinned=pdata.get("is_pinned", False),
                          is_announcement=pdata.get("is_announcement", False),
                          view_count=_rng.randint(15, 180), created_at=dt(pdata["days"]))
            db.add(p); db.flush()
            created(f"post {p.title[:55]}")
        for cdata in pdata.get("comments", []):
            commenter = users.get(cdata["author_email"])
            if not commenter:
                continue
            cid = sid(f"comment:{p.id}:{commenter.id}:{cdata['days']}")
            if not get_or_none(db, Comment, id=cid):
                db.add(Comment(id=cid, post_id=p.id, author_id=commenter.id,
                               content=cdata["content"], created_at=dt(cdata["days"])))
                db.flush()
