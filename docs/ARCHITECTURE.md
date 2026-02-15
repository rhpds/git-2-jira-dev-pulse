# Architecture

## Overview

Git-2-Jira-Dev-Pulse is a multi-interface application that transforms git activity into Jira tickets. It follows a shared-backend architecture where all interfaces (Web UI, CLI, MCP) use the same backend services.

```
┌─────────────────────────────────────────────────────────────┐
│                         Interfaces                          │
├──────────────┬──────────────────┬─────────────────────────┤
│   Web UI     │       CLI        │      MCP Server         │
│ React + PF5  │   Typer CLI      │   FastMCP (Claude)      │
│  Port 5173   │   Direct calls   │   stdio transport       │
└──────┬───────┴────────┬─────────┴──────────┬──────────────┘
       │                │                    │
       │                └────────┬───────────┘
       │                         │
       ▼                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                         │
│                      (Port 8000)                            │
├─────────────────────────────────────────────────────────────┤
│  Routes    │  /api/folders/   /api/analyze/  /api/suggest/ │
│            │  /api/tickets/   /api/health                   │
├─────────────────────────────────────────────────────────────┤
│  Services  │  folder_scanner   git_analyzer                │
│            │  ticket_suggester jira_client                  │
├─────────────────────────────────────────────────────────────┤
│  Models    │  Repository       GitWorkSummary               │
│            │  TicketSuggestion JiraModels                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │        External Systems             │
        ├──────────────────┬──────────────────┤
        │  Git Repos       │  Jira API        │
        │  ~/repos/        │  your-jira       │
        │  (GitPython)     │  (jira library)  │
        └──────────────────┴──────────────────┘
```

## Backend Architecture

### Core Services

#### 1. FolderScanner (`backend/api/services/folder_scanner.py`)
**Responsibility:** Discover and list git repositories

```python
class FolderScanner:
    def scan() -> list[Repository]:
        """Scans base path for git repos"""
        # Returns: repo name, path, last commit date
```

**Flow:**
1. Walk through `REPOS_BASE_PATH` directory
2. Identify git repos by `.git` folder presence
3. Extract basic metadata (name, path)
4. Return list of Repository models

#### 2. GitAnalyzer (`backend/api/services/git_analyzer.py`)
**Responsibility:** Analyze git history and current state

```python
class GitAnalyzer:
    def get_work_summary(path, max_commits, since_days) -> GitWorkSummary:
        """Analyzes commits, branches, and uncommitted changes"""
```

**Flow:**
1. Open repo with GitPython
2. Get commit log (filtered by date/count)
3. List branches (local + remote)
4. Detect uncommitted changes (staged + unstaged)
5. Group commits by quarter
6. Return structured summary

**Key Data:**
- Commits: hash, message, author, date, files changed
- Branches: name, last commit
- Uncommitted: modified files, line counts

#### 3. TicketSuggester (`backend/api/services/ticket_suggester.py`)
**Responsibility:** Generate Jira ticket suggestions from git activity

```python
class TicketSuggester:
    def suggest(summaries, project_key) -> list[TicketSuggestion]:
        """Converts git work into ticket suggestions"""
```

**Algorithm:**
1. Analyze commit messages for ticket-worthy work
2. Group related commits by feature/area
3. Detect patterns (new features, bug fixes, refactors)
4. Generate ticket summaries and descriptions
5. Assign appropriate issue types and priorities
6. Return suggestions with git references

**Heuristics:**
- Feature commits → Story
- Fix/bug commits → Bug
- Large file changes → Task
- Default priority: Major

#### 4. JiraClient (`backend/api/services/jira_client.py`)
**Responsibility:** Interface with Jira API

```python
class JiraClient:
    def check_connection() -> dict:
        """Verifies Jira connectivity"""

    def create_ticket(request: TicketCreateRequest) -> TicketCreateResult:
        """Creates a single Jira ticket"""

    def create_tickets_batch(requests) -> list[TicketCreateResult]:
        """Creates multiple tickets"""
```

