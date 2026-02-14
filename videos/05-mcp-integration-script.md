# Video 05: MCP Integration with Claude Code

**Duration:** ~5 minutes
**File name:** `05-mcp-integration.mp4`

## Pre-Recording Checklist

- [ ] Claude Code installed and working
- [ ] MCP server configured
- [ ] Test MCP tools before recording
- [ ] Clean Claude conversation history
- [ ] Terminal + Claude visible simultaneously
- [ ] High contrast in both windows
- [ ] Test environment loaded

## Script

### Scene 1: Title Card (0:00-0:05)
**Visual:**
- Title: "Git-2-Jira-Dev-Pulse"
- Subtitle: "Part 5: MCP Integration with Claude Code"

**Audio:**
"Welcome to the final video! Today we'll integrate Git-2-Jira with Claude Code using the Model Context Protocol."

### Scene 2: What is MCP? (0:05-0:30)
**Visual:**
- Show MCP architecture diagram

**Diagram:**
```
┌─────────────┐
│ Claude Code │
│   (User)    │
└──────┬──────┘
       │ MCP Protocol
       │
┌──────▼────────────┐
│   MCP Server      │
│  (git-2-jira)     │
└──────┬────────────┘
       │
   ┌───▼───┬────────┬────────┐
   │ Scan  │Analyze │ Create │
   │ Repos │ Git    │Tickets │
   └───────┴────────┴────────┘
```

**Audio:**
"The Model Context Protocol lets Claude Code access your tools and data. Our MCP server exposes five tools: scan repos, analyze git history, suggest tickets, create tickets, and check Jira health. Claude can call these tools to help you manage your work."

**Annotations:**
- Yellow highlight on each component
- Arrows showing data flow
- Callout: "Claude + Your Tools = Powerful Automation"

### Scene 3: Configuration (0:30-1:30)
**Visual:**
- Show Claude config file
- Explain settings

**File location:**
```
~/.config/claude/claude_desktop_config.json
```

**Show configuration:**
```json
{
  "mcpServers": {
    "git-to-jira": {
      "command": "python3",
      "args": [
        "/Users/josh/repos/git-2-jira-dev-pulse/mcp-server/server.py"
      ],
      "env": {
        "PYTHONPATH": "/Users/josh/repos/git-2-jira-dev-pulse"
      },
      "description": "Git-to-Jira ticket workflow"
    }
  }
}
```

**Audio:**
"First, let's configure the MCP server. Open your Claude config file and add the git-to-jira server. Set the command to python3, point args to your server.py file, and set PYTHONPATH to the project root. The description helps Claude understand what tools are available."

**Annotations:**
- Yellow highlight on each field
- Callout on "command": "Must be python3"
- Callout on "args": "Full path to server.py"
- Callout on "env": "Important for imports"
- Red circle on file location
- Text overlay: "Edit with: code ~/.config/claude/claude_desktop_config.json"

**Show save and restart:**
```
1. Save the file
2. Restart Claude Code completely
3. Verify MCP server loads in status bar
```

**Audio:**
"Save the file and restart Claude Code. You should see the git-to-jira server in your MCP status bar."

**Annotations:**
- Green checkmark on save
- Arrow pointing to status bar
- Callout: "Look for 'git-to-jira' indicator"
- Zoom in on MCP icon

### Scene 4: Available MCP Tools (1:30-2:00)
**Visual:**
- Show Claude with MCP tools loaded

**Ask Claude:**
"What MCP tools do you have available?"

**Claude response:**
```
I have access to the following git-to-jira MCP tools:

1. scan_repos()
   - Scans ~/repos/ for git repositories
   - Returns list of repos with metadata

2. analyze_repo(path, max_commits, since_days)
   - Analyzes a git repository's history
   - Shows commits, branches, uncommitted changes

3. suggest_tickets(paths, project_key)
   - Generates Jira ticket suggestions
   - Based on git activity across repos

4. create_jira_ticket(project_key, summary, description, ...)
   - Creates a single Jira ticket
   - Returns ticket key and URL

5. check_jira_connection()
   - Verifies Jira connectivity
   - Shows current user info

Would you like me to use any of these tools?
```

**Audio:**
"Ask Claude what tools are available. It will list all five MCP tools with descriptions. This confirms the server loaded correctly."

**Annotations:**
- Yellow highlight on each tool
- Callout: "Claude understands all your tools"
- Number badges appear next to each tool

### Scene 5: Basic Usage - Scan Repos (2:00-2:30)
**Visual:**
- Natural language command to Claude
- Watch MCP tool execution

**User message:**
"Can you scan my repositories and show me which ones have recent activity?"

**Show Claude thinking:**
```
I'll use the scan_repos tool to find your repositories.
```

**Show tool execution:**
```
🔧 Using MCP tool: scan_repos()
```

