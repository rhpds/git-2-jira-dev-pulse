"""Linear API client for issue tracking and project management."""
from __future__ import annotations

import os
from typing import Any, Optional, Dict, List
from datetime import datetime, timedelta

import requests


class LinearClient:
    """Client for interacting with Linear GraphQL API."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Linear client with API key."""
        self.api_key = api_key or os.getenv("LINEAR_API_KEY", "")
        self.base_url = "https://api.linear.app/graphql"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": self.api_key,
        }

    def _request(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make authenticated GraphQL request to Linear API."""
        payload = {"query": query}
        if variables:
            payload["variables"] = variables

        response = requests.post(self.base_url, json=payload, headers=self.headers)
        response.raise_for_status()

        result = response.json()
        if "errors" in result:
            raise Exception(f"Linear API error: {result['errors']}")

        return result.get("data", {})

    def check_connection(self) -> Dict[str, Any]:
        """Verify Linear API connection and get authenticated user info."""
        query = """
        query {
            viewer {
                id
                name
                email
                displayName
                avatarUrl
            }
        }
        """
        try:
            data = self._request(query)
            viewer = data.get("viewer", {})
            return {
                "connected": True,
                "user_id": viewer.get("id", ""),
                "name": viewer.get("name", ""),
                "display_name": viewer.get("displayName", ""),
                "email": viewer.get("email", ""),
                "avatar_url": viewer.get("avatarUrl", ""),
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}

    def get_teams(self) -> List[Dict[str, Any]]:
        """Get all teams accessible to the user."""
        query = """
        query {
            teams {
                nodes {
                    id
                    name
                    key
                    description
                    private
                    issueCount
                }
            }
        }
        """
        try:
            data = self._request(query)
            teams = data.get("teams", {}).get("nodes", [])
            return [
                {
                    "id": team["id"],
                    "name": team["name"],
                    "key": team["key"],
                    "description": team.get("description", ""),
                    "private": team.get("private", False),
                    "issue_count": team.get("issueCount", 0),
                }
                for team in teams
            ]
        except Exception as e:
            return []

    def get_projects(self, team_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get projects, optionally filtered by team."""
        query = """
        query($teamId: String) {
            projects(filter: { team: { id: { eq: $teamId } } }) {
                nodes {
                    id
                    name
                    description
                    state
                    priority
                    startDate
                    targetDate
                    leadId
                    teamIds
                    issueCount
                }
            }
        }
        """
        variables = {"teamId": team_id} if team_id else {}

        try:
            data = self._request(query, variables)
            projects = data.get("projects", {}).get("nodes", [])
            return [
                {
                    "id": project["id"],
                    "name": project["name"],
                    "description": project.get("description", ""),
                    "state": project.get("state", ""),
                    "priority": project.get("priority", 0),
                    "start_date": project.get("startDate"),
                    "target_date": project.get("targetDate"),
                    "lead_id": project.get("leadId"),
                    "team_ids": project.get("teamIds", []),
                    "issue_count": project.get("issueCount", 0),
                }
                for project in projects
            ]
        except Exception:
            return []

    def get_issues(
        self,
        team_id: Optional[str] = None,
        project_id: Optional[str] = None,
        state: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Get issues with optional filters."""
        # Build filter
        filters = []
        if team_id:
            filters.append(f'team: {{ id: {{ eq: "{team_id}" }} }}')
        if project_id:
            filters.append(f'project: {{ id: {{ eq: "{project_id}" }} }}')
        if state:
            filters.append(f'state: {{ name: {{ eq: "{state}" }} }}')

        filter_str = f"filter: {{ {', '.join(filters)} }}" if filters else ""

        query = f"""
        query {{
            issues(first: {limit}, {filter_str}) {{
                nodes {{
                    id
                    identifier
                    title
                    description
                    priority
                    estimate
                    url
                    state {{
                        name
                        type
                    }}
                    team {{
                        id
                        name
                        key
                    }}
                    assignee {{
                        id
                        name
                        email
                    }}
                    creator {{
                        id
                        name
                    }}
                    project {{
                        id
                        name
                    }}
                    createdAt
                    updatedAt
                    completedAt
                    labels {{
                        nodes {{
                            name
                        }}
                    }}
                }}
            }}
        }}
        """

        try:
            data = self._request(query)
            issues = data.get("issues", {}).get("nodes", [])
            return [
                {
                    "id": issue["id"],
                    "identifier": issue["identifier"],
                    "title": issue["title"],
                    "description": issue.get("description", ""),
                    "priority": issue.get("priority", 0),
                    "estimate": issue.get("estimate"),
                    "url": issue["url"],
                    "state_name": issue.get("state", {}).get("name", ""),
                    "state_type": issue.get("state", {}).get("type", ""),
                    "team_id": issue.get("team", {}).get("id"),
                    "team_name": issue.get("team", {}).get("name", ""),
                    "team_key": issue.get("team", {}).get("key", ""),
                    "assignee_id": issue.get("assignee", {}).get("id"),
                    "assignee_name": issue.get("assignee", {}).get("name", ""),
                    "assignee_email": issue.get("assignee", {}).get("email", ""),
                    "creator_id": issue.get("creator", {}).get("id"),
                    "creator_name": issue.get("creator", {}).get("name", ""),
                    "project_id": issue.get("project", {}).get("id"),
                    "project_name": issue.get("project", {}).get("name", ""),
                    "created_at": issue["createdAt"],
                    "updated_at": issue["updatedAt"],
                    "completed_at": issue.get("completedAt"),
                    "labels": [label["name"] for label in issue.get("labels", {}).get("nodes", [])],
                }
                for issue in issues
            ]
        except Exception:
            return []

    def get_issue(self, issue_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific issue by ID."""
        query = f"""
        query {{
            issue(id: "{issue_id}") {{
                id
                identifier
                title
                description
                priority
                estimate
                url
                state {{
                    name
                    type
                }}
                team {{
                    id
                    name
                    key
                }}
                assignee {{
                    id
                    name
                    email
                }}
                creator {{
                    id
                    name
                }}
                project {{
                    id
                    name
                }}
                createdAt
                updatedAt
                completedAt
                labels {{
                    nodes {{
                        name
                    }}
                }}
                comments {{
                    nodes {{
                        id
                        body
                        createdAt
                        user {{
                            name
                        }}
                    }}
                }}
            }}
        }}
        """

        try:
            data = self._request(query)
            issue = data.get("issue")
            if not issue:
                return None

            return {
                "id": issue["id"],
                "identifier": issue["identifier"],
                "title": issue["title"],
                "description": issue.get("description", ""),
                "priority": issue.get("priority", 0),
                "estimate": issue.get("estimate"),
                "url": issue["url"],
                "state_name": issue.get("state", {}).get("name", ""),
                "state_type": issue.get("state", {}).get("type", ""),
                "team_id": issue.get("team", {}).get("id"),
                "team_name": issue.get("team", {}).get("name", ""),
                "team_key": issue.get("team", {}).get("key", ""),
                "assignee_id": issue.get("assignee", {}).get("id"),
                "assignee_name": issue.get("assignee", {}).get("name", ""),
                "assignee_email": issue.get("assignee", {}).get("email", ""),
                "creator_id": issue.get("creator", {}).get("id"),
                "creator_name": issue.get("creator", {}).get("name", ""),
                "project_id": issue.get("project", {}).get("id"),
                "project_name": issue.get("project", {}).get("name", ""),
                "created_at": issue["createdAt"],
                "updated_at": issue["updatedAt"],
                "completed_at": issue.get("completedAt"),
                "labels": [label["name"] for label in issue.get("labels", {}).get("nodes", [])],
                "comments": [
                    {
                        "id": comment["id"],
                        "body": comment["body"],
                        "created_at": comment["createdAt"],
                        "user_name": comment.get("user", {}).get("name", ""),
                    }
                    for comment in issue.get("comments", {}).get("nodes", [])
                ],
            }
        except Exception:
            return None

    def create_issue(
        self,
        team_id: str,
        title: str,
        description: str = "",
        priority: int = 0,
        assignee_id: Optional[str] = None,
        project_id: Optional[str] = None,
        labels: Optional[List[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Create a new Linear issue."""
        mutation = """
        mutation IssueCreate($input: IssueCreateInput!) {
            issueCreate(input: $input) {
                success
                issue {
                    id
                    identifier
                    title
                    url
                }
            }
        }
        """

        variables = {
            "input": {
                "teamId": team_id,
                "title": title,
                "description": description,
                "priority": priority,
            }
        }

        if assignee_id:
            variables["input"]["assigneeId"] = assignee_id
        if project_id:
            variables["input"]["projectId"] = project_id
        if labels:
            variables["input"]["labelIds"] = labels

        try:
            data = self._request(mutation, variables)
            result = data.get("issueCreate", {})
            if result.get("success"):
                issue = result.get("issue", {})
                return {
                    "id": issue["id"],
                    "identifier": issue["identifier"],
                    "title": issue["title"],
                    "url": issue["url"],
                }
            return None
        except Exception:
            return None

    def add_comment(self, issue_id: str, body: str) -> bool:
        """Add a comment to a Linear issue."""
        mutation = """
        mutation CommentCreate($input: CommentCreateInput!) {
            commentCreate(input: $input) {
                success
            }
        }
        """

        variables = {
            "input": {
                "issueId": issue_id,
                "body": body,
            }
        }

        try:
            data = self._request(mutation, variables)
            return data.get("commentCreate", {}).get("success", False)
        except Exception:
            return False