**Features:**
- Connection health check
- Single ticket creation
- Batch ticket creation
- Error handling and retry logic
- Credential management (from ~/.git2jira.env)

### Data Models

#### Repository
```python
@dataclass
class Repository:
    name: str
    path: str
    last_commit: Optional[datetime]
```

#### GitWorkSummary
```python
@dataclass
class GitWorkSummary:
    repository: Repository
    commits: list[Commit]
    branches: list[Branch]
    uncommitted_changes: UncommittedChanges
    quarters: dict[str, QuarterSummary]
```

#### TicketSuggestion
```python
@dataclass
class TicketSuggestion:
    project_key: str
    summary: str
    description: str
    issue_type: IssueType  # Story, Task, Bug
    priority: Priority     # Blocker, Critical, Major, Normal, Minor
    source_commits: list[str]
    estimated_story_points: Optional[int]
```

## Frontend Architecture

### Technology Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **PatternFly 5** - Design system
- **React Router** - Navigation

### Component Structure

```
src/
├── App.tsx                   # Root component, routing
├── pages/
│   ├── SelectRepos.tsx       # Step 1: Select repositories
│   ├── ReviewWork.tsx        # Step 2: Review work by quarter
│   └── CreateTickets.tsx     # Step 3: Create Jira tickets
├── components/
│   ├── RepoCard.tsx          # Repository display card
│   ├── QuarterView.tsx       # Quarter-based grouping
│   ├── TicketForm.tsx        # Ticket creation form
│   └── HealthCheck.tsx       # Connection status
└── services/
    └── api.ts                # API client (fetch wrapper)
```

### State Management

**Session Storage** for wizard flow:
```typescript
// Page 1 → Page 2
sessionStorage.setItem('selectedRepos', JSON.stringify(repos))

// Page 2 → Page 3
sessionStorage.setItem('workSummaries', JSON.stringify(summaries))
```

**React State** for page-level data:
```typescript
const [repos, setRepos] = useState<Repository[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### API Client

```typescript
// services/api.ts
const API_BASE = 'http://localhost:8000'

export const api = {
  listRepos: () => fetch(`${API_BASE}/api/folders/`),
  analyzeRepo: (path: string) => fetch(`${API_BASE}/api/analyze/`, ...),
  suggestTickets: (data) => fetch(`${API_BASE}/api/suggest/`, ...),
  createTicket: (ticket) => fetch(`${API_BASE}/api/tickets/`, ...),
  healthCheck: () => fetch(`${API_BASE}/api/health`)
}
```

## CLI Architecture

Built with **Typer** for automatic command generation:

```python
# cli/main.py
app = typer.Typer()

@app.command()
def scan():
    """Scan ~/repos for git repositories"""

@app.command()
def analyze(path: str):
    """Analyze a single repository"""

@app.command()
def suggest(paths: list[str], project: str = "MYPROJECT"):
    """Generate ticket suggestions"""

@app.command()
def create(...):
    """Create a Jira ticket"""
```

**Direct service calls** (no API):
```python
scanner = FolderScanner(settings.repos_base_path)
analyzer = GitAnalyzer()
jira = JiraClient(...)
suggester = TicketSuggester()
```

## MCP Server Architecture

Built with **FastMCP** for Claude integration:

```python
# mcp-server/server.py
mcp = FastMCP("git-to-jira")

@mcp.tool()
def scan_repos() -> str:
    """Scan ~/repos/ for git repositories"""

@mcp.tool()
def analyze_repo(path: str, ...) -> str:
    """Analyze a git repository"""

@mcp.tool()
def suggest_tickets(paths: list[str], ...) -> str:
    """Generate Jira ticket suggestions"""

@mcp.tool()
def create_jira_ticket(...) -> str:
    """Create a single Jira ticket"""
