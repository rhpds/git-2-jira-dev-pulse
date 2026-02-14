# Video 03: Using the Web UI

**Duration:** ~6 minutes
**File name:** `03-using-web-ui.mp4`

## Pre-Recording Checklist

- [ ] Backend and frontend running
- [ ] Test repositories with recent commits
- [ ] Browser window sized to 1920x1080
- [ ] Browser zoom at 100%
- [ ] Clear browser cache/cookies
- [ ] Test Jira project accessible
- [ ] Record mouse movements
- [ ] Enable cursor highlighting

## Script

### Scene 1: Title Card (0:00-0:05)
**Visual:**
- Title: "Git-2-Jira-Dev-Pulse"
- Subtitle: "Part 3: Using the Web UI"

**Audio:**
"Welcome back! In this video, we'll walk through the complete workflow using the web interface."

### Scene 2: Starting the Application (0:05-0:30)
**Visual:**
- Terminal showing start commands

**Commands:**
```bash
cd ~/repos/git-2-jira-dev-pulse

# Option 1: Start both at once
make all

# Option 2: Separate terminals
make backend  # Terminal 1
make frontend # Terminal 2
```

**Audio:**
"Let's start the application. Run 'make all' to start both the backend and frontend, or run them separately in two terminals. The backend starts on port 8000, and the frontend on port 5175."

**Annotations:**
- Text overlay: "$ make all"
- Split screen showing both starting
- Callout: "Backend: http://localhost:8000"
- Callout: "Frontend: http://localhost:5175"
- Loading indicators

**Show startup logs:**
- Backend: "INFO: Application startup complete"
- Frontend: "Local: http://localhost:5175/"

**Annotations:**
- Green checkmarks when each starts
- Yellow highlight on URLs

### Scene 3: Opening the UI (0:30-0:50)
**Visual:**
- Open browser
- Navigate to localhost:5175
- Show landing page

**Audio:**
"Open your browser and go to localhost:5175. You'll see the Git-2-Jira homepage with our three-step workflow: Select Repos, Review Work, and Create Tickets."

**Show landing page:**
- Hero section with app name
- Three-step wizard preview
- "Get Started" button

**Annotations:**
- Zoom in on URL bar
- Red circle on "Get Started" button
- Callout bubbles on each step:
  - Step 1 → "Choose repositories"
  - Step 2 → "Review by quarter"
  - Step 3 → "Create tickets"

### Scene 4: Step 1 - Select Repositories (0:50-1:45)
**Visual:**
- Click "Get Started"
- Show repo list loading
- Select repositories

**Audio:**
"Click 'Get Started' to begin. The app scans your ~/repos directory for git repositories. This happens automatically and usually takes just a few seconds."

**Show loading state:**
- Spinner animation
- Text: "Scanning repositories..."

**Annotations:**
- Loading animation
- Callout: "Scanning ~/repos"

**Show repository cards:**
```
┌─────────────────────────────────┐
│ git-2-jira-dev-pulse            │
│ /Users/josh/repos/git-2-jira... │
│ Last commit: 2 hours ago         │
│ [Select] button                  │
└─────────────────────────────────┘
```

**Audio:**
"Here are all your git repositories. Each card shows the repo name, path, and last commit time. Let's select a few repositories to analyze. Click the Select button on repos you've been working on recently."

**Actions:**
- Click "Select" on 3-4 repositories
- Watch checkmarks appear
- Selection count updates

**Annotations:**
- Red circles on "Select" buttons (fade in/out)
- Green checkmarks appear on selected
- Yellow highlight on selection counter
- Callout: "Select repos with recent work"
- Arrow pointing to counter: "3 repositories selected"

**Show selection controls:**
- "Select All" button
- "Clear Selection" button
- Search/filter box

**Audio:**
"You can also use Select All, or filter repositories by name. When you're ready, click Continue."

**Annotations:**
- Point to "Continue" button
- Callout: "Ready to analyze!"

### Scene 5: Step 2 - Review Work by Quarter (1:45-3:30)
**Visual:**
- Loading transition
- Work analysis view loads
- Show quarter grouping

**Audio:**
"Now the app analyzes your git history. It looks at commits, branches, and uncommitted changes, then groups everything by fiscal quarter."

**Show analysis loading:**
- Progress indicators for each repo
- Text: "Analyzing git-2-jira-dev-pulse..."

**Annotations:**
- Loading bar for each repo
- Callout: "Analyzing commits, branches, changes"