**Claude response:**
```
I found 12 git repositories in ~/repos. Here are the most
recently active ones:

1. git-2-jira-dev-pulse
   Last commit: 2 hours ago
   Path: ~/repos/git-2-jira-dev-pulse

2. aiops-skills
   Last commit: 1 day ago
   Path: ~/repos/aiops-skills

3. jira-mcp
   Last commit: 3 days ago
   Path: ~/repos/jira-mcp

The others haven't been touched in over a week. Would you
like me to analyze any of these in detail?
```

**Audio:**
"Just ask Claude in natural language. It automatically chooses the right MCP tool, executes it, and presents the results conversationally. No commands to remember!"

**Annotations:**
- Red circle on user message
- Yellow highlight on "scan_repos" tool call
- Loading animation during tool execution
- Green checkmark when complete
- Callout: "Natural language → Automatic tool use"

### Scene 6: Advanced Usage - Analyze & Suggest (2:30-3:30)
**Visual:**
- Multi-step workflow with Claude

**User message:**
"Analyze git-2-jira-dev-pulse and aiops-skills for the last 30 days, then suggest Jira tickets for any significant work."

**Show Claude's workflow:**
```
I'll help you with that. Let me:
1. Analyze both repositories
2. Look for significant work in the last 30 days
3. Generate ticket suggestions

🔧 Using: analyze_repo(git-2-jira-dev-pulse, 30, 30)
```

**Show analysis results:**
```
git-2-jira-dev-pulse analysis:
- 15 commits in last 30 days
- 3 active branches
- Major work: MCP server implementation
- Uncommitted changes detected

🔧 Using: analyze_repo(aiops-skills, 30, 30)
```

**Show second analysis:**
```
aiops-skills analysis:
- 8 commits in last 30 days
- 2 active branches
- Major work: New skill definitions

🔧 Using: suggest_tickets([paths], "RHDPOPS")
```

**Show suggestions:**
```
Based on the git activity, I suggest these Jira tickets:

1. Story: Implement MCP server for Claude integration
   - 8 commits related to MCP functionality
   - Estimated: 5 story points
   - Priority: Major

2. Task: Update AIOps skill definitions
   - 5 commits updating skill catalog
   - Estimated: 3 story points
   - Priority: Normal

Would you like me to create these tickets?
```

**Audio:**
"Claude can chain multiple tools together intelligently. It analyzes both repositories, identifies significant work, and generates suggestions - all from one natural language request. This is the power of MCP!"

**Annotations:**
- Step numbers appear as Claude works
- Loading indicators for each tool call
- Yellow highlight on key findings
- Callout: "Claude decides which tools to use"
- Callout: "Multi-step reasoning"
- Green arrows showing workflow progression

### Scene 7: Creating Tickets with Approval (3:30-4:10)
**Visual:**
- Review and create tickets

**User message:**
"Yes, create both tickets. Assign them to me."

**Show Claude creating:**
```
I'll create both tickets in RHDPOPS and assign them to you.

🔧 Using: create_jira_ticket(
    project_key="RHDPOPS",
    summary="Implement MCP server for Claude integration",
    description="...",
    issue_type="Story",
    priority="Major",
    assignee="jdoe"
)
```

**Show success:**
```
✓ Created: RHDPOPS-1234
  Implement MCP server for Claude integration
  https://issues.redhat.com/browse/RHDPOPS-1234

🔧 Using: create_jira_ticket(...)
```

**Show second ticket:**
```
✓ Created: RHDPOPS-1235
  Update AIOps skill definitions
  https://issues.redhat.com/browse/RHDPOPS-1235

Both tickets are created and assigned to you! Here's a
summary:

• RHDPOPS-1234 (Story, Major): MCP server integration
• RHDPOPS-1235 (Task, Normal): Skill definitions update

Would you like me to analyze more repositories or create
additional tickets?
```

**Audio:**
"Claude creates both tickets automatically, returns the ticket keys, and provides clickable Jira links. The entire workflow - from scanning repos to creating tickets - happened through natural conversation!"

**Annotations:**
- Loading animations during creation
- Green checkmarks as tickets created
- Zoom in on ticket keys
- Highlight Jira URLs
- Callout: "2 tickets created in seconds"
- Success celebration animation

### Scene 8: Real-World Scenarios (4:10-4:40)
**Visual:**
- Show different use cases

**Example prompts:**
```
"What work have I done this week across all repos?"

"Find repos I haven't committed to in 30 days"

"Create a bug ticket for the routing issue I fixed yesterday"

"Analyze uncommitted changes and suggest tickets"

"Check my Jira connection and show my open tickets"

"Scan for repos with merge conflicts"
```

**Audio:**
"The MCP integration enables countless workflows. Ask Claude about work across all repos, find inactive projects, create tickets for specific commits, analyze uncommitted changes, or check Jira health. Claude combines the MCP tools with its reasoning to help however you need."

**Annotations:**
- Each prompt appears as example
- Callout: "Natural language = Flexibility"
- Yellow highlights on key phrases
- Icon indicators for different operations:
  - 🔍 = Scan/Analyze
  - 📝 = Create tickets
  - ✅ = Health check

### Scene 9: Tips & Best Practices (4:40-5:10)
**Visual:**
- Show tips overlay

