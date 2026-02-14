# Migration Guide: v1.x → v2.0

This guide helps you upgrade from Git-2-Jira-Dev-Pulse v1.x to v2.0 with the new multi-directory configuration system.

## What's Changed?

### Configuration Location

**v1.x**: Single-directory scanning via `.rh-jira-mcp.env`:
```env
REPOS_BASE_PATH=~/repos
```

**v2.0**: Multi-directory YAML configuration at `~/.git2jira.config.yaml`:
```yaml
scan_directories:
  - path: "~/repos"
    enabled: true
    recursive: false
    max_depth: 1
```

### Key Benefits

- ✅ **Multiple directories** — scan repos in different locations
- ✅ **Recursive scanning** — find repos in subdirectories
- ✅ **Custom exclusions** — per-directory pattern-based filtering
- ✅ **Auto-discovery** — automatically detect new repositories
- ✅ **Modern UI** — glassmorphic design with data visualizations

## Migration Options

### Option 1: Automatic Migration (Recommended)

Use the built-in migration command to convert your existing `.env` configuration:

```bash
# Preview migration (safe, no changes made)
python cli/main.py config migrate

# Review the preview, then confirm when prompted
```

**What this does:**
1. Reads your current `REPOS_BASE_PATH` from `~/.rh-jira-mcp.env`
2. Creates a new `~/.git2jira.config.yaml` with equivalent settings
3. Backs up your original `.env` to `.rh-jira-mcp.env.backup`
4. Preserves all Jira credentials in the `.env` file

**After migration:**
- Your `.env` file still contains Jira credentials (still needed!)
- New YAML config handles directory scanning
- Everything works exactly as before, plus new features

### Option 2: Manual Configuration

Create `~/.git2jira.config.yaml` from scratch using the template:

```bash
cp example.config.yaml ~/.git2jira.config.yaml
nano ~/.git2jira.config.yaml
```

Edit the file to match your setup:

```yaml
version: "1.0"

scan_directories:
  - path: "~/repos"
    enabled: true
    recursive: false
    max_depth: 1
    exclude_patterns:
      - "node_modules"
      - ".venv"
      - ".git"
      - "__pycache__"
    exclude_folders: []

auto_discovery:
  enabled: false
  watch_paths:
    - "~/repos"
  scan_interval_seconds: 300
  notify_on_new_repos: true

ui:
  theme: "standard"  # or "glassmorphic"
  animations_enabled: true
  show_visualizations: true
  default_view: "grid"

performance:
  max_parallel_scans: 10
  cache_ttl_seconds: 300
```

### Option 3: Do Nothing (Backward Compatible)

v2.0 automatically falls back to `.env` if no YAML config exists:

- Keep using `REPOS_BASE_PATH` in `.env`
- Everything works as in v1.x
- But you won't get new features (multi-directory, auto-discovery, etc.)

## Post-Migration Verification

### 1. Check Configuration

```bash
# View current configuration
python cli/main.py config list

# Should show your directories and settings
```

### 2. Test Scanning

```bash
# Scan repositories
python cli/main.py scan

# Should find all repos as before
```

### 3. Test Web UI

```bash
# Start the application
make all

# Open http://localhost:5175
# Navigate to Settings → Scan Directories
# You should see your migrated directory
```

### 4. Verify Auto-Discovery (Optional)

If you enabled auto-discovery during migration:

```bash
# Check watcher status
python cli/main.py config watcher status

# Create a test repo
mkdir ~/repos/test-repo
cd ~/repos/test-repo
git init

# Wait ~30 seconds, then scan again
python cli/main.py scan

# test-repo should appear automatically
```

## Common Migration Scenarios

### Scenario 1: Single Directory User

**Before (v1.x):**
```env
REPOS_BASE_PATH=~/repos
```

**After (v2.0):**
```yaml
scan_directories:
  - path: "~/repos"
    enabled: true
    recursive: false
    max_depth: 1
```

**Migration:** Run `python cli/main.py config migrate`

---

### Scenario 2: Need Recursive Scanning

**Before (v1.x):**
- Only scanned `~/repos` directly
- Repos in `~/repos/projects/work` were missed

**After (v2.0):**
```yaml
scan_directories:
  - path: "~/repos"
    enabled: true
    recursive: true    # Enable recursion
    max_depth: 3       # Scan up to 3 levels deep
```

**Migration:** Run migration, then edit YAML to enable `recursive: true`

---