**Show quarter view:**
```
┌────────────────────────────────────────┐
│ FY26 Q4 (Dec 2025 - Feb 2026)        │
│ 15 commits across 3 repositories       │
│                                        │
│ git-2-jira-dev-pulse (8 commits)       │
│ │ Add MCP server support               │
│ │ Implement ticket suggestions         │
│ │ Fix frontend routing                 │
│ │ ... and 5 more                       │
│                                        │
│ aiops-skills (7 commits)               │
│ │ Update skill definitions             │
│ │ Add new AIOps skill                  │
│ │ ... and 5 more                       │
└────────────────────────────────────────┘
```

**Audio:**
"Here's your work grouped by quarter. By default, it shows Red Hat fiscal quarters, but you can toggle to calendar quarters. Each quarter shows your total commits and breaks them down by repository."

**Annotations:**
- Yellow highlight on quarter header
- Callout: "Red Hat Fiscal Year"
- Arrow pointing to toggle: "Switch to calendar quarters"
- Red circle on quarter dropdown

**Demo quarter toggle:**
- Click dropdown
- Show options: FY26 Q4, Q3, Q2, Q1
- Select different quarter
- Content updates

**Annotations:**
- Smooth transition animation
- Callout: "Data updates instantly"

**Expand repository details:**
- Click repository name
- Show commit list
- Show files changed

**Audio:**
"Click on a repository to see detailed commit history. You can see commit messages, authors, timestamps, and files changed. This helps you review what work was done and needs tickets."

**Annotations:**
- Red circle on expandable section
- Zoom in on commit details
- Yellow highlight on commit messages
- Callout: "Click to expand/collapse"

**Show uncommitted changes:**
```
⚠️ Uncommitted Changes Detected

Modified Files (3):
  • src/App.tsx
  • backend/api/services/git_analyzer.py
  • README.md

+120 additions, -45 deletions
```

**Audio:**
"The app also detects uncommitted changes. Here you can see modified files that haven't been committed yet. This ensures you don't forget about work in progress when creating tickets."

**Annotations:**
- Yellow warning box
- Red circle on modified files
- Callout: "Don't forget these!"
- Arrow pointing to file list

### Scene 6: Filtering and Searching (3:30-4:00)
**Visual:**
- Show filter controls
- Demo search functionality

**Audio:**
"Use the search box to filter commits by message or file name. You can also filter by date range or specific authors."

**Demo:**
- Type in search: "feature"
- Results filter in real-time
- Clear search
- Results restore

**Annotations:**
- Red circle on search box
- Yellow highlight on matching results
- Callout: "Real-time filtering"
- Show count: "8 of 45 commits match"

### Scene 7: Step 3 - Generate Ticket Suggestions (4:00-5:00)
**Visual:**
- Click "Suggest Tickets"
- Loading animation
- Show generated suggestions

**Audio:**
"When you're ready, click 'Suggest Tickets'. The app analyzes your git activity and generates intelligent Jira ticket suggestions. It groups related commits, detects the type of work, and even estimates story points."

**Show loading:**
- Spinner
- Text: "Analyzing commits and generating suggestions..."
- Progress bar

**Annotations:**
- Loading animation
- Callout: "AI-powered analysis"

**Show ticket suggestions:**
```
┌──────────────────────────────────────────┐
│ Suggested Ticket #1                       │
│                                           │
│ Type: Story    Priority: Major            │
│ Story Points: 5                           │
│                                           │
│ Summary:                                  │
│ Implement MCP server integration          │
│                                           │
│ Description:                              │
│ Added Model Context Protocol server for   │
│ Claude Code integration. Includes tools   │
│ for scanning repos, analyzing commits,    │
│ and creating tickets.                     │
│                                           │
│ Source Commits:                           │
│ • a1b2c3d - Add MCP server                │
│ • b2c3d4e - Add MCP tools                 │
│ • c3d4e5f - Test MCP integration          │
│                                           │
│ [Edit] [Create Ticket] [Skip]            │
└──────────────────────────────────────────┘
```

**Audio:**
"Each suggestion includes a summary, description with context, the issue type, priority, and the source commits that led to this suggestion. You can edit any field before creating the ticket."

**Annotations:**
- Yellow highlight on each section as explained
- Callout on "Type": "Detected from commit messages"
- Callout on "Story Points": "Estimated from code changes"
- Callout on "Source Commits": "Linked to git history"

### Scene 8: Editing and Creating Tickets (5:00-5:45)
**Visual:**
- Click "Edit" on a suggestion
- Modify fields
- Create ticket

**Audio:**
"Let's edit this suggestion. Click Edit to open the form. You can change the summary, update the description, adjust the issue type or priority, and even add labels."

**Show edit form:**
```
Project: RHDPOPS ▼
Summary: [Implement MCP server integration]
Description: [Large text area]
Type: Story ▼
Priority: Major ▼
Assignee: jdoe ▼
Labels: [+ Add label]

[Cancel] [Save Changes] [Create Ticket]
```