**Show on screen:**
```
💡 MCP Integration Tips

✓ Be specific with date ranges
  "Analyze last 2 weeks" not "recent work"

✓ Review suggestions before creating
  Claude will ask for approval

✓ Use conversational refinement
  "Make the description more detailed"
  "Change priority to Critical"

✓ Combine with Claude's knowledge
  "Write this ticket following agile best practices"

✓ Leverage Claude's memory
  "Use the same format as last time"

⚠️ Check Jira connection first
  "Check my Jira connection" before bulk operations
```

**Audio:**
"Some tips for effective use: Be specific with time ranges. Always review suggestions before creating. Use conversational refinement to adjust tickets. Leverage Claude's general knowledge for better descriptions. And always check your Jira connection before bulk operations."

**Annotations:**
- Green checkmarks for do's
- Yellow warning for precautions
- Each tip highlights as mentioned

### Scene 10: Comparison with Other Interfaces (5:10-5:30)
**Visual:**
- Show comparison table

**Show on screen:**
```
Which Interface to Use?

Web UI 🖥️
✓ Visual workflow
✓ Review multiple repos side-by-side
✓ Best for: Interactive exploration

CLI ⌨️
✓ Fast automation
✓ Scriptable
✓ Best for: Power users, CI/CD

MCP + Claude 🤖
✓ Natural language
✓ Multi-step reasoning
✓ Context-aware
✓ Best for: Complex workflows, quick questions
```

**Audio:**
"So when should you use each interface? Use the Web UI for visual exploration. Use the CLI for automation and scripts. Use MCP with Claude for natural language interaction and complex multi-step workflows. All three use the same backend, so pick what works best for your situation!"

**Annotations:**
- Icons for each interface
- Checkmarks appear as benefits listed
- Callout: "Choose your style!"

### Scene 11: Wrap-Up (5:30-5:50)
**Visual:**
- Series completion

**Show on screen:**
```
Series Complete! 🎉

You've Learned:
✓ Video 1: Setup & Installation
✓ Video 2: Jira Configuration
✓ Video 3: Web UI Workflow
✓ Video 4: CLI Power User Features
✓ Video 5: MCP with Claude Code

Start Creating Tickets:
• Web: http://localhost:5173
• CLI: python cli/main.py --help
• MCP: Ask Claude!
```

**Audio:**
"That's a wrap on our video series! You've learned how to set up Git-2-Jira, configure your credentials, use all three interfaces, and create tickets from your git activity. Start using whichever interface fits your workflow best. Happy ticket creating!"

**Annotations:**
- Confetti animation
- All five checkmarks appear
- Links highlight
- Callout: "Thanks for watching!"

### Scene 12: End Card (5:50-6:00)
**Visual:**
- Final resources

**Show on screen:**
```
Git-2-Jira-Dev-Pulse

📚 Documentation:
   github.com/rhpds/git-2-jira-dev-pulse/docs

🐛 Report Issues:
   github.com/rhpds/git-2-jira-dev-pulse/issues

💬 Questions:
   Slack: #rhdp-dev-tools

⭐ Star us on GitHub!
```

---

## Recording Notes

### Claude Code Setup

Before recording:
```bash
# Verify MCP server
python mcp-server/server.py

# Should show:
# FastMCP server running...
# Tools: scan_repos, analyze_repo, suggest_tickets, ...
```

### Conversation Preparation

**Start fresh:**
1. Clear Claude conversation history
2. Start new conversation
3. Test MCP tools first (off camera)
4. Then record clean conversation

**Script conversation:**
- Plan your questions ahead
- Know Claude's expected responses
- Have contingency if Claude responds unexpectedly
- Can edit out pauses

### Visual Layout

**Split screen:**
```
┌─────────────────┬─────────────────┐
│                 │                 │
│  Claude Code    │   Terminal      │
│  Conversation   │   / Browser     │
│                 │                 │
│  (MCP tools)    │   (Jira view)   │
│                 │                 │
└─────────────────┴─────────────────┘
```

Or alternate between:
- Full-screen Claude (for conversation)
- Full-screen terminal (for config)
- Picture-in-picture (for results)

## Recovery Points

- **1:30** - Can restart from showing tools
- **2:00** - Can restart from scan example
- **2:30** - Can restart from analyze example
- **3:30** - Can restart from create example

## Handling Claude Variability

Claude's responses vary. Plan for:

**If Claude doesn't use expected tool:**
- Rephrase request more specifically
- Explicitly mention the tool
- Continue recording - real usage is valuable

**If tool fails:**
- Show troubleshooting (good content!)
- Demonstrate error handling
- Fix and continue

**If conversation goes long:**
- Edit for pacing in post-production
- Speed up less important parts
- Jump cut between tool calls

## Post-Production Checklist

- [ ] Claude + terminal both visible
- [ ] MCP tool calls highlighted
- [ ] Tool execution flows clear
- [ ] Jira ticket creation confirmed (show in browser)
- [ ] Comparison table readable
- [ ] File size under 50 MB
- [ ] Natural conversation pacing
- [ ] Background apps hidden
