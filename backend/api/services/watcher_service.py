"""File system watcher service for auto-discovering git repositories."""

import asyncio
import threading
import time
from pathlib import Path
from typing import Optional, Set, Callable
from datetime import datetime

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent

from .config_service import get_config_service
from ..logging_config import get_logger

logger = get_logger(__name__)


class GitRepoHandler(FileSystemEventHandler):
    """Handler for file system events that tracks git repository creation."""

    def __init__(self, callback: Callable[[Path], None]):
        """Initialize handler.

        Args:
            callback: Function to call when a new repo is discovered
        """
        super().__init__()
        self.callback = callback
        self.processed_paths: Set[Path] = set()
        self.debounce_time = 2.0  # Wait 2 seconds before processing
        self.pending_checks: dict[Path, float] = {}

    def on_created(self, event: FileSystemEvent) -> None:
        """Handle directory creation events.

        Args:
            event: File system event
        """
        if event.is_directory:
            path = Path(event.src_path)

            # Check if this is a .git directory
            if path.name == ".git":
                repo_path = path.parent
                self._schedule_check(repo_path)
            # Or if a directory was created that might contain repos
            else:
                self._schedule_check(path)

    def on_moved(self, event: FileSystemEvent) -> None:
        """Handle directory move events.

        Args:
            event: File system event
        """
        if event.is_directory:
            dest_path = Path(event.dest_path)
            self._schedule_check(dest_path)

    def _schedule_check(self, path: Path) -> None:
        """Schedule a check for new repos (with debouncing).

        Args:
            path: Path to check
        """
        self.pending_checks[path] = time.time()

    def process_pending_checks(self) -> None:
        """Process pending checks (called periodically)."""
        current_time = time.time()
        to_process = []

        # Find checks that have waited long enough
        for path, scheduled_time in list(self.pending_checks.items()):
            if current_time - scheduled_time >= self.debounce_time:
                to_process.append(path)
                del self.pending_checks[path]

        # Process the checks
        for path in to_process:
            self._check_for_repo(path)

    def _check_for_repo(self, path: Path) -> None:
        """Check if path is a new git repository.

        Args:
            path: Path to check
        """
        if path in self.processed_paths:
            return

        try:
            # Check if it's a git repo
            git_dir = path / ".git"
            if git_dir.exists() and git_dir.is_dir():
                logger.info(f"Discovered new git repository: {path}")
                self.callback(path)
                self.processed_paths.add(path)
        except (PermissionError, OSError) as e:
            logger.debug(f"Error checking path {path}: {e}")


