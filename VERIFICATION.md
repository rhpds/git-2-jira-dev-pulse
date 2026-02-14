# Verification Checklist

Use this checklist to verify all features of Git-2-Jira-Dev-Pulse v2.0 are working correctly.

## ✅ Pre-Flight Checks

- [ ] Python 3.11+ installed (`python --version`)
- [ ] Node.js 20+ installed (`node --version`)
- [ ] GitHub CLI authenticated (`gh auth status`)
- [ ] Jira credentials configured in `~/.rh-jira-mcp.env`
- [ ] Dependencies installed (`make install`)

## ✅ Backend Verification

### Health Check
```bash
# Start backend
make backend

# In another terminal
curl http://localhost:8000/api/health
```

**Expected:**
```json
{
  "status": "healthy",
  "jira": {
    "connected": true,
    "user": "your-username",
    "email": "your-email@redhat.com",
    "server": "https://issues.redhat.com"
  }
}
```

### Configuration API
```bash
# Get current config
curl http://localhost:8000/api/config/ | jq

# Should return full config with scan_directories, auto_discovery, ui, performance
```

**Expected:** Valid JSON config object

### Folder Scanner
```bash
# List repositories
curl http://localhost:8000/api/folders/ | jq

# Should return array of repositories
```

**Expected:** Array with repos from configured directories

### Auto-Discovery Status
```bash
# Check watcher status
curl http://localhost:8000/api/config/auto-discovery/status | jq
```

**Expected:**
```json
{
  "running": true|false,
  "enabled": true|false,
  "watch_paths": ["~/repos"],
  "scan_interval_seconds": 300,
  "discovered_count": <number>,
  "callback_count": <number>
}
```

## ✅ Frontend Verification

### Web UI Loads
```bash
# Start frontend (backend must be running)
make frontend

# Open browser to http://localhost:5175
```

**Expected:**
- [ ] Page loads without errors
- [ ] Navigation visible with: Repositories, Dashboard, Results, History, Settings
- [ ] Statistics cards visible at top
- [ ] Repositories load and display

### Statistics Cards
On the main scan page:

- [ ] **Total Repositories** card shows correct count with PulseIcon
- [ ] **Recent Commits** card shows total commits with ActivityBurstIcon
- [ ] **Uncommitted Changes** card shows total changes with StatusIcon
- [ ] **Clean Repos** card shows clean count with CodeFlowIcon
- [ ] All icons are animated (if animations enabled)

### Data Visualizations
- [ ] **Activity Heatmap** displays bar chart of top 10 repos
- [ ] Bars show stacked: commits (blue) + uncommitted (pink)
- [ ] Summary stats show total commits, uncommitted, activity
- [ ] **Status Pie Chart** displays clean vs dirty distribution
- [ ] Pie chart has green (clean) and red (dirty) segments
- [ ] Summary cards show percentages

### View Mode Toggle
- [ ] Toggle between Grid/List/Visualization modes visible in toolbar
- [ ] **Grid View** shows repository cards
- [ ] **List View** shows placeholder
- [ ] **Visualization View** shows expanded charts
- [ ] Smooth animation when switching modes

### Repository Cards (Grid View)
**Standard Theme:**
- [ ] Cards use PatternFly Card component
- [ ] Checkbox for selection visible
- [ ] Branch label (blue) displayed
- [ ] Status label (green for clean, orange for dirty)
- [ ] Commit count label (purple) if > 0
- [ ] "Pull branch..." button if has_remote

**Glassmorphic Theme:**
- [ ] Cards use GlassCard with frosted glass effect
- [ ] RepoIdentityIcon visible (size 32)
- [ ] Icon color matches status (green=clean, orange=dirty)
- [ ] All same labels as standard theme
- [ ] Hover effect animates smoothly

