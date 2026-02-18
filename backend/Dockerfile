# Multi-stage Dockerfile for backend

# Stage 1: Base
FROM python:3.12-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

# Stage 2: Dependencies
FROM base AS dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Development
FROM dependencies AS development
COPY . .
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Stage 4: Production
FROM dependencies AS production
RUN groupadd --gid 1001 appuser && useradd --uid 1001 --gid appuser --create-home appuser
COPY --chown=appuser:appuser . .
EXPOSE 8000
USER appuser
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
