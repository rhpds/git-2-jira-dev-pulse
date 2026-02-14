# Video 04: Using the CLI

**Duration:** ~4 minutes
**File name:** `04-using-cli-script.md`

## Pre-Recording Checklist

- [ ] Terminal font: 20pt (larger for CLI videos)
- [ ] Terminal theme: high contrast
- [ ] Terminal size: 120x40 or larger
- [ ] Test commands work before recording
- [ ] Have example data ready
- [ ] Clear command history

## Script

### Scene 1: Title Card (0:00-0:05)
**Visual:**
- Title: "Git-2-Jira-Dev-Pulse"
- Subtitle: "Part 4: Using the CLI"

**Audio:**
"In this video, we'll explore the command-line interface - perfect for power users and automation."

### Scene 2: CLI Overview (0:05-0:25)
**Visual:**
- Show CLI help output

**Commands:**
```bash
cd ~/repos/git-2-jira-dev-pulse
python cli/main.py --help
```

**Show output:**
```
Usage: main.py [OPTIONS] COMMAND [ARGS]...

  Git-2-Jira CLI - Turn git activity into Jira tickets

Commands:
  scan      Scan ~/repos for git repositories
  analyze   Analyze a single repository
  suggest   Generate ticket suggestions from git work
  create    Create a Jira ticket
  health    Check Jira connection status

Options:
  --help    Show this message and exit
```

**Audio:**
"The CLI provides five main commands: scan to find repositories, analyze to inspect git history, suggest to generate ticket ideas, create to make tickets directly, and health to check your Jira connection."

**Annotations:**
- Yellow highlight on each command as mentioned
- Callout bubbles:
  - scan → "Find repos"
  - analyze → "Inspect history"
  - suggest → "Generate ideas"
  - create → "Make tickets"
  - health → "Test connection"

### Scene 3: Health Check (0:25-0:45)
**Visual:**
- Run health command
- Show Jira connection status

**Commands:**
```bash
python cli/main.py health
```

**Show output:**
```
✓ Jira Connection Healthy

Server: https://issues.redhat.com
User: John Doe (jdoe@redhat.com)
Default Project: RHDPOPS

Everything is configured correctly!
```

**Audio:**
"Always start with the health check. This verifies your Jira credentials are working and shows your connection details. Green checkmark means you're good to go!"

**Annotations:**
- Green checkmark animation
- Yellow highlight on user info
- Callout: "Test this after any config changes"
- Text overlay: "python cli/main.py health"

### Scene 4: Scanning Repositories (0:45-1:15)
**Visual:**
- Run scan command
- Show repository list

**Commands:**
```bash
python cli/main.py scan
```

**Show output:**
```
Scanning ~/repos for git repositories...

Found 12 repositories:

  1. git-2-jira-dev-pulse
     /Users/josh/repos/git-2-jira-dev-pulse
     Last commit: 2 hours ago

  2. aiops-skills
     /Users/josh/repos/aiops-skills
     Last commit: 1 day ago

  3. jira-mcp
     /Users/josh/repos/jira-mcp
     Last commit: 3 days ago

  ... and 9 more

Use --path to scan a different directory
Example: python cli/main.py scan --path ~/other-repos
```

**Audio:**
"The scan command finds all git repositories in your repos directory. It shows the name, full path, and last commit time for each repo. Use the --path flag to scan a different directory."

**Annotations:**
- Loading animation during scan
- Yellow highlight on each repo as listed
- Callout: "12 repositories found"
- Text overlay: "python cli/main.py scan --path ~/other-repos"
- Arrow pointing to example command

### Scene 5: Analyzing a Repository (1:15-2:15)
**Visual:**
- Run analyze command with options
- Show detailed output

**Commands:**
```bash
# Basic analysis
python cli/main.py analyze ~/repos/git-2-jira-dev-pulse

# With options
python cli/main.py analyze ~/repos/git-2-jira-dev-pulse \
  --max-commits 50 \
  --since-days 60
```

