"""GitHub integration API routes."""
from __future__ import annotations

import os
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

import subprocess

from ..database import get_db
from ..models.db_models import GitHubIntegration, GitHubPullRequest as DBGitHubPR
from ..models.github_models import (
    GitHubConnectionStatus,
    GitHubRepoInfo,
    GitHubPullRequest,
    GitHubPRDetails,
    GitHubCommit,
    GitHubBranch,
    GitHubWorkflowRun,
    EnableGitHubIntegrationRequest,
    GitHubSyncResult,
    LinkPRToJiraRequest,
    LinkPRToJiraResponse,
)
from ..services.github_client import GitHubClient
from ..services.jira_client import JiraClient

router = APIRouter(prefix="/github", tags=["github"])


def get_github_client() -> GitHubClient:
    """Get GitHub client with token from environment."""
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise HTTPException(status_code=400, detail="GITHUB_TOKEN not configured")
    return GitHubClient(token=token)


@router.get("/health")
async def check_github_connection(
    client: GitHubClient = Depends(get_github_client),
) -> GitHubConnectionStatus:
    """Check GitHub API connection status."""
    result = client.check_connection()
    return GitHubConnectionStatus(**result)


@router.post("/enable")
async def enable_github_integration(
    request: EnableGitHubIntegrationRequest,
    db: Session = Depends(get_db),
    client: GitHubClient = Depends(get_github_client),
) -> dict:
    """Enable GitHub integration for a repository."""
    # Auto-detect GitHub repo from git remote if not provided
    if not request.github_owner or not request.github_repo:
        # Get remote URL from git
        try:
            result = subprocess.run(
                ["git", "-C", request.repo_path, "remote", "get-url", "origin"],
                capture_output=True,
                text=True,
                check=False,
            )
            remote_url = result.stdout.strip() if result.returncode == 0 else None
        except Exception:
            remote_url = None

        if remote_url:
            extracted = client.extract_repo_from_remote(remote_url)
            if extracted:
                owner, repo = extracted
                request.github_owner = request.github_owner or owner
                request.github_repo = request.github_repo or repo
                request.remote_url = request.remote_url or remote_url

    if not request.github_owner or not request.github_repo:
        raise HTTPException(
            status_code=400,
            detail="Could not auto-detect GitHub repository. Please provide github_owner and github_repo.",
        )

    # Check if integration already exists
    stmt = select(GitHubIntegration).where(GitHubIntegration.repo_path == request.repo_path)
    existing = db.execute(stmt).scalar_one_or_none()

    if existing:
        # Update existing
        existing.github_owner = request.github_owner
        existing.github_repo = request.github_repo
        existing.remote_url = request.remote_url
        existing.sync_enabled = request.sync_enabled
        existing.updated_at = datetime.now()
        db.commit()
        db.refresh(existing)
        integration = existing
    else:
        # Create new
        repo_name = os.path.basename(request.repo_path)
        integration = GitHubIntegration(
            repo_path=request.repo_path,
            repo_name=repo_name,
            github_owner=request.github_owner,
            github_repo=request.github_repo,
            remote_url=request.remote_url,
            sync_enabled=request.sync_enabled,
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)

    # Fetch repo info from GitHub to validate
    try:
        repo_info = client.get_repo_info(request.github_owner, request.github_repo)
        if "error" not in repo_info:
            integration.metadata = repo_info
            db.commit()
    except Exception:
        pass

    return {
        "success": True,
        "integration_id": integration.id,
        "github_owner": integration.github_owner,
        "github_repo": integration.github_repo,
    }


@router.delete("/disable/{repo_path:path}")
async def disable_github_integration(
    repo_path: str,
    db: Session = Depends(get_db),
) -> dict:
    """Disable GitHub integration for a repository."""
    stmt = select(GitHubIntegration).where(GitHubIntegration.repo_path == repo_path)
    integration = db.execute(stmt).scalar_one_or_none()

    if not integration:
        raise HTTPException(status_code=404, detail="GitHub integration not found")

    db.delete(integration)
    db.commit()

    return {"success": True, "message": "GitHub integration disabled"}


@router.get("/integrations")
async def list_github_integrations(
    db: Session = Depends(get_db),
) -> list[dict]:
    """List all GitHub integrations."""
    stmt = select(GitHubIntegration)
    integrations = db.execute(stmt).scalars().all()

    return [
        {
            "id": integration.id,
            "repo_path": integration.repo_path,
            "repo_name": integration.repo_name,
            "github_owner": integration.github_owner,
            "github_repo": integration.github_repo,
            "remote_url": integration.remote_url,
            "sync_enabled": integration.sync_enabled,
            "last_synced": integration.last_synced.isoformat() if integration.last_synced else None,
            "metadata": integration.metadata,
        }
        for integration in integrations
    ]


