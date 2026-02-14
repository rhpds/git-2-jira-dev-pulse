"""Theme service for managing visual themes.

Supports both built-in themes and custom user-defined themes via YAML.
"""

from pathlib import Path
from typing import Dict, List, Optional
import yaml
from pydantic import BaseModel, Field


class ThemeColors(BaseModel):
    """Color palette for a theme."""
    # Base colors
    background: str
    surface: str
    foreground: str

    # Text colors
    text_primary: str
    text_secondary: str
    text_subtle: str
    text_on_dark: str

    # Brand colors
    primary: str
    secondary: str
    accent: str

    # Status colors
    success: str
    warning: str
    danger: str
    info: str

    # UI elements
    border: str
    divider: str
    hover: str
    active: str

    # Glassmorphic-specific (optional)
    glass_bg: Optional[str] = None
    glass_border: Optional[str] = None


class ThemeEffects(BaseModel):
    """Visual effects configuration."""
    blur_radius: str = "10px"
    shadow_sm: str = "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
    shadow_md: str = "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
    shadow_lg: str = "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
    shadow_xl: str = "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
    glow: Optional[str] = None  # For neon theme
    border_radius: str = "8px"
    border_radius_lg: str = "16px"


class ThemeTypography(BaseModel):
    """Typography configuration."""
    font_family: str = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    font_family_mono: str = "'SF Mono', Monaco, 'Courier New', monospace"
    font_size_base: str = "16px"
    font_size_sm: str = "14px"
    font_size_lg: str = "18px"
    font_size_xl: str = "24px"
    font_weight_normal: str = "400"
    font_weight_medium: str = "500"
    font_weight_bold: str = "700"


class ThemeGradients(BaseModel):
    """Gradient definitions."""
    primary: str = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    secondary: str = "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
    success: str = "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
    warning: str = "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
    danger: str = "linear-gradient(135deg, #ff0844 0%, #ffb199 100%)"


class ThemeDefinition(BaseModel):
    """Complete theme definition."""
    id: str
    name: str
    description: str
    category: str = "custom"  # "built-in" | "custom" | "dark" | "light"
    author: Optional[str] = None
    version: str = "1.0"

    colors: ThemeColors
    effects: ThemeEffects = Field(default_factory=ThemeEffects)
    typography: ThemeTypography = Field(default_factory=ThemeTypography)
    gradients: ThemeGradients = Field(default_factory=ThemeGradients)

    # Additional custom CSS variables
    custom_vars: Dict[str, str] = Field(default_factory=dict)

    # CSS overrides (full CSS string)
    custom_css: Optional[str] = None


