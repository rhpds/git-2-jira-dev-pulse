from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timedelta, timezone
from typing import Any
from pathlib import Path

from git import Repo

from ..models.git_models import (
    BranchInfo,
    CommitInfo,
    FileChange,
    PullRequestInfo,
    UncommittedChanges,
    WorkSummary,
)

JIRA_REF_PATTERN = re.compile(r"[A-Z][A-Z0-9]+-\d+")


class GitAnalyzer:
    def get_work_summary(
        self, repo_path: str, max_commits: int = 30, since_days: int = 30
    ) -> WorkSummary:
        path = Path(repo_path).expanduser()
        repo = Repo(path)

        return WorkSummary(
            repo_name=path.name,
            repo_path=str(path),
            current_branch=str(repo.active_branch) if not repo.head.is_detached else "HEAD",
            uncommitted=self._get_uncommitted(repo),
            recent_commits=self._get_recent_commits(repo, max_commits, since_days),
            branches=self._get_branches(repo),
            pull_requests=GitAnalyzer._get_pull_requests(path),
        )

    def get_uncommitted(self, repo_path: str) -> UncommittedChanges:
        repo = Repo(Path(repo_path).expanduser())
        return self._get_uncommitted(repo)

    def get_commits(
        self, repo_path: str, max_commits: int = 30, since_days: int = 30
    ) -> list[CommitInfo]:
        repo = Repo(Path(repo_path).expanduser())
        return self._get_recent_commits(repo, max_commits, since_days)

    def get_branches(self, repo_path: str) -> list[BranchInfo]:
        repo = Repo(Path(repo_path).expanduser())
        return self._get_branches(repo)

    def get_diff(self, repo_path: str, commit_sha: str | None = None) -> str:
        repo = Repo(Path(repo_path).expanduser())
        if commit_sha:
            commit = repo.commit(commit_sha)
            if commit.parents:
                return repo.git.diff(commit.parents[0].hexsha, commit.hexsha)
            return repo.git.diff(commit.hexsha, "--root")
        # Unstaged + staged combined diff
        return repo.git.diff("HEAD")

    @staticmethod
    def get_remote_branches(repo_path: str, author: str = "rhjcd") -> list[dict]:
        """Get remote branches, filtering to those with PRs by the given author."""
        path = Path(repo_path).expanduser()
        try:
            # Fetch latest remote refs
            repo = Repo(path)
            if repo.remotes:
                repo.remotes[0].fetch()
        except Exception:
            pass

        # Use gh to find branches that rhjcd has PRs on
        try:
            result = subprocess.run(
                [
                    "gh", "pr", "list",
                    "--state", "all",
                    "--author", author,
                    "--limit", "50",
                    "--json", "headRefName,state,number,title,url",
                ],
                cwd=str(path),
                capture_output=True,
                text=True,
                timeout=15,
            )
            if result.returncode != 0:
                return []
            prs = json.loads(result.stdout)
            # Deduplicate by branch, keep the most recent PR per branch
            seen: dict[str, dict] = {}
            for pr in prs:
                branch = pr["headRefName"]
                if branch not in seen:
                    seen[branch] = {
                        "branch": branch,
                        "pr_number": pr["number"],
                        "pr_title": pr["title"],
                        "pr_state": pr["state"],
                        "pr_url": pr["url"],
                    }

            # Always include main/master if they exist on the remote
            try:
                repo = Repo(path)
                remote_refs = {ref.remote_head for ref in repo.remotes[0].refs} if repo.remotes else set()
                for default_branch in ("main", "master"):
                    if default_branch in remote_refs and default_branch not in seen:
                        seen[default_branch] = {
                            "branch": default_branch,
                            "pr_number": 0,
                            "pr_title": f"Default branch ({default_branch})",
                            "pr_state": "DEFAULT",
                            "pr_url": "",
                        }
            except Exception:
                pass

            return list(seen.values())
        except Exception:
            return []

    @staticmethod
    def git_pull(repo_path: str, branch: str) -> dict:
        """Checkout and pull a branch."""
        path = Path(repo_path).expanduser()
        try:
            repo = Repo(path)
            # Stash any uncommitted changes
            had_stash = False
            if repo.is_dirty(untracked_files=False):
                repo.git.stash("save", "auto-stash before pull")
                had_stash = True

            # Checkout the branch
            repo.git.checkout(branch)

            # Pull from remote
            pull_output = repo.git.pull()

            # Pop stash if we made one
            if had_stash:
                try:
                    repo.git.stash("pop")
                except Exception:
                    pass

            return {
                "success": True,
                "branch": branch,
                "output": pull_output,
                "current_branch": str(repo.active_branch),
            }
        except Exception as e:
            return {
                "success": False,
                "branch": branch,
                "error": str(e),
            }

    def _get_uncommitted(self, repo: Repo) -> UncommittedChanges:
        staged: list[FileChange] = []
        unstaged: list[FileChange] = []

        try:
            for diff in repo.index.diff("HEAD"):
                staged.append(
                    FileChange(
                        path=diff.a_path or diff.b_path or "",
                        change_type=diff.change_type or "modified",
                        diff=self._safe_diff_text(diff),
                    )
                )
        except Exception:
            pass

        try:
            for diff in repo.index.diff(None):
                unstaged.append(
                    FileChange(
                        path=diff.a_path or diff.b_path or "",
                        change_type=diff.change_type or "modified",
                        diff=self._safe_diff_text(diff),
                    )
                )
        except Exception:
            pass

        return UncommittedChanges(
            staged=staged,
            unstaged=unstaged,
            untracked=list(repo.untracked_files),
        )

    def _get_recent_commits(
        self, repo: Repo, max_commits: int, since_days: int
    ) -> list[CommitInfo]:
        since = datetime.now(timezone.utc) - timedelta(days=since_days)
        commits: list[CommitInfo] = []

        for commit in repo.iter_commits(max_count=max_commits):
            commit_dt = datetime.fromtimestamp(commit.committed_date, tz=timezone.utc)
            if commit_dt < since:
                break

            files_changed = len(commit.stats.files)
            total = commit.stats.total
            msg = commit.message if isinstance(commit.message, str) else commit.message.decode("utf-8", errors="replace")
            jira_refs = JIRA_REF_PATTERN.findall(msg)

            commits.append(
                CommitInfo(
                    sha=commit.hexsha,
                    short_sha=commit.hexsha[:7],
                    message=commit.message.strip(),
                    author=str(commit.author),
                    author_email=commit.author.email or "",
                    date=commit_dt,
                    files_changed=files_changed,
                    insertions=total.get("insertions", 0),
                    deletions=total.get("deletions", 0),
                    jira_refs=jira_refs,
                )
            )
        return commits

    def _get_branches(self, repo: Repo) -> list[BranchInfo]:
        branches: list[BranchInfo] = []
        active = repo.active_branch.name if not repo.head.is_detached else None

        for branch in repo.heads:
            jira_refs = JIRA_REF_PATTERN.findall(branch.name)
            tracking = None
            ahead = 0
            behind = 0
            try:
                tb = branch.tracking_branch()
                if tb:
                    tracking = tb.name
                    ahead = sum(1 for _ in repo.iter_commits(f"{tb.name}..{branch.name}"))
                    behind = sum(1 for _ in repo.iter_commits(f"{branch.name}..{tb.name}"))
            except Exception:
                pass

            last_date = None
            try:
                last_commit = branch.commit
                last_date = datetime.fromtimestamp(
                    last_commit.committed_date, tz=timezone.utc
                )
            except Exception:
                pass

            branches.append(
                BranchInfo(
                    name=branch.name,
                    is_active=branch.name == active,
                    tracking=tracking,
                    ahead=ahead,
                    behind=behind,
                    last_commit_date=last_date,
                    jira_refs=jira_refs,
                )
            )
        return branches

    @staticmethod
    def _parse_gh_date(val: Any) -> datetime | None:
        """Parse an ISO date string from gh CLI output."""
        if not val:
            return None
        try:
            s = str(val)
            return datetime.fromisoformat(s.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _get_pull_requests(repo_path: Path) -> list[PullRequestInfo]:
        """Use gh CLI to list PRs associated with this repo."""
        try:
            result = subprocess.run(
                [
                    "gh", "pr", "list",
                    "--state", "all",
                    "--author", "rhjcd",
                    "--limit", "50",
                    "--json", "number,title,url,headRefName,state,createdAt,mergedAt,closedAt",
                ],
                cwd=str(repo_path),
                capture_output=True,
                text=True,
                timeout=15,
            )
            if result.returncode != 0:
                return []
            prs = json.loads(result.stdout)
            return [
                PullRequestInfo(
                    number=pr["number"],
                    title=pr["title"],
                    url=pr["url"],
                    branch=pr["headRefName"],
                    state=pr["state"],
                    created_at=GitAnalyzer._parse_gh_date(pr.get("createdAt")),
                    merged_at=GitAnalyzer._parse_gh_date(pr.get("mergedAt")),
                    closed_at=GitAnalyzer._parse_gh_date(pr.get("closedAt")),
                )
                for pr in prs
            ]
        except Exception:
            return []

    @staticmethod
    def _safe_diff_text(diff) -> str | None:
        try:
            return diff.diff.decode("utf-8", errors="replace") if diff.diff else None
        except Exception:
            return None
