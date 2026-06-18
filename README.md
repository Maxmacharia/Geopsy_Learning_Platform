# 🌍 Geopsy Learning Platform

**GIS capacity building for tertiary institutions across Kenya.**

Free, open-source, mobile-first, community-driven.

---

## Stack

| Layer       | Technology                              |
|-------------|----------------------------------------|
| Frontend    | React 18 · Vite · TailwindCSS · Zustand |
| Backend     | Python 3.12 · FastAPI · SQLAlchemy      |
| Database    | PostgreSQL 15 + PostGIS                 |
| Maps        | Leaflet.js · OpenStreetMap              |
| File Storage| Cloudinary                              |
| Auth        | JWT + Google OAuth 2.0                  |
| Deploy      | Vercel (frontend) · Render (backend)    |

---

## Quick Start (Local Development)

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- Python 3.12+

### 1. Clone and configure

```bash
git clone https://github.com/your-org/geopsy.git
cd geopsy

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# Frontend
cp frontend/.env.example frontend/.env
```

### 2. Start with Docker Compose

```bash
docker-compose up -d
```

This starts:
- PostgreSQL + PostGIS on port 5432
- FastAPI backend on http://localhost:8000
- React frontend on http://localhost:5173

### 3. Or run manually

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 4. Default admin credentials

```
Email:    admin@geopsy.co.ke
Password: Admin@1234!
```

**Change these immediately in production.**

---

## API Documentation

When the backend is running, visit:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc:       http://localhost:8000/api/redoc

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                | Description                          |
|-------------------------|--------------------------------------|
| `DATABASE_URL`          | PostgreSQL connection string         |
| `SECRET_KEY`            | JWT signing secret (change this!)    |
| `GOOGLE_CLIENT_ID`      | Google OAuth client ID               |
| `GOOGLE_CLIENT_SECRET`  | Google OAuth client secret           |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                   |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                |
| `FRONTEND_URL`          | Frontend origin for CORS             |

### Frontend (`frontend/.env`)

| Variable        | Description              |
|-----------------|--------------------------|
| `VITE_API_URL`  | Backend API base URL     |

---

## Project Structure

```
geopsy/
├── backend/
│   ├── app/
│   │   ├── api/v1/routers/   # Route handlers
│   │   ├── core/             # Config, security, deps
│   │   ├── db/               # Session, base, seed
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   └── utils/            # Cloudinary, email
│   ├── alembic/              # DB migrations
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── pages/            # Route-level pages
│       ├── store/            # Zustand state
│       ├── services/         # Axios API calls
│       └── router/           # App routing
└── docker-compose.yml
```

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build
# Push to GitHub → connect to Vercel → auto-deploys
```

Set env var: `VITE_API_URL=https://your-api.onrender.com/api/v1`

### Backend → Render

1. Create a new Web Service on Render
2. Connect your GitHub repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `backend/.env.example`

### Database → Render Postgres or Supabase

1. Create a PostgreSQL database
2. Copy the connection string to `DATABASE_URL`
3. Run migrations: `alembic upgrade head`

---

## GIS Categories

- GIS Fundamentals
- Remote Sensing
- Cartography
- Spatial Databases
- QGIS
- ArcGIS
- Web GIS
- Python for GIS
- GeoServer
- PostGIS
- GPS & Surveying
- Drone Mapping
- Spatial Analysis
- OpenStreetMap

---

## Security Notes

- Change the default admin password immediately
- Set a strong `SECRET_KEY` in production
- Configure `FRONTEND_URL` and `BACKEND_CORS_ORIGINS` to your actual domains
- Enable HTTPS via Render/Vercel (automatic)
- Rate limiting is enabled via `slowapi` (100 req/min public, 20/min auth)

---

## License

MIT — free to use, modify, and distribute.

Built with ❤️ for Kenyan GIS students.
