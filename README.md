# git-2-jira-dev-pulse

Turn your git activity into Jira tickets. Scans local repositories, visualizes work by quarter, and creates tickets in one click.

Built for the RHDP team — works with Red Hat Jira (`issues.redhat.com`) out of the box, but configurable for any Jira instance.

## What It Does

1. **Select Repos** — picks up all git repos in your `~/repos` directory
2. **Work Dashboard** — groups commits, PRs, and existing Jira tickets by Red Hat fiscal quarter (or calendar quarter), with week-level drill-down
3. **Create Tickets** — generates smart ticket suggestions from your git activity and pushes them to Jira

Comes in three flavors: **Web UI** (React + PatternFly), **CLI**, and **MCP Server** (for Claude Code / Claude Desktop).

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- [GitHub CLI](https://cli.github.com/) (`gh`) — authenticated and logged in
- A Jira Personal Access Token

### 1. Clone and install

```bash
git clone https://github.com/rhpds/git-2-jira-dev-pulse.git
cd git-2-jira-dev-pulse
make install
```

### 2. Configure your environment

Copy the example env file to your home directory:

```bash
cp .env.example ~/.rh-jira-mcp.env
```

Then edit `~/.rh-jira-mcp.env` with your values:

```env
JIRA_URL=https://issues.redhat.com
JIRA_API_TOKEN=<your-token>
JIRA_DEFAULT_PROJECT=RHDPOPS
JIRA_DEFAULT_ASSIGNEE=<your-jira-username>
REPOS_BASE_PATH=~/repos
```

**Getting your Jira API token:**

| Jira Instance | Where to Generate |
|---|---|
| Red Hat Jira (`issues.redhat.com`) | [Profile → Personal Access Tokens](https://issues.redhat.com/secure/ViewProfile.jspa) |
| Atlassian Cloud (`*.atlassian.net`) | [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |
| Self-hosted Jira Server | Your Jira admin panel → Personal Access Tokens |

**Using a different Jira instance:**

Change `JIRA_URL` to your server and `JIRA_DEFAULT_PROJECT` to your project key. Everything else works the same.

### 3. Run

```bash
# Web UI (recommended)
make all          # Starts backend (:8000) + frontend (:5173)

# Or run separately
make backend      # FastAPI on http://localhost:8000
make frontend     # Vite dev server on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Verify

```bash
curl http://localhost:8000/api/health
```

Should return `"connected": true` with your Jira user info.

## CLI Usage

```bash
python cli/main.py scan                              # List all repos
python cli/main.py analyze ~/repos/my-project        # Analyze a single repo
python cli/main.py suggest ~/repos/my-project        # Generate ticket suggestions
python cli/main.py create --project RHDPOPS \
  --summary "Add feature X" --type Story             # Create a ticket directly
python cli/main.py health                             # Check Jira connection
```

## MCP Server (Claude Code / Claude Desktop)

Add to your Claude configuration:

```json
{
  "mcpServers": {
    "git-to-jira": {
      "command": "python",
      "args": ["<path-to-repo>/mcp-server/server.py"]
    }
  }
}
```

Then ask Claude: *"Scan my repos and suggest Jira tickets for this quarter's work"*

## RHDP Team Notes

- The default project is **RHDPOPS** — change `JIRA_DEFAULT_PROJECT` in your env if you use a different project
- The dashboard supports **Red Hat fiscal quarters** (FY starts in March: Q1=Mar-May, Q2=Jun-Aug, Q3=Sep-Nov, Q4=Dec-Feb) — toggle to calendar quarters in the UI
- PR detection requires `gh auth login` with access to the repos you work on
- The `rhdp-slack-bot` Jira integration is available in the RHDPOPS project — tickets created here will be visible there too

## Project Structure

```
backend/api/          FastAPI backend — services, models, routes
frontend/src/         React + TypeScript + PatternFly 5 + Vite
cli/                  Typer CLI
mcp-server/           FastMCP server for Claude
```

## Environment File Location

The app reads from `~/.rh-jira-mcp.env` by default. This is the same file used by `jira-mcp` and other RHDP tools, so if you already have that set up, you're good to go.
