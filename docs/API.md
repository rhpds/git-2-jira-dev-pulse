# API Documentation

Base URL: `http://localhost:8000`

## Health Check

### `GET /api/health`

Check Jira connectivity and get current user info.

**Response:**
```json
{
  "status": "ok",
  "jira": {
    "connected": true,
    "user": {
      "accountId": "557058:...",
      "displayName": "John Doe",
      "emailAddress": "jdoe@redhat.com"
    }
  }
}
```

**Example:**
```bash
curl http://localhost:8000/api/health
```

---

## Repository Scanning

### `GET /api/folders/`

List all git repositories in the configured base path.

**Query Parameters:**
- `base_path` (optional): Override the default repos path

**Response:**
```json
[
  {
    "name": "git-2-jira-dev-pulse",
    "path": "/Users/josh/repos/git-2-jira-dev-pulse",
    "last_commit": "2026-02-13T15:30:00Z"
  },
  {
    "name": "aiops-skills",
    "path": "/Users/josh/repos/aiops-skills",
    "last_commit": "2026-02-10T10:15:00Z"
  }
]
```

**Example:**
```bash
curl http://localhost:8000/api/folders/
```

---

## Git Analysis

### `POST /api/analyze/`

Analyze a git repository's work history.

**Request Body:**
```json
{
  "path": "/Users/josh/repos/my-project",
  "max_commits": 30,
  "since_days": 30
}
```

**Parameters:**
- `path` (required): Absolute path to git repository
- `max_commits` (optional, default: 30): Maximum number of commits to analyze
- `since_days` (optional, default: 30): Only include commits from last N days

**Response:**
```json
{
  "repository": {
    "name": "my-project",
    "path": "/Users/josh/repos/my-project",
    "last_commit": "2026-02-13T15:30:00Z"
  },
  "commits": [
    {
      "hash": "a1b2c3d",
      "message": "Add new feature X",
      "author": "John Doe",
      "date": "2026-02-13T14:20:00Z",
      "files_changed": 5,
      "insertions": 120,
      "deletions": 30
    }
  ],
  "branches": [
    {
      "name": "main",
      "last_commit": "a1b2c3d",
      "is_current": true
    },
    {
      "name": "feature/new-ui",
      "last_commit": "b2c3d4e",
      "is_current": false
    }
  ],
  "uncommitted_changes": {
    "has_changes": true,
    "staged_files": ["src/app.py"],
    "unstaged_files": ["README.md"],
    "total_additions": 45,
    "total_deletions": 12
  },
  "quarters": {
    "FY26Q4": {
      "label": "FY26 Q4 (Dec 2025 - Feb 2026)",
      "start_date": "2025-12-01",
      "end_date": "2026-02-28",
      "commit_count": 15,
      "commits": [...]
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/analyze/ \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/Users/josh/repos/my-project",
    "max_commits": 50,
    "since_days": 60
  }'
```

---

## Ticket Suggestions

### `POST /api/suggest/`

Generate Jira ticket suggestions from git work summaries.

**Request Body:**
```json
{
  "work_summaries": [
    {
      "repository": {...},
      "commits": [...],
      "branches": [...],
      "uncommitted_changes": {...}
    }
  ],
  "project_key": "RHDPOPS"
}
```

**Parameters:**
- `work_summaries` (required): Array of GitWorkSummary objects from `/api/analyze/`
- `project_key` (required): Jira project key (e.g., "RHDPOPS")

**Response:**
```json
[
  {
    "project_key": "RHDPOPS",
    "summary": "Implement user authentication",
    "description": "Based on recent commits in my-project:\n\n- Add login endpoint\n- Create JWT token service\n- Implement password hashing\n\nCommits: a1b2c3d, b2c3d4e, c3d4e5f",
    "issue_type": "Story",
    "priority": "Major",
    "source_commits": ["a1b2c3d", "b2c3d4e", "c3d4e5f"],
    "estimated_story_points": 5
  },
  {
    "project_key": "RHDPOPS",
    "summary": "Fix database connection timeout",
    "description": "Resolved database connection issues:\n\n- Increase connection pool size\n- Add retry logic\n- Improve error handling\n\nCommit: d4e5f6a",
    "issue_type": "Bug",
    "priority": "Critical",
    "source_commits": ["d4e5f6a"],
    "estimated_story_points": 3
  }
]
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/suggest/ \
  -H "Content-Type: application/json" \
  -d @work_summary.json
```

---

## Ticket Creation

### `POST /api/tickets/`

Create a single Jira ticket.

