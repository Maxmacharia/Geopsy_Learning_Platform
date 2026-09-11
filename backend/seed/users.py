"""seed/users.py — admin and learner accounts for all 20 test scenarios."""
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import hash_password
from seed.utils import sid, get_or_none, created, skipped, dt

ADMIN_PASSWORD   = "GeoPsy@Admin2024"
LEARNER_PASSWORD = "Learner@2024!"

INSTITUTIONS = [
    "Machakos University",
    "Maseno University",
    "Kenya National Polytechnic",
    "Egerton University",
    "Coast Institute of Technology",
    "Multimedia University of Kenya",
]

ADMINS = [
    dict(id=sid("user:amina.kariuki"),  email="amina.kariuki@geopsyresearch.org",
         full_name="Dr. Amina Wanjiru Kariuki",  institution="GeoPsy Research",
         bio="GIS curriculum lead and course author.", role="admin", days=0),
    dict(id=sid("user:brian.odhiambo"), email="brian.odhiambo@geopsyresearch.org",
         full_name="Mr. Brian Otieno Odhiambo",  institution="GeoPsy Research",
         bio="Remote sensing and Earth observation specialist.", role="admin", days=0),
    dict(id=sid("user:grace.njoroge"),  email="grace.njoroge@geopsyresearch.org",
         full_name="Ms. Grace Muthoni Njoroge",  institution="GeoPsy Research",
         bio="Spatial data analyst and practical project lead.", role="admin", days=0),
]

LEARNERS = [
    dict(id=sid("user:john.mwangi"),     email="john.mwangi@machakos.ac.ke",
         full_name="John Kamau Mwangi",       institution=INSTITUTIONS[0], days=1,  scenario="new_reg"),
    dict(id=sid("user:aisha.omar"),      email="aisha.omar@maseno.ac.ke",
         full_name="Aisha Fatuma Omar",        institution=INSTITUTIONS[1], days=10, scenario="no_enroll"),
    dict(id=sid("user:peter.kiprotich"), email="peter.kiprotich@knp.ac.ke",
         full_name="Peter Kipkirui Kiprotich", institution=INSTITUTIONS[2], days=8,  scenario="pay_pending"),
    dict(id=sid("user:mercy.wanjiku"),   email="mercy.wanjiku@machakos.ac.ke",
         full_name="Mercy Wanjiku Kamau",      institution=INSTITUTIONS[0], days=20, scenario="enrolled"),
    dict(id=sid("user:samuel.otieno"),   email="samuel.otieno@egerton.ac.ke",
         full_name="Samuel Omondi Otieno",     institution=INSTITUTIONS[3], days=35, scenario="failed_beg"),
    dict(id=sid("user:diana.mugo"),      email="diana.mugo@coast.ac.ke",
         full_name="Diana Muthoni Mugo",       institution=INSTITUTIONS[4], days=40, scenario="retake_beg"),
    dict(id=sid("user:eric.waweru"),     email="eric.waweru@mmu.ac.ke",
         full_name="Eric Njoroge Waweru",      institution=INSTITUTIONS[5], days=50, scenario="passed_beg"),
    dict(id=sid("user:faith.njeri"),     email="faith.njeri@maseno.ac.ke",
         full_name="Faith Achieng Njeri",      institution=INSTITUTIONS[1], days=55, scenario="enrolled_int"),
    dict(id=sid("user:kevin.mutua"),     email="kevin.mutua@knp.ac.ke",
         full_name="Kevin Kitheka Mutua",      institution=INSTITUTIONS[2], days=60, scenario="failed_int"),
    dict(id=sid("user:lydia.akinyi"),    email="lydia.akinyi@machakos.ac.ke",
         full_name="Lydia Achieng Akinyi",     institution=INSTITUTIONS[0], days=62, scenario="passed_int"),
    dict(id=sid("user:moses.kariuki"),   email="moses.kariuki@egerton.ac.ke",
         full_name="Moses Kariuki Maina",      institution=INSTITUTIONS[3], days=65, scenario="enrolled_adv"),
    dict(id=sid("user:naomi.wanjiru"),   email="naomi.wanjiru@mmu.ac.ke",
         full_name="Naomi Nyambura Wanjiru",   institution=INSTITUTIONS[5], days=70, scenario="passed_adv"),
    dict(id=sid("user:oliver.ochieng"),  email="oliver.ochieng@maseno.ac.ke",
         full_name="Oliver Otieno Ochieng",    institution=INSTITUTIONS[1], days=72, scenario="multi_cert"),
    dict(id=sid("user:patricia.wambua"), email="patricia.wambua@coast.ac.ke",
         full_name="Patricia Mwende Wambua",   institution=INSTITUTIONS[4], days=22, scenario="manual_grade"),
    dict(id=sid("user:raymond.koech"),   email="raymond.koech@knp.ac.ke",
         full_name="Raymond Kipkoech Koech",   institution=INSTITUTIONS[2], days=30, scenario="low_activity"),
    dict(id=sid("user:susan.njoki"),     email="susan.njoki@machakos.ac.ke",
         full_name="Susan Njoki Mwangi",       institution=INSTITUTIONS[0], days=45, scenario="high_activity"),
    dict(id=sid("user:thomas.kamande"),  email="thomas.kamande@egerton.ac.ke",
         full_name="Thomas Mwangi Kamande",    institution=INSTITUTIONS[3], days=58, scenario="retake2"),
    dict(id=sid("user:ursula.awuor"),    email="ursula.awuor@mmu.ac.ke",
         full_name="Ursula Adhiambo Awuor",    institution=INSTITUTIONS[5], days=25, scenario="mixed_grade"),
    dict(id=sid("user:victor.kamau"),    email="victor.kamau@maseno.ac.ke",
         full_name="Victor Waweru Kamau",      institution=INSTITUTIONS[1], days=15, scenario="prereq_test"),
    dict(id=sid("user:winnie.oloo"),     email="winnie.oloo@coast.ac.ke",
         full_name="Winnie Atieno Oloo",       institution=INSTITUTIONS[4], days=80, scenario="inactive"),
]


def seed_users(db: Session) -> dict[str, User]:
    users: dict[str, User] = {}
    for data in ADMINS:
        u = get_or_none(db, User, id=data["id"])
        if u:
            skipped(f"admin {data['email']}")
        else:
            u = User(id=data["id"], email=data["email"], full_name=data["full_name"],
                     hashed_password=hash_password(ADMIN_PASSWORD), role="admin",
                     institution=data.get("institution"), bio=data.get("bio"),
                     is_active=True, created_at=dt(0), updated_at=dt(0))
            db.add(u); db.flush()
            created(f"admin {data['email']}")
        users[data["email"]] = u

    for data in LEARNERS:
        u = get_or_none(db, User, id=data["id"])
        if u:
            skipped(f"learner {data['email']}")
        else:
            u = User(id=data["id"], email=data["email"], full_name=data["full_name"],
                     hashed_password=hash_password(LEARNER_PASSWORD), role="student",
                     institution=data["institution"],
                     is_active=(data.get("scenario") != "inactive"),
                     created_at=dt(data["days"]), updated_at=dt(data["days"]))
            db.add(u); db.flush()
            created(f"learner {data['email']}")
        u._scenario = data.get("scenario", "")
        users[data["email"]] = u
    return users
