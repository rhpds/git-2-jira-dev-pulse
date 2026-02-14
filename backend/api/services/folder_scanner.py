from __future__ import annotations

from pathlib import Path
from typing import Optional, Literal

from git import Repo, InvalidGitRepositoryError

from ..models.git_models import RepoInfo, RepoStatus

EXCLUDED_FOLDERS = {
    "Minerva",
    "automation_apps",
    "dev-orchestrator-mcp",
    "devops-intelligence",
    "google_forms",
    "infra",
    "jira-mcp",
    "ocm-resources",
    "playright-mcp",
    "playwright-mcp",
    "cnv-project",
    "ripgrep-edit",
    "workshops",
}

# Folders that are themselves git repos but should be labeled with sub-project context
PARENT_WITH_SUBPROJECTS: dict[str, list[str]] = {
    "rhpds-utils": ["web-utils", "RHDP-Scheduler"],
}


class FolderScanner:
    def __init__(self, base_path: str):
        self.base_path = Path(base_path).expanduser()

    def scan(self) -> list[RepoInfo]:
        repos: list[RepoInfo] = []
        if not self.base_path.is_dir():
            return repos

        for child in sorted(self.base_path.iterdir()):
            if not child.is_dir() or child.name.startswith("."):
                continue
            if child.name in EXCLUDED_FOLDERS:
                continue

            # Parent folders: scan the parent repo itself but note its sub-projects
            if child.name in PARENT_WITH_SUBPROJECTS:
                if (child / ".git").exists():
                    subs = ", ".join(PARENT_WITH_SUBPROJECTS[child.name])
                    info = self._scan_repo(child, display_name=f"{child.name} ({subs})")
                    if info:
                        repos.append(info)
                continue

            git_dir = child / ".git"
            if not git_dir.exists():
                continue
            info = self._scan_repo(child)
            if info:
                repos.append(info)

        return repos

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

            if has_commits:
                is_dirty = repo.is_dirty(untracked_files=True)
                uncommitted = (
                    len(repo.index.diff("HEAD"))
                    + len(repo.index.diff(None))
                    + len(repo.untracked_files)
                )
                branch = str(repo.active_branch) if not repo.head.is_detached else "HEAD"
                commit_count = sum(1 for _ in repo.iter_commits(max_count=30))
            else:
                is_dirty = len(repo.untracked_files) > 0
                uncommitted = len(repo.untracked_files)
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
            )
        except (InvalidGitRepositoryError, Exception):
            return None
