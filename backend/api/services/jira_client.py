from __future__ import annotations

import re

from jira import JIRA

from ..models.jira_models import (
    CreatedTicket,
    DuplicateCheckResult,
    ExistingJiraMatch,
    TicketCreateRequest,
)

# Pattern to validate Jira project keys (only allow valid keys)
_PROJECT_KEY_PATTERN = re.compile(r"^[A-Z][A-Z0-9]{1,9}$")


def _sanitize_jql_text(value: str) -> str:
    """Sanitize a text value for safe inclusion in JQL queries.

    Escapes characters that have special meaning in JQL text searches
    to prevent JQL injection attacks.
    """
    # Remove any control characters
    value = re.sub(r"[\x00-\x1f\x7f]", "", value)
    # Escape JQL reserved characters: backslash, double-quote, single-quote
    value = value.replace("\\", "\\\\")
    value = value.replace('"', '\\"')
    value = value.replace("'", "\\'")
    # Remove JQL operators that could be injected
    # Strip sequences that look like JQL clauses
    value = re.sub(r"\b(AND|OR|NOT|ORDER BY|IN|IS|WAS|CHANGED)\b", "", value, flags=re.IGNORECASE)
    return value.strip()


def _validate_project_key(key: str) -> str:
    """Validate and return a safe Jira project key.

    Raises ValueError if the key doesn't match expected format.
    """
    key = key.strip().upper()
    if not _PROJECT_KEY_PATTERN.match(key):
        raise ValueError(f"Invalid Jira project key format: {key}")
    return key


