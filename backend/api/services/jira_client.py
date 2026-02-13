from __future__ import annotations

from jira import JIRA

from ..models.jira_models import (
    CreatedTicket,
    DuplicateCheckResult,
    ExistingJiraMatch,
    TicketCreateRequest,
)


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

    def check_duplicate(self, summary: str, project_key: str) -> DuplicateCheckResult:
        clean_summary = summary.replace('"', '\\"')
        jql = f'project = {project_key} AND summary ~ "{clean_summary}" AND created >= -30d'
        try:
            results = self.client.search_issues(jql, maxResults=5)
            keys = [str(issue.key) for issue in results]
            return DuplicateCheckResult(
                is_duplicate=len(keys) > 0,
                existing_keys=keys,
            )
        except Exception:
            return DuplicateCheckResult(is_duplicate=False)

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
    ) -> list[ExistingJiraMatch]:
        """Search for existing Jira tickets that already track this work."""
        matches: dict[str, ExistingJiraMatch] = {}

        # Search by repo name in summary (our tickets use "[repo-name] ..." format)
        # Note: Jira text search doesn't handle brackets well, search without them
        clean_repo = repo_name.replace('"', '\\"')
        jql = f'project = {project_key} AND summary ~ "{clean_repo}"'
        try:
            results = self.client.search_issues(jql, maxResults=10)
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

        # Also search by branch name if it's not a default branch
        if branch and branch not in ("main", "master", "development"):
            clean_branch = branch.replace('"', '\\"')
            jql_branch = (
                f'project = {project_key} AND '
                f'(summary ~ "{clean_branch}" OR description ~ "{clean_branch}")'
            )
            try:
                results = self.client.search_issues(jql_branch, maxResults=10)
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

        # Search by PR URLs in description
        for pr_url in (pr_urls or []):
            # Extract the PR number portion for a text search
            if "/pull/" in pr_url:
                pr_ref = pr_url.split("/pull/")[-1]
                repo_slug = pr_url.split("/pull/")[0].split("/")[-1]
                jql_pr = (
                    f'project = {project_key} AND '
                    f'description ~ "{repo_slug}" AND description ~ "pull/{pr_ref}"'
                )
                try:
                    results = self.client.search_issues(jql_pr, maxResults=5)
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
