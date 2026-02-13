.PHONY: backend frontend mcp cli all install-backend install-frontend

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
