"""Theme management API routes."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel

from ..services.theme_service import (
    get_theme_registry,
    ThemeDefinition,
)

router = APIRouter(prefix="/api/themes", tags=["themes"])


class ThemeSummary(BaseModel):
    """Summary of a theme for listing."""
    id: str
    name: str
    description: str
    category: str
    author: Optional[str] = None


@router.get("/", response_model=List[ThemeSummary])
async def list_themes(category: Optional[str] = None):
    """List all available themes.

    Args:
        category: Optional category filter (built-in, custom, dark, light, accessibility)

    Returns:
        List of theme summaries
    """
    registry = get_theme_registry()
    themes = registry.list_themes(category=category)

    return [
        ThemeSummary(
            id=theme.id,
            name=theme.name,
            description=theme.description,
            category=theme.category,
            author=theme.author,
        )
        for theme in themes
    ]


@router.get("/{theme_id}", response_model=ThemeDefinition)
async def get_theme(theme_id: str):
    """Get full theme definition.

    Args:
        theme_id: Theme identifier

    Returns:
        Complete theme definition

    Raises:
        404: Theme not found
    """
    registry = get_theme_registry()
    theme = registry.get_theme(theme_id)

    if not theme:
        raise HTTPException(status_code=404, detail=f"Theme '{theme_id}' not found")

    return theme


@router.post("/install", response_model=ThemeDefinition)
async def install_custom_theme(theme_data: dict = Body(...)):
    """Install a custom theme from YAML definition.

    Args:
        theme_data: Theme definition as JSON

    Returns:
        Installed theme definition

    Raises:
        400: Invalid theme data
    """
    try:
        registry = get_theme_registry()
        theme = registry.install_custom_theme(theme_data)
        return theme
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid theme data: {str(e)}")


@router.delete("/{theme_id}")
async def delete_custom_theme(theme_id: str):
    """Delete a custom theme.

    Args:
        theme_id: Theme identifier

    Returns:
        Success status

    Raises:
        404: Theme not found or is built-in
    """
    registry = get_theme_registry()
    success = registry.delete_custom_theme(theme_id)

    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Theme '{theme_id}' not found or cannot be deleted (built-in theme)"
        )

    return {"success": True, "message": f"Theme '{theme_id}' deleted"}


@router.get("/{theme_id}/css")
async def get_theme_css(theme_id: str):
    """Get CSS for a theme.

    Args:
        theme_id: Theme identifier

    Returns:
        CSS string with theme variables

    Raises:
        404: Theme not found
    """
    registry = get_theme_registry()
    theme = registry.get_theme(theme_id)

    if not theme:
        raise HTTPException(status_code=404, detail=f"Theme '{theme_id}' not found")

    # Generate CSS variables from theme definition
    # Map theme colors to PatternFly variables
    css_vars = []
    colors = theme.colors.model_dump()

    def _is_self_ref(var_name: str, value: str) -> bool:
        """Skip self-referential declarations that create circular CSS references."""
        return value.strip() == f"var({var_name})"

    # PatternFly global color overrides
    pf_mappings = [
        ("background", "--pf-t--global--background--color--primary"),
        ("text_primary", "--pf-t--global--text--color--regular"),
        ("text_secondary", "--pf-t--global--text--color--secondary"),
        ("text_subtle", "--pf-t--global--text--color--subtle"),
        ("text_on_dark", "--pf-t--global--text--color--on-dark"),
        ("primary", "--pf-t--global--color--brand--default"),
        ("success", "--pf-t--global--color--status--success--default"),
        ("warning", "--pf-t--global--color--status--warning--default"),
        ("danger", "--pf-t--global--color--status--danger--default"),
        ("info", "--pf-t--global--color--status--info--default"),
        ("border", "--pf-t--global--border--color--default"),
    ]

    for color_key, css_var in pf_mappings:
        value = colors.get(color_key)
        if value and not _is_self_ref(css_var, value):
            css_vars.append(f"  {css_var}: {value};")

    if colors.get("surface"):
        surface = colors["surface"]
        if not _is_self_ref("--pf-t--global--background--color--secondary", surface):
            css_vars.append(f"  --pf-t--global--background--color--secondary: {surface};")
        css_vars.append(f"  --pf-v6-c-card--BackgroundColor: {surface};")

    # Custom theme variables (for custom components)
    for key, value in colors.items():
        if value:
            css_vars.append(f"  --theme-color-{key.replace('_', '-')}: {value};")

    # Effects
    effects = theme.effects.model_dump()
    for key, value in effects.items():
        if value:
            css_vars.append(f"  --theme-effect-{key.replace('_', '-')}: {value};")

    # Typography
    typography = theme.typography.model_dump()
    if typography.get("font_family"):
        css_vars.append(f"  --pf-t--global--font--family--body: {typography['font_family']};")
    if typography.get("font_family_mono"):
        css_vars.append(f"  --pf-t--global--font--family--monospace: {typography['font_family_mono']};")

    for key, value in typography.items():
        if value:
            css_vars.append(f"  --theme-font-{key.replace('_', '-')}: {value};")

    # Gradients
    for key, value in theme.gradients.model_dump().items():
        if value:
            css_vars.append(f"  --theme-gradient-{key}: {value};")

    # Custom vars
    for key, value in theme.custom_vars.items():
        css_vars.append(f"  --theme-{key}: {value};")

    # Combine into CSS
    css = f"""/* Theme: {theme.name} */
/* {theme.description} */

:root[data-theme="{theme.id}"] {{
{chr(10).join(css_vars)}
}}
"""

    # Add special styling for gradient/glassmorphic backgrounds
    if colors.get("background") and ("gradient" in colors["background"] or "rgba" in str(colors.get("glass_bg", ""))):
        css += f"""
/* Gradient/Glassmorphic background styling */
[data-theme="{theme.id}"] .pf-v6-c-page {{
  background: {colors['background']} !important;
}}

[data-theme="{theme.id}"] .pf-v6-c-card {{
  background: {colors.get('surface', colors['background'])} !important;
  backdrop-filter: blur({effects.get('blur_radius', '10px')}) !important;
  border: 1px solid {colors.get('border', 'rgba(255, 255, 255, 0.2)')} !important;
}}
"""

    # Add custom CSS if present
    if theme.custom_css:
        css += f"\n{theme.custom_css}\n"

    return {"css": css}
