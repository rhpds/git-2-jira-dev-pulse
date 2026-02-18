from __future__ import annotations

import hashlib
import re
from collections import defaultdict
from datetime import datetime, timedelta

from ..models.git_models import CommitInfo, WorkSummary
from ..models.jira_models import IssueType, Priority, TicketSuggestion


FIX_PATTERN = re.compile(r"\b(fix|bug|patch|hotfix|resolve)\b", re.IGNORECASE)
FEAT_PATTERN = re.compile(r"\b(feat|feature|add|implement|new)\b", re.IGNORECASE)
REFACTOR_PATTERN = re.compile(r"\b(refactor|cleanup|clean up|reorganize|restructure)\b", re.IGNORECASE)
DOCS_PATTERN = re.compile(r"\b(docs?|documentation|readme|changelog)\b", re.IGNORECASE)
CI_PATTERN = re.compile(r"\b(ci|cd|pipeline|workflow|deploy|docker|container|github.action)\b", re.IGNORECASE)
TEST_PATTERN = re.compile(r"\b(test|spec|coverage|jest|pytest|unittest)\b", re.IGNORECASE)

# File area heuristics: map path prefixes/patterns to logical areas
AREA_PATTERNS = [
    (re.compile(r"(^|/)frontend/|\.tsx?$|\.jsx?$|\.css$|\.scss$"), "frontend"),
    (re.compile(r"(^|/)backend/|\.py$"), "backend"),
    (re.compile(r"(^|/)(test|tests|__tests__|spec)/"), "tests"),
    (re.compile(r"(^|/)(\.github|\.gitlab|Jenkinsfile|Dockerfile|docker-compose|Makefile|\.ci)"), "ci-infra"),
    (re.compile(r"(^|/)(docs?|README|CHANGELOG|\.md$)"), "docs"),
    (re.compile(r"(^|/)ansible/|\.ya?ml$.*role"), "ansible"),
    (re.compile(r"(^|/)(config|\.env|settings)"), "config"),
]


