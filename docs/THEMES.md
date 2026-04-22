# Theme System Documentation

Git-2-Jira-Dev-Pulse features a powerful theme system with **10 built-in themes** and support for **custom themes** via YAML definitions.

## Quick Start

### Switching Themes

1. Navigate to **Settings → Visual Preferences**
2. Browse the theme gallery
3. Click any theme card to activate it
4. Changes apply immediately

### Available Themes

| Theme | Category | Description |
|-------|----------|-------------|
| **Standard** | Built-in | Classic PatternFly design with solid cards |
| **Glassmorphic** | Built-in | Modern frosted glass effect with gradients and blur |
| **Standard Dark** | Dark | Dark mode PatternFly design |
| **Glassmorphic Dark** | Dark | Dark frosted glass with deep background |
| **High Contrast** | Accessibility | WCAG AAA compliant high-contrast theme |
| **Minimalist** | Light | Clean, zen-like design with maximum whitespace |
| **Neon Cyberpunk** | Dark | Vibrant neon colors with glow effects |
| **Neumorphic** | Light | Soft UI with subtle depth and shadows |
| **Material Design** | Light | Google Material Design 3 theme |
| **Retro Terminal** | Dark | Classic terminal green-on-black aesthetic |

---

## Built-in Themes

### 1. Standard (Default)

**Category**: Built-in
**Best for**: Professional environments, maximum compatibility

Classic PatternFly design that works in all contexts. Solid cards, traditional styling, familiar patterns.

```yaml
theme: standard
```

---

### 2. Glassmorphic

**Category**: Built-in
**Best for**: Modern presentations, visual impact

Frosted glass cards with blur effects, gradient backgrounds, and smooth animations. Creates depth and visual interest.

**Features:**
- Backdrop blur effects
- Gradient overlays
- Translucent surfaces
- Enhanced shadows

```yaml
theme: glassmorphic
```

---

### 3. Standard Dark

**Category**: Dark
**Best for**: Low-light environments, reduced eye strain

Dark mode version of the standard theme. Optimized for nighttime use with comfortable contrast levels.

**Colors:**
- Background: `#0f1419`
- Surface: `#1c2128`
- Text: `#e6e8ea`

```yaml
theme: standard-dark
```

---

### 4. Glassmorphic Dark

**Category**: Dark
**Best for**: Immersive dark mode experience

Combines glassmorphic effects with a deep, gradient dark background. Perfect for demo environments.

**Features:**
- Deep purple/blue gradients
- Subtle glass effects
- Low-contrast text for comfort
- Enhanced blur radius

```yaml
theme: glassmorphic-dark
```

---

### 5. High Contrast

**Category**: Accessibility
**Best for**: Accessibility compliance, visual impairments

WCAG AAA compliant theme with maximum contrast ratios. Strong borders, clear focus indicators, no subtle colors.

**Accessibility Features:**
- 21:1 contrast ratio (black on white)
- Bold borders for all elements
- Clear focus indicators
- No reliance on color alone

```yaml
theme: high-contrast
```

---

### 6. Minimalist

**Category**: Light
**Best for**: Distraction-free work, content focus

Ultra-clean design with maximum whitespace, minimal borders, and monochrome palette. Reduces visual noise.

**Features:**
- Subtle shadows
- Ample whitespace
- Light weight fonts (Inter)
- Minimal animations

```yaml
theme: minimalist
```

---

### 7. Neon Cyberpunk

**Category**: Dark
**Best for**: Tech demos, creative presentations

Vibrant neon accent colors (cyan, magenta, yellow) with glow effects on dark backgrounds. Eye-catching and modern.