**Request Body:**
```json
{
  "project_key": "RHDPOPS",
  "summary": "Implement user authentication",
  "description": "Add login and JWT token functionality",
  "issue_type": "Story",
  "priority": "Major",
  "assignee": "jdoe",
  "labels": ["backend", "security"]
}
```

**Parameters:**
- `project_key` (required): Jira project key
- `summary` (required): Ticket title (max 255 chars)
- `description` (required): Ticket description (Markdown supported)
- `issue_type` (required): One of: `Story`, `Task`, `Bug`
- `priority` (optional, default: "Major"): One of: `Blocker`, `Critical`, `Major`, `Normal`, `Minor`
- `assignee` (optional): Jira username (defaults to current user)
- `labels` (optional): Array of labels

**Response:**
```json
{
  "success": true,
  "key": "RHDPOPS-1234",
  "url": "https://issues.redhat.com/browse/RHDPOPS-1234",
  "summary": "Implement user authentication"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/tickets/ \
  -H "Content-Type: application/json" \
  -d '{
    "project_key": "RHDPOPS",
    "summary": "Add dark mode",
    "description": "Implement dark mode toggle in UI settings",
    "issue_type": "Story",
    "priority": "Normal"
  }'
```

---

### `POST /api/tickets/batch`

Create multiple Jira tickets at once.

**Request Body:**
```json
{
  "tickets": [
    {
      "project_key": "RHDPOPS",
      "summary": "First ticket",
      "description": "Description 1",
      "issue_type": "Story"
    },
    {
      "project_key": "RHDPOPS",
      "summary": "Second ticket",
      "description": "Description 2",
      "issue_type": "Task"
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "success": true,
      "key": "RHDPOPS-1234",
      "url": "https://issues.redhat.com/browse/RHDPOPS-1234",
      "summary": "First ticket"
    },
    {
      "success": true,
      "key": "RHDPOPS-1235",
      "url": "https://issues.redhat.com/browse/RHDPOPS-1235",
      "summary": "Second ticket"
    }
  ],
  "total": 2,
  "successful": 2,
  "failed": 0
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/tickets/batch \
  -H "Content-Type: application/json" \
  -d @tickets.json
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid Jira token)
- `404` - Not Found (repository or ticket not found)
- `500` - Internal Server Error

**Example Error:**
```json
{
  "detail": "Repository not found: /invalid/path"
}
```

---

## Rate Limiting

The Jira API has rate limits. If you hit a rate limit, you'll receive:

```json
{
  "detail": "Rate limit exceeded. Please try again in 60 seconds."
}
```

**Recommendations:**
- Use batch endpoints when creating multiple tickets
- Add delays between individual ticket creations
- Consider using the CLI or Web UI for bulk operations

---

## CORS

The API allows requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (alternative frontend)

For production deployments, configure CORS origins in `backend/api/main.py`.

---

## Testing the API

### Using curl
```bash
# Health check
curl http://localhost:8000/api/health

# List repos
curl http://localhost:8000/api/folders/

# Analyze a repo
curl -X POST http://localhost:8000/api/analyze/ \
  -H "Content-Type: application/json" \
  -d '{"path": "/Users/josh/repos/my-project"}'
```

### Using httpie
```bash
# Install: pip install httpie

http GET http://localhost:8000/api/health
http GET http://localhost:8000/api/folders/
http POST http://localhost:8000/api/analyze/ path=/Users/josh/repos/my-project
```

### Using Python requests
```python
import requests

# Health check
response = requests.get("http://localhost:8000/api/health")
print(response.json())

# Create ticket
ticket = {
    "project_key": "RHDPOPS",
    "summary": "Test ticket",
    "description": "Created via API",
    "issue_type": "Task"
}
response = requests.post("http://localhost:8000/api/tickets/", json=ticket)
print(response.json())
```

---

## Authentication

The API does not require authentication itself. However, it uses your Jira credentials from `~/.rh-jira-mcp.env` to communicate with Jira.

**Required environment variables:**
```env
JIRA_URL=https://issues.redhat.com
JIRA_API_TOKEN=<your-token>
```

If these are missing or invalid, the `/api/health` endpoint will return `connected: false`.

---

## Development

### Running the API
```bash
cd backend
uvicorn api.main:app --reload --port 8000
```

### API Documentation
Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

### Adding New Endpoints

1. Create route in `backend/api/routes/`
2. Add service logic in `backend/api/services/`
3. Define models in `backend/api/models/`
4. Register route in `backend/api/main.py`

Example:
```python
# routes/my_route.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/myroute")

@router.get("/")
async def my_endpoint():
    return {"message": "Hello"}

# main.py
from api.routes import my_route
app.include_router(my_route.router)
```