class TicketSuggester:
    """Generate fine-grained Jira ticket suggestions from git work summaries.

    Grouping strategy (applied per repo):
    1. Uncommitted work -> one ticket
    2. Commits grouped by WEEK first
    3. Within each week, further split by FILE AREA (frontend, backend, tests, etc.)
    4. Feature branches get their own ticket regardless of week boundaries
    5. Commits that already have Jira refs are excluded from suggestions
    """

    def __init__(self, default_assignee: str = ""):
        self.default_assignee = default_assignee

    def suggest(
        self, summaries: list[WorkSummary], project_key: str
    ) -> list[TicketSuggestion]:
        suggestions: list[TicketSuggestion] = []

        for summary in summaries:
            # Group 1: Uncommitted work -> one ticket per repo with dirty state
            if (
                summary.uncommitted.staged
                or summary.uncommitted.unstaged
                or summary.uncommitted.untracked
            ):
                suggestions.append(self._uncommitted_ticket(summary, project_key))

            # Filter out commits that already reference Jira tickets
            untracked_commits = [
                c for c in summary.recent_commits if not c.jira_refs
            ]

            if not untracked_commits:
                continue

            # Group 2: Feature branches get their own ticket(s)
            feature_branches = self._extract_feature_branches(summary)
            feature_branch_commits: set[str] = set()

            for branch_name, branch_commits in feature_branches.items():
                # Sub-group feature branch by week if it has many commits
                if len(branch_commits) > 12:
                    weekly = self._group_by_week(branch_commits)
                    for week_label, week_commits in weekly.items():
                        suggestions.append(
                            self._build_ticket(
                                summary, branch_name, week_commits, project_key,
                                context=f"week-{week_label}",
                            )
                        )
                else:
                    suggestions.append(
                        self._build_ticket(
                            summary, branch_name, branch_commits, project_key,
                        )
                    )
                for c in branch_commits:
                    feature_branch_commits.add(c.sha)

            # Group 3: Remaining commits on main/default branch
            remaining = [
                c for c in untracked_commits
                if c.sha not in feature_branch_commits
            ]

            if not remaining:
                continue

            # Split remaining by week
            weekly_groups = self._group_by_week(remaining)

            for week_label, week_commits in weekly_groups.items():
                # Within each week, split by file area
                area_groups = self._group_by_file_area(week_commits)

                if len(area_groups) == 1:
                    # Single area: one ticket for the week
                    area_name, area_commits = next(iter(area_groups.items()))
                    suggestions.append(
                        self._build_ticket(
                            summary,
                            summary.current_branch,
                            area_commits,
                            project_key,
                            context=f"week-{week_label}",
                            area=area_name,
                        )
                    )
                else:
                    # Multiple areas: one ticket per area per week
                    for area_name, area_commits in area_groups.items():
                        if len(area_commits) == 0:
                            continue
                        suggestions.append(
                            self._build_ticket(
                                summary,
                                summary.current_branch,
                                area_commits,
                                project_key,
                                context=f"week-{week_label}",
                                area=area_name,
                            )
                        )

        return suggestions

    # ------------------------------------------------------------------
    # Grouping helpers
    # ------------------------------------------------------------------

    def _extract_feature_branches(
        self, summary: WorkSummary
    ) -> dict[str, list[CommitInfo]]:
        """Identify commits belonging to feature branches.

        For now, uses branch info from the summary to find non-default branches.
        Commits on default branches (main, master, development) stay in the
        general pool.
        """
        default_branches = {"main", "master", "development", "develop"}
        feature_branches: dict[str, list[CommitInfo]] = {}

        for branch in summary.branches:
            if branch.name in default_branches or branch.name == summary.current_branch:
                continue
            # We don't have per-branch commit lists in the model, so this is
            # a best-effort heuristic: match commits whose messages mention
            # the branch name (common in merge commits)
            branch_commits = [
                c for c in summary.recent_commits
                if not c.jira_refs and branch.name in c.message
            ]
            if branch_commits:
                feature_branches[branch.name] = branch_commits

        return feature_branches

    def _group_by_week(
        self, commits: list[CommitInfo]
    ) -> dict[str, list[CommitInfo]]:
        """Group commits by ISO calendar week."""
        groups: dict[str, list[CommitInfo]] = defaultdict(list)
        for commit in commits:
            dt = commit.date if isinstance(commit.date, datetime) else datetime.fromisoformat(str(commit.date))
            iso_year, iso_week, _ = dt.isocalendar()
            week_label = f"{iso_year}-W{iso_week:02d}"
            groups[week_label].append(commit)

        # Sort by week
        return dict(sorted(groups.items()))

    def _group_by_file_area(
        self, commits: list[CommitInfo]
    ) -> dict[str, list[CommitInfo]]:
        """Group commits by the dominant file area they touch.

        Uses commit message heuristics and file patterns. Each commit is
        assigned to exactly one area based on its primary signal.
        """
        groups: dict[str, list[CommitInfo]] = defaultdict(list)

        for commit in commits:
            area = self._detect_area_from_message(commit.message)
            groups[area].append(commit)

        # Merge very small groups (1-2 commits) into "general"
        merged: dict[str, list[CommitInfo]] = defaultdict(list)
        for area, area_commits in groups.items():
            if len(area_commits) <= 1 and area != "general":
                merged["general"].extend(area_commits)
            else:
                merged[area].extend(area_commits)

        return dict(merged) if merged else {"general": commits}

    @staticmethod
    def _detect_area_from_message(message: str) -> str:
        """Detect file area from commit message content."""
        msg_lower = message.lower()

        if CI_PATTERN.search(message):
            return "ci-infra"
        if TEST_PATTERN.search(message):
            return "tests"
        if DOCS_PATTERN.search(message):
            return "docs"

        # Check for path-like references in commit message
        # e.g., "frontend/src/..." or "backend/api/..."
        if "frontend" in msg_lower or "ui" in msg_lower or "component" in msg_lower or "tsx" in msg_lower:
            return "frontend"
        if "backend" in msg_lower or "api" in msg_lower or "service" in msg_lower or "route" in msg_lower:
            return "backend"
        if "ansible" in msg_lower or "playbook" in msg_lower or "role" in msg_lower:
            return "ansible"
        if "config" in msg_lower or "settings" in msg_lower or "env" in msg_lower:
            return "config"

        return "general"

    # ------------------------------------------------------------------
    # Ticket builders
    # ------------------------------------------------------------------

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

    def _build_ticket(
        self,
        summary: WorkSummary,
        branch: str,
        commits: list[CommitInfo],
        project_key: str,
        context: str = "",
        area: str = "",
    ) -> TicketSuggestion:
        """Build a ticket suggestion from a group of commits."""
        all_messages = " ".join(c.message for c in commits)
        issue_type = self._infer_type_from_messages(all_messages)
        total_files = sum(c.files_changed for c in commits)
        total_insertions = sum(c.insertions for c in commits)
        priority = self._infer_priority(total_files, total_insertions)

        # Build a descriptive summary
        ticket_summary = self._build_summary(
            summary.repo_name, commits, context, area
        )

        # Build description
        desc_lines = self._build_description(
            summary.repo_name, branch, commits, context, area, total_files
        )

        # Match PRs for this branch
        pr_urls = [
            pr.url for pr in summary.pull_requests
            if pr.branch == branch
        ]

        # Build unique ID from all relevant parts
        id_parts = [summary.repo_name, branch]
        if context:
            id_parts.append(context)
        if area:
            id_parts.append(area)

        return TicketSuggestion(
            id=self._make_id(*id_parts),
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

    def _build_summary(
        self,
        repo_name: str,
        commits: list[CommitInfo],
        context: str,
        area: str,
    ) -> str:
        """Build a human-readable ticket summary."""
        # Extract the dominant theme from commit messages
        theme = self._extract_theme(commits)

        parts = [f"[{repo_name}]"]

        if theme:
            parts.append(theme)
        else:
            first_msg = commits[0].message.split("\n")[0][:60]
            parts.append(first_msg)

        if len(commits) > 1:
            parts.append(f"(+{len(commits) - 1} commits)")

        # Add area/week context in brackets
        qualifiers = []
        if area and area != "general":
            qualifiers.append(area)
        if context:
            qualifiers.append(context)
        if qualifiers:
            parts.append(f"[{', '.join(qualifiers)}]")

        return " ".join(parts)

    def _build_description(
        self,
        repo_name: str,
        branch: str,
        commits: list[CommitInfo],
        context: str,
        area: str,
        total_files: int,
    ) -> list[str]:
        """Build ticket description lines."""
        desc = [
            f"Work on **{repo_name}**, branch `{branch}`.",
        ]

        if context:
            # Parse week label to date range
            week_range = self._week_label_to_range(context.replace("week-", ""))
            if week_range:
                desc.append(f"Period: {week_range}")

        if area and area != "general":
            desc.append(f"Area: **{area}**")

        desc.append("")
        desc.append(f"**{len(commits)} commit(s), {total_files} file(s) changed:**")
        desc.append("")

        for c in commits[:15]:
            first_line = c.message.split("\n")[0][:100]
            dt = c.date if isinstance(c.date, datetime) else datetime.fromisoformat(str(c.date))
            date_str = dt.strftime("%Y-%m-%d")
            desc.append(f"- `{c.short_sha}` ({date_str}) {first_line}")

        if len(commits) > 15:
            desc.append(f"- ... and {len(commits) - 15} more commits")

        return desc

    def _extract_theme(self, commits: list[CommitInfo]) -> str:
        """Try to extract a dominant theme from commit messages."""
        all_messages = " ".join(c.message.split("\n")[0] for c in commits)

        # Check for conventional commit prefixes
        prefix_counts: dict[str, int] = {}
        for c in commits:
            first_line = c.message.split("\n")[0].lower()
            if first_line.startswith("feat"):
                prefix_counts["Feature development"] = prefix_counts.get("Feature development", 0) + 1
            elif first_line.startswith("fix"):
                prefix_counts["Bug fixes"] = prefix_counts.get("Bug fixes", 0) + 1
            elif first_line.startswith("refactor"):
                prefix_counts["Refactoring"] = prefix_counts.get("Refactoring", 0) + 1
            elif first_line.startswith("docs"):
                prefix_counts["Documentation updates"] = prefix_counts.get("Documentation updates", 0) + 1
            elif first_line.startswith("test"):
                prefix_counts["Test improvements"] = prefix_counts.get("Test improvements", 0) + 1
            elif first_line.startswith("chore"):
                prefix_counts["Maintenance"] = prefix_counts.get("Maintenance", 0) + 1
            elif first_line.startswith("ci"):
                prefix_counts["CI/CD updates"] = prefix_counts.get("CI/CD updates", 0) + 1

        if prefix_counts:
            dominant = max(prefix_counts, key=lambda k: prefix_counts[k])
            if prefix_counts[dominant] >= len(commits) * 0.5:
                return dominant

        # Fall back to pattern matching
        if FEAT_PATTERN.search(all_messages):
            return "Feature development"
        if FIX_PATTERN.search(all_messages):
            return "Bug fixes and patches"
        if REFACTOR_PATTERN.search(all_messages):
            return "Code refactoring"

        return ""

    @staticmethod
    def _week_label_to_range(week_label: str) -> str:
        """Convert ISO week label (2025-W05) to human date range."""
        try:
            parts = week_label.split("-W")
            if len(parts) != 2:
                return ""
            year = int(parts[0])
            week = int(parts[1])
            # Monday of that ISO week using ISO calendar
            monday = datetime.fromisocalendar(year, week, 1)
            sunday = monday + timedelta(days=6)
            return f"{monday.strftime('%b %d')} - {sunday.strftime('%b %d, %Y')}"
        except (ValueError, IndexError):
            return ""

    # ------------------------------------------------------------------
    # Inference helpers
    # ------------------------------------------------------------------

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
        return hashlib.sha256(raw.encode()).hexdigest()[:12]
