# Video 02: Configuring Jira Credentials

**Duration:** ~4 minutes
**File name:** `02-configuring-jira-credentials.mp4`

## Pre-Recording Checklist

- [ ] Have test Jira account ready (not production)
- [ ] Browser in private mode (hide personal data)
- [ ] Example .env file prepared
- [ ] Test token ready (or be prepared to generate)
- [ ] Desktop clean
- [ ] Terminal font size: 18pt

## Script

### Scene 1: Title Card (0:00-0:05)
**Visual:**
- Title: "Git-2-Jira-Dev-Pulse"
- Subtitle: "Part 2: Configuring Jira Credentials"

**Audio:**
"In this video, we'll configure your Jira credentials so Git-2-Jira can create tickets on your behalf."

### Scene 2: Overview (0:05-0:25)
**Visual:**
- Show diagram of authentication flow

**Diagram:**
```
Your Machine              Jira API
    ↓                        ↓
  .env file  →  API Token  →  your-jira.atlassian.net
    ↑                        ↑
Configuration          Authentication
```

**Audio:**
"Git-2-Jira uses a Jira Personal Access Token to authenticate with your Jira instance. This is stored locally in a dot-env file in your home directory. It's never committed to git, keeping your credentials safe."

**Annotations:**
- Yellow highlight on ".env file"
- Callout: "Stored securely in your home directory"
- Red circle on "API Token"

### Scene 3: Locate Example File (0:25-0:50)
**Visual:**
- Terminal showing project directory
- Show example file contents

**Commands:**
```bash
cd ~/repos/git-2-jira-dev-pulse
ls -la .env.example
cat .env.example
```

**Audio:**
"First, let's look at the example environment file included in the project. Run 'cat .env.example' to see what we need to configure."

**Show on screen:**
```env
JIRA_URL=https://your-jira.atlassian.net
JIRA_API_TOKEN=<your-token-here>
JIRA_DEFAULT_PROJECT=MYPROJECT
JIRA_DEFAULT_ASSIGNEE=<your-jira-username>
REPOS_BASE_PATH=~/repos
```

**Annotations:**
- Yellow highlight on each line as explained
- Callout bubbles:
  - JIRA_URL → "Your Jira instance"
  - JIRA_API_TOKEN → "We'll get this next"
  - JIRA_DEFAULT_PROJECT → "Your project key"
  - JIRA_DEFAULT_ASSIGNEE → "Your username"

### Scene 4: Copy to Home Directory (0:50-1:10)
**Visual:**
- Copy example file to home directory

**Commands:**
```bash
cp .env.example ~/.git2jira.env
ls -la ~/.git2jira.env
```

**Audio:**
"Copy the example file to your home directory with this name: dot-git2jira-dot-env. This is where Git-2-Jira looks for your credentials."

**Annotations:**
- Text overlay showing command
- Red circle around destination path
- Callout: "Git-2-Jira reads credentials from here"
- Green checkmark after successful copy

### Scene 5: Getting Jira API Token (1:10-2:30)
**Visual:**
- Open browser
- Navigate to Jira
- Go to token generation page

**For Jira (your-jira.atlassian.net):**

**Steps:**
1. Go to your-jira.atlassian.net
2. Click profile icon (top right)
3. Click "Profile"
4. Click "Personal Access Tokens" tab
5. Click "Create token"

**Audio:**
"Now let's get your Jira API token. The process differs slightly by Jira instance. Go to your Jira instance, click your profile icon, then Profile, then the Personal Access Tokens tab. Click 'Create token'."

**Annotations:**
- Red circles on each click target (fade in/out)
- Zoom in on profile icon
- Zoom in on "Create token" button
- Callout: "For Atlassian Cloud, go to id.atlassian.com/manage-profile/security/api-tokens"

**Show token creation form:**
- Name: "git-2-jira-dev-pulse"
- Expiration: 90 days (recommended)

**Audio (continued):**
"Give your token a descriptive name like 'git-2-jira-dev-pulse'. Set an expiration - I recommend 90 days. This ensures if your token is compromised, it won't work forever. Click Create."

**Annotations:**
- Yellow highlight on name field
- Yellow highlight on expiration dropdown
- Callout: "Choose expiration based on your security policy"
- Red circle on "Create" button

**Show token display:**
**Audio:**
"Your token is now displayed. This is the ONLY time you'll see it, so copy it immediately. Click the copy icon."

**Annotations:**
- ⚠️ Warning callout: "Copy now! You won't see this again"
- Red circle on copy button
- Visual effect: Token being copied to clipboard

### Scene 6: Edit Environment File (2:30-3:20)
**Visual:**
- Open .env file in editor
- Replace placeholder values

**Commands:**
```bash
# Option 1: nano
nano ~/.git2jira.env

# Option 2: VS Code
code ~/.git2jira.env

# Option 3: vim
vim ~/.git2jira.env
```

**Audio:**
"Now let's edit our environment file. You can use any text editor - I'll use nano. Open the file we just created."

**Show file contents:**
```env
JIRA_URL=https://your-jira.atlassian.net
JIRA_API_TOKEN=paste-your-token-here
JIRA_DEFAULT_PROJECT=MYPROJECT
JIRA_DEFAULT_ASSIGNEE=your-username
REPOS_BASE_PATH=~/repos
```