### Settings Page
Navigate to [http://localhost:5175/settings](http://localhost:5175/settings)

#### Scan Directories Tab
- [ ] Tab is accessible and loads
- [ ] List of configured directories displayed
- [ ] Each directory shows: path, recursive status, exclusion count
- [ ] "Add Directory" button opens modal
- [ ] Modal allows entering path, recursive toggle, max depth
- [ ] Adding directory works and updates list
- [ ] "Remove" button deletes directory
- [ ] Empty state shown if no directories configured

#### Auto-Discovery Tab
- [ ] Tab loads watcher status
- [ ] Status refreshes every 5 seconds (check network tab)
- [ ] Shows: running (yes/no), discovered count, watch paths, scan interval
- [ ] "Enable Auto-Discovery" toggle works
- [ ] "Start Watcher" button starts service (if stopped)
- [ ] "Stop Watcher" button stops service (if running)
- [ ] "Manual Scan Now" triggers immediate discovery
- [ ] Success alert shown after manual scan with discovered count
- [ ] Warning shown if no watch paths configured

#### Visual Preferences Tab
- [ ] Theme radio buttons: Standard / Glassmorphic
- [ ] Changing theme updates immediately (check main page)
- [ ] "Enable Animations" toggle works
- [ ] "Show Data Visualizations" toggle works
- [ ] Default view radio buttons: Grid / List / Visualization
- [ ] Live preview section shows glassmorphic cards (if theme enabled)
- [ ] Preview cards show PulseIcon, CodeFlowIcon with animations

#### Advanced Tab
- [ ] "Maximum Parallel Scans" number input (1-50)
- [ ] "Cache Time-To-Live" number input (0-3600)
- [ ] "Export Configuration" button downloads JSON file
- [ ] Success alert shown after export
- [ ] Configuration file location displayed: `~/.git2jira.config.yaml`
- [ ] Version shown
- [ ] Current configuration summary displays all settings

## ✅ CLI Verification

### Configuration Commands
```bash
# List configuration
python cli/main.py config list

# Should show rich formatted table of scan directories
```

**Expected:** Table with columns: Path, Enabled, Recursive, Max Depth, Exclusions

```bash
# Add directory
python cli/main.py config add ~/test-dir

# Should add and show success message
```

**Expected:** "✓ Added scan directory: ~/test-dir"

```bash
# Remove directory
python cli/main.py config remove ~/test-dir

# Should remove and show success message
```

**Expected:** "✓ Removed scan directory: ~/test-dir"

```bash
# Export configuration
python cli/main.py config export

# Should print YAML to stdout
```

**Expected:** Valid YAML configuration

```bash
# Watcher status
python cli/main.py config watcher status

# Should show status
```

**Expected:** Watcher running/stopped, discovered count, watch paths

### Scan Commands
```bash
# Basic scan
python cli/main.py scan

# Should list all repos from all configured directories
```

**Expected:** Rich formatted table with: Name, Branch, Status, Commits, Changes

```bash
# Scan with grouping
python cli/main.py scan --group

# Should group repos by parent directory
```

**Expected:** Sections for each scan directory with repos listed underneath

### Health Check
```bash
python cli/main.py health

# Should show Jira connection status
```

**Expected:**
```
✓ Jira connected
  User: your-username
  Server: https://issues.redhat.com
```

### Migration
```bash
# Migrate from .env (if exists)
python cli/main.py config migrate

# Should show preview and prompt for confirmation
```

**Expected:** Preview of YAML config, confirmation prompt, success message

## ✅ Auto-Discovery Testing

### Setup
1. Enable auto-discovery in Settings or CLI:
   ```bash
   python cli/main.py config watcher start
   ```

2. Verify watcher is running:
   ```bash
   curl http://localhost:8000/api/config/auto-discovery/status
   ```

### Test Case 1: New Repository Detection
1. Create a new git repository in a watched directory:
   ```bash
   mkdir ~/repos/test-auto-discovery
   cd ~/repos/test-auto-discovery
   git init
   ```

2. Wait up to 30 seconds

3. Check if discovered:
   ```bash
   python cli/main.py scan | grep test-auto-discovery
   # OR
   curl http://localhost:8000/api/folders/ | jq '.[] | select(.name=="test-auto-discovery")'
   ```

**Expected:** Repository appears in scan results

### Test Case 2: Manual Discovery Trigger
1. Create another repo:
   ```bash
   mkdir ~/repos/test-manual
   cd ~/repos/test-manual
   git init
   ```

2. Trigger manual scan via Settings page or CLI:
   ```bash
   curl -X POST http://localhost:8000/api/config/auto-discovery/discover
   ```

3. Check backend logs for "New repository discovered" message

**Expected:** Immediate discovery (< 1 second)

### Cleanup
```bash
rm -rf ~/repos/test-auto-discovery ~/repos/test-manual
```

## ✅ Theme Switching

### Standard → Glassmorphic
1. Navigate to Settings → Visual Preferences
2. Select "Glassmorphic" theme
3. Return to main scan page

**Verify:**
- [ ] Statistics cards have frosted glass effect with blur
- [ ] Repository cards have GlassCard styling
- [ ] Icons have gradient colors
- [ ] Hover effects are smooth

### Glassmorphic → Standard
1. Navigate to Settings → Visual Preferences
2. Select "Standard" theme
3. Return to main scan page

**Verify:**
- [ ] Statistics cards use standard PatternFly styling
- [ ] Repository cards are solid (no blur)
- [ ] UI still functional and readable

## ✅ Performance Testing

### Load Test: 100+ Repositories
1. Configure multiple scan directories with many repos
2. Scan all:
   ```bash
   python cli/main.py scan
   ```

**Expected:**
- [ ] Scan completes in < 5 seconds
- [ ] No crashes or errors
- [ ] Memory usage stays reasonable (< 500MB)

### Frontend Rendering
1. Load scan page with 100+ repos
2. Check browser performance

**Expected:**
- [ ] Page loads in < 3 seconds
- [ ] Smooth scrolling (60fps)
- [ ] Animations don't lag
- [ ] Charts render correctly

### Watcher Performance
1. Enable watcher with 100+ existing repos
2. Monitor CPU/memory usage

**Expected:**
- [ ] CPU usage < 5% at idle
- [ ] Memory < 100MB for watcher service
- [ ] No performance degradation over time

## ✅ Cross-Platform Testing

### macOS
- [ ] All features work on macOS (primary platform)
- [ ] `~` path expansion works
- [ ] File watcher works with macOS file system

### Linux
- [ ] All features work on Linux
- [ ] `~` path expansion works
- [ ] File watcher works with inotify

### Windows
- [ ] All features work on Windows
- [ ] Path handling works (forward/back slashes)
- [ ] File watcher works with Windows file system

## ✅ Edge Cases

### No Configuration File
1. Delete `~/.git2jira.config.yaml` (backup first)
2. Start backend

**Expected:**
- [ ] Fallback to `.env` file
- [ ] `REPOS_BASE_PATH` used as single directory
- [ ] No errors on startup

### Invalid YAML
1. Corrupt `~/.git2jira.config.yaml` (backup first):
   ```yaml
   version: "1.0
   scan_directories:
     - invalid yaml here
   ```

2. Start backend

**Expected:**
- [ ] Error logged with helpful message
- [ ] Fallback to `.env` or default config
- [ ] Application doesn't crash

### No Repositories Found
1. Configure scan directory with no git repos:
   ```bash
   python cli/main.py config add ~/empty-dir
   ```

2. Scan:
   ```bash
   python cli/main.py scan
   ```

**Expected:**
- [ ] "No repositories found" message
- [ ] No errors
- [ ] Suggestions to add more directories

### Disabled Directories
1. Add directory and disable it in YAML:
   ```yaml
   - path: "~/repos"
     enabled: false
   ```

2. Scan

**Expected:**
- [ ] Directory not scanned
- [ ] Other enabled directories still scanned

## ✅ Regression Testing

Ensure all original v1.x features still work:

- [ ] Repository scanning works
- [ ] Work dashboard displays commits by quarter
- [ ] Jira ticket suggestions generated
- [ ] Batch ticket creation works
- [ ] Pull request detection works (`gh` integration)
- [ ] Analysis history saved and retrievable
- [ ] Export analysis runs

## ✅ Security Checks

- [ ] No credentials in logs
- [ ] Config files in home directory only (not in project)
- [ ] API endpoints require local access only
- [ ] No sensitive data exposed in error messages
- [ ] Pattern exclusions prevent scanning `.env`, `.git`, etc.

---

## Summary

**Total Checks:** ~120

Run through this checklist after any major changes or before release. All items should pass for production readiness.

### Quick Verification Script

```bash
#!/bin/bash
# quick-verify.sh - Run automated checks

echo "🔍 Verifying Git-2-Jira-Dev-Pulse v2.0"

# Backend health
echo -n "Backend health... "
curl -s http://localhost:8000/api/health | jq -e '.jira.connected' > /dev/null && echo "✓" || echo "✗"

# Config API
echo -n "Config API... "
curl -s http://localhost:8000/api/config/ | jq -e '.version' > /dev/null && echo "✓" || echo "✗"

# Watcher status
echo -n "Watcher status... "
curl -s http://localhost:8000/api/config/auto-discovery/status | jq -e '.enabled' > /dev/null && echo "✓" || echo "✗"

# CLI scan
echo -n "CLI scan... "
python cli/main.py scan > /dev/null 2>&1 && echo "✓" || echo "✗"

# Frontend (check if reachable)
echo -n "Frontend... "
curl -s http://localhost:5175 > /dev/null && echo "✓" || echo "✗"

echo "✅ Verification complete!"
```

Save as `quick-verify.sh`, make executable (`chmod +x quick-verify.sh`), and run before commits.
