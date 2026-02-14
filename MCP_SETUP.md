# MCP Server Setup

This document describes all configured MCP servers for the git-2-jira-dev-pulse project.

## Configuration Location

All MCP servers are configured in:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Backup created at:** `claude_desktop_config.json.backup`

## Configured MCP Servers

### 1. Sequential Thinking ✅
**Package:** `@modelcontextprotocol/server-sequential-thinking`
**Purpose:** Enables structured, step-by-step reasoning for complex problems
**Type:** NPX package

### 2. Memory ✅
**Package:** `@modelcontextprotocol/server-memory`
**Purpose:** Persists findings and context across sessions
**Type:** NPX package

### 3. Jira (Red Hat) ✅
**Container:** `localhost/jira-mcp:latest`
**Purpose:** Red Hat Jira integration (issues.redhat.com)
**Type:** Containerized (Podman)
**Credentials:** `~/.rh-jira-mcp.env`
**Features:**
- Get/search Jira issues
- Project management
- Board & sprint management
- User management

**Setup:**
1. Built from `~/repos/jira-mcp/`
2. Uses Jira API token from `~/.rh-jira-mcp.env`
3. Contains 20 Jira tools

### 4. Git Operations ✅
**Package:** `@cyanheads/git-mcp-server`
**Purpose:** Comprehensive Git version control operations
**Type:** NPX package
**Features:**
- Branch management
- Commit operations
- Merge/rebase
- Remote operations
- Git log/diff
- Stash/cherry-pick

### 5. Git-to-Jira (Project-Specific) ✅
**Path:** `/Users/joshuadisraeli/repos/git-2-jira-dev-pulse/mcp-server/server.py`
**Purpose:** Project's git-to-jira ticket workflow
**Type:** Python script (FastMCP)
**Features:**
- `scan_repos()` - Scan ~/repos/ for git repositories
- `analyze_repo(path, max_commits, since_days)` - Analyze repo work
- `suggest_tickets(paths, project_key)` - Generate ticket suggestions
- `create_jira_ticket(...)` - Create Jira tickets
- `check_jira_connection()` - Verify Jira connectivity

### 6. GitHub ✅
**Container:** `ghcr.io/github/github-mcp-server`
**Purpose:** GitHub API integration
**Type:** Containerized (Podman)
**Credentials:** Environment variable `GITHUB_PERSONAL_ACCESS_TOKEN`

### 7. Puppeteer (Browser Automation) ✅
**Package:** `@modelcontextprotocol/server-puppeteer`
**Purpose:** Webapp testing and verification (similar to Playwright)
**Type:** NPX package
**Use cases:**
- PatternFly UI testing
- Frontend verification
- Automated browser testing

### 8. Filesystem ✅
**Package:** `@modelcontextprotocol/server-filesystem`
**Purpose:** File system operations
**Type:** NPX package
**Accessible paths:**
- `/Users/joshuadisraeli/Documents`
- `/Users/joshuadisraeli/Desktop`
- `/Users/joshuadisraeli/repos`

### 9. Kubernetes ✅
**Package:** `mcp-server-kubernetes`
**Purpose:** Kubernetes cluster operations
**Type:** NPX package

## PatternFly Note

**No separate PatternFly MCP server is needed.** PatternFly is a UI component library used in the frontend. Testing and verification of PatternFly components can be done using the **Puppeteer MCP server** for browser automation.

## Testing the Setup

### 1. Test Jira Connection
```bash
# Via CLI
python cli/main.py scan

# Via API
curl http://localhost:8000/api/health
```

### 2. Test MCP Servers
Restart Claude Desktop/Claude Code and check that all MCP servers appear in:
- Claude Desktop: Settings → Tools & Integrations → MCP Tools
- Claude Code: Should automatically load on startup

### 3. Test Git-to-Jira MCP
From Claude, you can now use:
- "Scan my repos for git work"
- "Analyze the git-2-jira-dev-pulse repository"
- "Suggest Jira tickets based on my recent commits"

## Maintenance

### Update Jira MCP Container
```bash
cd ~/repos/jira-mcp
make build
```

### Update Credentials
Edit `~/.rh-jira-mcp.env`:
```bash
JIRA_URL=https://issues.redhat.com/
JIRA_API_TOKEN=<your-token>
```

### Restore Previous Config
```bash
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json.backup \
   ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

## Troubleshooting

### Podman Issues
```bash
# Start Podman machine
podman machine start

# Check running containers
podman ps

# Test Jira MCP manually
cd ~/repos/jira-mcp
make run
```

### MCP Servers Not Loading
1. Restart Claude Desktop/Code completely
2. Check MCP logs in Claude Desktop: Output → MCP Logs
3. Verify all paths and credentials are correct
4. For NPX packages, ensure internet connectivity

### Git-to-Jira MCP Issues
```bash
# Test Python MCP server directly
cd ~/repos/git-2-jira-dev-pulse
python mcp-server/server.py

# Check dependencies
make install
```

## Summary

All requested MCP servers are now configured:
- ✅ Sequential thinking
- ✅ Jira (Red Hat)
- ✅ Git operations
- ✅ Puppeteer (covers Playwright use cases)
- ✅ Memory
- ✅ GitHub
- ✅ Git-to-Jira (project-specific)
- ✅ Filesystem
- ✅ Kubernetes

**Next Steps:**
1. Restart Claude Desktop/Code
2. Verify all MCP servers load successfully
3. Test the git-to-jira workflow