**Features:**
- Neon text glow effects
- Animated gradients
- Vibrant color palette
- Dark base (#0a0e27)

```yaml
theme: neon
```

---

### 8. Neumorphic

**Category**: Light
**Best for**: Modern UI, tactile feel

Soft UI design with embossed/debossed effects. Creates subtle depth using soft shadows. iOS-inspired aesthetic.

**Features:**
- Dual-direction shadows
- Soft gray palette
- Rounded corners (16px)
- Tactile button feel

```yaml
theme: neumorphic
```

---

### 9. Material Design

**Category**: Light
**Best for**: Google ecosystem integration

Google's Material Design 3 with paper elevation system, ripple effects, and dynamic colors.

**Features:**
- Material elevation shadows
- Ripple effects on interactions
- Material color palette
- Roboto font family

```yaml
theme: material
```

---

### 10. Retro Terminal

**Category**: Dark
**Best for**: Developer tools, nostalgia

Classic terminal aesthetic with monospace fonts, green-on-black color scheme, and CRT scanline effects.

**Features:**
- Monospace fonts throughout
- Terminal green (#33ff33)
- Text glow effects
- Scanline overlay (CRT simulation)

```yaml
theme: retro-terminal
```

---

## Creating Custom Themes

### Quick Start

1. Go to **Settings → Visual Preferences**
2. Click **"Upload Custom Theme"**
3. Paste your theme YAML
4. Click **"Install Theme"**

### Theme Schema

```yaml
id: my-theme               # Unique identifier (required)
name: My Theme             # Display name (required)
description: A cool theme  # Description (required)
category: custom           # built-in | custom | dark | light | accessibility
author: Your Name          # Optional
version: "1.0"             # Optional

# Color palette (required)
colors:
  # Base colors
  background: "#ffffff"
  surface: "#f5f5f5"
  foreground: "#eeeeee"

  # Text colors
  text_primary: "#000000"
  text_secondary: "#666666"
  text_subtle: "#999999"
  text_on_dark: "#ffffff"

  # Brand colors
  primary: "#0066cc"
  secondary: "#666666"
  accent: "#ff6600"

  # Status colors
  success: "#28a745"
  warning: "#ffc107"
  danger: "#dc3545"
  info: "#17a2b8"

  # UI elements
  border: "#dddddd"
  divider: "#eeeeee"
  hover: "#f0f0f0"
  active: "#e0e0e0"

  # Glassmorphic-specific (optional)
  glass_bg: "rgba(255, 255, 255, 0.1)"
  glass_border: "rgba(255, 255, 255, 0.2)"

# Visual effects (optional)
effects:
  blur_radius: "10px"
  shadow_sm: "0 1px 2px rgba(0, 0, 0, 0.05)"
  shadow_md: "0 4px 6px rgba(0, 0, 0, 0.1)"
  shadow_lg: "0 10px 15px rgba(0, 0, 0, 0.1)"
  shadow_xl: "0 20px 25px rgba(0, 0, 0, 0.1)"
  glow: "0 0 10px currentColor"  # For neon effects
  border_radius: "8px"
  border_radius_lg: "16px"

# Typography (optional)
typography:
  font_family: "-apple-system, sans-serif"
  font_family_mono: "'Courier New', monospace"
  font_size_base: "16px"
  font_size_sm: "14px"
  font_size_lg: "18px"
  font_size_xl: "24px"
  font_weight_normal: "400"
  font_weight_medium: "500"
  font_weight_bold: "700"

# Gradients (optional)
gradients:
  primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  secondary: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
  success: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
  warning: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
  danger: "linear-gradient(135deg, #ff0844 0%, #ffb199 100%)"

# Custom CSS variables (optional)
custom_vars:
  my-special-color: "#ff00ff"
  my-spacing: "2rem"

# Raw CSS overrides (optional)
custom_css: |
  body {
    background-attachment: fixed;
  }
  .custom-class {
    color: var(--theme-my-special-color);
  }
```

### Example: Sunset Theme

```yaml
id: sunset-theme
name: Sunset Vibes
description: Warm orange and pink sunset colors
category: custom
author: Jane Doe
version: "1.0"

colors:
  background: "#fff5f0"
  surface: "#ffe8e0"
  foreground: "#ffd0c0"
  text_primary: "#5c3d2e"
  text_secondary: "#8b6f5c"
  text_subtle: "#a68b7b"
  text_on_dark: "#ffffff"
  primary: "#ff6b35"
  secondary: "#ff9a56"
  accent: "#ff4e50"
  success: "#4ecdc4"
  warning: "#f7b731"
  danger: "#ee5a6f"
  info: "#54a0ff"
  border: "#ffc5a8"
  divider: "#ffe0d1"
  hover: "#ffd8c8"
  active: "#ffc0a8"

effects:
  border_radius: "12px"
  border_radius_lg: "20px"
  shadow_md: "0 4px 12px rgba(255, 107, 53, 0.15)"

gradients:
  primary: "linear-gradient(135deg, #ff6b35 0%, #ff9a56 100%)"
  secondary: "linear-gradient(135deg, #ff9a56 0%, #ffc5a8 100%)"
```

---

## File-based Theme Management

Themes are stored in `~/.git2jira/themes/` as YAML files.

### Installing via File

```bash
# Create theme directory
mkdir -p ~/.git2jira/themes

# Create theme file
cat > ~/.git2jira/themes/my-theme.yaml <<EOF
id: my-theme
name: My Theme
# ... rest of theme definition
EOF

# Restart the application or trigger theme reload
```

### Sharing Themes

Share your `.yaml` theme file with others! They can:

1. Copy to `~/.git2jira/themes/`
2. Or upload via Settings UI

---

## API Reference

### REST Endpoints

```bash
# List all themes
GET /api/themes/

# Get theme by ID
GET /api/themes/{theme_id}

# Get theme CSS
GET /api/themes/{theme_id}/css

# Install custom theme
POST /api/themes/install
Content-Type: application/json
{
  "id": "my-theme",
  "name": "My Theme",
  ...
}

# Delete custom theme
DELETE /api/themes/{theme_id}
```

### Frontend Hook

```tsx
import { useTheme } from "../context/ThemeContext";

function MyComponent() {
  const { currentTheme, setTheme, loading } = useTheme();

  return (
    <button onClick={() => setTheme("neon")}>
      Switch to Neon Theme
    </button>
  );
}
```

---

## Theme Development Guide

### Testing Your Theme

1. **Create** your theme YAML file
2. **Upload** via Settings UI
3. **Activate** the theme
4. **Test** all pages:
   - Scan page (cards, visualizations)
   - Dashboard (ticket suggestions, filtering)
   - Results (tables, metrics)
   - History (timeline, details)
   - Settings (forms, modals)
5. **Check accessibility**: Use browser DevTools to verify contrast ratios
6. **Validate** on different screen sizes

### CSS Variable Naming

Themes generate CSS variables with the following pattern:

```css
:root[data-theme="my-theme"] {
  --theme-color-background: #ffffff;
  --theme-color-text-primary: #000000;
  --theme-effect-blur-radius: 10px;
  --theme-font-family: sans-serif;
  --theme-gradient-primary: linear-gradient(...);
}
```

### Debugging

**Check current theme:**
```javascript
console.log(document.documentElement.getAttribute('data-theme'));
```

**Inspect theme CSS:**
```javascript
const themeStyle = document.getElementById('theme-my-theme');
console.log(themeStyle.textContent);
```

---

## Best Practices

### Color Contrast

- **Text on background**: Minimum 4.5:1 ratio (WCAG AA)
- **Large text**: Minimum 3:1 ratio
- **Interactive elements**: Clear focus indicators

### Performance

- Avoid complex gradients on large surfaces
- Limit blur radius to 20px max
- Use CSS transforms (not position) for animations
- Test with 100+ repository cards

### Accessibility

- Don't rely on color alone for meaning
- Provide sufficient contrast
- Test with screen readers
- Support keyboard navigation

### Naming Conventions

- Use descriptive IDs: `sunset-theme`, not `theme1`
- Version your themes: `"1.0"`, `"1.1"`, etc.
- Document color meanings in description

---

## Troubleshooting

### Theme not applying

1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Check browser console for errors
3. Verify theme YAML syntax
4. Ensure theme ID is unique

### Colors look wrong

- Check color format (hex, rgb, rgba)
- Verify CSS variable names
- Test in different browsers
- Check for CSS specificity conflicts

### Performance issues

- Reduce blur radius
- Simplify gradients
- Disable animations
- Use solid colors instead of gradients

### Theme not saving

- Check `~/.git2jira/themes/` permissions
- Verify YAML syntax
- Check backend logs
- Ensure disk space available

---

## Examples & Templates

### Dark Mode Template

```yaml
id: my-dark-theme
name: My Dark Theme
description: Custom dark theme
category: dark

colors:
  background: "#1a1a1a"
  surface: "#2d2d2d"
  text_primary: "#ffffff"
  text_secondary: "#cccccc"
  # ... add all required colors
```

### Light Mode Template

```yaml
id: my-light-theme
name: My Light Theme
description: Custom light theme
category: light

colors:
  background: "#ffffff"
  surface: "#f5f5f5"
  text_primary: "#000000"
  text_secondary: "#666666"
  # ... add all required colors
```

### Gradient Background Template

```yaml
colors:
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  surface: "rgba(255, 255, 255, 0.1)"
  glass_bg: "rgba(255, 255, 255, 0.1)"
  glass_border: "rgba(255, 255, 255, 0.2)"

effects:
  blur_radius: "10px"
```

---

## Community Themes

Share your themes with the community!

**Submit a theme:**
1. Create a gist on GitHub with your theme YAML
2. Open an issue on [git-2-jira-dev-pulse](https://github.com/rhpds/git-2-jira-dev-pulse/issues)
3. Tag it with `theme-submission`

**Popular community themes** (coming soon):
- Ocean Breeze
- Forest Night
- Corporate Blue
- Pastel Dreams

---

## FAQ

**Q: Can I have multiple themes installed?**
A: Yes! Install as many custom themes as you want. Only one is active at a time.

**Q: Do themes affect performance?**
A: Minimal impact. Complex gradients and blur effects may reduce FPS slightly.

**Q: Can themes modify functionality?**
A: No. Themes only affect visual appearance, not features or behavior.

**Q: Are themes synced across devices?**
A: Not currently. Themes are stored locally in `~/.git2jira/themes/`.

**Q: Can I edit built-in themes?**
A: Built-in themes can't be edited, but you can create a custom theme based on them.

**Q: What happens if I delete a theme that's active?**
A: The app will fall back to the "standard" theme.

---

## Support

**Issues & Bugs**: [GitHub Issues](https://github.com/rhpds/git-2-jira-dev-pulse/issues)
**Documentation**: [README.md](./README.md)
**Examples**: [Community Themes](https://github.com/rhpds/git-2-jira-dev-pulse/wiki/Community-Themes)

---

**Last Updated**: February 2026
**Theme System Version**: 1.0
