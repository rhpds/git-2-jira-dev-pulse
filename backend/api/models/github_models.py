"""Pydantic models for GitHub integration."""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class GitHubConnectionStatus(BaseModel):
    """GitHub connection status response."""

    connected: bool
    username: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    error: Optional[str] = None


class GitHubRepoInfo(BaseModel):
    """GitHub repository information."""

    id: int
    name: str
    full_name: str
    description: str = ""
    url: str
    default_branch: str
    private: bool
    stars: int = 0
    forks: int = 0
    open_issues: int = 0
    language: str = ""
    created_at: str
    updated_at: str
    pushed_at: str


class GitHubPullRequest(BaseModel):
    """GitHub pull request information."""

    number: int
    title: str
    state: str
    url: str
    branch: str
    base_branch: str
    author: str
    created_at: str
    updated_at: str
    merged_at: Optional[str] = None
    closed_at: Optional[str] = None
    mergeable: Optional[bool] = None
    comments: int = 0
    commits: int = 0
    additions: int = 0
    deletions: int = 0
    changed_files: int = 0
    jira_key: Optional[str] = None  # Linked Jira ticket


class GitHubPRDetails(GitHubPullRequest):
    """Detailed GitHub pull request information."""

    body: str = ""
    mergeable_state: str = ""
    review_comments: int = 0
    reviews: list[dict] = Field(default_factory=list)
    commit_shas: list[str] = Field(default_factory=list)


class GitHubCommit(BaseModel):
    """GitHub commit information."""

    sha: str
    short_sha: str
    message: str
    author: str
    author_email: str
    date: str
    url: str
    verified: bool = False


class GitHubBranch(BaseModel):
    """GitHub branch information."""

    name: str
    protected: bool = False
    commit_sha: str


class GitHubWorkflowRun(BaseModel):
    """GitHub Actions workflow run information."""

    id: int
    name: str
    status: str
    conclusion: Optional[str] = None
    branch: str
    commit_sha: str
    created_at: str
    updated_at: str
    url: str


class GitHubIntegrationConfig(BaseModel):
    """GitHub integration configuration."""

    enabled: bool = False
    token: Optional[str] = None  # Personal access token
    auto_sync_prs: bool = True
    auto_link_jira: bool = True
    sync_interval_minutes: int = 30
    link_pattern: str = r"([A-Z]+-\d+)"  # Pattern to extract Jira keys from PR titles/descriptions


class EnableGitHubIntegrationRequest(BaseModel):
    """Request to enable GitHub integration for a repository."""

    repo_path: str
    github_owner: Optional[str] = None  # Auto-detected if None
    github_repo: Optional[str] = None  # Auto-detected if None
    remote_url: Optional[str] = None  # Auto-detected from git if None
    sync_enabled: bool = True


class GitHubSyncResult(BaseModel):
    """Result of syncing GitHub data."""

    success: bool
    repo_name: str
    prs_synced: int = 0
    commits_synced: int = 0
    jira_links_created: int = 0
    error: Optional[str] = None
    last_synced: Optional[datetime] = None


class LinkPRToJiraRequest(BaseModel):
    """Request to link a GitHub PR to a Jira ticket."""

    repo_path: str
    pr_number: int
    jira_key: str
    add_comment: bool = True  # Add comment to PR linking to Jira


class LinkPRToJiraResponse(BaseModel):
    """Response from linking PR to Jira."""

    success: bool
    pr_url: str
    jira_url: str
    error: Optional[str] = None
