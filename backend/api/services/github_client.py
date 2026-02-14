"""GitHub API client for repository analysis and PR management."""
from __future__ import annotations

import os
from typing import Any, Optional
from datetime import datetime, timedelta

import requests


class GitHubClient:
    """Client for interacting with GitHub API."""

    def __init__(self, token: Optional[str] = None):
        """Initialize GitHub client with personal access token."""
        self.token = token or os.getenv("GITHUB_TOKEN", "")
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"

    def _request(
        self, method: str, endpoint: str, **kwargs
    ) -> Any:
        """Make authenticated request to GitHub API."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        response = requests.request(method, url, headers=self.headers, **kwargs)
        response.raise_for_status()
        return response.json()

    def check_connection(self) -> dict[str, Any]:
        """Verify GitHub API connection and get authenticated user info."""
        try:
            user_data = self._request("GET", "/user")
            return {
                "connected": True,
                "username": user_data.get("login", ""),
                "name": user_data.get("name", ""),
                "email": user_data.get("email", ""),
                "avatar_url": user_data.get("avatar_url", ""),
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}

    def get_repo_info(self, owner: str, repo: str) -> dict[str, Any]:
        """Get repository information."""
        try:
            repo_data = self._request("GET", f"/repos/{owner}/{repo}")
            return {
                "id": repo_data["id"],
                "name": repo_data["name"],
                "full_name": repo_data["full_name"],
                "description": repo_data.get("description", ""),
                "url": repo_data["html_url"],
                "default_branch": repo_data["default_branch"],
                "private": repo_data["private"],
                "stars": repo_data["stargazers_count"],
                "forks": repo_data["forks_count"],
                "open_issues": repo_data["open_issues_count"],
                "language": repo_data.get("language", ""),
                "created_at": repo_data["created_at"],
                "updated_at": repo_data["updated_at"],
                "pushed_at": repo_data["pushed_at"],
            }
        except Exception as e:
            return {"error": str(e)}

    def get_pull_requests(
        self,
        owner: str,
        repo: str,
        state: str = "all",
        since_days: int = 30,
    ) -> list[dict[str, Any]]:
        """Get pull requests for a repository."""
        try:
            since_date = (datetime.now() - timedelta(days=since_days)).isoformat()
            prs = self._request(
                "GET",
                f"/repos/{owner}/{repo}/pulls",
                params={"state": state, "sort": "updated", "direction": "desc"},
            )

            result = []
            for pr in prs:
                # Filter by updated date
                if pr.get("updated_at", "") < since_date:
                    continue

                result.append({
                    "number": pr["number"],
                    "title": pr["title"],
                    "state": pr["state"],
                    "url": pr["html_url"],
                    "branch": pr["head"]["ref"],
                    "base_branch": pr["base"]["ref"],
                    "author": pr["user"]["login"],
                    "created_at": pr["created_at"],
                    "updated_at": pr["updated_at"],
                    "merged_at": pr.get("merged_at"),
                    "closed_at": pr.get("closed_at"),
                    "mergeable": pr.get("mergeable"),
                    "comments": pr.get("comments", 0),
                    "commits": pr.get("commits", 0),
                    "additions": pr.get("additions", 0),
                    "deletions": pr.get("deletions", 0),
                    "changed_files": pr.get("changed_files", 0),
                })

            return result
        except Exception as e:
            return []

    def get_pr_details(self, owner: str, repo: str, pr_number: int) -> dict[str, Any]:
        """Get detailed information about a specific pull request."""
        try:
            pr = self._request("GET", f"/repos/{owner}/{repo}/pulls/{pr_number}")

            # Get PR reviews
            reviews = self._request(
                "GET", f"/repos/{owner}/{repo}/pulls/{pr_number}/reviews"
            )

            # Get PR commits
            commits = self._request(
                "GET", f"/repos/{owner}/{repo}/pulls/{pr_number}/commits"
            )

            return {
                "number": pr["number"],
                "title": pr["title"],
                "body": pr.get("body", ""),
                "state": pr["state"],
                "url": pr["html_url"],
                "branch": pr["head"]["ref"],
                "base_branch": pr["base"]["ref"],
                "author": pr["user"]["login"],
                "created_at": pr["created_at"],
                "updated_at": pr["updated_at"],
                "merged_at": pr.get("merged_at"),
                "closed_at": pr.get("closed_at"),
                "mergeable": pr.get("mergeable"),
                "mergeable_state": pr.get("mergeable_state", ""),
                "comments": pr.get("comments", 0),
                "review_comments": pr.get("review_comments", 0),
                "commits": len(commits),
                "additions": pr.get("additions", 0),
                "deletions": pr.get("deletions", 0),
                "changed_files": pr.get("changed_files", 0),
                "reviews": [
                    {
                        "user": review["user"]["login"],
                        "state": review["state"],
                        "submitted_at": review["submitted_at"],
                    }
                    for review in reviews
                ],
                "commit_shas": [commit["sha"] for commit in commits],
            }
        except Exception as e:
            return {"error": str(e)}

    def get_commits(
        self,
        owner: str,
        repo: str,
        since_days: int = 30,
        branch: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """Get commits for a repository."""
        try:
            since_date = (datetime.now() - timedelta(days=since_days)).isoformat()
            params = {"since": since_date}
            if branch:
                params["sha"] = branch

            commits = self._request("GET", f"/repos/{owner}/{repo}/commits", params=params)

            result = []
            for commit in commits:
                result.append({
                    "sha": commit["sha"],
                    "short_sha": commit["sha"][:7],
                    "message": commit["commit"]["message"],
                    "author": commit["commit"]["author"]["name"],
                    "author_email": commit["commit"]["author"]["email"],
                    "date": commit["commit"]["author"]["date"],
                    "url": commit["html_url"],
                    "verified": commit["commit"].get("verification", {}).get("verified", False),
                })

            return result
        except Exception as e:
            return []

    def get_branches(self, owner: str, repo: str) -> list[dict[str, Any]]:
        """Get branches for a repository."""
        try:
            branches = self._request("GET", f"/repos/{owner}/{repo}/branches")

            result = []
            for branch in branches:
                result.append({
                    "name": branch["name"],
                    "protected": branch.get("protected", False),
                    "commit_sha": branch["commit"]["sha"],
                })

            return result
        except Exception as e:
            return []

    def create_issue(
        self,
        owner: str,
        repo: str,
        title: str,
        body: str,
        labels: Optional[list[str]] = None,
        assignees: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """Create a GitHub issue."""
        try:
            data: dict[str, Any] = {"title": title, "body": body}
            if labels:
                data["labels"] = labels
            if assignees:
                data["assignees"] = assignees

            issue = self._request("POST", f"/repos/{owner}/{repo}/issues", json=data)

            return {
                "number": issue["number"],
                "url": issue["html_url"],
                "state": issue["state"],
                "created_at": issue["created_at"],
            }
        except Exception as e:
            return {"error": str(e)}

    def link_pr_to_issue(
        self, owner: str, repo: str, pr_number: int, issue_number: int
    ) -> bool:
        """Link a pull request to an issue by adding a comment."""
        try:
            comment_body = f"Linked to #{issue_number}"
            self._request(
                "POST",
                f"/repos/{owner}/{repo}/issues/{pr_number}/comments",
                json={"body": comment_body},
            )
            return True
        except Exception:
            return False

    def get_workflow_runs(
        self, owner: str, repo: str, since_days: int = 30
    ) -> list[dict[str, Any]]:
        """Get GitHub Actions workflow runs."""
        try:
            since_date = (datetime.now() - timedelta(days=since_days)).isoformat()

            runs = self._request("GET", f"/repos/{owner}/{repo}/actions/runs")

            result = []
            for run in runs.get("workflow_runs", []):
                # Filter by created date
                if run.get("created_at", "") < since_date:
                    continue

                result.append({
                    "id": run["id"],
                    "name": run["name"],
                    "status": run["status"],
                    "conclusion": run.get("conclusion"),
                    "branch": run["head_branch"],
                    "commit_sha": run["head_sha"],
                    "created_at": run["created_at"],
                    "updated_at": run["updated_at"],
                    "url": run["html_url"],
                })

            return result
        except Exception:
            return []

    def extract_repo_from_remote(self, remote_url: str) -> tuple[str, str] | None:
        """Extract owner and repo name from a Git remote URL."""
        if not remote_url:
            return None

        # Handle HTTPS URLs: https://github.com/owner/repo.git
        if "github.com/" in remote_url:
            parts = remote_url.split("github.com/")[-1].rstrip("/").rstrip(".git").split("/")
            if len(parts) >= 2:
                return parts[0], parts[1]

        # Handle SSH URLs: git@github.com:owner/repo.git
        if "git@github.com:" in remote_url:
            parts = remote_url.split("git@github.com:")[-1].rstrip(".git").split("/")
            if len(parts) >= 2:
                return parts[0], parts[1]

        return None
