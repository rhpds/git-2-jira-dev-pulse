"""Configuration management API endpoints."""

from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.config_service import (
    get_config_service,
    Git2JiraConfig,
    ScanDirectory,
    UIPreferences,
    JiraProject,
    JiraBoard,
    JiraConfig,
)
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
    """Migrate configuration from legacy .git2jira.env file.

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
