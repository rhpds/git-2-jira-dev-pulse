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
make all          # Starts backend (:8000) + frontend (:5175)

# Or run separately
make backend      # FastAPI on http://localhost:8000
make frontend     # Vite dev server on http://localhost:5175
```

Open [http://localhost:5175](http://localhost:5175) in your browser.

### 4. Verify

```bash
curl http://localhost:8000/api/health
```

Should return `"connected": true` with your Jira user info.

## CLI Usage

### Scanning Repositories

```bash
# Scan all configured directories
python cli/main.py scan

# Scan with directory grouping (shows repos organized by parent directory)
python cli/main.py scan --group
```

### Configuration Management

```bash
# View current configuration
python cli/main.py config list

# Add a new scan directory
python cli/main.py config add ~/projects --recursive --max-depth 3

# Add with custom exclusions
python cli/main.py config add ~/work -r -d 2 --exclude "*.pyc" --exclude "build/*"

# Remove a scan directory
python cli/main.py config remove ~/projects

# Export configuration
python cli/main.py config export --format yaml
python cli/main.py config export --output config-backup.yaml

# Migrate from legacy .env to new YAML config
python cli/main.py config migrate
```

### Analysis and Tickets

```bash
# Analyze a single repo
python cli/main.py analyze ~/repos/my-project

# Generate ticket suggestions
python cli/main.py suggest ~/repos/my-project

# Create a ticket directly
python cli/main.py create --project RHDPOPS \
  --summary "Add feature X" --type Story

# Check Jira connection
python cli/main.py health
```

## Multi-Directory Configuration

Git-2-Jira now supports scanning multiple directories with individual settings. Configuration is stored in `~/.git2jira.config.yaml`.

### Configuration File

See [`example.config.yaml`](./example.config.yaml) for a complete example. Key features:

- **Multiple scan directories** — each with its own settings
- **Recursive scanning** — with configurable depth limits
- **Pattern-based exclusions** — use glob patterns like `node_modules`, `build/*`, `*.pyc`
- **Per-directory exclusions** — exclude specific folders by name
- **Auto-discovery** (experimental) — automatically detect new repositories

### Example Configuration

```yaml
version: "1.0"

scan_directories:
  # Non-recursive scan
  - path: "~/repos"
    enabled: true
    recursive: false
    max_depth: 1
    exclude_patterns:
      - "node_modules"
      - ".venv"
      - "build/*"

  # Recursive scan with depth limit
  - path: "~/projects"
    enabled: true
    recursive: true
    max_depth: 3
    exclude_patterns:
      - "vendor/*"
      - "*.egg-info"
```

### Backward Compatibility

The tool automatically falls back to `~/.rh-jira-mcp.env` if no YAML config exists. Use `python cli/main.py config migrate` to upgrade to the new format.

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

## Web UI Features

The modern web interface includes:

### Visual Themes

- **Standard Mode** — Classic PatternFly design with solid cards
- **Glassmorphic Mode** — Modern frosted glass effect with gradients, blur, and animations

Toggle between themes in **Settings → Visual Preferences**.

### Data Visualizations

- **Activity Heatmap** — Bar chart showing the top 10 most active repositories (commits + uncommitted changes)
- **Repository Status Pie Chart** — Distribution of clean vs. dirty repositories
- **Statistics Cards** — Live summary of total repos, commits, uncommitted changes, and clean repos

Enable/disable visualizations in **Settings → Visual Preferences**.

### View Modes

Switch between three view modes on the main scan page:

- **Grid View** — Repository cards in a responsive grid layout (default)
- **List View** — Compact list with repository details (coming soon)
- **Visualization View** — Focus on charts and data insights

### Auto-Discovery Watcher

The file system watcher automatically detects new git repositories in your configured scan directories:

- **Real-time discovery** — New repos appear within 30 seconds
- **Periodic scanning** — Fallback scan every 5 minutes
- **Manual trigger** — Force an immediate scan from Settings

Configure in **Settings → Auto-Discovery**:

```bash
# Or via CLI
python cli/main.py config watcher start
python cli/main.py config watcher stop
python cli/main.py config watcher status
```

### Settings Page

Manage all configuration through the web UI:

- **📁 Scan Directories** — Add/remove directories, configure recursion and exclusions
- **🔍 Auto-Discovery** — Control the file system watcher
- **🎨 Visual Preferences** — Customize theme, animations, and visualizations
- **⚙️ Advanced** — Performance tuning, cache settings, export configuration

Access at [http://localhost:5175/settings](http://localhost:5175/settings)

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