@router.post("/sync/{repo_path:path}")
async def sync_github_data(
    repo_path: str,
    since_days: int = 30,
    db: Session = Depends(get_db),
    client: GitHubClient = Depends(get_github_client),
) -> GitHubSyncResult:
    """Sync GitHub data (PRs, commits) for a repository."""
    stmt = select(GitHubIntegration).where(GitHubIntegration.repo_path == repo_path)
    integration = db.execute(stmt).scalar_one_or_none()

    if not integration:
        raise HTTPException(status_code=404, detail="GitHub integration not found for this repository")

    if not integration.sync_enabled:
        raise HTTPException(status_code=400, detail="Sync is disabled for this repository")

    owner = integration.github_owner
    repo = integration.github_repo

    if not owner or not repo:
        return GitHubSyncResult(
            success=False,
            repo_name=integration.repo_name,
            error="GitHub owner/repo not configured",
        )

    try:
        # Fetch PRs from GitHub
        prs = client.get_pull_requests(owner, repo, state="all", since_days=since_days)
        prs_synced = 0

        for pr_data in prs:
            # Check if PR already exists in DB
            stmt_pr = select(DBGitHubPR).where(
                DBGitHubPR.integration_id == integration.id,
                DBGitHubPR.pr_number == pr_data["number"],
            )
            existing_pr = db.execute(stmt_pr).scalar_one_or_none()

            if existing_pr:
                # Update existing PR
                existing_pr.title = pr_data["title"]
                existing_pr.state = pr_data["state"]
                existing_pr.url = pr_data["url"]
                existing_pr.branch = pr_data["branch"]
                existing_pr.base_branch = pr_data["base_branch"]
                existing_pr.author = pr_data["author"]
                existing_pr.merged_at = (
                    datetime.fromisoformat(pr_data["merged_at"].rstrip("Z"))
                    if pr_data.get("merged_at")
                    else None
                )
                existing_pr.closed_at = (
                    datetime.fromisoformat(pr_data["closed_at"].rstrip("Z"))
                    if pr_data.get("closed_at")
                    else None
                )
                existing_pr.pr_data = pr_data
                existing_pr.last_synced = datetime.now()
            else:
                # Create new PR record
                new_pr = DBGitHubPR(
                    integration_id=integration.id,
                    pr_number=pr_data["number"],
                    title=pr_data["title"],
                    state=pr_data["state"],
                    url=pr_data["url"],
                    branch=pr_data["branch"],
                    base_branch=pr_data["base_branch"],
                    author=pr_data["author"],
                    created_at_gh=datetime.fromisoformat(pr_data["created_at"].rstrip("Z")),
                    merged_at=(
                        datetime.fromisoformat(pr_data["merged_at"].rstrip("Z"))
                        if pr_data.get("merged_at")
                        else None
                    ),
                    closed_at=(
                        datetime.fromisoformat(pr_data["closed_at"].rstrip("Z"))
                        if pr_data.get("closed_at")
                        else None
                    ),
                    pr_data=pr_data,
                )
                db.add(new_pr)

            prs_synced += 1

        # Update integration last_synced
        integration.last_synced = datetime.now()
        db.commit()

        return GitHubSyncResult(
            success=True,
            repo_name=integration.repo_name,
            prs_synced=prs_synced,
            last_synced=integration.last_synced,
        )

    except Exception as e:
        return GitHubSyncResult(
            success=False,
            repo_name=integration.repo_name,
            error=str(e),
        )


@router.get("/{repo_path:path}/prs")
async def get_repository_prs(
    repo_path: str,
    state: str = "all",
    db: Session = Depends(get_db),
) -> list[dict]:
    """Get cached pull requests for a repository."""
    stmt = select(GitHubIntegration).where(GitHubIntegration.repo_path == repo_path)
    integration = db.execute(stmt).scalar_one_or_none()

    if not integration:
        raise HTTPException(status_code=404, detail="GitHub integration not found")

    stmt_prs = select(DBGitHubPR).where(DBGitHubPR.integration_id == integration.id)
    if state != "all":
        stmt_prs = stmt_prs.where(DBGitHubPR.state == state)

    prs = db.execute(stmt_prs.order_by(DBGitHubPR.created_at_gh.desc())).scalars().all()

    return [
        {
            "number": pr.pr_number,
            "title": pr.title,
            "state": pr.state,
            "url": pr.url,
            "branch": pr.branch,
            "base_branch": pr.base_branch,
            "author": pr.author,
            "created_at": pr.created_at_gh.isoformat(),
            "merged_at": pr.merged_at.isoformat() if pr.merged_at else None,
            "closed_at": pr.closed_at.isoformat() if pr.closed_at else None,
            "jira_key": pr.jira_key,
            "last_synced": pr.last_synced.isoformat(),
        }
        for pr in prs
    ]