**Show output:**
```
Analyzing ~/repos/git-2-jira-dev-pulse...

Repository: git-2-jira-dev-pulse
Path: /Users/josh/repos/git-2-jira-dev-pulse
Last commit: 2 hours ago

━━━ Commits (last 30 days) ━━━

  • a1b2c3d - Add MCP server support (2 hours ago)
    Files: 5 changed, +120/-30 lines

  • b2c3d4e - Implement ticket suggestions (1 day ago)
    Files: 3 changed, +89/-12 lines

  • c3d4e5f - Fix frontend routing bug (2 days ago)
    Files: 2 changed, +15/-8 lines

  ... 12 more commits

━━━ Branches ━━━

  * main (current)
    feature/mcp-integration
    fix/routing-issue

━━━ Uncommitted Changes ━━━

  ⚠️  3 files modified:
      • src/App.tsx (+45/-12)
      • README.md (+23/-5)
      • backend/api/main.py (+8/-2)

━━━ Work by Quarter ━━━

  FY26 Q4 (Dec 2025 - Feb 2026)
  └─ 15 commits across 8 files

  FY26 Q3 (Sep - Nov 2025)
  └─ 23 commits across 12 files
```

**Audio:**
"The analyze command gives you a detailed breakdown. You'll see recent commits with file changes, active branches, uncommitted work, and commits grouped by quarter. Use --max-commits and --since-days to control how much history to analyze."

**Annotations:**
- Section headers highlight as discussed
- Yellow box around commit details
- Red circle on uncommitted changes warning
- Callout: "Don't forget uncommitted work!"
- Text overlay showing command options
- Split view: Command → Output

### Scene 6: Generating Suggestions (2:15-3:00)
**Visual:**
- Run suggest command
- Show generated tickets

**Commands:**
```bash
python cli/main.py suggest ~/repos/git-2-jira-dev-pulse \
  --project RHDPOPS
```

**Show output:**
```
Generating ticket suggestions for git-2-jira-dev-pulse...

━━━ Suggested Tickets ━━━

[1] Implement MCP server integration
    Type: Story | Priority: Major | Points: 5

    Description:
    Added Model Context Protocol server for Claude Code
    integration with tools for repo scanning, commit
    analysis, and ticket creation.

    Source commits:
    • a1b2c3d - Add MCP server
    • b2c3d4e - Add MCP tools
    • c3d4e5f - Test MCP integration

[2] Fix frontend routing issues
    Type: Bug | Priority: Critical | Points: 3

    Description:
    Resolved navigation bugs in React Router that caused
    page refresh issues and broken back button behavior.

    Source commits:
    • c3d4e5f - Fix routing bug

... 2 more suggestions

Use 'create' command to make tickets from these suggestions
```

**Audio:**
"The suggest command analyzes your git work and generates intelligent ticket suggestions. Each suggestion includes a type, priority, story point estimate, description, and the source commits. These are the same AI-powered suggestions you see in the web UI."

**Annotations:**
- Yellow highlight on each suggestion
- Callout on [1]: "Smart grouping"
- Callout on Type: "Auto-detected"
- Callout on Points: "Based on complexity"
- Arrow pointing to source commits
- Text overlay: "python cli/main.py suggest <path> --project <KEY>"

### Scene 7: Creating Tickets (3:00-3:40)
**Visual:**
- Run create command with different options
- Show successful creation

**Commands:**
```bash
# Interactive mode (prompts for details)
python cli/main.py create --interactive

# Direct creation
python cli/main.py create \
  --project RHDPOPS \
  --summary "Add dark mode to UI" \
  --description "Implement dark mode toggle in settings panel" \
  --type Story \
  --priority Normal \
  --assignee jdoe
```

**Show interactive mode:**
```
Create Jira Ticket (Interactive Mode)

Project key: RHDPOPS
Summary: Add dark mode to UI
Description: Implement dark mode toggle in settings panel
Issue type (Story/Task/Bug): Story
Priority (Blocker/Critical/Major/Normal/Minor): Normal
Assignee (leave empty for self): jdoe

Creating ticket...
```

**Show success:**
```
✓ Ticket Created Successfully!

   RHDPOPS-1234: Add dark mode to UI

   View in Jira:
   https://issues.redhat.com/browse/RHDPOPS-1234

   Assigned to: John Doe
   Type: Story
   Priority: Normal
```

**Audio:**
"The create command has two modes. Interactive mode prompts you for each field, which is great when you're getting started. For automation, use the direct mode with all flags. Either way, you get instant feedback with the ticket key and URL."

**Annotations:**
- Split screen: Interactive vs Direct
- Yellow highlight on each field as filled
- Green success animation
- Zoom in on ticket key
- Red circle around Jira URL
- Callout: "Ctrl+Click to open in browser"