### Scenario 3: Multiple Directories

**Before (v1.x):**
- Could only scan one directory at a time
- Needed to change `REPOS_BASE_PATH` and restart

**After (v2.0):**
```yaml
scan_directories:
  - path: "~/repos"
    enabled: true
    recursive: false
    max_depth: 1

  - path: "~/projects"
    enabled: true
    recursive: true
    max_depth: 2

  - path: "~/work"
    enabled: true
    recursive: false
    max_depth: 1
```

**Migration:** Run migration for first directory, then add others via:
```bash
python cli/main.py config add ~/projects --recursive --max-depth 2
python cli/main.py config add ~/work
```

Or edit the YAML file directly.

---

### Scenario 4: Custom Exclusions

**Before (v1.x):**
- Hardcoded exclusions in Python code
- Required code changes to customize

**After (v2.0):**
```yaml
scan_directories:
  - path: "~/repos"
    enabled: true
    recursive: true
    max_depth: 3
    exclude_patterns:
      - "node_modules"
      - ".venv"
      - "build/*"
      - "dist/*"
      - "*.egg-info"
    exclude_folders:
      - "Minerva"           # Skip specific folder
      - "automation_apps"   # Skip another folder
```

**Migration:** Run migration, then edit YAML to add custom exclusions

---

## Troubleshooting

### Issue: "No configuration found"

**Cause:** Neither YAML config nor `.env` file exists

**Fix:**
```bash
# Option 1: Create from template
cp example.config.yaml ~/.git2jira.config.yaml

# Option 2: Restore .env file
cp .env.example ~/.rh-jira-mcp.env
# Edit with your values
```

---

### Issue: "No repositories found after migration"

**Cause:** Path in YAML config doesn't match actual directory

**Fix:**
```bash
# Check current configuration
python cli/main.py config list

# Verify path exists
ls ~/repos  # or your configured path

# Update path if needed
python cli/main.py config remove ~/repos
python cli/main.py config add ~/actual/path
```

---

### Issue: "Auto-discovery not working"

**Cause:** Watcher service not started

**Fix:**
```bash
# Check status
python cli/main.py config watcher status

# Start manually
python cli/main.py config watcher start

# Or enable in YAML and restart backend
```

---

### Issue: "Backend crashes on startup"

**Cause:** Invalid YAML syntax in config file

**Fix:**
```bash
# Validate YAML
python -c "import yaml; yaml.safe_load(open('~/.git2jira.config.yaml'))"

# If invalid, restore from backup
cp ~/.git2jira.config.yaml.backup ~/.git2jira.config.yaml

# Or regenerate
python cli/main.py config migrate
```

---

## Rollback to v1.x

If you need to revert to v1.x behavior:

1. **Delete YAML config** (forces fallback to .env):
   ```bash
   mv ~/.git2jira.config.yaml ~/.git2jira.config.yaml.backup
   ```

2. **Restore original .env** (if backed up):
   ```bash
   mv ~/.rh-jira-mcp.env.backup ~/.rh-jira-mcp.env
   ```

3. **Restart application**:
   ```bash
   make all
   ```

The tool will use `.env` only, behaving exactly like v1.x.

---

## Getting Help

- **Check Logs**: Backend logs show startup and configuration loading
  ```bash
  # Start backend with verbose logging
  cd backend
  uvicorn api.main:app --reload --log-level debug
  ```

- **Verify Health**: Ensure Jira connection still works
  ```bash
  curl http://localhost:8000/api/health
  ```

- **Report Issues**: [GitHub Issues](https://github.com/rhpds/git-2-jira-dev-pulse/issues)

---

## Next Steps After Migration

Once migrated successfully:

1. **Explore Settings Page**: [http://localhost:5175/settings](http://localhost:5175/settings)
   - Try glassmorphic theme
   - Enable data visualizations
   - Configure auto-discovery

2. **Add More Directories**:
   ```bash
   python cli/main.py config add ~/projects --recursive
   ```

3. **Customize Exclusions**: Edit `~/.git2jira.config.yaml` to exclude specific folders

4. **Enable Auto-Discovery**: Never manually rescan again!
   ```bash
   python cli/main.py config watcher start
   ```

5. **Export Configuration**: Backup your settings
   ```bash
   python cli/main.py config export --output config-backup.yaml
   ```

---

**Migration complete!** 🎉 Enjoy the new features of Git-2-Jira-Dev-Pulse v2.0!
