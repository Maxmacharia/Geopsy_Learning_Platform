.PHONY: dev backend frontend install migrate seed test lint stop reset

# Detect docker compose command (modern: "docker compose", legacy: "docker-compose")
DOCKER_COMPOSE := $(shell if docker compose version > /dev/null 2>&1; then echo "docker compose"; elif command -v docker-compose > /dev/null 2>&1; then echo "docker-compose"; else echo ""; fi)

# Start everything with Docker Compose
dev:
	@if [ -z "$(DOCKER_COMPOSE)" ]; then \
		echo "❌  Docker Compose not found."; \
		echo "    Install Docker Desktop from https://www.docker.com/products/docker-desktop"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) up -d --build
	@echo ""
	@echo "✅  Services starting (first run takes ~60s for image downloads)"
	@echo ""
	@echo "   Frontend → http://localhost:5173"
	@echo "   Backend  → http://localhost:8000"
	@echo "   API Docs → http://localhost:8000/api/docs"
	@echo ""
	@echo "   Admin login: admin@geopsy.co.ke / Admin@1234!"

# Backend only (local venv, no Docker)
backend:
	cd backend && uvicorn app.main:app --reload

# Frontend only (no Docker)
frontend:
	cd frontend && npm run dev

# Install all dependencies locally
install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

# Run DB migrations
migrate:
	cd backend && alembic upgrade head

# Seed initial data
seed:
	cd backend && python -c "from app.db.session import SessionLocal; from app.db.init_db import init_db; db=SessionLocal(); init_db(db); db.close(); print('Seeded.')"

# Run backend tests
test:
	cd backend && pytest tests/ -v

# Lint frontend
lint:
	cd frontend && npm run lint

# Build frontend for production
build:
	cd frontend && npm run build

# View logs
logs:
	$(DOCKER_COMPOSE) logs -f

# Stop all services
stop:
	$(DOCKER_COMPOSE) down

# Full reset — WARNING: deletes the database volume
reset:
	$(DOCKER_COMPOSE) down -v
	$(DOCKER_COMPOSE) up -d --build
