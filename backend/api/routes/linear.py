"""Linear integration API routes."""
from __future__ import annotations

import os
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import LinearIntegration, LinearIssue as DBLinearIssue
from ..models.linear_models import (
    LinearConnectionStatus,
    LinearTeam,
    LinearProject,
    LinearIssue,
    LinearIssueDetails,
    LinearIntegrationConfig,
    EnableLinearIntegrationRequest,
    LinearSyncResult,
    LinkLinearToJiraRequest,
    LinkLinearToJiraResponse,
    CreateLinearIssueRequest,
)
from ..services.linear_client import LinearClient

router = APIRouter(prefix="/api/linear", tags=["linear"])


def get_linear_client() -> LinearClient:
    """Get Linear client with API key from environment."""
    api_key = os.getenv("LINEAR_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="LINEAR_API_KEY not configured")
    return LinearClient(api_key=api_key)


@router.get("/health")
async def check_linear_connection(
    client: LinearClient = Depends(get_linear_client),
) -> LinearConnectionStatus:
    """Check Linear API connection status."""
    result = client.check_connection()
    return LinearConnectionStatus(**result)


@router.get("/teams")
async def get_teams(
    client: LinearClient = Depends(get_linear_client),
) -> list[LinearTeam]:
    """Get all Linear teams accessible to the user."""
    teams = client.get_teams()
    return [LinearTeam(**team) for team in teams]


@router.get("/projects")
async def get_projects(
    team_id: Optional[str] = None,
    client: LinearClient = Depends(get_linear_client),
) -> list[LinearProject]:
    """Get Linear projects, optionally filtered by team."""
    projects = client.get_projects(team_id=team_id)
    return [LinearProject(**project) for project in projects]


@router.get("/issues")
async def get_issues(
    team_id: Optional[str] = None,
    project_id: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = 50,
    client: LinearClient = Depends(get_linear_client),
) -> list[LinearIssue]:
    """Get Linear issues with optional filters."""
    issues = client.get_issues(
        team_id=team_id,
        project_id=project_id,
        state=state,
        limit=limit
    )
    return [LinearIssue(**issue) for issue in issues]


@router.get("/issues/{issue_id}")
async def get_issue(
    issue_id: str,
    client: LinearClient = Depends(get_linear_client),
) -> LinearIssueDetails:
    """Get detailed information about a specific Linear issue."""
    issue = client.get_issue(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Linear issue not found")
    return LinearIssueDetails(**issue)


@router.post("/issues")
async def create_issue(
    request: CreateLinearIssueRequest,
    client: LinearClient = Depends(get_linear_client),
) -> dict:
    """Create a new Linear issue."""
    result = client.create_issue(
        team_id=request.team_id,
        title=request.title,
        description=request.description,
        priority=request.priority,
        assignee_id=request.assignee_id,
        project_id=request.project_id,
        labels=request.labels,
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create Linear issue")
    return result


@router.post("/enable")
async def enable_linear_integration(
    request: EnableLinearIntegrationRequest,
    db: Session = Depends(get_db),
    client: LinearClient = Depends(get_linear_client),
) -> dict:
    """Enable Linear integration for a team."""
    # Auto-detect team info if not provided
    if not request.team_name or not request.team_key:
        teams = client.get_teams()
        team = next((t for t in teams if t["id"] == request.team_id), None)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        request.team_name = request.team_name or team["name"]
        request.team_key = request.team_key or team["key"]

    # Check if integration already exists
    stmt = select(LinearIntegration).where(LinearIntegration.team_id == request.team_id)
    existing = db.execute(stmt).scalar_one_or_none()

    if existing:
        # Update existing
        existing.team_name = request.team_name
        existing.team_key = request.team_key
        existing.auto_sync = request.auto_sync
        existing.sync_interval_minutes = request.sync_interval_minutes
        existing.updated_at = datetime.now()
        db.commit()
        db.refresh(existing)
        integration = existing
    else:
        # Create new
        integration = LinearIntegration(
            team_id=request.team_id,
            team_name=request.team_name,
            team_key=request.team_key,
            auto_sync=request.auto_sync,
            sync_interval_minutes=request.sync_interval_minutes,
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)

    return {
        "success": True,
        "integration_id": integration.id,
        "team_id": integration.team_id,
        "team_name": integration.team_name,
        "team_key": integration.team_key,
    }


@router.delete("/disable/{team_id}")
async def disable_linear_integration(
    team_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Disable Linear integration for a team."""
    stmt = select(LinearIntegration).where(LinearIntegration.team_id == team_id)
    integration = db.execute(stmt).scalar_one_or_none()

    if not integration:
        raise HTTPException(status_code=404, detail="Linear integration not found")

    db.delete(integration)
    db.commit()

    return {"success": True, "message": "Linear integration disabled"}


@router.get("/integrations")
async def list_linear_integrations(
    db: Session = Depends(get_db),
) -> list[dict]:
    """List all Linear integrations."""
    stmt = select(LinearIntegration)
    integrations = db.execute(stmt).scalars().all()

    return [
        {
            "id": integration.id,
            "team_id": integration.team_id,
            "team_name": integration.team_name,
            "team_key": integration.team_key,
            "enabled": integration.enabled,
            "auto_sync": integration.auto_sync,
            "sync_interval_minutes": integration.sync_interval_minutes,
            "last_synced": integration.last_synced.isoformat() if integration.last_synced else None,
            "metadata": integration.team_metadata,
        }
        for integration in integrations
    ]


@router.post("/sync/{team_id}")
async def sync_linear_data(
    team_id: str,
    limit: int = 100,
    db: Session = Depends(get_db),
    client: LinearClient = Depends(get_linear_client),
) -> LinearSyncResult:
    """Sync Linear data (issues) for a team."""
    stmt = select(LinearIntegration).where(LinearIntegration.team_id == team_id)
    integration = db.execute(stmt).scalar_one_or_none()

    if not integration:
        raise HTTPException(status_code=404, detail="Linear integration not found")

    try:
        # Fetch issues from Linear
        issues = client.get_issues(team_id=team_id, limit=limit)
        issues_synced = 0

        for issue_data in issues:
            # Check if issue already exists in DB
            stmt_issue = select(DBLinearIssue).where(
                DBLinearIssue.linear_id == issue_data["id"]
            )
            existing_issue = db.execute(stmt_issue).scalar_one_or_none()

            if existing_issue:
                # Update existing issue
                existing_issue.title = issue_data["title"]
                existing_issue.description = issue_data.get("description", "")
                existing_issue.state_name = issue_data["state_name"]
                existing_issue.state_type = issue_data["state_type"]
                existing_issue.priority = issue_data["priority"]
                existing_issue.assignee_id = issue_data.get("assignee_id")
                existing_issue.assignee_name = issue_data.get("assignee_name")
                existing_issue.project_id = issue_data.get("project_id")
                existing_issue.project_name = issue_data.get("project_name")
                existing_issue.updated_at_linear = datetime.fromisoformat(
                    issue_data["updated_at"].rstrip("Z")
                )
                if issue_data.get("completed_at"):
                    existing_issue.completed_at = datetime.fromisoformat(
                        issue_data["completed_at"].rstrip("Z")
                    )
                existing_issue.issue_data = issue_data
                existing_issue.last_synced = datetime.now()
            else:
                # Create new issue record
                new_issue = DBLinearIssue(
                    integration_id=integration.id,
                    linear_id=issue_data["id"],
                    identifier=issue_data["identifier"],
                    title=issue_data["title"],
                    description=issue_data.get("description", ""),
                    state_name=issue_data["state_name"],
                    state_type=issue_data["state_type"],
                    priority=issue_data["priority"],
                    url=issue_data["url"],
                    assignee_id=issue_data.get("assignee_id"),
                    assignee_name=issue_data.get("assignee_name"),
                    project_id=issue_data.get("project_id"),
                    project_name=issue_data.get("project_name"),
                    created_at_linear=datetime.fromisoformat(
                        issue_data["created_at"].rstrip("Z")
                    ),
                    updated_at_linear=datetime.fromisoformat(
                        issue_data["updated_at"].rstrip("Z")
                    ),
                    completed_at=(
                        datetime.fromisoformat(issue_data["completed_at"].rstrip("Z"))
                        if issue_data.get("completed_at")
                        else None
                    ),
                    issue_data=issue_data,
                )
                db.add(new_issue)

            issues_synced += 1

        # Update integration last_synced
        integration.last_synced = datetime.now()
        db.commit()

        return LinearSyncResult(
            success=True,
            team_name=integration.team_name,
            issues_synced=issues_synced,
            last_synced=integration.last_synced,
        )

    except Exception as e:
        return LinearSyncResult(
            success=False,
            team_name=integration.team_name,
            error=str(e),
        )


@router.get("/{team_id}/issues")
async def get_team_issues(
    team_id: str,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
) -> list[dict]:
    """Get cached Linear issues for a team."""
    stmt = select(LinearIntegration).where(LinearIntegration.team_id == team_id)
    integration = db.execute(stmt).scalar_one_or_none()

    if not integration:
        raise HTTPException(status_code=404, detail="Linear integration not found")

    stmt_issues = select(DBLinearIssue).where(
        DBLinearIssue.integration_id == integration.id
    )
    if state:
        stmt_issues = stmt_issues.where(DBLinearIssue.state_type == state)

    issues = db.execute(stmt_issues.order_by(DBLinearIssue.updated_at_linear.desc())).scalars().all()

    return [
        {
            "id": issue.linear_id,
            "identifier": issue.identifier,
            "title": issue.title,
            "description": issue.description,
            "state_name": issue.state_name,
            "state_type": issue.state_type,
            "priority": issue.priority,
            "url": issue.url,
            "assignee_name": issue.assignee_name,
            "project_name": issue.project_name,
            "created_at": issue.created_at_linear.isoformat(),
            "updated_at": issue.updated_at_linear.isoformat(),
            "completed_at": issue.completed_at.isoformat() if issue.completed_at else None,
            "jira_key": issue.jira_key,
            "last_synced": issue.last_synced.isoformat(),
        }
        for issue in issues
    ]


@router.post("/link-to-jira")
async def link_issue_to_jira(
    request: LinkLinearToJiraRequest,
    db: Session = Depends(get_db),
    client: LinearClient = Depends(get_linear_client),
) -> LinkLinearToJiraResponse:
    """Link a Linear issue to a Jira ticket."""
    # Get Linear issue from database
    stmt = select(DBLinearIssue).where(DBLinearIssue.linear_id == request.linear_issue_id)
    issue = db.execute(stmt).scalar_one_or_none()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Linear issue not found in database. Run sync first."
        )

    # Update issue with Jira key
    issue.jira_key = request.jira_key
    db.commit()

    # Build URLs
    linear_url = issue.url
    jira_server = os.getenv("JIRA_URL", "https://your-jira.atlassian.net")
    jira_url = f"{jira_server}/browse/{request.jira_key}"

    # Optionally add comment to Linear issue
    if request.add_comment:
        try:
            comment_body = f"🎫 Linked to Jira: [{request.jira_key}]({jira_url})"
            client.add_comment(request.linear_issue_id, comment_body)
        except Exception:
            pass  # Non-fatal

    return LinkLinearToJiraResponse(
        success=True,
        linear_url=linear_url,
        jira_url=jira_url,
    )
