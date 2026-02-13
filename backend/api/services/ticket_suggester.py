from __future__ import annotations

import hashlib
import re
from collections import defaultdict

from ..models.git_models import CommitInfo, WorkSummary
from ..models.jira_models import IssueType, Priority, TicketSuggestion


FIX_PATTERN = re.compile(r"\b(fix|bug|patch|hotfix|resolve)\b", re.IGNORECASE)
FEAT_PATTERN = re.compile(r"\b(feat|feature|add|implement|new)\b", re.IGNORECASE)


class TicketSuggester:
    def __init__(self, default_assignee: str = ""):
        self.default_assignee = default_assignee

    def suggest(
        self, summaries: list[WorkSummary], project_key: str
    ) -> list[TicketSuggestion]:
        suggestions: list[TicketSuggestion] = []

        for summary in summaries:
            # Group 1: Uncommitted work → one ticket per repo with dirty state
            if (
                summary.uncommitted.staged
                or summary.uncommitted.unstaged
                or summary.uncommitted.untracked
            ):
                suggestions.append(self._uncommitted_ticket(summary, project_key))

            # Group 2: Commits grouped by branch
            branch_commits = self._group_by_branch(summary)
            for branch, commits in branch_commits.items():
                if not commits:
                    continue
                # Skip if all commits already reference Jira tickets
                if all(c.jira_refs for c in commits):
                    continue
                suggestions.append(
                    self._branch_ticket(summary, branch, commits, project_key)
                )

        return suggestions

    def _uncommitted_ticket(
        self, summary: WorkSummary, project_key: str
    ) -> TicketSuggestion:
        files = []
        change_types = []

        for f in summary.uncommitted.staged:
            files.append(f.path)
            change_types.append(f.change_type)
        for f in summary.uncommitted.unstaged:
            files.append(f.path)
            change_types.append(f.change_type)
        for f in summary.uncommitted.untracked:
            files.append(f)

        issue_type = self._infer_type_from_files(files, change_types)
        priority = self._infer_priority(len(files), 0)

        desc_lines = [
            f"Uncommitted work in **{summary.repo_name}** on branch `{summary.current_branch}`.",
            "",
            f"**{len(files)} file(s) changed:**",
        ]
        for f in files[:20]:
            desc_lines.append(f"- `{f}`")
        if len(files) > 20:
            desc_lines.append(f"- ... and {len(files) - 20} more")

        # Match PRs for current branch
        pr_urls = [
            pr.url for pr in summary.pull_requests
            if pr.branch == summary.current_branch
        ]

        return TicketSuggestion(
            id=self._make_id(summary.repo_name, "uncommitted"),
            summary=f"[{summary.repo_name}] Uncommitted work on {summary.current_branch}",
            description="\n".join(desc_lines),
            issue_type=issue_type,
            priority=priority,
            assignee=self.default_assignee,
            pr_urls=pr_urls,
            project_key=project_key,
            source_repo=summary.repo_name,
            source_branch=summary.current_branch,
            source_files=files[:50],
        )

    def _branch_ticket(
        self,
        summary: WorkSummary,
        branch: str,
        commits: list[CommitInfo],
        project_key: str,
    ) -> TicketSuggestion:
        all_messages = " ".join(c.message for c in commits)
        issue_type = self._infer_type_from_messages(all_messages)
        total_files = sum(c.files_changed for c in commits)
        total_insertions = sum(c.insertions for c in commits)
        priority = self._infer_priority(total_files, total_insertions)

        # Build a coherent summary from commit messages
        first_msg = commits[0].message.split("\n")[0][:80]
        if len(commits) == 1:
            ticket_summary = f"[{summary.repo_name}] {first_msg}"
        else:
            ticket_summary = (
                f"[{summary.repo_name}] {first_msg} (+{len(commits) - 1} commits)"
            )

        desc_lines = [
            f"Work on **{summary.repo_name}**, branch `{branch}`.",
            "",
            f"**{len(commits)} commit(s), {total_files} file(s) changed:**",
            "",
        ]
        for c in commits[:15]:
            first_line = c.message.split("\n")[0][:100]
            desc_lines.append(f"- `{c.short_sha}` {first_line}")
        if len(commits) > 15:
            desc_lines.append(f"- ... and {len(commits) - 15} more commits")

        # Match PRs for this branch
        pr_urls = [
            pr.url for pr in summary.pull_requests
            if pr.branch == branch
        ]

        return TicketSuggestion(
            id=self._make_id(summary.repo_name, branch),
            summary=ticket_summary,
            description="\n".join(desc_lines),
            issue_type=issue_type,
            priority=priority,
            assignee=self.default_assignee,
            pr_urls=pr_urls,
            project_key=project_key,
            source_repo=summary.repo_name,
            source_branch=branch,
            source_commits=[c.short_sha for c in commits],
        )

    def _group_by_branch(
        self, summary: WorkSummary
    ) -> dict[str, list[CommitInfo]]:
        """Group commits by current branch (simple strategy)."""
        # For now, all recent commits go under the current branch
        groups: dict[str, list[CommitInfo]] = defaultdict(list)
        groups[summary.current_branch] = summary.recent_commits
        return groups

    @staticmethod
    def _infer_type_from_messages(text: str) -> IssueType:
        if FIX_PATTERN.search(text):
            return IssueType.BUG
        if FEAT_PATTERN.search(text):
            return IssueType.STORY
        return IssueType.TASK

    @staticmethod
    def _infer_type_from_files(
        files: list[str], change_types: list[str]
    ) -> IssueType:
        if any("test" in f.lower() for f in files):
            return IssueType.TASK
        if any(ct in ("added", "A") for ct in change_types):
            return IssueType.STORY
        return IssueType.TASK

    @staticmethod
    def _infer_priority(file_count: int, insertions: int) -> Priority:
        if file_count > 20 or insertions > 500:
            return Priority.CRITICAL
        if file_count > 10 or insertions > 200:
            return Priority.MAJOR
        if file_count > 3:
            return Priority.NORMAL
        return Priority.MINOR

    @staticmethod
    def _make_id(*parts: str) -> str:
        raw = "-".join(parts)
        return hashlib.md5(raw.encode()).hexdigest()[:12]