### Scene 8: Advanced Usage & Automation (3:40-4:10)
**Visual:**
- Show scripting examples

**Show script examples:**
```bash
# Analyze multiple repos and create tickets
for repo in ~/repos/*; do
  if [ -d "$repo/.git" ]; then
    python cli/main.py suggest "$repo" --project RHDPOPS
  fi
done

# Create tickets from a file
while IFS= read -r line; do
  python cli/main.py create \
    --project RHDPOPS \
    --summary "$line" \
    --type Task
done < tickets.txt

# Daily automation with cron
# 0 9 * * * cd ~/repos/git-2-jira-dev-pulse && python cli/main.py scan >> ~/logs/repos.log
```

**Audio:**
"The CLI is perfect for automation. You can loop through multiple repos, read from files, or schedule with cron jobs. This makes it easy to integrate with your existing scripts and workflows."

**Annotations:**
- Code syntax highlighting
- Callout on loop: "Batch processing"
- Callout on while: "File input"
- Callout on cron: "Daily automation"
- Text overlay: "Perfect for CI/CD pipelines"

### Scene 9: Tips & Shortcuts (4:10-4:35)
**Visual:**
- Show helpful tips

**Show on screen:**
```
💡 CLI Pro Tips

• Use --help on any command for details
  $ python cli/main.py create --help

• Pipe output to files
  $ python cli/main.py scan > repos.txt

• Combine with jq for JSON processing
  $ python cli/main.py analyze --json | jq '.commits'

• Set up bash aliases
  alias g2j='python ~/repos/git-2-jira-dev-pulse/cli/main.py'
  $ g2j health

• Use tab completion
  $ eval "$(_MAIN_COMPLETE=source_bash main.py)"
```

**Audio:**
"Some power user tips: Always use --help to see all options. Pipe output to files for logging. Use jq for JSON processing. Set up bash aliases to save typing. And enable tab completion for even faster workflows."

**Annotations:**
- Yellow highlight on each tip
- Small demos of aliases and completion
- Callout: "Save these in your .bashrc"

### Scene 10: Next Steps (4:35-4:50)
**Visual:**
- Next steps overlay

**Show on screen:**
```
CLI Mastered! ✓

Next:
→ Video 5: MCP with Claude Code

Perfect for:
• Power users
• Automation scripts
• CI/CD pipelines
• Quick ticket creation
```

**Audio:**
"You're now a CLI expert! In the next and final video, we'll explore MCP integration with Claude Code for AI-assisted ticket creation. See you there!"

### Scene 11: End Card (4:50-5:00)
**Visual:**
- Project links

**Show on screen:**
```
Git-2-Jira-Dev-Pulse

CLI Docs: github.com/rhpds/git-2-jira-dev-pulse/docs
Examples: github.com/rhpds/git-2-jira-dev-pulse/examples
Issues: github.com/rhpds/git-2-jira-dev-pulse/issues
```

---

## Terminal Recording Tips

### Tools for Better CLI Videos

**asciinema (Recommended):**
```bash
# Install
brew install asciinema

# Record
asciinema rec demo.cast

# Play back
asciinema play demo.cast

# Convert to GIF
agg demo.cast demo.gif
```

**Record with OBS:**
- Focus camera on terminal only
- Use "Window Capture" not "Display Capture"
- Higher contrast = better readability

### Terminal Appearance

```bash
# Increase font size
# In Terminal.app: Cmd+Plus
# In iTerm2: Cmd+Plus

# Use high-contrast theme
# Recommended: Solarized Dark, Dracula, One Dark

# Set PS1 for cleaner prompt
export PS1='\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '

# Or even simpler
export PS1='$ '
```

### Command Pacing

- Type at 60-80% normal speed
- Pause 2 seconds after each command
- Pause 3 seconds after output appears
- Clear screen between major sections: `clear`

## Recovery Points

- **0:45** - Can restart from scan
- **1:15** - Can restart from analyze
- **2:15** - Can restart from suggest
- **3:00** - Can restart from create

## Post-Production Checklist

- [ ] All commands readable
- [ ] Output not truncated
- [ ] Proper pacing (not too fast)
- [ ] Error examples included
- [ ] Command overlays added
- [ ] Key commands highlighted
- [ ] File size under 50 MB
- [ ] Audio synced with typing
