# CLAUDE.md — updating-my-jira

## Project Overview

Git-to-Jira ticket app. Scans local git repos, analyzes work (commits, branches, uncommitted changes), generates Jira ticket suggestions, and pushes them to Jira.

## Architecture

- **Backend**: FastAPI (Python) at `backend/api/` — services, models, routes
- **Frontend**: React + TypeScript + PatternFly 5 + Vite at `frontend/`
- **MCP Server**: FastMCP wrapper at `mcp-server/server.py`
- **CLI**: Typer CLI at `cli/main.py`

All three interfaces share the same backend services (no logic duplication).

## Running

```bash
make install          # Install all dependencies
make backend          # Start FastAPI on :8000
make frontend         # Start Vite dev server on :5173
make all              # Both together
make mcp              # Run MCP server
python cli/main.py scan  # CLI usage
```

## Jira Credentials

Loaded from `~/.git2jira.env` (JIRA_URL, JIRA_API_TOKEN). Same file used by jira-mcp.

## Key Patterns

- Pydantic models in `backend/api/models/`
- Services in `backend/api/services/` (folder_scanner, git_analyzer, jira_client, ticket_suggester)
- FastAPI routes in `backend/api/routes/`
- Frontend uses sessionStorage for cross-page state between wizard steps
- PatternFly 5 components throughout the UI

## Testing

```bash
curl http://localhost:8000/api/health           # Backend health + Jira connectivity
curl http://localhost:8000/api/folders/          # List repos
python cli/main.py scan                          # CLI repo scan
```
