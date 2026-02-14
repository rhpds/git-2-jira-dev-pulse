# Video Tutorials - Recording Guide

This directory contains scripts and storyboards for creating video tutorials for Git-2-Jira-Dev-Pulse.

## Video Production Guide

### Required Tools

#### Screen Recording (macOS)
- **QuickTime Player** (built-in) - Basic screen recording
- **OBS Studio** (recommended) - Free, professional features
  - Download: https://obsproject.com/
  - Supports annotations, webcam overlay, multiple scenes
- **ScreenFlow** (paid) - Advanced editing and annotations
  - Best for professional production

#### Video Editing
- **DaVinci Resolve** (free) - Professional editing
  - Download: https://www.blackmagicdesign.com/products/davinciresolve
- **iMovie** (built-in, macOS) - Simple editing
- **Final Cut Pro** (paid) - Professional editing

#### Annotations & Effects
- **Screenflick** - Real-time cursor highlighting
- **Keycastr** - Show keyboard shortcuts on screen
- **Annotate.app** - Add callouts and text overlays

### Recording Settings

**Video Quality:**
- Resolution: 1920x1080 (1080p minimum)
- Frame Rate: 30 fps
- Format: MP4 (H.264 codec)
- Bitrate: 5-8 Mbps

**Audio:**
- Use external microphone if possible
- Sample Rate: 48kHz
- Bitrate: 128 kbps or higher
- Record in quiet environment

**GitHub File Size Limits:**
- GitHub: 100 MB max per file (without Git LFS)
- With Git LFS: 2 GB max per file
- Recommended: Keep videos under 50 MB each (3-5 minutes)

### Video Compression

To meet GitHub limits:
```bash
# Using ffmpeg
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset slow \
  -c:a aac -b:a 96k output.mp4

# Using HandBrake (GUI)
# 1. Open video
# 2. Select "Web" preset
# 3. Adjust quality slider to ~28 RF
# 4. Convert
```

## Video Structure

### Video Series Overview

1. **01-setup-and-installation.mp4** (5 min)
   - Clone repository
   - Install dependencies
   - Verify installation

2. **02-configuring-jira-credentials.mp4** (4 min)
   - Get Jira API token
   - Create .env file
   - Test connection

3. **03-using-web-ui.mp4** (6 min)
   - Start application
   - Select repositories
   - Review work by quarter
   - Create tickets

4. **04-using-cli.mp4** (4 min)
   - Scan repos
   - Analyze commits
   - Generate suggestions
   - Create tickets

5. **05-mcp-integration.mp4** (5 min)
   - Configure Claude
   - Use MCP tools
   - Create tickets via Claude

## Recording Instructions

### Before Recording

1. **Prepare Environment**
   - Clean desktop (no personal files visible)
   - Close unnecessary apps
   - Set browser to clean state (no personal bookmarks)
   - Use incognito/private window if needed
   - Increase terminal font size (18-20pt)
   - Use high contrast theme for visibility

2. **Prepare Demo Data**
   - Have test repositories ready
   - Use example data (not production)
   - Prepare test Jira project

3. **Script Practice**
   - Read through script
   - Practice commands
   - Time yourself
   - Mark sections for callouts

### During Recording

1. **Speak Clearly**
   - Talk at moderate pace
   - Pause between sections
   - Announce what you're doing
   - Explain why, not just what

2. **Mouse Movement**
   - Move cursor slowly and deliberately
   - Hover over items before clicking
   - Pause on important elements

3. **Recording Workflow**
   - Start recording
   - Count "3, 2, 1" silently
   - Begin speaking
   - Execute actions smoothly
   - Pause 2 seconds at end
   - Stop recording

### After Recording

1. **Review Footage**
   - Check audio quality
   - Verify all actions visible
   - Look for mistakes or confusion

2. **Add Annotations**
   - Red circles around click targets
   - Yellow highlights for important text
   - Callout bubbles with explanations
   - Arrows showing flow
   - Zoom in on small text

3. **Add Text Overlays**
   - Title card at start
   - Command text overlays
   - Key point summaries
   - URL references
   - End card with next steps

4. **Export Settings**
   - Format: MP4
   - Codec: H.264
   - Resolution: 1080p
   - Frame rate: 30 fps
   - Quality: High (aim for <50 MB)

## Annotation Guidelines

### Visual Elements to Add

**Red Circles:**
- Use for: Click targets, buttons, important fields
- Size: Just larger than target element
- Duration: 1-2 seconds
- Animation: Fade in/out

**Yellow Highlights:**
- Use for: Text to read, code sections, important info
- Style: Semi-transparent box
- Duration: As long as mentioned in audio

**Callout Bubbles:**
- Use for: Explanations, warnings, tips
- Style: White bubble with arrow pointing to element
- Text: Brief (5-10 words)
- Font: Sans-serif, 18-24pt

**Arrows:**
- Use for: Showing flow, indicating movement
- Style: Thick, bright color (red or green)
- Animation: Fade in, hold, fade out

**Text Overlays:**
- Use for: Commands, URLs, key points
- Position: Bottom third of screen
- Style: Dark background, white text
- Font: Monospace for code, Sans-serif for text
- Size: 20-24pt

### Animation Timing

- Fade in: 0.3 seconds
- Hold: 1-2 seconds (or duration of discussion)
- Fade out: 0.3 seconds
- Zoom transition: 0.5 seconds

## Example Annotation Timeline

```
Time    Action                  Annotation
------  --------------------    ----------------------------------
0:00    Title card              "Git-2-Jira Setup Guide"
0:05    Terminal appears        Text overlay: "$ git clone..."
0:10    Highlight URL           Yellow box around GitHub URL
0:15    Click clone button      Red circle on button (fade in/out)
0:20    Loading indicator       Callout: "This may take a minute"
0:30    Success message         Green checkmark overlay
```

## Testing Your Videos

Before finalizing:
1. Watch without audio - visuals should tell story
2. Listen without video - audio should make sense
3. Watch at 1.5x speed - should still be clear
4. Get feedback from colleague
5. Test on different devices (mobile, tablet)

## Git LFS Setup (for large videos)

If videos exceed 50 MB:
```bash
# Install Git LFS
brew install git-lfs  # macOS
# or download from: https://git-lfs.github.com/

# Initialize in repo
git lfs install

# Track MP4 files
git lfs track "videos/*.mp4"
git add .gitattributes

# Commit as normal
git add videos/
git commit -m "Add video tutorials"
git push
```

## Video Hosting Alternatives

If GitHub isn't suitable:
- **YouTube** - Upload as unlisted, embed in README
- **Vimeo** - Professional hosting, privacy controls
- **Google Drive** - Share links in documentation
- **Self-hosted** - Use project website

## Maintenance

Update videos when:
- UI significantly changes
- New major features added
- Process changes
- Based on user feedback

Keep raw footage and project files for easy updates.

## Questions?

- Check existing video examples
- Review script files in this directory
- Contact video maintainer
- Post in #rhdp-dev-tools Slack

## Resources

- [OBS Studio Tutorials](https://obsproject.com/wiki/)
- [DaVinci Resolve Training](https://www.blackmagicdesign.com/products/davinciresolve/training)
- [Screen Recording Best Practices](https://www.techsmith.com/blog/screen-recording-tips/)
- [Creating Software Tutorials](https://www.youtube.com/watch?v=example)

Happy recording! 🎥
