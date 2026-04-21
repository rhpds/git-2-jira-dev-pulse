"""GitHub organization management routes."""
from __future__ import annotations

import os
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import GitHubOrg, GitHubIntegration, User
from ..models.github_org_models import (
    AddGitHubOrgRequest,
    AddGitHubRepoRequest,
    GitHubOrgResponse,
    GitHubOrgRepoResponse,
)
from ..services.github_client import GitHubClient
from ..middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/github-orgs", tags=["github-orgs"])


def _get_github_client() -> GitHubClient:
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise HTTPException(status_code=400, detail="GITHUB_TOKEN not configured")
    return GitHubClient(token=token)


@router.post("/")
async def add_github_org(
    request: AddGitHubOrgRequest,
    db: Session = Depends(get_db),
    client: GitHubClient = Depends(_get_github_client),
    user: User = Depends(get_current_user),
) -> GitHubOrgResponse:
    """Add a GitHub organization for repo discovery."""
    existing = db.execute(
        select(GitHubOrg).where(GitHubOrg.org_login == request.org_login)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Organization already added")

    info = client.get_org_info(request.org_login)
    if "error" in info:
        raise HTTPException(status_code=404, detail=f"GitHub org not found: {info['error']}")

    org = GitHubOrg(
        org_login=info["login"],
        display_name=info.get("name", ""),
        avatar_url=info.get("avatar_url", ""),
        description=info.get("description", ""),
        public_repos=info.get("public_repos", 0),
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    return GitHubOrgResponse.model_validate(org)


@router.get("/")
async def list_github_orgs(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[GitHubOrgResponse]:
    """List all tracked GitHub organizations."""
    orgs = db.execute(
        select(GitHubOrg).order_by(GitHubOrg.org_login)
    ).scalars().all()
    return [GitHubOrgResponse.model_validate(o) for o in orgs]


@router.delete("/{org_login}")
async def remove_github_org(
    org_login: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Remove a tracked GitHub organization."""
    org = db.execute(
        select(GitHubOrg).where(GitHubOrg.org_login == org_login)
    ).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    db.delete(org)
    db.commit()
    return {"success": True}


@router.get("/{org_login}/repos")
async def list_org_repos(
    org_login: str,
    page: int = 1,
    db: Session = Depends(get_db),
    client: GitHubClient = Depends(_get_github_client),
    user: User = Depends(get_current_user),
) -> list[GitHubOrgRepoResponse]:
    """Discover repos in a GitHub org. Marks repos already added as integrations."""
    repos = client.list_org_repos(org_login, per_page=100, page=page)
    if not repos:
        raise HTTPException(status_code=404, detail="No repos found or org does not exist")

    added_set = set()
    integrations = db.execute(select(GitHubIntegration)).scalars().all()
    for integ in integrations:
        if integ.github_owner and integ.github_repo:
            added_set.add(f"{integ.github_owner}/{integ.github_repo}".lower())

    result = []
    for repo in repos:
        is_added = repo["full_name"].lower() in added_set
        result.append(GitHubOrgRepoResponse(is_added=is_added, **repo))
    return result


@router.post("/add-repo")
async def add_repo_from_github(
    request: AddGitHubRepoRequest,
    db: Session = Depends(get_db),
    client: GitHubClient = Depends(_get_github_client),
    user: User = Depends(get_current_user),
) -> dict:
    """Add a GitHub repo by owner/repo. Creates a GitHubIntegration without a local path."""
    repo_path = f"github:{request.owner}/{request.repo}"

    existing = db.execute(
        select(GitHubIntegration).where(GitHubIntegration.repo_path == repo_path)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Repository already added")

    info = client.get_repo_info(request.owner, request.repo)
    if "error" in info:
        raise HTTPException(status_code=404, detail=f"Repository not found: {info['error']}")

    integration = GitHubIntegration(
        repo_path=repo_path,
        repo_name=request.repo,
        github_owner=request.owner,
        github_repo=request.repo,
        remote_url=info.get("url", ""),
        sync_enabled=True,
        repo_metadata=info,
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)

    return {
        "success": True,
        "integration_id": integration.id,
        "full_name": f"{request.owner}/{request.repo}",
    }