class ThemeRegistry:
    """Registry for managing themes."""

    THEMES_DIR = Path.home() / ".git2jira" / "themes"

    def __init__(self):
        """Initialize theme registry."""
        self._themes: Dict[str, ThemeDefinition] = {}
        self._load_built_in_themes()
        self._load_custom_themes()

    def _load_built_in_themes(self) -> None:
        """Load built-in themes."""
        # Standard theme (default PatternFly)
        self._themes["standard"] = ThemeDefinition(
            id="standard",
            name="Standard",
            description="Classic PatternFly design with solid cards",
            category="built-in",
            author="Git-2-Jira-Dev-Pulse",
            colors=ThemeColors(
                background="var(--pf-t--global--background--color--primary)",
                surface="var(--pf-t--global--background--color--secondary)",
                foreground="#ffffff",
                text_primary="var(--pf-t--global--text--color--regular)",
                text_secondary="var(--pf-t--global--text--color--secondary)",
                text_subtle="var(--pf-t--global--text--color--subtle)",
                text_on_dark="#ffffff",
                primary="var(--pf-t--global--color--brand--default)",
                secondary="#6a6e73",
                accent="#06c",
                success="var(--pf-t--global--color--status--success--default)",
                warning="var(--pf-t--global--color--status--warning--default)",
                danger="var(--pf-t--global--color--status--danger--default)",
                info="var(--pf-t--global--color--status--info--default)",
                border="var(--pf-t--global--border--color--default)",
                divider="var(--pf-t--global--border--color--default)",
                hover="rgba(0, 0, 0, 0.05)",
                active="rgba(0, 0, 0, 0.1)",
            )
        )

        # Glassmorphic theme
        self._themes["glassmorphic"] = ThemeDefinition(
            id="glassmorphic",
            name="Glassmorphic",
            description="Modern frosted glass effect with gradients and blur",
            category="built-in",
            author="Git-2-Jira-Dev-Pulse",
            colors=ThemeColors(
                background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                surface="rgba(255, 255, 255, 0.1)",
                foreground="#ffffff",
                text_primary="#ffffff",
                text_secondary="rgba(255, 255, 255, 0.8)",
                text_subtle="rgba(255, 255, 255, 0.6)",
                text_on_dark="#ffffff",
                primary="#667eea",
                secondary="#764ba2",
                accent="#4facfe",
                success="#00f2fe",
                warning="#fee140",
                danger="#ff0844",
                info="#4facfe",
                border="rgba(255, 255, 255, 0.2)",
                divider="rgba(255, 255, 255, 0.1)",
                hover="rgba(255, 255, 255, 0.15)",
                active="rgba(255, 255, 255, 0.25)",
                glass_bg="rgba(255, 255, 255, 0.1)",
                glass_border="rgba(255, 255, 255, 0.2)",
            ),
            effects=ThemeEffects(
                blur_radius="10px",
                shadow_lg="0 8px 32px 0 rgba(31, 38, 135, 0.37)",
                border_radius="16px",
                border_radius_lg="24px",
            )
        )

        # Standard Dark
        self._themes["standard-dark"] = ThemeDefinition(
            id="standard-dark",
            name="Standard Dark",
            description="Dark mode PatternFly design",
            category="dark",
            author="Git-2-Jira-Dev-Pulse",
            colors=ThemeColors(
                background="#0f1419",
                surface="#1c2128",
                foreground="#262c36",
                text_primary="#e6e8ea",
                text_secondary="#b8bdc4",
                text_subtle="#8b949e",
                text_on_dark="#ffffff",
                primary="#4a9eff",
                secondary="#8957e5",
                accent="#06c",
                success="#3fb950",
                warning="#d29922",
                danger="#f85149",
                info="#4a9eff",
                border="#30363d",
                divider="#21262d",
                hover="rgba(255, 255, 255, 0.05)",
                active="rgba(255, 255, 255, 0.1)",
            )
        )

        # Glassmorphic Dark
        self._themes["glassmorphic-dark"] = ThemeDefinition(
            id="glassmorphic-dark",
            name="Glassmorphic Dark",
            description="Dark frosted glass with deep background",
            category="dark",
            author="Git-2-Jira-Dev-Pulse",
            colors=ThemeColors(
                background="linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
                surface="rgba(255, 255, 255, 0.05)",
                foreground="rgba(255, 255, 255, 0.1)",
                text_primary="#ffffff",
                text_secondary="rgba(255, 255, 255, 0.7)",
                text_subtle="rgba(255, 255, 255, 0.5)",
                text_on_dark="#ffffff",
                primary="#6366f1",
                secondary="#8b5cf6",
                accent="#06b6d4",
                success="#10b981",
                warning="#f59e0b",
                danger="#ef4444",
                info="#06b6d4",
                border="rgba(255, 255, 255, 0.1)",
                divider="rgba(255, 255, 255, 0.05)",
                hover="rgba(255, 255, 255, 0.1)",
                active="rgba(255, 255, 255, 0.2)",
                glass_bg="rgba(255, 255, 255, 0.05)",
                glass_border="rgba(255, 255, 255, 0.1)",
            ),
            effects=ThemeEffects(
                blur_radius="16px",
                shadow_lg="0 8px 32px 0 rgba(0, 0, 0, 0.5)",
                border_radius="16px",
                border_radius_lg="24px",
            )
        )

        # High Contrast
        self._themes["high-contrast"] = ThemeDefinition(
            id="high-contrast",
            name="High Contrast",
            description="WCAG AAA compliant high-contrast theme",
            category="accessibility",
            author="Git-2-Jira-Dev-Pulse",
            colors=ThemeColors(
                background="#ffffff",
                surface="#f0f0f0",
                foreground="#e0e0e0",
                text_primary="#000000",
                text_secondary="#000000",
                text_subtle="#333333",
                text_on_dark="#ffffff",
                primary="#0000ee",
                secondary="#551a8b",
                accent="#0066cc",
                success="#008000",
                warning="#ff8c00",
                danger="#cc0000",
                info="#0000ee",
                border="#000000",
                divider="#666666",
                hover="#e0e0e0",
                active="#cccccc",
            ),
            effects=ThemeEffects(
                shadow_sm="0 0 0 1px #000000",
                shadow_md="0 0 0 2px #000000",
                shadow_lg="0 0 0 3px #000000",
                border_radius="4px",
                border_radius_lg="8px",
            )
        )

        # Minimalist
        self._themes["minimalist"] = ThemeDefinition(
            id="minimalist",
            name="Minimalist",
            description="Clean, zen-like design with maximum whitespace",
            category="light",
            author="Git-2-Jira-Dev-Pulse",
            colors=ThemeColors(
                background="#ffffff",
                surface="#fafafa",
                foreground="#f5f5f5",
                text_primary="#1a1a1a",
                text_secondary="#666666",
                text_subtle="#999999",
                text_on_dark="#ffffff",
                primary="#000000",
                secondary="#666666",
                accent="#333333",
                success="#2e7d32",
                warning="#ed6c02",
                danger="#d32f2f",
                info="#0288d1",
                border="#e0e0e0",
                divider="#eeeeee",
                hover="#f5f5f5",
                active="#e0e0e0",
            ),
            effects=ThemeEffects(
                shadow_sm="none",
                shadow_md="0 1px 3px rgba(0, 0, 0, 0.05)",
                shadow_lg="0 2px 6px rgba(0, 0, 0, 0.05)",
                border_radius="2px",
                border_radius_lg="4px",
            ),
            typography=ThemeTypography(
                font_family="'Inter', -apple-system, sans-serif",
                font_weight_normal="300",
                font_weight_medium="400",
                font_weight_bold="600",
            )
        )

        # Neon/Cyberpunk
        self._themes["neon"] = ThemeDefinition(
            id="neon",
            name="Neon Cyberpunk",
            description="Vibrant neon colors with glow effects",
            category="dark",
            author="Git-2-Jira-Dev-Pulse",
            colors=ThemeColors(
                background="#0a0e27",
                surface="#151934",
                foreground="#1e2440",
                text_primary="#00ffff",
                text_secondary="#ff00ff",
                text_subtle="#888888",
                text_on_dark="#00ffff",
                primary="#00ffff",
                secondary="#ff00ff",
                accent="#ffff00",
                success="#00ff00",
                warning="#ffaa00",
                danger="#ff0055",
                info="#00aaff",
                border="#00ffff",
                divider="rgba(0, 255, 255, 0.2)",
                hover="rgba(0, 255, 255, 0.1)",
                active="rgba(0, 255, 255, 0.2)",
            ),
            effects=ThemeEffects(
                glow="0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor",
                shadow_lg="0 0 20px rgba(0, 255, 255, 0.5)",
                border_radius="4px",
                border_radius_lg="8px",
            ),
            gradients=ThemeGradients(
                primary="linear-gradient(90deg, #00ffff 0%, #ff00ff 100%)",
                secondary="linear-gradient(90deg, #ff00ff 0%, #ffff00 100%)",
                success="linear-gradient(90deg, #00ff00 0%, #00ffff 100%)",
                warning="linear-gradient(90deg, #ffaa00 0%, #ff0055 100%)",
                danger="linear-gradient(90deg, #ff0055 0%, #ff00ff 100%)",
            )
        )

        # Neumorphic
        self._themes["neumorphic"] = ThemeDefinition(
            id="neumorphic",
            name="Neumorphic",
            description="Soft UI with subtle depth and shadows",
            category="light",
            author="Git-2-Jira-Dev-Pulse",
            colors=ThemeColors(
                background="#e0e5ec",
                surface="#e0e5ec",
                foreground="#e0e5ec",
                text_primary="#4a5568",
                text_secondary="#718096",
                text_subtle="#a0aec0",
                text_on_dark="#ffffff",
                primary="#5a67d8",
                secondary="#667eea",
                accent="#4299e1",
                success="#48bb78",
                warning="#ed8936",
                danger="#f56565",
                info="#4299e1",
                border="transparent",
                divider="rgba(0, 0, 0, 0.05)",
                hover="#d1d5db",
                active="#c2c7cf",
            ),
            effects=ThemeEffects(
                shadow_sm="3px 3px 6px #b8bec5, -3px -3px 6px #ffffff",
                shadow_md="6px 6px 12px #b8bec5, -6px -6px 12px #ffffff",
                shadow_lg="10px 10px 20px #b8bec5, -10px -10px 20px #ffffff",
                border_radius="16px",
                border_radius_lg="24px",
            )
        )

        # Material Design
        self._themes["material"] = ThemeDefinition(
            id="material",
            name="Material Design",
            description="Google Material Design 3 theme",
            category="light",
            author="Git-2-Jira-Dev-Pulse",
            colors=ThemeColors(
                background="#fefbff",
                surface="#fef7ff",
                foreground="#ffffff",
                text_primary="#1c1b1f",
                text_secondary="#49454f",
                text_subtle="#79747e",
                text_on_dark="#ffffff",
                primary="#6750a4",
                secondary="#625b71",
                accent="#7d5260",
                success="#006e1c",
                warning="#8c5000",
                danger="#ba1a1a",
                info="#006874",
                border="#79747e",
                divider="#e7e0ec",
                hover="#f6edff",
                active="#e8def8",
            ),
            effects=ThemeEffects(
                shadow_sm="0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)",
                shadow_md="0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15)",
                shadow_lg="0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.3)",
                border_radius="12px",
                border_radius_lg="28px",
            ),
            typography=ThemeTypography(
                font_family="'Roboto', sans-serif",
            )
        )

        # Retro Terminal
        self._themes["retro-terminal"] = ThemeDefinition(
            id="retro-terminal",
            name="Retro Terminal",
            description="Classic terminal green-on-black aesthetic",
            category="dark",
            author="Git-2-Jira-Dev-Pulse",
            colors=ThemeColors(
                background="#0c0c0c",
                surface="#1a1a1a",
                foreground="#262626",
                text_primary="#33ff33",
                text_secondary="#00cc00",
                text_subtle="#008800",
                text_on_dark="#33ff33",
                primary="#33ff33",
                secondary="#00cc00",
                accent="#00ff00",
                success="#00ff00",
                warning="#ffff00",
                danger="#ff3333",
                info="#00ffff",
                border="#33ff33",
                divider="rgba(51, 255, 51, 0.2)",
                hover="rgba(51, 255, 51, 0.1)",
                active="rgba(51, 255, 51, 0.2)",
            ),
            effects=ThemeEffects(
                glow="0 0 5px #33ff33, 0 0 10px #33ff33",
                shadow_lg="0 0 10px rgba(51, 255, 51, 0.5)",
                border_radius="0px",
                border_radius_lg="0px",
            ),
            typography=ThemeTypography(
                font_family="'Courier New', 'Courier', monospace",
                font_family_mono="'Courier New', 'Courier', monospace",
            ),
            custom_css="""
                /* CRT scanline effect */
                body::after {
                    content: "";
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: repeating-linear-gradient(
                        0deg,
                        rgba(0, 0, 0, 0.15),
                        rgba(0, 0, 0, 0.15) 1px,
                        transparent 1px,
                        transparent 2px
                    );
                    pointer-events: none;
                    z-index: 9999;
                }
            """
        )

    def _load_custom_themes(self) -> None:
        """Load custom themes from ~/.git2jira/themes/."""
        if not self.THEMES_DIR.exists():
            return

        for theme_file in self.THEMES_DIR.glob("*.yaml"):
            try:
                with open(theme_file, "r") as f:
                    data = yaml.safe_load(f)
                theme = ThemeDefinition(**data)
                self._themes[theme.id] = theme
            except Exception as e:
                print(f"Error loading custom theme {theme_file}: {e}")

    def get_theme(self, theme_id: str) -> Optional[ThemeDefinition]:
        """Get theme by ID.

        Args:
            theme_id: Theme identifier

        Returns:
            ThemeDefinition or None if not found
        """
        return self._themes.get(theme_id)

    def list_themes(self, category: Optional[str] = None) -> List[ThemeDefinition]:
        """List all themes, optionally filtered by category.

        Args:
            category: Optional category filter

        Returns:
            List of ThemeDefinition objects
        """
        themes = list(self._themes.values())
        if category:
            themes = [t for t in themes if t.category == category]
        return themes

    def install_custom_theme(self, theme_data: Dict) -> ThemeDefinition:
        """Install a custom theme from YAML data.

        Args:
            theme_data: Theme definition as dictionary

        Returns:
            Installed ThemeDefinition
        """
        theme = ThemeDefinition(**theme_data)

        # Save to themes directory
        self.THEMES_DIR.mkdir(parents=True, exist_ok=True)
        theme_file = self.THEMES_DIR / f"{theme.id}.yaml"

        with open(theme_file, "w") as f:
            yaml.dump(theme.model_dump(mode="json"), f, default_flow_style=False)

        # Add to registry
        self._themes[theme.id] = theme

        return theme

    def delete_custom_theme(self, theme_id: str) -> bool:
        """Delete a custom theme.

        Args:
            theme_id: Theme identifier

        Returns:
            True if deleted, False if not found or is built-in
        """
        theme = self.get_theme(theme_id)
        if not theme or theme.category == "built-in":
            return False

        # Remove file
        theme_file = self.THEMES_DIR / f"{theme_id}.yaml"
        if theme_file.exists():
            theme_file.unlink()

        # Remove from registry
        del self._themes[theme_id]

        return True


# Global theme registry instance
_theme_registry: Optional[ThemeRegistry] = None


def get_theme_registry() -> ThemeRegistry:
    """Get global theme registry instance.

    Returns:
        ThemeRegistry singleton
    """
    global _theme_registry
    if _theme_registry is None:
        _theme_registry = ThemeRegistry()
    return _theme_registry