class JiraClient:
    def __init__(self, server: str, token: str):
        self.server = server
        self.token = token
        self._client: JIRA | None = None

    @property
    def client(self) -> JIRA:
        if self._client is None:
            self._client = JIRA(server=self.server, token_auth=self.token)
        return self._client

    def check_connection(self) -> dict:
        try:
            user = self.client.myself()
            return {
                "connected": True,
                "user": user.get("displayName", ""),
                "email": user.get("emailAddress", ""),
                "server": self.server,
            }
        except Exception as e:
            return {"connected": False, "error": str(e), "server": self.server}

    def get_projects(self) -> list[dict]:
        projects = self.client.projects()
        return [
            {"key": p.key, "name": p.name}
            for p in projects
        ]

    def check_duplicate(
        self,
        summary: str,
        project_key: str,
        commit_shas: list[str] | None = None,
    ) -> DuplicateCheckResult:
        """Check if a ticket with a similar summary already exists.

        Uses multiple strategies:
        1. Summary text search (fuzzy)
        2. Commit SHA references in descriptions
        Returns confidence level: high, medium, low, or none.
        """
        safe_key = _validate_project_key(project_key)
        matches: dict[str, ExistingJiraMatch] = {}

        # Strategy 1: Summary text search
        clean_summary = _sanitize_jql_text(summary)
        # Extract the key phrase (strip repo prefix like "[repo-name]")
        core_summary = re.sub(r"^\[.*?\]\s*", "", clean_summary).strip()
        # Take first 60 chars of core summary for search
        search_text = core_summary[:60] if core_summary else clean_summary[:60]

        if search_text:
            jql = (
                f'project = {safe_key} AND summary ~ "{_sanitize_jql_text(search_text)}" '
                f"AND created >= -60d"
            )
            try:
                results = self.client.search_issues(jql, maxResults=5)
                for issue in results:
                    key = str(issue.key)
                    matches[key] = ExistingJiraMatch(
                        key=key,
                        summary=str(issue.fields.summary),
                        status=str(issue.fields.status),
                        url=f"{self.server}/browse/{key}",
                    )
            except Exception:
                pass

        # Strategy 2: Check for commit SHA references
        for sha in (commit_shas or [])[:5]:
            safe_sha = _sanitize_jql_text(sha[:7])
            if len(safe_sha) < 6:
                continue
            jql_sha = (
                f'project = {safe_key} AND description ~ "{safe_sha}"'
            )
            try:
                results = self.client.search_issues(jql_sha, maxResults=3)
                for issue in results:
                    key = str(issue.key)
                    if key not in matches:
                        matches[key] = ExistingJiraMatch(
                            key=key,
                            summary=str(issue.fields.summary),
                            status=str(issue.fields.status),
                            url=f"{self.server}/browse/{key}",
                        )
            except Exception:
                pass

        match_list = list(matches.values())
        keys = [m.key for m in match_list]

        # Determine confidence
        if not match_list:
            confidence = "none"
        elif len(match_list) >= 2:
            confidence = "high"
        elif commit_shas and any(sha[:7] in str(m.summary) for m in match_list for sha in commit_shas):
            confidence = "high"
        else:
            confidence = "medium"

        return DuplicateCheckResult(
            is_duplicate=len(keys) > 0,
            confidence=confidence,
            existing_keys=keys,
            matches=match_list,
        )

    def create_ticket(self, request: TicketCreateRequest) -> CreatedTicket:
        try:
            fields = {
                "project": {"key": request.project_key},
                "summary": request.summary,
                "description": request.description,
                "issuetype": {"name": request.issue_type.value},
                "priority": {"name": request.priority.value},
            }
            if request.labels:
                fields["labels"] = request.labels
            if request.assignee:
                fields["assignee"] = {"name": request.assignee}
            issue = self.client.create_issue(fields=fields)
            issue_key = str(issue.key)

            # Add PR remote links
            for pr_url in request.pr_urls:
                try:
                    self.client.add_remote_link(
                        issue_key,
                        {
                            "url": pr_url,
                            "title": pr_url.split("/")[-1]
                            if "/pull/" in pr_url
                            else pr_url,
                        },
                        globalId=f"github-pr-{pr_url}",
                        relationship="is developed by",
                    )
                except Exception:
                    pass  # Non-fatal: ticket still created

            return CreatedTicket(
                key=issue_key,
                url=f"{self.server}/browse/{issue_key}",
                summary=request.summary,
            )
        except Exception as e:
            return CreatedTicket(
                key="ERROR",
                url="",
                summary=request.summary,
                error=str(e),
            )

    def find_existing(
        self,
        project_key: str,
        repo_name: str,
        branch: str = "",
        pr_urls: list[str] | None = None,
        commit_shas: list[str] | None = None,
    ) -> list[ExistingJiraMatch]:
        """Search for existing Jira tickets that already track this work.

        Uses multiple strategies with sanitized JQL:
        1. Repo name in summary
        2. Branch name in summary/description (non-default branches only)
        3. PR URLs in descriptions
        4. Commit SHAs in descriptions
        """
        safe_key = _validate_project_key(project_key)
        matches: dict[str, ExistingJiraMatch] = {}

        def _collect(jql: str, max_results: int = 10) -> None:
            try:
                results = self.client.search_issues(jql, maxResults=max_results)
                for issue in results:
                    key = str(issue.key)
                    if key not in matches:
                        matches[key] = ExistingJiraMatch(
                            key=key,
                            summary=str(issue.fields.summary),
                            status=str(issue.fields.status),
                            url=f"{self.server}/browse/{key}",
                        )
            except Exception:
                pass

        # Strategy 1: Repo name in summary
        clean_repo = _sanitize_jql_text(repo_name)
        if clean_repo:
            _collect(f'project = {safe_key} AND summary ~ "{clean_repo}"')

        # Strategy 2: Branch name (non-default branches)
        if branch and branch not in ("main", "master", "development", "develop"):
            clean_branch = _sanitize_jql_text(branch)
            if clean_branch:
                _collect(
                    f'project = {safe_key} AND '
                    f'(summary ~ "{clean_branch}" OR description ~ "{clean_branch}")'
                )

        # Strategy 3: PR URLs in description
        for pr_url in (pr_urls or []):
            if "/pull/" in pr_url:
                pr_ref = _sanitize_jql_text(pr_url.split("/pull/")[-1])
                repo_slug = _sanitize_jql_text(
                    pr_url.split("/pull/")[0].split("/")[-1]
                )
                if repo_slug and pr_ref:
                    _collect(
                        f'project = {safe_key} AND '
                        f'description ~ "{repo_slug}" AND description ~ "pull/{pr_ref}"',
                        max_results=5,
                    )

        # Strategy 4: Commit SHAs in descriptions
        for sha in (commit_shas or [])[:5]:
            safe_sha = _sanitize_jql_text(sha[:7])
            if len(safe_sha) >= 6:
                _collect(
                    f'project = {safe_key} AND description ~ "{safe_sha}"',
                    max_results=3,
                )

        return list(matches.values())

    def search_issues(self, jql: str, max_results: int = 20) -> list[dict]:
        results = self.client.search_issues(jql, maxResults=max_results)
        return [
            {
                "key": str(issue.key),
                "summary": str(issue.fields.summary),
                "status": str(issue.fields.status),
                "url": f"{self.server}/browse/{issue.key}",
            }
            for issue in results
        ]

    def search_issues_safe(
        self,
        project_key: str,
        text: str,
        since: str = "",
        max_results: int = 50,
    ) -> list[dict]:
        """Search issues using sanitized inputs instead of raw JQL."""
        safe_key = _validate_project_key(project_key)
        safe_text = _sanitize_jql_text(text)
        jql = f'project = {safe_key} AND summary ~ "{safe_text}"'
        if since:
            # Validate date format (YYYY-MM-DD)
            safe_since = _sanitize_jql_text(since)
            if re.match(r"^\d{4}-\d{2}-\d{2}$", safe_since):
                jql += f' AND created >= "{safe_since}"'
        jql += " ORDER BY created DESC"
        return self.search_issues(jql, max_results)