```

**Transport:** stdio (standard input/output)
**Claude reads from:** Tool results (JSON strings)

## Configuration

### Environment Variables
All interfaces read from `~/.git2jira.env`:

```env
JIRA_URL=https://your-jira.atlassian.net
JIRA_API_TOKEN=<token>
JIRA_DEFAULT_PROJECT=MYPROJECT
JIRA_DEFAULT_ASSIGNEE=<username>
REPOS_BASE_PATH=~/repos
```

### Settings (`backend/api/config.py`)
```python
class Settings(BaseSettings):
    jira_url: str
    jira_api_token: str
    jira_default_project: str = "MYPROJECT"
    repos_base_path: Path = Path.home() / "repos"

    class Config:
        env_file = Path.home() / ".git2jira.env"
```

## Data Flow Examples

### Web UI: Create Ticket Flow
1. User selects repos → `POST /api/folders/select`
2. User clicks "Analyze" → `POST /api/analyze/` for each repo
3. Backend runs `GitAnalyzer.get_work_summary()`
4. Frontend displays work grouped by quarter
5. User clicks "Suggest Tickets" → `POST /api/suggest/`
6. Backend runs `TicketSuggester.suggest()`
7. User reviews suggestions, clicks "Create"
8. Frontend sends `POST /api/tickets/` for each ticket
9. Backend calls `JiraClient.create_ticket()`
10. Jira API creates ticket, returns key
11. Frontend displays success with ticket links

### CLI: Direct Ticket Creation
1. User runs `python cli/main.py create --summary "..." --type Story`
2. CLI creates `TicketCreateRequest` from args
3. Calls `JiraClient.create_ticket()` directly
4. Displays result to console

### MCP: Claude Integration
1. User asks Claude: "Scan my repos and suggest tickets"
2. Claude calls `scan_repos()` tool
3. MCP server runs `FolderScanner.scan()`
4. Returns JSON to Claude
5. Claude calls `analyze_repo()` for interesting repos
6. MCP server runs `GitAnalyzer.get_work_summary()`
7. Claude calls `suggest_tickets()` with analyzed data
8. MCP server runs `TicketSuggester.suggest()`
9. Claude presents suggestions to user
10. User approves → Claude calls `create_jira_ticket()`

## Security Considerations

1. **Credentials:** Stored in home directory (`~/.git2jira.env`), not in repo
2. **API Token:** Passed via environment, never logged
3. **CORS:** FastAPI backend restricts origins (localhost only by default)
4. **Input Validation:** Pydantic models validate all inputs
5. **Path Traversal:** FolderScanner validates repo paths

## Performance Considerations

1. **Git Operations:** Can be slow for large repos with deep history
   - Mitigation: Limit commits (`max_commits` parameter)
   - Future: Cache results, parallel processing

2. **Multiple Repos:** Sequential scanning can be slow
   - Future: Parallel repo analysis with asyncio

3. **Jira API:** Rate limits on ticket creation
   - Current: Sequential batch creation
   - Future: Respect rate limits, add retry with backoff

## Testing Strategy

1. **Backend Services:** Unit tests with pytest
2. **API Endpoints:** Integration tests with FastAPI TestClient
3. **Frontend:** Component tests with Vitest, E2E with Playwright
4. **MCP Server:** Integration tests with MCP protocol validator
5. **CLI:** Functional tests with typer testing utilities

## Deployment

### Local Development
```bash
make install  # Install dependencies
make all      # Run backend + frontend
```

### Production (Future)
- Docker Compose with nginx reverse proxy
- Environment-specific configs
- HTTPS with SSL certificates
- Monitoring and logging

## Future Architecture Enhancements

1. **Background Jobs:** Celery for async ticket creation
2. **Database:** PostgreSQL for caching and history
3. **Real-time Updates:** WebSocket for live progress
4. **Multi-user:** User authentication and personal repos
5. **Analytics:** Track ticket creation patterns and success rates
