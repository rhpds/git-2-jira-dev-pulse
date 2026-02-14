"""Configuration management API endpoints."""

from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.config_service import (
    get_config_service,
    Git2JiraConfig,
    ScanDirectory,
    UIPreferences,
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
