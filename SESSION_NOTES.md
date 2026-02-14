# Git-2-Jira-Dev-Pulse Project - Session Memory

## Project Location
- **Path:** ~/repos/git-2-jira-dev-pulse
- **GitHub:** https://github.com/rhpds/git-2-jira-dev-pulse
- **Latest Commit:** 67c1f18 (chore: Change frontend port from 5173 to 5175)

## Application Ports
- **Frontend:** http://localhost:5175 (changed from 5173 due to conflict)
- **Backend:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

## MCP Servers Configured (2026-02-13)
**Config Location:** ~/Library/Application Support/Claude/claude_desktop_config.json

Configured servers:
1. Sequential thinking - @modelcontextprotocol/server-sequential-thinking
2. Memory - @modelcontextprotocol/server-memory
3. Jira (Red Hat) - localhost/jira-mcp:latest (containerized, uses ~/.rh-jira-mcp.env)
4. Git Operations - @cyanheads/git-mcp-server
5. Git-to-Jira Project - ~/repos/git-2-jira-dev-pulse/mcp-server/server.py
6. GitHub - ghcr.io/github/github-mcp-server
7. Puppeteer - @modelcontextprotocol/server-puppeteer
8. Filesystem - @modelcontextprotocol/server-filesystem
9. Kubernetes - mcp-server-kubernetes

**Jira Credentials:** ~/.rh-jira-mcp.env
- JIRA_URL=https://issues.redhat.com/
- JIRA_DEFAULT_PROJECT=RHDPOPS
- Connected as: slack-google-jira bot

## Documentation Created (4,930+ lines)
**Files Added:**
- .gitattributes (Git LFS for videos)
- CONTRIBUTING.md (430 lines)
- MCP_SETUP.md (complete MCP setup guide)
- docs/README.md (documentation index)
- docs/TODO.md (project roadmap)
- docs/ARCHITECTURE.md (550+ lines - system design)
- docs/API.md (420+ lines - complete API reference)
- docs/DEPLOYMENT.md (600+ lines - production deployment)

**Video Tutorial Scripts:**
- videos/README.md (production guide with OBS Studio instructions)
- videos/01-setup-and-installation-script.md (5 min)
- videos/02-configuring-jira-credentials-script.md (4 min)
- videos/03-using-web-ui-script.md (6 min)
- videos/04-using-cli-script.md (4 min)
- videos/05-mcp-integration-script.md (5 min)

Each script includes:
- Scene-by-scene breakdown with timestamps
- Visual annotation specifications (red circles, yellow highlights, callouts)
- Recording tips and post-production checklists
- Compression for GitHub file size limits

## Project Architecture
**Backend (FastAPI):**
- FolderScanner - scans ~/repos for git repositories
- GitAnalyzer - analyzes commits, branches, uncommitted changes
- TicketSuggester - generates Jira ticket suggestions from git work
- JiraClient - creates tickets in issues.redhat.com

**Frontend (React + PatternFly 5):**
- 3-step wizard: Select Repos → Review Work → Create Tickets
- Quarter-based grouping (Red Hat fiscal quarters)
- SessionStorage for state management

**CLI (Typer):**
Commands: scan, analyze, suggest, create, health

**MCP Server (FastMCP):**
Tools: scan_repos, analyze_repo, suggest_tickets, create_jira_ticket, check_jira_connection

## Running the Application
```bash
cd ~/repos/git-2-jira-dev-pulse
make all          # Starts backend + frontend
make backend      # Backend only (port 8000)
make frontend     # Frontend only (port 5175)
make mcp          # MCP server
python cli/main.py scan  # CLI usage
```

## Recent Commits
1. 0a1158e - docs: Add comprehensive documentation and video tutorial scripts (15 files, 4,930 insertions)
2. 67c1f18 - chore: Change frontend port from 5173 to 5175 (6 files changed)

## Key Features
- Scans ~/repos for git repositories
- Groups commits by Red Hat fiscal quarters
- Detects uncommitted changes
- AI-powered ticket suggestions
- Batch ticket creation
- Three interfaces: Web UI, CLI, MCP (all share same backend)

## Current Status
- ✅ All MCP servers configured and tested
- ✅ Documentation complete (13 files)
- ✅ Video scripts ready for recording
- ✅ Port changed to 5175 (no conflicts)
- ✅ Backend and frontend running successfully
- ✅ Jira connection verified (issues.redhat.com)
- ✅ All changes committed and pushed to GitHub

## Next Steps
- Record video tutorials using scripts in videos/
- Test git-2-jira on itself (create tickets for documentation work)
- Consider adding features from docs/TODO.md
