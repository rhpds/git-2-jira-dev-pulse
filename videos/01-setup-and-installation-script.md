# Video 01: Setup and Installation

**Duration:** ~5 minutes
**File name:** `01-setup-and-installation.mp4`

## Pre-Recording Checklist

- [ ] Clean desktop
- [ ] Terminal font size: 18pt minimum
- [ ] Browser in private/incognito mode
- [ ] GitHub logged out (use public view)
- [ ] Terminal theme: high contrast
- [ ] Dock hidden or minimized
- [ ] Notifications disabled

## Script

### Scene 1: Title Card (0:00-0:05)
**Visual:**
- Title: "Git-2-Jira-Dev-Pulse"
- Subtitle: "Part 1: Setup and Installation"
- Background: Project logo or screenshot

**Audio:**
"Welcome! In this video, we'll walk through setting up Git-2-Jira-Dev-Pulse on your local machine."

### Scene 2: Prerequisites Overview (0:05-0:30)
**Visual:**
- Text overlay showing requirements
- Check marks appear as you mention each

**Show on screen:**
```
Prerequisites:
✓ Python 3.11 or higher
✓ Node.js 20 or higher
✓ Git
✓ GitHub CLI (gh)
✓ Jira account with API access
```

**Audio:**
"Before we begin, make sure you have these prerequisites installed: Python 3.11 or higher, Node.js 20 or higher, Git, the GitHub CLI, and a Jira account with API access. Don't worry if you're missing something - I'll show you where to get it."

**Annotations:**
- Yellow highlight on each item as mentioned
- Callout bubble: "Verify with: python --version, node --version, git --version"

### Scene 3: Check Prerequisites (0:30-1:00)
**Visual:**
- Open terminal
- Run verification commands

**Commands to run:**
```bash
python3 --version
node --version
git --version
gh --version
```

**Audio:**
"Let's verify everything is installed. Open your terminal and run these commands to check your versions. Python should be 3.11 or higher, Node should be 20 or higher."

**Annotations:**
- Text overlay showing each command
- Red circle around version numbers
- Green checkmark when version is good
- If missing: Callout with download URL

### Scene 4: Clone Repository (1:00-1:45)
**Visual:**
- Open browser to GitHub
- Navigate to repository
- Show clone options

**Browser URL:**
`https://github.com/rhpds/git-2-jira-dev-pulse`

**Audio:**
"Now let's clone the repository. Go to github.com/rhpds/git-2-jira-dev-pulse. Click the green Code button and copy the HTTPS URL."

**Annotations:**
- Red circle on "Code" button (fade in/out)
- Yellow highlight on clone URL
- Zoom in on copy button

**Visual:**
- Switch to terminal
- Navigate to repos directory
- Run git clone

**Commands:**
```bash
cd ~/repos
git clone https://github.com/rhpds/git-2-jira-dev-pulse.git
cd git-2-jira-dev-pulse
```

**Audio:**
"In your terminal, navigate to where you keep your repositories. I use ~/repos. Then paste the git clone command and press enter. This will download the project."

**Annotations:**
- Text overlay showing command
- Progress bar indication during clone
- Callout: "This takes about 30 seconds"

### Scene 5: Review Project Structure (1:45-2:15)
**Visual:**
- Show directory listing
- Point out key directories

**Commands:**
```bash
ls -la
tree -L 2  # or just ls
```

**Audio:**
"Great! Let's look at what we just cloned. You'll see several directories here. The backend folder contains our FastAPI application. Frontend has the React UI. CLI is our command-line interface. And mcp-server is for Claude integration."

**Annotations:**
- Yellow highlight on each directory as mentioned
- Callout bubbles:
  - backend/ → "Python FastAPI"
  - frontend/ → "React + PatternFly"
  - cli/ → "Typer CLI"
  - mcp-server/ → "Claude MCP"

### Scene 6: Install Dependencies (2:15-3:30)
**Visual:**
- Show Makefile
- Run make install

**Commands:**
```bash
cat Makefile  # Show briefly
make install
```

