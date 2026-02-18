.PHONY: backend frontend mcp cli all install-backend install-frontend \
        test-backend test-backend-cov test-frontend test-frontend-cov test-e2e \
        test test-all lint-backend lint-frontend lint \
        docker-build docker-up docker-down docker-logs docker-clean \
        dev dev-rebuild ci

# --- Install ---
install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

install: install-backend install-frontend

# --- Run ---
backend:
	cd backend && uvicorn api.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

mcp:
	cd mcp-server && python server.py

cli:
	cd cli && python main.py $(CMD)

# Run backend + frontend together
all:
	@echo "Starting backend and frontend..."
	@make backend & make frontend

# --- Testing ---
test-backend:
	cd backend && pytest

test-backend-cov:
	cd backend && pytest --cov=api --cov-report=term-missing --cov-report=html

test-frontend:
	cd frontend && npm run test

test-frontend-cov:
	cd frontend && npm run test:coverage

test-e2e:
	cd frontend && npm run test:e2e

test: test-backend test-frontend

test-all: test-backend test-frontend test-e2e

# --- Linting ---
lint-backend:
	cd backend && ruff check api

lint-frontend:
	cd frontend && npm run lint && npm run type-check

lint: lint-backend lint-frontend

# --- Docker ---
docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-clean:
	docker compose down -v
	docker system prune -f

dev:
	docker compose up

dev-rebuild:
	docker compose up --build

# --- CI ---
ci: lint test-all
	@echo "All CI checks passed!"
