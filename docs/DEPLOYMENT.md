# Deployment Guide

This guide covers deploying Git-2-Jira-Dev-Pulse in various environments.

## Table of Contents
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Environment Configuration](#environment-configuration)
- [Security Considerations](#security-considerations)
- [Monitoring](#monitoring)

## Local Development

### Quick Start
```bash
git clone https://github.com/rhpds/git-2-jira-dev-pulse.git
cd git-2-jira-dev-pulse
make install
make all
```

### Development Servers

**Backend (FastAPI):**
```bash
cd backend
uvicorn api.main:app --reload --port 8000
```

**Frontend (Vite):**
```bash
cd frontend
npm run dev
```

**Hot Reload:**
- Backend: Auto-reloads on Python file changes
- Frontend: Auto-reloads on React/TypeScript changes

### Development Ports
- Backend API: http://localhost:8000
- Frontend UI: http://localhost:5173
- API Docs: http://localhost:8000/docs

## Production Deployment

### Prerequisites
- Ubuntu 20.04+ or RHEL 8+ server
- Python 3.11+
- Node.js 20+
- Nginx or Apache
- SSL certificate
- Systemd (for service management)

### Production Build

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm run build
# Outputs to frontend/dist/
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/git-2-jira

upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name git2jira.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name git2jira.example.com;

    ssl_certificate /etc/letsencrypt/live/git2jira.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/git2jira.example.com/privkey.pem;

    # Frontend (static files)
    root /var/www/git-2-jira/frontend/dist;
    index index.html;

    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API docs
    location /docs {
        proxy_pass http://backend;
    }

    # WebSocket support (if needed)
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_header_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/git-2-jira /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Systemd Service

**Backend Service:**
```ini
# /etc/systemd/system/git-2-jira-backend.service

[Unit]
Description=Git-2-Jira Backend API
After=network.target

[Service]
Type=simple
User=git2jira
Group=git2jira
WorkingDirectory=/opt/git-2-jira-dev-pulse/backend
EnvironmentFile=/opt/git-2-jira-dev-pulse/.env.production
ExecStart=/opt/git-2-jira-dev-pulse/venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable git-2-jira-backend
sudo systemctl start git-2-jira-backend
sudo systemctl status git-2-jira-backend
```

### Application User

```bash
# Create dedicated user
sudo useradd -r -s /bin/false git2jira

# Set ownership
sudo chown -R git2jira:git2jira /opt/git-2-jira-dev-pulse
```

## Docker Deployment

### Dockerfile (Backend)

```dockerfile
# backend/Dockerfile

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dockerfile (Frontend)

```dockerfile
# frontend/Dockerfile

FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy build files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

```yaml
# docker-compose.yml

version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - JIRA_URL=${JIRA_URL}
      - JIRA_API_TOKEN=${JIRA_API_TOKEN}
      - JIRA_DEFAULT_PROJECT=${JIRA_DEFAULT_PROJECT}
      - REPOS_BASE_PATH=/repos
    volumes:
      - ${HOST_REPOS_PATH}:/repos:ro
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
```

**Deploy:**
```bash
docker-compose up -d
docker-compose logs -f
```

## Environment Configuration

### Production Environment File

```env
# .env.production

# Jira Configuration
JIRA_URL=https://issues.redhat.com
JIRA_API_TOKEN=<secure-token>
JIRA_DEFAULT_PROJECT=RHDPOPS
JIRA_DEFAULT_ASSIGNEE=<username>

# Repositories
REPOS_BASE_PATH=/data/repos

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4

# Security
SECRET_KEY=<generate-secure-key>
ALLOWED_ORIGINS=https://git2jira.example.com

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/git-2-jira/app.log

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
```

### Environment-Specific Configs

**Development:**
```env
DEBUG=true
LOG_LEVEL=DEBUG
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Production:**
```env
DEBUG=false
LOG_LEVEL=INFO
ALLOWED_ORIGINS=https://git2jira.example.com
```

## Security Considerations

### Credentials Management

**Never commit:**
- `.env` files
- API tokens
- Passwords
- Private keys

**Use environment variables:**
```bash
export JIRA_API_TOKEN="$(cat /secure/path/jira-token.txt)"
```

**Or secret management:**
- Vault by HashiCorp
- AWS Secrets Manager
- Azure Key Vault
- Kubernetes Secrets

### API Security

**Enable CORS properly:**
```python
# backend/api/main.py

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

**Add rate limiting:**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/folders/")
@limiter.limit("10/minute")
async def list_folders():
    ...
```

**Input validation:**
- All inputs validated with Pydantic
- Path traversal prevented
- SQL injection not applicable (no SQL)

### SSL/TLS

**Get certificate (Let's Encrypt):**
```bash
sudo certbot --nginx -d git2jira.example.com
```

**Force HTTPS:**
```nginx
# Redirect all HTTP to HTTPS
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

### Firewall

```bash
# Allow only necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## Monitoring

### Health Checks

**Backend health endpoint:**
```bash
curl http://localhost:8000/api/health
```

**Systemd monitoring:**
```bash
sudo systemctl status git-2-jira-backend
sudo journalctl -u git-2-jira-backend -f
```

### Logging

**Backend logging:**
```python
# backend/api/config.py

import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/git-2-jira/app.log'),
        logging.StreamHandler()
    ]
)
```

**Log rotation:**
```
# /etc/logrotate.d/git-2-jira

/var/log/git-2-jira/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 git2jira git2jira
    sharedscripts
    postrotate
        systemctl reload git-2-jira-backend
    endscript
}
```

### Metrics (Prometheus)

```python
# backend/api/main.py

