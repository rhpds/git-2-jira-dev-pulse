# Multi-stage Dockerfile for DevPulse
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npx vite build

# Stage 2: Python backend + static frontend
FROM python:3.12-slim AS production
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./static

# Create non-root user and data directory
# OCP runs with arbitrary UIDs in the root group, so we need group write
RUN useradd -m -r -g 0 devpulse && \
    mkdir -p /home/devpulse/.git2jira && \
    chown -R devpulse:0 /app /home/devpulse && \
    chmod -R g=u /app /home/devpulse
USER devpulse

# Environment
ENV PYTHONUNBUFFERED=1
ENV PORT=9000

EXPOSE 9000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "9000"]