**Audio:**
"Installation is simple thanks to our Makefile. Just run 'make install'. This will install all Python and Node.js dependencies. You'll see pip installing backend packages, then npm installing frontend packages. This takes about 2-3 minutes."

**Annotations:**
- Text overlay: "$ make install"
- Split screen during install showing:
  - Top: Backend packages installing
  - Bottom: Frontend packages installing
- Progress indicators
- Callout: "Great time for a coffee break ☕"

**During installation, show overlay text:**
```
Installing...
├─ Backend (Python)
│  ├─ FastAPI
│  ├─ GitPython
│  └─ Jira client
└─ Frontend (Node.js)
   ├─ React
   ├─ TypeScript
   └─ PatternFly
```

### Scene 7: Verify Installation (3:30-4:15)
**Visual:**
- Check installations
- Show success messages

**Commands:**
```bash
# Check backend
pip list | grep fastapi
pip list | grep jira

# Check frontend
cd frontend
npm list --depth=0 | grep react
cd ..
```

**Audio:**
"Let's verify everything installed correctly. We can check the backend packages with pip list, and the frontend packages with npm list. If you see FastAPI, Jira, and React in the output, you're all set!"

**Annotations:**
- Yellow highlight on package names
- Green checkmarks appear next to verified packages
- Callout: "All good! ✓"

### Scene 8: Quick Structure Tour (4:15-4:45)
**Visual:**
- Open project in VS Code or editor
- Quick tour of main files

**Audio:**
"Before we wrap up, let's quickly look at the project structure in an editor. Here's backend/api where our main application lives. Frontend/src has our React components. The CLI and MCP server both use the same backend services - no code duplication!"

**Annotations:**
- Arrow pointing to key files:
  - backend/api/main.py
  - frontend/src/App.tsx
  - cli/main.py
  - mcp-server/server.py
- Callout: "All interfaces share the same backend!"

### Scene 9: Next Steps (4:45-5:00)
**Visual:**
- Show title card with checklist

**Show on screen:**
```
Setup Complete! ✓

Next Steps:
→ Video 2: Configure Jira Credentials
→ Video 3: Use the Web UI
→ Video 4: Try the CLI
→ Video 5: MCP Integration
```

**Audio:**
"And that's it for setup! In the next video, we'll configure your Jira credentials so you can start creating tickets. See you there!"

**Annotations:**
- Green checkmark animation
- Text fades in for next steps
- Arrow pointing to "Video 2"

### Scene 10: End Card (5:00-5:05)
**Visual:**
- Project logo
- Links

**Show on screen:**
```
Git-2-Jira-Dev-Pulse

Documentation: github.com/rhpds/git-2-jira-dev-pulse
Issues: github.com/rhpds/git-2-jira-dev-pulse/issues
Slack: #rhdp-dev-tools
```

---

## B-Roll Ideas (Optional)

- Fast-forward of installation progress
- Side-by-side before/after directory
- Rotating 3D view of project structure
- Animated diagram of components

## Common Issues to Address

If you encounter errors during recording, add these callouts:

**Port already in use:**
```
Error: Port 8000 already in use
Fix: Kill existing process or use different port
```

**Permission denied:**
```
Error: Permission denied
Fix: Run without sudo, check directory permissions
```

**Python version too old:**
```
Error: Python 3.10 required
Fix: Update Python using pyenv or system package manager
```

## Recovery Points

If you make a mistake:
- **0:30** - Can restart from prerequisites check
- **1:00** - Can restart from clone
- **2:15** - Can restart from install
- **3:30** - Can restart from verification

Mark these in your editor for quick jumping.

## Post-Production Notes

### Add These Effects:
1. Smooth zoom on clone URL
2. Speed up installation (1.5x-2x)
3. Fade transitions between sections
4. Background music (low volume, neutral)

### Text Overlays to Add:
- Command text as you type
- URLs in large font
- Section headers
- Time estimates

### Final Checklist:
- [ ] All commands visible
- [ ] Audio clear throughout
- [ ] Annotations don't obscure content
- [ ] File size under 50 MB
- [ ] Tested on mobile view
- [ ] Captions/subtitles added (optional)
