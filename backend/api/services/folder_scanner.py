from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Literal
import fnmatch

from git import Repo, InvalidGitRepositoryError

from ..models.git_models import RepoInfo, RepoStatus, StaleBranch
from .config_service import get_config_service, ScanDirectory


class FolderScanner:
    """Multi-directory folder scanner with configurable exclusions.

    Supports scanning multiple base directories with individual settings for:
    - Recursive scanning
    - Maximum depth
    - Pattern-based exclusions
    - Folder-specific exclusions
    """

    def __init__(self, base_path: Optional[str] = None):
        """Initialize folder scanner.

        Args:
            base_path: Optional legacy base path for backward compatibility.
                      If None, uses all enabled directories from config.
        """
        self.config_service = get_config_service()

        # Legacy mode: single base path
        if base_path:
            self.legacy_mode = True
            self.base_path = Path(base_path).expanduser()
            # Create a scan directory config from legacy path
            config = self.config_service.get_config()
            if config.scan_directories:
                # Use first directory's settings as defaults
                first_dir = config.scan_directories[0]
                self.scan_config = ScanDirectory(
                    path=str(self.base_path),
                    enabled=True,
                    recursive=first_dir.recursive,
                    max_depth=first_dir.max_depth,
                    exclude_patterns=first_dir.exclude_patterns,
                    exclude_folders=first_dir.exclude_folders
                )
            else:
                self.scan_config = ScanDirectory(path=str(self.base_path))
        else:
            self.legacy_mode = False
            self.base_path = None
            self.scan_config = None

    def scan(self, include_hidden: bool = False) -> list[RepoInfo]:
        """Scan for git repositories.

        Args:
            include_hidden: If True, include repos that are hidden by the user

        Returns:
            List of discovered repositories
        """
        repos: list[RepoInfo] = []
        seen_paths: set[str] = set()
        # Track paths that were explicitly added (not broad scan directories)
        # These get priority and bypass hidden filtering
        explicit_paths: set[str] = set()

        if self.legacy_mode and self.scan_config is not None:
            # Legacy mode: scan single directory
            repos.extend(self._scan_directory(self.scan_config))
        else:
            # Multi-directory mode: scan all enabled directories
            # Process specific/nested paths first so they take priority
            config = self.config_service.get_config()
            broad_dirs = []
            specific_dirs = []

            for scan_dir in config.scan_directories:
                if not scan_dir.enabled:
                    continue
                scan_path = Path(scan_dir.path)
                # A "specific" dir is one that is inside a git repo or is a git repo
                # (i.e., not a broad parent directory containing many repos)
                if (scan_path / ".git").exists():
                    specific_dirs.append(scan_dir)
                else:
                    # Check if it's inside a git repo
                    is_nested = any((p / ".git").exists() for p in scan_path.parents)
                    if is_nested:
                        specific_dirs.append(scan_dir)
                    else:
                        broad_dirs.append(scan_dir)

            # Scan specific dirs first — they get priority
            for scan_dir in specific_dirs:
                for repo in self._scan_directory(scan_dir):
                    if repo.path not in seen_paths:
                        seen_paths.add(repo.path)
                        explicit_paths.add(repo.path)
                        repos.append(repo)

            # Then scan broad directories
            for scan_dir in broad_dirs:
                for repo in self._scan_directory(scan_dir):
                    if repo.path not in seen_paths:
                        seen_paths.add(repo.path)
                        repos.append(repo)

        # Filter out hidden repos unless explicitly requested
        if not include_hidden:
            config = self.config_service.get_config()
            hidden = set(config.hidden_repos)
            if hidden:
                # Never hide repos from explicitly added scan paths
                repos = [r for r in repos
                         if r.path in explicit_paths
                         or r.name not in hidden]

        return repos

    def _scan_directory(self, scan_config: ScanDirectory) -> list[RepoInfo]:
        """Scan a single directory according to its configuration.

        Args:
            scan_config: Configuration for this scan directory

        Returns:
            List of repositories found in this directory
        """
        repos: list[RepoInfo] = []
        base_path = Path(scan_config.path)

        if not base_path.is_dir():
            return repos

        # Check if the scan path itself is a git repo
        if (base_path / ".git").exists():
            info = self._scan_repo(base_path)
            if info:
                repos.append(info)
            return repos

        # Check if the scan path is inside a git repo (e.g. a subfolder)
        # Walk up to find the nearest .git directory
        for parent in base_path.parents:
            if (parent / ".git").exists():
                info = self._scan_repo(parent, display_name=base_path.name)
                if info:
                    repos.append(info)
                return repos

        if scan_config.recursive:
            # Recursive scan with depth limit
            repos.extend(self._scan_recursive(
                base_path,
                scan_config,
                current_depth=0
            ))
        else:
            # Non-recursive scan (original behavior)
            repos.extend(self._scan_flat(base_path, scan_config))

        return repos

    def _scan_flat(self, base_path: Path, scan_config: ScanDirectory) -> list[RepoInfo]:
        """Scan a directory non-recursively (1 level deep).

        Args:
            base_path: Base directory to scan
            scan_config: Scan configuration

        Returns:
            List of repositories found
        """
        repos: list[RepoInfo] = []

        for child in sorted(base_path.iterdir()):
            if not child.is_dir() or child.name.startswith("."):
                continue

            # Check exclusions
            if self._is_excluded(child, scan_config):
                continue

            # Check if it's a git repo
            if (child / ".git").exists():
                info = self._scan_repo(child)
                if info:
                    repos.append(info)

        return repos

    def _scan_recursive(
        self,
        path: Path,
        scan_config: ScanDirectory,
        current_depth: int
    ) -> list[RepoInfo]:
        """Scan directory recursively up to max_depth.

        Args:
            path: Current directory path
            scan_config: Scan configuration
            current_depth: Current recursion depth

        Returns:
            List of repositories found
        """
        repos: list[RepoInfo] = []

        # Stop if we've exceeded max depth
        if current_depth >= scan_config.max_depth:
            return repos

        try:
            for child in sorted(path.iterdir()):
                if not child.is_dir() or child.name.startswith("."):
                    continue

                # Check exclusions
                if self._is_excluded(child, scan_config):
                    continue

                # Check if it's a git repo
                if (child / ".git").exists():
                    info = self._scan_repo(child)
                    if info:
                        repos.append(info)
                    # Don't recurse into git repos
                    continue

                # Recurse into subdirectories
                repos.extend(self._scan_recursive(
                    child,
                    scan_config,
                    current_depth + 1
                ))
        except (PermissionError, OSError):
            # Skip directories we can't access
            pass

        return repos

    def _is_excluded(self, path: Path, scan_config: ScanDirectory) -> bool:
        """Check if path should be excluded based on patterns and folder names.

        Args:
            path: Path to check
            scan_config: Scan configuration with exclusion rules

        Returns:
            True if path should be excluded
        """
        # Check folder-specific exclusions
        if path.name in scan_config.exclude_folders:
            return True

        # Check pattern-based exclusions
        for pattern in scan_config.exclude_patterns:
            if fnmatch.fnmatch(path.name, pattern):
                return True

        return False

    def scan_with_filters(
        self,
        status_filter: Optional[RepoStatus] = None,
        has_uncommitted: Optional[bool] = None,
        min_commits: int = 0,
        sort_by: Literal["name", "status", "uncommitted", "commits", "activity"] = "name",
        sort_desc: bool = False,
    ) -> list[RepoInfo]:
        """
        Scan repos with filters and sorting.

        Args:
            status_filter: Filter by repo status (CLEAN or DIRTY)
            has_uncommitted: Filter repos with/without uncommitted changes
            min_commits: Minimum number of recent commits
            sort_by: Sort field (name, status, uncommitted, commits, activity)
            sort_desc: Sort in descending order

        Returns:
            Filtered and sorted list of repos
        """
        repos = self.scan()

        # Apply filters
        if status_filter:
            repos = [r for r in repos if r.status == status_filter]

        if has_uncommitted is not None:
            if has_uncommitted:
                repos = [r for r in repos if r.uncommitted_count > 0]
            else:
                repos = [r for r in repos if r.uncommitted_count == 0]

        if min_commits > 0:
            repos = [r for r in repos if r.recent_commit_count >= min_commits]

        # Apply sorting
        if sort_by == "name":
            repos.sort(key=lambda r: r.name.lower(), reverse=sort_desc)
        elif sort_by == "status":
            repos.sort(key=lambda r: r.status.value, reverse=sort_desc)
        elif sort_by == "uncommitted":
            repos.sort(key=lambda r: r.uncommitted_count, reverse=sort_desc)
        elif sort_by == "commits":
            repos.sort(key=lambda r: r.recent_commit_count, reverse=sort_desc)
        elif sort_by == "activity":
            # Activity = uncommitted + commits
            repos.sort(
                key=lambda r: r.uncommitted_count + r.recent_commit_count,
                reverse=sort_desc,
            )

        return repos

    @staticmethod
    def _scan_repo(path: Path, display_name: str | None = None) -> RepoInfo | None:
        try:
            repo = Repo(path)

            # Handle repos with no commits yet (empty HEAD)
            has_commits = True
            try:
                repo.head.commit
            except ValueError:
                has_commits = False

            unpushed_count = 0
            untracked_count = 0
            stale_branches: list[StaleBranch] = []

            if has_commits:
                is_dirty = repo.is_dirty(untracked_files=True)
                untracked_count = len(repo.untracked_files)
                uncommitted = (
                    len(repo.index.diff("HEAD"))
                    + len(repo.index.diff(None))
                    + untracked_count
                )
                branch = str(repo.active_branch) if not repo.head.is_detached else "HEAD"
                commit_count = sum(1 for _ in repo.iter_commits(max_count=30))

                # Detect unpushed commits on current branch
                if not repo.head.is_detached and repo.remotes:
                    try:
                        active = repo.active_branch
                        tracking = active.tracking_branch()
                        if tracking:
                            unpushed_count = sum(
                                1 for _ in repo.iter_commits(
                                    f"{tracking.name}..{active.name}"
                                )
                            )
                    except Exception:
                        pass

                # Detect stale branches (unmerged, older than 30 days)
                now = datetime.now(timezone.utc)
                cutoff = now - timedelta(days=30)
                default_branch_name = None
                for candidate in ("main", "master", "develop", "development"):
                    if candidate in [b.name for b in repo.heads]:
                        default_branch_name = candidate
                        break
                if not default_branch_name and not repo.head.is_detached:
                    default_branch_name = repo.active_branch.name

                if default_branch_name:
                    try:
                        default_ref = repo.heads[default_branch_name]
                        default_shas = set()
                        for c in repo.iter_commits(default_ref, max_count=200):
                            default_shas.add(c.hexsha)

                        for b in repo.heads:
                            if b.name == default_branch_name:
                                continue
                            try:
                                last_c = b.commit
                                last_dt = datetime.fromtimestamp(
                                    last_c.committed_date, tz=timezone.utc
                                )
                                if last_dt >= cutoff:
                                    continue
                                if last_c.hexsha not in default_shas:
                                    stale_branches.append(
                                        StaleBranch(
                                            name=b.name,
                                            last_commit_date=last_dt,
                                            days_stale=(now - last_dt).days,
                                            is_merged=False,
                                        )
                                    )
                            except Exception:
                                continue
                    except Exception:
                        pass
            else:
                is_dirty = len(repo.untracked_files) > 0
                untracked_count = len(repo.untracked_files)
                uncommitted = untracked_count
                branch = "main"
                commit_count = 0

            return RepoInfo(
                name=display_name or path.name,
                path=str(path),
                current_branch=branch,
                status=RepoStatus.DIRTY if is_dirty else RepoStatus.CLEAN,
                uncommitted_count=uncommitted,
                recent_commit_count=commit_count,
                has_remote=len(repo.remotes) > 0,
                unpushed_count=unpushed_count,
                untracked_count=untracked_count,
                stale_branches=stale_branches,
            )
        except (InvalidGitRepositoryError, Exception):
            return None
