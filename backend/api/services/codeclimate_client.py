"""CodeClimate API client for code quality and test coverage metrics."""
from __future__ import annotations

import os
from typing import Any, Optional, Dict, List

import requests


class CodeClimateClient:
    """Client for interacting with CodeClimate API."""

    def __init__(self, api_token: Optional[str] = None):
        """Initialize CodeClimate client with API token."""
        self.api_token = api_token or os.getenv("CODECLIMATE_API_TOKEN", "")
        self.base_url = "https://api.codeclimate.com/v1"
        self.headers = {
            "Accept": "application/vnd.api+json",
            "Authorization": f"Token token={self.api_token}",
        }

    def _request(self, method: str, endpoint: str, **kwargs) -> Any:
        """Make authenticated request to CodeClimate API."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        response = requests.request(method, url, headers=self.headers, **kwargs)
        response.raise_for_status()
        return response.json()

    def check_connection(self) -> Dict[str, Any]:
        """Verify CodeClimate API connection."""
        try:
            # Try to get current user's orgs to verify token
            data = self._request("GET", "/orgs")
            return {
                "connected": True,
                "orgs_count": len(data.get("data", [])),
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}

    def get_orgs(self) -> List[Dict[str, Any]]:
        """Get all organizations accessible to the user."""
        try:
            data = self._request("GET", "/orgs")
            orgs = data.get("data", [])
            return [
                {
                    "id": org["id"],
                    "name": org["attributes"]["name"],
                    "avatar_url": org["attributes"].get("avatar_url", ""),
                }
                for org in orgs
            ]
        except Exception:
            return []

    def get_repos(self, org_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get repositories, optionally filtered by organization."""
        try:
            endpoint = f"/orgs/{org_id}/repos" if org_id else "/repos"
            data = self._request("GET", endpoint)
            repos = data.get("data", [])

            result = []
            for repo in repos:
                attrs = repo["attributes"]
                result.append({
                    "id": repo["id"],
                    "name": attrs["human_name"],
                    "slug": attrs["slug"],
                    "badge_token": attrs.get("badge_token", ""),
                    "github_slug": attrs.get("github_slug", ""),
                    "analysis_version": attrs.get("analysis_version", 0),
                    "last_activity_at": attrs.get("last_activity_at"),
                    "created_at": attrs.get("created_at"),
                })
            return result
        except Exception:
            return []

    def get_repo(self, repo_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific repository."""
        try:
            data = self._request("GET", f"/repos/{repo_id}")
            repo = data.get("data", {})
            attrs = repo.get("attributes", {})

            return {
                "id": repo["id"],
                "name": attrs["human_name"],
                "slug": attrs["slug"],
                "badge_token": attrs.get("badge_token", ""),
                "github_slug": attrs.get("github_slug", ""),
                "analysis_version": attrs.get("analysis_version", 0),
                "last_activity_at": attrs.get("last_activity_at"),
                "created_at": attrs.get("created_at"),
                "test_coverage": attrs.get("test_coverage"),
            }
        except Exception:
            return None

    def get_repo_snapshot(self, repo_id: str) -> Optional[Dict[str, Any]]:
        """Get the latest snapshot (quality metrics) for a repository."""
        try:
            data = self._request("GET", f"/repos/{repo_id}/snapshots/latest")
            snapshot = data.get("data", {})
            attrs = snapshot.get("attributes", {})

            return {
                "id": snapshot.get("id"),
                "commit_sha": attrs.get("commit_sha", ""),
                "committed_at": attrs.get("committed_at"),
                "created_at": attrs.get("created_at"),
                "gpa": attrs.get("gpa"),  # Maintainability score (0-4)
                "worker_version": attrs.get("worker_version", 0),
                "lines_of_code": attrs.get("lines_of_code", 0),
                "ratings": attrs.get("ratings", []),
            }
        except Exception:
            return None

    def get_test_coverage(self, repo_id: str) -> Optional[Dict[str, Any]]:
        """Get test coverage report for a repository."""
        try:
            data = self._request("GET", f"/repos/{repo_id}/test_reports")
            reports = data.get("data", [])

            if not reports:
                return None

            # Get the latest report
            latest = reports[0]
            attrs = latest.get("attributes", {})

            return {
                "id": latest.get("id"),
                "commit_sha": attrs.get("commit_sha", ""),
                "committed_at": attrs.get("committed_at"),
                "covered_percent": attrs.get("covered_percent", 0.0),
                "lines_covered": attrs.get("lines_covered", 0),
                "lines_total": attrs.get("total_lines", 0),
                "rating": attrs.get("rating"),  # A, B, C, D, F
                "received_at": attrs.get("received_at"),
            }
        except Exception:
            return None

    def get_issues(
        self,
        repo_id: str,
        category: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get code quality issues for a repository."""
        try:
            params = {"page[size]": limit}
            if category:
                params["filter[category]"] = category

            data = self._request("GET", f"/repos/{repo_id}/issues", params=params)
            issues = data.get("data", [])

            result = []
            for issue in issues:
                attrs = issue.get("attributes", {})
                result.append({
                    "id": issue["id"],
                    "check_name": attrs.get("check_name", ""),
                    "description": attrs.get("description", ""),
                    "category": attrs.get("categories", []),
                    "severity": attrs.get("severity", ""),
                    "remediation_points": attrs.get("remediation_points", 0),
                    "location": attrs.get("location", {}),
                    "fingerprint": attrs.get("fingerprint", ""),
                })
            return result
        except Exception:
            return []

    def get_repo_stats(self, repo_id: str) -> Dict[str, Any]:
        """Get comprehensive stats for a repository."""
        try:
            # Get snapshot for maintainability
            snapshot = self.get_repo_snapshot(repo_id)

            # Get test coverage
            coverage = self.get_test_coverage(repo_id)

            # Get issue count
            issues = self.get_issues(repo_id, limit=1000)

            # Calculate technical debt (remediation points to hours)
            total_remediation = sum(issue.get("remediation_points", 0) for issue in issues)
            technical_debt_hours = total_remediation / 50000  # CodeClimate uses 50k points = 1 hour

            # Convert GPA to letter grade
            gpa = snapshot.get("gpa", 0) if snapshot else 0
            grade_map = {
                4: "A", 3: "B", 2: "C", 1: "D", 0: "F"
            }
            maintainability_grade = grade_map.get(int(gpa), "F") if gpa else "N/A"

            return {
                "repo_id": repo_id,
                "maintainability_score": gpa,
                "maintainability_grade": maintainability_grade,
                "test_coverage": coverage.get("covered_percent", 0) if coverage else 0,
                "coverage_rating": coverage.get("rating", "N/A") if coverage else "N/A",
                "lines_of_code": snapshot.get("lines_of_code", 0) if snapshot else 0,
                "total_issues": len(issues),
                "technical_debt_hours": round(technical_debt_hours, 2),
                "last_snapshot_at": snapshot.get("committed_at") if snapshot else None,
                "last_coverage_at": coverage.get("committed_at") if coverage else None,
            }
        except Exception as e:
            return {
                "repo_id": repo_id,
                "error": str(e),
            }

    def get_repo_trends(self, repo_id: str, days: int = 30) -> Optional[Dict[str, Any]]:
        """Get quality trends for a repository over time."""
        try:
            # This would require multiple snapshot requests
            # For now, return basic trend data structure
            snapshot = self.get_repo_snapshot(repo_id)

            return {
                "repo_id": repo_id,
                "current_gpa": snapshot.get("gpa", 0) if snapshot else 0,
                "trend_direction": "stable",  # Would calculate from historical data
                "days": days,
            }
        except Exception:
            return None