class WatcherService:
    """Background service for watching directories and auto-discovering repos."""

    def __init__(self):
        """Initialize watcher service."""
        self.config_service = get_config_service()
        self.observer: Optional[Observer] = None
        self.running = False
        self.discovery_callbacks: list[Callable[[Path], None]] = []
        self.handler: Optional[GitRepoHandler] = None
        self._lock = threading.Lock()
        self._periodic_task: Optional[asyncio.Task] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def add_discovery_callback(self, callback: Callable[[Path], None]) -> None:
        """Add a callback to be called when a new repo is discovered.

        Args:
            callback: Function that takes a Path and returns None
        """
        self.discovery_callbacks.append(callback)

    def _on_repo_discovered(self, repo_path: Path) -> None:
        """Handle discovery of a new repository.

        Args:
            repo_path: Path to discovered repository
        """
        logger.info(f"New repository discovered: {repo_path}")

        # Call all registered callbacks
        for callback in self.discovery_callbacks:
            try:
                callback(repo_path)
            except Exception as e:
                logger.error(f"Error in discovery callback: {e}", exc_info=True)

    async def start(self) -> None:
        """Start the watcher service."""
        with self._lock:
            if self.running:
                logger.warning("Watcher service already running")
                return

            config = self.config_service.get_config(force_reload=True)

            if not config.auto_discovery.enabled:
                logger.info("Auto-discovery is disabled")
                return

            if not config.auto_discovery.watch_paths:
                logger.warning("No watch paths configured")
                return

            logger.info("Starting file system watcher service")

            # Create handler
            self.handler = GitRepoHandler(callback=self._on_repo_discovered)

            # Create observer
            self.observer = Observer()

            # Add watches for configured paths
            watch_count = 0
            for watch_path in config.auto_discovery.watch_paths:
                path = Path(watch_path)
                if path.exists() and path.is_dir():
                    try:
                        self.observer.schedule(
                            self.handler,
                            str(path),
                            recursive=True
                        )
                        watch_count += 1
                        logger.info(f"Watching: {path}")
                    except Exception as e:
                        logger.error(f"Failed to watch {path}: {e}")
                else:
                    logger.warning(f"Watch path does not exist: {path}")

            if watch_count == 0:
                logger.warning("No valid watch paths found")
                return

            # Start observer
            self.observer.start()
            self.running = True

            # Store event loop reference
            self._loop = asyncio.get_event_loop()

            # Start periodic check task
            self._periodic_task = asyncio.create_task(self._periodic_scan())

            logger.info(f"Watcher service started (watching {watch_count} paths)")

    async def stop(self) -> None:
        """Stop the watcher service."""
        with self._lock:
            if not self.running:
                return

            logger.info("Stopping file system watcher service")

            # Cancel periodic task
            if self._periodic_task:
                self._periodic_task.cancel()
                try:
                    await self._periodic_task
                except asyncio.CancelledError:
                    pass
                self._periodic_task = None

            # Stop observer
            if self.observer:
                self.observer.stop()
                self.observer.join(timeout=5)
                self.observer = None

            self.running = False
            self.handler = None
            logger.info("Watcher service stopped")

    async def _periodic_scan(self) -> None:
        """Periodic task to process pending checks and perform full scans."""
        config = self.config_service.get_config()
        scan_interval = config.auto_discovery.scan_interval_seconds

        while self.running:
            try:
                # Process pending checks (debounced events)
                if self.handler:
                    await asyncio.to_thread(self.handler.process_pending_checks)

                # Wait for next scan interval
                await asyncio.sleep(scan_interval)

                # Perform full scan
                await self._perform_full_scan()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic scan: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying

    async def _perform_full_scan(self) -> None:
        """Perform a full scan of watch paths for new repositories."""
        logger.debug("Performing periodic full scan")

        config = self.config_service.get_config()

        for watch_path in config.auto_discovery.watch_paths:
            path = Path(watch_path)
            if not path.exists():
                continue

            try:
                # Scan for git repos
                await asyncio.to_thread(self._scan_directory, path)
            except Exception as e:
                logger.error(f"Error scanning {path}: {e}", exc_info=True)

    def _scan_directory(self, path: Path, max_depth: int = 3) -> None:
        """Scan directory for git repositories.

        Args:
            path: Directory to scan
            max_depth: Maximum recursion depth
        """
        self._scan_recursive(path, current_depth=0, max_depth=max_depth)

    def _scan_recursive(self, path: Path, current_depth: int, max_depth: int) -> None:
        """Recursively scan directory.

        Args:
            path: Current path
            current_depth: Current recursion depth
            max_depth: Maximum depth
        """
        if current_depth >= max_depth:
            return

        try:
            for child in path.iterdir():
                if not child.is_dir() or child.name.startswith("."):
                    continue

                # Check if it's a git repo
                if (child / ".git").exists():
                    if self.handler and child not in self.handler.processed_paths:
                        self._on_repo_discovered(child)
                        self.handler.processed_paths.add(child)
                    # Don't recurse into git repos
                    continue

                # Recurse into subdirectories
                self._scan_recursive(child, current_depth + 1, max_depth)

        except (PermissionError, OSError) as e:
            logger.debug(f"Cannot access {path}: {e}")

    def get_status(self) -> dict:
        """Get watcher service status.

        Returns:
            Dictionary with status information
        """
        config = self.config_service.get_config()

        return {
            "running": self.running,
            "enabled": config.auto_discovery.enabled,
            "watch_paths": config.auto_discovery.watch_paths,
            "scan_interval_seconds": config.auto_discovery.scan_interval_seconds,
            "discovered_count": len(self.handler.processed_paths) if self.handler else 0,
            "callback_count": len(self.discovery_callbacks)
        }


# Global watcher service instance
_watcher_service: Optional[WatcherService] = None


def get_watcher_service() -> WatcherService:
    """Get global watcher service instance.

    Returns:
        WatcherService singleton
    """
    global _watcher_service
    if _watcher_service is None:
        _watcher_service = WatcherService()
    return _watcher_service
