"""Pydantic models for Linear integration."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class LinearConnectionStatus(BaseModel):
    """Linear connection status response."""

    connected: bool
    user_id: Optional[str] = None
    name: Optional[str] = None
    display_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    error: Optional[str] = None


class LinearTeam(BaseModel):
    """Linear team information."""

    id: str
    name: str
    key: str
    description: str = ""
    private: bool = False
    issue_count: int = 0


class LinearProject(BaseModel):
    """Linear project information."""

    id: str
    name: str
    description: str = ""
    state: str = ""
    priority: int = 0
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    lead_id: Optional[str] = None
    team_ids: List[str] = Field(default_factory=list)
    issue_count: int = 0


class LinearIssue(BaseModel):
    """Linear issue information."""

    id: str
    identifier: str
    title: str
    description: str = ""
    priority: int = 0
    estimate: Optional[int] = None
    url: str
    state_name: str
    state_type: str
    team_id: Optional[str] = None
    team_name: Optional[str] = None
    team_key: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    creator_id: Optional[str] = None
    creator_name: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None
    labels: List[str] = Field(default_factory=list)
    jira_key: Optional[str] = None  # Linked Jira ticket


class LinearIssueDetails(LinearIssue):
    """Detailed Linear issue information with comments."""

    comments: List[dict] = Field(default_factory=list)


class LinearIntegrationConfig(BaseModel):
    """Linear integration configuration."""

    team_id: str
    team_name: str
    team_key: str
    enabled: bool = True
    auto_sync: bool = True
    sync_interval_minutes: int = 30


class EnableLinearIntegrationRequest(BaseModel):
    """Request to enable Linear integration for a team."""

    team_id: str
    team_name: Optional[str] = None  # Auto-detected if None
    team_key: Optional[str] = None  # Auto-detected if None
    auto_sync: bool = True
    sync_interval_minutes: int = 30


class LinearSyncResult(BaseModel):
    """Result of syncing Linear data."""

    success: bool
    team_name: str
    issues_synced: int = 0
    projects_synced: int = 0
    jira_links_created: int = 0
    error: Optional[str] = None
    last_synced: Optional[datetime] = None


class LinkLinearToJiraRequest(BaseModel):
    """Request to link a Linear issue to a Jira ticket."""

    linear_issue_id: str
    jira_key: str
    add_comment: bool = True  # Add comment to Linear issue linking to Jira


class LinkLinearToJiraResponse(BaseModel):
    """Response from linking Linear issue to Jira."""

    success: bool
    linear_url: str
    jira_url: str
    error: Optional[str] = None


class CreateLinearIssueRequest(BaseModel):
    """Request to create a Linear issue."""

    team_id: str
    title: str
    description: str = ""
    priority: int = 0
    assignee_id: Optional[str] = None
    project_id: Optional[str] = None
    labels: Optional[List[str]] = None