**Audio (continued):**
"Paste your token where it says 'paste-your-token-here'. Then update your Jira username and project key. Set the project key to match your Jira project. Update your repos path if it's different from ~/repos."

**Annotations:**
- Arrow pointing to JIRA_API_TOKEN line
- Yellow highlight on token being pasted (blur actual token)
- Callout: "Your token is secret - never share it!"
- Yellow highlight on PROJECT and ASSIGNEE as changed
- Split screen showing:
  - Left: Where to find your username (Jira profile)
  - Right: Where to find project key (Jira project page)

**Save file:**
```bash
# In nano: Ctrl+O, Enter, Ctrl+X
# In vim: :wq
```

**Audio:**
"Save and exit. In nano, that's Control-O, Enter, then Control-X."

**Annotations:**
- Text overlay: "Ctrl+O → Enter → Ctrl+X"
- Green checkmark when saved

### Scene 7: Verify Configuration (3:20-3:50)
**Visual:**
- Test connection with health endpoint
- Show successful response

**Commands:**
```bash
# Start backend
cd ~/repos/git-2-jira-dev-pulse
make backend &

# Wait a few seconds for startup
sleep 5

# Test connection
curl http://localhost:8000/api/health
```

**Audio:**
"Let's verify our configuration. Start the backend with 'make backend', wait a few seconds for it to start, then test the health endpoint with this curl command."

**Annotations:**
- Text overlay: "$ make backend"
- Loading indicator during startup
- Callout: "Starting FastAPI server..."

**Show successful response:**
```json
{
  "status": "ok",
  "jira": {
    "connected": true,
    "user": {
      "accountId": "557058:...",
      "displayName": "John Doe",
      "emailAddress": "jdoe@example.com"
    }
  }
}
```

**Audio:**
"Perfect! We got a successful response. You can see 'connected: true' and your Jira user information. This means everything is configured correctly!"

**Annotations:**
- Yellow highlight on "connected": true
- Green checkmark overlay
- Callout: "Success! You're connected"
- Zoom in on user info

### Scene 8: Troubleshooting (3:50-4:20)
**Visual:**
- Show common errors and solutions

**Show error examples:**

**Error 1: Invalid token**
```json
{
  "detail": "Jira authentication failed"
}
```

**Solution:**
- Check token is correct
- Verify no extra spaces
- Check token hasn't expired

**Error 2: Wrong URL**
```json
{
  "detail": "Could not connect to Jira"
}
```

**Solution:**
- Verify JIRA_URL is correct
- Check network connection
- Try accessing URL in browser

**Audio:**
"If you see an error, here are the most common issues. 'Authentication failed' usually means your token is incorrect or expired. 'Could not connect' means your Jira URL might be wrong. Double-check your .env file and try again."

**Annotations:**
- Red X on errors
- Side-by-side: Error → Solution
- Callout boxes with fixes
- Arrow pointing to .env file for verification

### Scene 9: Security Best Practices (4:20-4:45)
**Visual:**
- Show list of security tips

**Show on screen:**
```
🔒 Security Best Practices

✓ Never commit .env files to git
✓ Set token expiration
✓ Use unique tokens per tool
✓ Rotate tokens regularly
✓ Revoke unused tokens
✓ Use least-privilege permissions
```

**Audio:**
"A few quick security tips: Never commit your .env file to git - it's in .gitignore by default. Set token expirations. Use unique tokens for different tools so you can revoke them individually. And rotate your tokens regularly for maximum security."

**Annotations:**
- Green checkmarks appear as each point is mentioned
- Callout: "Your .env is automatically gitignored"
- Yellow highlight on most important points

### Scene 10: Next Steps (4:45-4:55)
**Visual:**
- Next steps overlay

**Show on screen:**
```
Configuration Complete! ✓

Next:
→ Video 3: Use the Web UI
→ Video 4: Try the CLI
→ Video 5: MCP Integration
```

**Audio:**
"That's it for configuration! You're now ready to start creating Jira tickets. In the next video, we'll explore the web UI. See you there!"

### Scene 11: End Card (4:55-5:00)
**Visual:**
- Project links

**Show on screen:**
```
Git-2-Jira-Dev-Pulse

Docs: github.com/rhpds/git-2-jira-dev-pulse/docs
Issues: github.com/rhpds/git-2-jira-dev-pulse/issues
```

---

## Important Security Notes

**When recording:**
- BLUR or MASK your actual API token
- Use a test token that will be revoked
- Don't show your real Jira username/email
- Use example data, not real projects

**Post-production:**
- Add blur effect over token (always)
- Add blur over personal info
- Consider using "dummy" overlay text

## Recovery Points

- **0:50** - Can restart from file copy
- **1:10** - Can restart from token generation
- **2:30** - Can restart from editing file
- **3:20** - Can restart from verification

## Alternative Scenarios

### For Atlassian Cloud Users:
Show alternative path at 1:10:
- Go to id.atlassian.com/manage-profile/security/api-tokens
- Click "Create API token"
- Different UI but same concept

### For Self-Hosted Jira:
Add callout:
- Token generation location varies
- Contact your Jira admin
- Process similar once you have token

## Post-Production Checklist

- [ ] All tokens blurred/masked
- [ ] Personal info hidden
- [ ] Error examples clear
- [ ] Audio matches visuals
- [ ] Annotations don't overlap
- [ ] File size under 50 MB