**Audio:**
"Make your changes, then click 'Create Ticket'. The app sends the request to Jira and shows you the result."

**Annotations:**
- Red circles on editable fields
- Yellow highlight on changes made
- Arrow pointing to "Create Ticket" button

**Show creation progress:**
- Loading spinner
- Text: "Creating ticket in Jira..."

**Show success message:**
```
✓ Ticket Created Successfully!

RHDPOPS-1234: Implement MCP server integration
View in Jira: https://issues.redhat.com/browse/RHDPOPS-1234

[Create Another] [View All Tickets]
```

**Audio:**
"Success! Your ticket is created. You get the Jira ticket key and a direct link to view it in Jira. Click the link to see your new ticket."

**Annotations:**
- Green success animation
- Zoom in on ticket key
- Red circle on Jira link
- Callout: "Ticket created in ~2 seconds"

### Scene 9: Batch Creation (5:45-6:10)
**Visual:**
- Show multiple suggestions
- Select several
- Create in batch

**Audio:**
"You can also create multiple tickets at once. Select the checkbox on each suggestion you want to create, then click 'Create Selected Tickets'. This batch creates them all with one click."

**Show batch selection:**
- Checkboxes on suggestions
- "Create Selected (3)" button

**Annotations:**
- Red circles on checkboxes
- Counter updates as selections change
- Callout: "Batch create saves time"

**Show batch progress:**
```
Creating tickets... (2 of 3)
✓ RHDPOPS-1234 created
✓ RHDPOPS-1235 created
⏳ RHDPOPS-1236 creating...
```

**Annotations:**
- Progress bar
- Green checkmarks as each completes
- Loading indicator on in-progress

**Show batch results:**
```
✓ All Tickets Created!

RHDPOPS-1234: MCP server integration
RHDPOPS-1235: Fix frontend routing
RHDPOPS-1236: Update documentation

[View in Jira] [Start Over] [Export List]
```

**Audio:**
"And there you go! All three tickets are created and ready in Jira."

**Annotations:**
- Celebratory animation
- List of created tickets
- Callout: "All links are clickable"

### Scene 10: Tips and Tricks (6:10-6:35)
**Visual:**
- Show helpful features

**Show on screen:**
```
💡 Pro Tips

• Use keyboard shortcuts:
  - Ctrl+S: Quick create
  - Ctrl+E: Edit ticket
  - Esc: Cancel

• Filter commits by date for accurate quarters
• Review uncommitted changes before suggesting
• Use labels for better organization
• Bookmark frequently used projects
```

**Audio:**
"Some quick tips: Use keyboard shortcuts for faster workflow. Filter commits by date to focus on specific time periods. Always review uncommitted changes - they might be significant work! And use Jira labels to keep your tickets organized."

**Annotations:**
- Yellow highlights on tips as mentioned
- Small demo of keyboard shortcut

### Scene 11: Next Steps (6:35-6:50)
**Visual:**
- Next steps overlay

**Show on screen:**
```
Web UI Mastered! ✓

Next:
→ Video 4: CLI for Power Users
→ Video 5: MCP with Claude Code

Alternative Interfaces:
• CLI for automation
• MCP for AI assistance
```

**Audio:**
"You're now a pro at the web UI! In the next video, we'll explore the CLI for power users and automation. After that, we'll integrate with Claude Code using the MCP server. See you there!"

### Scene 12: End Card (6:50-7:00)
**Visual:**
- Project links

**Show on screen:**
```
Git-2-Jira-Dev-Pulse

Web UI: http://localhost:5175
API Docs: http://localhost:8000/docs
GitHub: github.com/rhpds/git-2-jira-dev-pulse
```

---

## Recovery Points

- **0:30** - Can restart from opening UI
- **1:45** - Can restart from review work
- **4:00** - Can restart from suggestions
- **5:00** - Can restart from editing

## B-Roll Opportunities

- Fast-forward through analysis
- Show multiple quarters side-by-side
- Animated transition between steps
- Split-screen: UI + Jira simultaneously

## Common Issues to Show

**No repositories found:**
```
ℹ️ No git repositories found in ~/repos

Solutions:
• Check REPOS_BASE_PATH in .env
• Ensure directories have .git folder
• Try different base path
```

**Jira connection error:**
```
⚠️ Could not connect to Jira

Solutions:
• Check credentials in .env
• Test with: curl localhost:8000/api/health
• Verify Jira is accessible
```

## Post-Production Checklist

- [ ] All UI interactions visible
- [ ] Mouse movements smooth
- [ ] Text readable at all times
- [ ] Loading states not too long (speed up if needed)
- [ ] Success animations clear
- [ ] Links clearly highlighted
- [ ] File size under 50 MB
- [ ] Audio levels consistent
