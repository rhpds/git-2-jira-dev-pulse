"""Configuration management API endpoints."""

import os
import stat
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.config_service import (
    get_config_service,
    Git2JiraConfig,
    ScanDirectory,
    UIPreferences,
    JiraProject,
    JiraConfig,
)
from ..services.jira_client import JiraClient
from ..services.watcher_service import get_watcher_service
from ..logging_config import get_logger

router = APIRouter(prefix="/api/config", tags=["config"])
logger = get_logger(__name__)


class AddScanDirectoryRequest(BaseModel):
    """Request body for adding a scan directory."""
    scan_directory: ScanDirectory


class RemoveScanDirectoryRequest(BaseModel):
    """Request body for removing a scan directory."""
    path: str


class UpdateUIPreferencesRequest(BaseModel):
    """Request body for updating UI preferences."""
    preferences: UIPreferences


class MigrateResponse(BaseModel):
    """Response for migration operation."""
    success: bool
    config: Git2JiraConfig
    backup_path: str


@router.get("/")
async def get_config() -> Git2JiraConfig:
    """Get current configuration.

    Returns:
        Current Git2JiraConfig
    """
    config_service = get_config_service()
    return config_service.get_config()


@router.post("/scan-directories")
async def add_scan_directory(request: AddScanDirectoryRequest) -> Git2JiraConfig:
    """Add a new scan directory.

    Args:
        request: Request containing scan directory configuration

    Returns:
        Updated configuration
    """
    config_service = get_config_service()
    return config_service.add_scan_directory(request.scan_directory)


@router.delete("/scan-directories")
async def remove_scan_directory(request: RemoveScanDirectoryRequest) -> Git2JiraConfig:
    """Remove a scan directory.

    Args:
        request: Request containing path to remove

    Returns:
        Updated configuration
    """
    config_service = get_config_service()
    return config_service.remove_scan_directory(request.path)


@router.put("/ui-preferences")
async def update_ui_preferences(request: UpdateUIPreferencesRequest) -> Git2JiraConfig:
    """Update UI preferences.

    Args:
        request: Request containing new UI preferences

    Returns:
        Updated configuration
    """
    config_service = get_config_service()
    return config_service.update_ui_preferences(request.preferences)