@router.post("/link-pr-to-jira")
async def link_pr_to_jira(
    request: LinkPRToJiraRequest,
    db: Session = Depends(get_db),
    github_client: GitHubClient = Depends(get_github_client),
) -> LinkPRToJiraResponse:
    """Link a GitHub PR to a Jira ticket."""
    # Get GitHub integration
    stmt = select(GitHubIntegration).where(GitHubIntegration.repo_path == request.repo_path)
    integration = db.execute(stmt).scalar_one_or_none()

    if not integration:
        raise HTTPException(status_code=404, detail="GitHub integration not found")

    # Get PR from database
    stmt_pr = select(DBGitHubPR).where(
        DBGitHubPR.integration_id == integration.id,
        DBGitHubPR.pr_number == request.pr_number,
    )
    pr = db.execute(stmt_pr).scalar_one_or_none()

    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found in database. Run sync first.")

    # Update PR with Jira key
    pr.jira_key = request.jira_key
    db.commit()

    # Build URLs
    pr_url = pr.url
    jira_server = os.getenv("JIRA_URL", "https://issues.redhat.com")
    jira_url = f"{jira_server}/browse/{request.jira_key}"

    # Optionally add comment to PR
    if request.add_comment and integration.github_owner and integration.github_repo:
        try:
            comment_body = f"🎫 Linked to Jira: [{request.jira_key}]({jira_url})"
            github_client._request(
                "POST",
                f"/repos/{integration.github_owner}/{integration.github_repo}/issues/{request.pr_number}/comments",
                json={"body": comment_body},
            )
        except Exception:
            pass  # Non-fatal

    return LinkPRToJiraResponse(
        success=True,
        pr_url=pr_url,
        jira_url=jira_url,
    )


@router.get("/repo-info/{owner}/{repo}")
async def get_github_repo_info(
    owner: str,
    repo: str,
    client: GitHubClient = Depends(get_github_client),
) -> GitHubRepoInfo:
    """Get GitHub repository information."""
    info = client.get_repo_info(owner, repo)
    if "error" in info:
        raise HTTPException(status_code=404, detail=info["error"])
    return GitHubRepoInfo(**info)


@router.get("/live-prs/{owner}/{repo}")
async def get_live_pull_requests(
    owner: str,
    repo: str,
    state: str = "all",
    since_days: int = 30,
    client: GitHubClient = Depends(get_github_client),
) -> list[GitHubPullRequest]:
    """Get pull requests directly from GitHub (not cached)."""
    prs = client.get_pull_requests(owner, repo, state=state, since_days=since_days)
    return [GitHubPullRequest(**pr) for pr in prs]


@router.get("/live-commits/{owner}/{repo}")
async def get_live_commits(
    owner: str,
    repo: str,
    since_days: int = 30,
    branch: Optional[str] = None,
    client: GitHubClient = Depends(get_github_client),
) -> list[GitHubCommit]:
    """Get commits directly from GitHub."""
    commits = client.get_commits(owner, repo, since_days=since_days, branch=branch)
    return [GitHubCommit(**commit) for commit in commits]


@router.get("/live-branches/{owner}/{repo}")
async def get_live_branches(
    owner: str,
    repo: str,
    client: GitHubClient = Depends(get_github_client),
) -> list[GitHubBranch]:
    """Get branches directly from GitHub."""
    branches = client.get_branches(owner, repo)
    return [GitHubBranch(**branch) for branch in branches]


@router.get("/live-workflows/{owner}/{repo}")
async def get_live_workflow_runs(
    owner: str,
    repo: str,
    since_days: int = 30,
    client: GitHubClient = Depends(get_github_client),
) -> list[GitHubWorkflowRun]:
    """Get GitHub Actions workflow runs directly from GitHub."""
    runs = client.get_workflow_runs(owner, repo, since_days=since_days)
    return [GitHubWorkflowRun(**run) for run in runs]