from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI()

# Instrument
Instrumentator().instrument(app).expose(app)
```

**Metrics endpoint:**
```
http://localhost:8000/metrics
```

### Uptime Monitoring

**Use services like:**
- UptimeRobot
- Pingdom
- StatusCake
- New Relic

**Monitor endpoints:**
- `https://git2jira.example.com/api/health`
- `https://git2jira.example.com/`

## Backup and Recovery

### Database (if added)

```bash
# Backup
pg_dump git2jira > backup_$(date +%Y%m%d).sql

# Restore
psql git2jira < backup_20260213.sql
```

### Configuration

```bash
# Backup configs
tar czf config-backup.tar.gz \
    /opt/git-2-jira-dev-pulse/.env.production \
    /etc/nginx/sites-available/git-2-jira \
    /etc/systemd/system/git-2-jira-backend.service
```

### Automated Backups

```bash
# /etc/cron.daily/git-2-jira-backup

#!/bin/bash
BACKUP_DIR=/var/backups/git-2-jira
DATE=$(date +%Y%m%d)

# Create backup
tar czf $BACKUP_DIR/git-2-jira-$DATE.tar.gz \
    /opt/git-2-jira-dev-pulse/.env.production \
    /var/log/git-2-jira

# Delete old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

## Scaling

### Horizontal Scaling (Multiple Workers)

**Gunicorn with uvicorn workers:**
```bash
gunicorn api.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000
```

**Systemd with multiple instances:**
```ini
[Service]
ExecStart=/opt/git-2-jira-dev-pulse/venv/bin/gunicorn api.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000
```

### Load Balancing

**Nginx load balancer:**
```nginx
upstream backend {
    least_conn;
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}
```

### Caching

**Redis caching (future):**
```python
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://localhost")
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
```

## Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check logs
sudo journalctl -u git-2-jira-backend -n 50

# Check port
sudo netstat -tlnp | grep 8000

# Check environment
sudo -u git2jira cat /proc/$(pgrep -f uvicorn)/environ | tr '\0' '\n'
```

**Frontend 502 errors:**
```bash
# Check backend health
curl http://localhost:8000/api/health

# Check nginx config
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

**Jira connection fails:**
```bash
# Test from server
curl -H "Authorization: Bearer $JIRA_API_TOKEN" \
    https://issues.redhat.com/rest/api/2/myself

# Check firewall
sudo ufw status
```

## Updates and Maintenance

### Update Process

```bash
# 1. Backup
sudo tar czf /var/backups/git-2-jira-pre-update.tar.gz \
    /opt/git-2-jira-dev-pulse

# 2. Pull updates
cd /opt/git-2-jira-dev-pulse
sudo -u git2jira git pull

# 3. Update dependencies
sudo -u git2jira pip install -r backend/requirements.txt
cd frontend && sudo -u git2jira npm install && npm run build

# 4. Restart services
sudo systemctl restart git-2-jira-backend
sudo systemctl reload nginx

# 5. Verify
curl http://localhost:8000/api/health
```

### Zero-Downtime Deployment

```bash
# Blue-green deployment
# Deploy to new instance, test, switch traffic
```

## Support

- Documentation: https://github.com/rhpds/git-2-jira-dev-pulse/docs
- Issues: https://github.com/rhpds/git-2-jira-dev-pulse/issues
- Slack: #rhdp-dev-tools