@router.post("/migrate-from-env")
async def migrate_from_env() -> MigrateResponse:
    """Migrate configuration from legacy .rh-jira-mcp.env file.

    Returns:
        Migration response with new config and backup path

    Raises:
        HTTPException: If legacy env file not found
    """
    config_service = get_config_service()

    try:
        config = config_service.migrate_from_env()
        return MigrateResponse(
            success=True,
            config=config,
            backup_path=str(config_service.LEGACY_ENV_PATH.with_suffix(".env.backup"))
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/directory-tree")
async def get_directory_tree(path: str, max_depth: int = 2) -> Dict[str, Any]:
    """List subdirectories and detect git repos for a given path.

    Args:
        path: Directory path to inspect
        max_depth: Maximum depth to traverse (default 2)

    Returns:
        Tree structure of subdirectories with git repo detection
    """
    expanded = Path(os.path.expanduser(os.path.expandvars(path))).resolve()
    if not expanded.is_dir():
        raise HTTPException(status_code=404, detail=f"Directory not found: {path}")

    skip = {"node_modules", ".venv", ".git", "__pycache__", ".pytest_cache", ".tox", "venv", ".mypy_cache"}

    def scan_tree(dir_path: Path, depth: int) -> List[Dict[str, Any]]:
        if depth >= max_depth:
            return []
        children = []
        try:
            for child in sorted(dir_path.iterdir()):
                if not child.is_dir() or child.name.startswith(".") or child.name in skip:
                    continue
                is_git = (child / ".git").exists()
                entry: Dict[str, Any] = {
                    "name": child.name,
                    "path": str(child),
                    "is_git_repo": is_git,
                }
                if not is_git:
                    entry["children"] = scan_tree(child, depth + 1)
                else:
                    entry["children"] = []
                children.append(entry)
        except (PermissionError, OSError):
            pass
        return children

    return {
        "path": str(expanded),
        "children": scan_tree(expanded, 0),
    }


@router.post("/auto-discovery/toggle")
async def toggle_auto_discovery(enabled: bool) -> Git2JiraConfig:
    """Enable or disable auto-discovery.

    Args:
        enabled: Whether to enable auto-discovery

    Returns:
        Updated configuration
    """
    config_service = get_config_service()
    config = config_service.get_config(force_reload=True)  # Force reload to get latest
    config.auto_discovery.enabled = enabled
    config_service.save_config(config)
    return config


@router.get("/scan-paths")
async def get_scan_paths() -> Dict[str, Any]:
    """Get all enabled scan directory paths.

    Returns:
        Dictionary with scan paths and metadata
    """
    config_service = get_config_service()
    paths = config_service.get_all_scan_paths()

    return {
        "scan_paths": [str(p) for p in paths],
        "count": len(paths)
    }


@router.post("/auto-discovery/start")
async def start_auto_discovery() -> Dict[str, Any]:
    """Start the auto-discovery watcher service.

    Returns:
        Status information
    """
    watcher = get_watcher_service()
    await watcher.start()

    return watcher.get_status()


@router.post("/auto-discovery/stop")
async def stop_auto_discovery() -> Dict[str, Any]:
    """Stop the auto-discovery watcher service.

    Returns:
        Status information
    """
    watcher = get_watcher_service()
    await watcher.stop()

    return watcher.get_status()


@router.get("/auto-discovery/status")
async def get_auto_discovery_status() -> Dict[str, Any]:
    """Get auto-discovery service status.

    Returns:
        Status information including running state, watch paths, discovered count
    """
    watcher = get_watcher_service()
    return watcher.get_status()


@router.post("/auto-discovery/discover")
async def trigger_manual_discovery() -> Dict[str, Any]:
    """Manually trigger a discovery scan.

    Returns:
        Discovery results
    """
    watcher = get_watcher_service()

    if not watcher.running:
        # Start temporarily for manual scan
        await watcher.start()
        await watcher._perform_full_scan()
        await watcher.stop()
    else:
        # Just trigger scan if already running
        await watcher._perform_full_scan()

    return {
        "success": True,
        "discovered_count": len(watcher.handler.processed_paths) if watcher.handler else 0
    }


# ============================================
# Jira Configuration Endpoints
# ============================================

class AddJiraProjectRequest(BaseModel):
    """Request body for adding a Jira project."""
    project: JiraProject


class UpdateJiraProjectRequest(BaseModel):
    """Request body for updating a Jira project."""
    project_key: str
    project: JiraProject


class RemoveJiraProjectRequest(BaseModel):
    """Request body for removing a Jira project."""
    project_key: str


class UpdateJiraConfigRequest(BaseModel):
    """Request body for updating Jira configuration."""
    jira_config: JiraConfig


@router.get("/jira")
async def get_jira_config() -> JiraConfig:
    """Get Jira configuration.

    Returns:
        Current JiraConfig
    """
    config_service = get_config_service()
    config = config_service.get_config()
    return config.jira


@router.put("/jira")
async def update_jira_config(request: UpdateJiraConfigRequest) -> Git2JiraConfig:
    """Update Jira configuration.

    Args:
        request: Request containing new Jira configuration

    Returns:
        Updated full configuration
    """
    config_service = get_config_service()
    config = config_service.get_config(force_reload=True)
    config.jira = request.jira_config
    config_service.save_config(config)
    return config


@router.post("/jira/projects")
async def add_jira_project(request: AddJiraProjectRequest) -> Git2JiraConfig:
    """Add a new Jira project.

    Args:
        request: Request containing Jira project configuration

    Returns:
        Updated configuration
    """
    config_service = get_config_service()
    config = config_service.get_config(force_reload=True)

    # Check if project already exists
    existing = [p for p in config.jira.projects if p.key == request.project.key]
    if existing:
        raise HTTPException(status_code=400, detail=f"Project {request.project.key} already exists")

    config.jira.projects.append(request.project)
    config_service.save_config(config)

    logger.info(f"Added Jira project: {request.project.key}")
    return config


@router.put("/jira/projects/{project_key}")
async def update_jira_project(project_key: str, request: UpdateJiraProjectRequest) -> Git2JiraConfig:
    """Update an existing Jira project.

    Args:
        project_key: The project key to update
        request: Request containing updated project configuration

    Returns:
        Updated configuration
    """
    config_service = get_config_service()
    config = config_service.get_config(force_reload=True)

    # Find and update project
    for i, project in enumerate(config.jira.projects):
        if project.key == project_key:
            config.jira.projects[i] = request.project
            config_service.save_config(config)
            logger.info(f"Updated Jira project: {project_key}")
            return config

    raise HTTPException(status_code=404, detail=f"Project {project_key} not found")


@router.delete("/jira/projects/{project_key}")
async def remove_jira_project(project_key: str) -> Git2JiraConfig:
    """Remove a Jira project.

    Args:
        project_key: The project key to remove

    Returns:
        Updated configuration
    """
    config_service = get_config_service()
    config = config_service.get_config(force_reload=True)

    # Remove project
    original_count = len(config.jira.projects)
    config.jira.projects = [p for p in config.jira.projects if p.key != project_key]

    if len(config.jira.projects) == original_count:
        raise HTTPException(status_code=404, detail=f"Project {project_key} not found")

    config_service.save_config(config)
    logger.info(f"Removed Jira project: {project_key}")
    return config


@router.post("/jira/projects/{project_key}/set-default")
async def set_default_jira_project(project_key: str) -> Git2JiraConfig:
    """Set a project as the default for new tickets.

    Args:
        project_key: The project key to set as default

    Returns:
        Updated configuration
    """
    config_service = get_config_service()
    config = config_service.get_config(force_reload=True)

    # Reset all defaults and set the specified project as default
    found = False
    for project in config.jira.projects:
        if project.key == project_key:
            project.default = True
            found = True
        else:
            project.default = False

    if not found:
        raise HTTPException(status_code=404, detail=f"Project {project_key} not found")

    config_service.save_config(config)
    logger.info(f"Set default Jira project: {project_key}")
    return config


# ============================================
# Jira Credentials Endpoints
# ============================================

CREDENTIALS_FILE = Path.home() / ".rh-jira-mcp.env"


class JiraCredentials(BaseModel):
    """Jira connection credentials."""
    jira_url: str  # JIRA_BASE_URL — e.g. https://issues.redhat.com
    jira_api_url: str = ""  # JIRA_API_URL — e.g. https://issues.redhat.com/rest/api/2/
    jira_api_token: str
    jira_email: str = ""


class JiraCredentialsResponse(BaseModel):
    """Response with masked credentials."""
    jira_url: str
    jira_api_url: str
    jira_api_token_masked: str
    jira_email: str
    has_token: bool


class JiraTestResult(BaseModel):
    """Result of a Jira connection test."""
    connected: bool
    user: str = ""
    email: str = ""
    server: str = ""
    error: str = ""


def _mask_token(token: str) -> str:
    """Mask a token, showing only first 4 and last 4 characters."""
    if not token or len(token) <= 12:
        return "*" * len(token) if token else ""
    return token[:4] + "*" * (len(token) - 8) + token[-4:]


def _read_credentials() -> Dict[str, str]:
    """Read credentials from the env file."""
    creds: Dict[str, str] = {}
    if CREDENTIALS_FILE.exists():
        with open(CREDENTIALS_FILE, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    creds[key.strip()] = value.strip().strip('"').strip("'")
    return creds


def _derive_api_url(base_url: str) -> str:
    """Derive JIRA_API_URL from JIRA_BASE_URL by appending /rest/api/2/."""
    base = base_url.rstrip("/")
    return f"{base}/rest/api/2/"


def _write_credentials(creds: Dict[str, str]) -> None:
    """Write credentials to the env file with restricted permissions."""
    lines = []
    lines.append("# Git-2-Jira credentials")
    lines.append(f'JIRA_URL="{creds.get("JIRA_URL", "")}"')
    lines.append(f'JIRA_API_URL="{creds.get("JIRA_API_URL", "")}"')
    lines.append(f'JIRA_API_TOKEN="{creds.get("JIRA_API_TOKEN", "")}"')
    lines.append(f'JIRA_EMAIL="{creds.get("JIRA_EMAIL", "")}"')
    # Preserve any additional keys
    reserved = {"JIRA_URL", "JIRA_API_URL", "JIRA_API_TOKEN", "JIRA_EMAIL"}
    for key, value in creds.items():
        if key not in reserved:
            lines.append(f'{key}="{value}"')

    with open(CREDENTIALS_FILE, "w") as f:
        f.write("\n".join(lines) + "\n")

    # Set file permissions to owner-only read/write (600)
    os.chmod(CREDENTIALS_FILE, stat.S_IRUSR | stat.S_IWUSR)


@router.get("/jira/credentials", response_model=JiraCredentialsResponse)
async def get_jira_credentials() -> JiraCredentialsResponse:
    """Get current Jira credentials (token masked).

    Returns:
        Credentials with masked token
    """
    creds = _read_credentials()
    token = creds.get("JIRA_API_TOKEN", "")
    base_url = creds.get("JIRA_URL", "")
    api_url = creds.get("JIRA_API_URL", "")
    # Auto-derive API URL from base URL if not explicitly set
    if not api_url and base_url:
        api_url = _derive_api_url(base_url)
    return JiraCredentialsResponse(
        jira_url=base_url,
        jira_api_url=api_url,
        jira_api_token_masked=_mask_token(token),
        jira_email=creds.get("JIRA_EMAIL", ""),
        has_token=bool(token),
    )


@router.put("/jira/credentials")
async def save_jira_credentials(credentials: JiraCredentials) -> Dict[str, Any]:
    """Save Jira credentials and test connection.

    The token is stored in ~/.rh-jira-mcp.env with owner-only permissions (600).
    After saving, a connection test is automatically run.

    Args:
        credentials: Jira URL, API token, and email

    Returns:
        Save result including connection test
    """
    # Read existing credentials to preserve extra keys
    existing = _read_credentials()

    # Update with new values
    existing["JIRA_URL"] = credentials.jira_url.rstrip("/")
    existing["JIRA_EMAIL"] = credentials.jira_email

    # Handle JIRA_API_URL: save explicit value or auto-derive from base URL
    if credentials.jira_api_url:
        existing["JIRA_API_URL"] = credentials.jira_api_url.rstrip("/") + "/"
    else:
        existing["JIRA_API_URL"] = _derive_api_url(existing["JIRA_URL"])

    # Only update token if a new one is provided (not masked)
    if credentials.jira_api_token and "*" not in credentials.jira_api_token:
        existing["JIRA_API_TOKEN"] = credentials.jira_api_token

    _write_credentials(existing)
    logger.info("Jira credentials saved")

    # Update runtime settings so the app uses new creds immediately
    from ..config import settings
    settings.jira_url = existing["JIRA_URL"]
    settings.jira_api_url = existing["JIRA_API_URL"]
    if "JIRA_API_TOKEN" in existing and existing["JIRA_API_TOKEN"]:
        settings.jira_api_token = existing["JIRA_API_TOKEN"]

    # Auto-test connection
    test_result = _test_jira_connection(
        existing["JIRA_URL"],
        existing.get("JIRA_API_TOKEN", ""),
    )

    return {
        "saved": True,
        "credentials": JiraCredentialsResponse(
            jira_url=existing["JIRA_URL"],
            jira_api_url=existing.get("JIRA_API_URL", ""),
            jira_api_token_masked=_mask_token(existing.get("JIRA_API_TOKEN", "")),
            jira_email=existing.get("JIRA_EMAIL", ""),
            has_token=bool(existing.get("JIRA_API_TOKEN")),
        ).model_dump(),
        "test_result": test_result,
    }


@router.post("/jira/test-connection", response_model=JiraTestResult)
async def test_jira_connection(
    credentials: Optional[JiraCredentials] = None,
) -> JiraTestResult:
    """Test Jira connection with provided or saved credentials.

    Args:
        credentials: Optional credentials to test. If not provided, uses saved creds.

    Returns:
        Connection test result
    """
    if credentials:
        url = credentials.jira_url.rstrip("/")
        token = credentials.jira_api_token
        # If token is masked, use saved token
        if "*" in token:
            saved = _read_credentials()
            token = saved.get("JIRA_API_TOKEN", "")
    else:
        saved = _read_credentials()
        url = saved.get("JIRA_URL", "")
        token = saved.get("JIRA_API_TOKEN", "")

    result = _test_jira_connection(url, token)
    return JiraTestResult(**result)


def _test_jira_connection(url: str, token: str) -> Dict[str, Any]:
    """Perform the actual Jira connection test."""
    if not url or not token:
        return {
            "connected": False,
            "error": "Jira URL and API token are required",
            "server": url,
        }
    try:
        client = JiraClient(server=url, token=token)
        return client.check_connection()
    except Exception as e:
        return {
            "connected": False,
            "error": str(e),
            "server": url,
        }
