"""CodeClimate integration API routes."""
from __future__ import annotations

import os
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import CodeClimateIntegration, CodeClimateSnapshot as DBCodeClimateSnapshot
from ..models.codeclimate_models import (
    CodeClimateConnectionStatus,
    CodeClimateOrg,
    CodeClimateRepo,
    CodeClimateSnapshot,
    CodeClimateTestCoverage,
    CodeClimateIssue,
    CodeClimateStats,
    EnableCodeClimateIntegrationRequest,
    CodeClimateSyncResult,
)
from ..services.codeclimate_client import CodeClimateClient

router = APIRouter(prefix="/api/codeclimate", tags=["codeclimate"])


def get_codeclimate_client() -> CodeClimateClient:
    """Get CodeClimate client with API token from environment."""
    api_token = os.getenv("CODECLIMATE_API_TOKEN")
    if not api_token:
        raise HTTPException(status_code=400, detail="CODECLIMATE_API_TOKEN not configured")
    return CodeClimateClient(api_token=api_token)


@router.get("/health")
async def check_codeclimate_connection(
    client: CodeClimateClient = Depends(get_codeclimate_client),
) -> CodeClimateConnectionStatus:
    """Check CodeClimate API connection status."""
    result = client.check_connection()
    return CodeClimateConnectionStatus(**result)


@router.get("/orgs")
async def get_orgs(
    client: CodeClimateClient = Depends(get_codeclimate_client),
) -> list[CodeClimateOrg]:
    """Get all CodeClimate organizations accessible to the user."""
    orgs = client.get_orgs()
    return [CodeClimateOrg(**org) for org in orgs]


@router.get("/repos")
async def get_repos(
    org_id: Optional[str] = None,
    client: CodeClimateClient = Depends(get_codeclimate_client),
) -> list[CodeClimateRepo]:
    """Get CodeClimate repositories, optionally filtered by organization."""
    repos = client.get_repos(org_id=org_id)
    return [CodeClimateRepo(**repo) for repo in repos]


@router.get("/repos/{repo_id}")
async def get_repo(
    repo_id: str,
    client: CodeClimateClient = Depends(get_codeclimate_client),
) -> CodeClimateRepo:
    """Get detailed information about a specific CodeClimate repository."""
    repo = client.get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="CodeClimate repository not found")
    return CodeClimateRepo(**repo)


@router.get("/repos/{repo_id}/snapshot")
async def get_repo_snapshot(
    repo_id: str,
    client: CodeClimateClient = Depends(get_codeclimate_client),
) -> CodeClimateSnapshot:
    """Get the latest quality snapshot for a repository."""
    snapshot = client.get_repo_snapshot(repo_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="No snapshot found for repository")
    return CodeClimateSnapshot(**snapshot)


@router.get("/repos/{repo_id}/coverage")
async def get_test_coverage(
    repo_id: str,
    client: CodeClimateClient = Depends(get_codeclimate_client),
) -> CodeClimateTestCoverage:
    """Get test coverage report for a repository."""
    coverage = client.get_test_coverage(repo_id)
    if not coverage:
        raise HTTPException(status_code=404, detail="No coverage report found")
    return CodeClimateTestCoverage(**coverage)


@router.get("/repos/{repo_id}/issues")
async def get_repo_issues(
    repo_id: str,
    category: Optional[str] = None,
    limit: int = 100,
    client: CodeClimateClient = Depends(get_codeclimate_client),
) -> list[CodeClimateIssue]:
    """Get code quality issues for a repository."""
    issues = client.get_issues(repo_id, category=category, limit=limit)
    return [CodeClimateIssue(**issue) for issue in issues]


@router.get("/repos/{repo_id}/stats")
async def get_repo_stats(
    repo_id: str,
    client: CodeClimateClient = Depends(get_codeclimate_client),
) -> CodeClimateStats:
    """Get comprehensive quality statistics for a repository."""
    stats = client.get_repo_stats(repo_id)
    return CodeClimateStats(**stats)


@router.post("/enable")
async def enable_codeclimate_integration(
    request: EnableCodeClimateIntegrationRequest,
    db: Session = Depends(get_db),
    client: CodeClimateClient = Depends(get_codeclimate_client),
) -> dict:
    """Enable CodeClimate integration for a repository."""
    # Auto-detect repo info if not provided
    if not request.repo_name or not request.repo_slug:
        repo = client.get_repo(request.repo_id)
        if not repo:
            raise HTTPException(status_code=404, detail="Repository not found")
        request.repo_name = request.repo_name or repo["name"]
        request.repo_slug = request.repo_slug or repo["slug"]

    # Check if integration already exists
    stmt = select(CodeClimateIntegration).where(
        CodeClimateIntegration.repo_id == request.repo_id
    )
    existing = db.execute(stmt).scalar_one_or_none()

    if existing:
        # Update existing
        existing.repo_name = request.repo_name
        existing.repo_slug = request.repo_slug
        existing.github_slug = request.github_slug
        existing.auto_sync = request.auto_sync
        existing.sync_interval_minutes = request.sync_interval_minutes
        existing.updated_at = datetime.now()
        db.commit()
        db.refresh(existing)
        integration = existing
    else:
        # Create new
        integration = CodeClimateIntegration(
            repo_id=request.repo_id,
            repo_name=request.repo_name,
            repo_slug=request.repo_slug,
            github_slug=request.github_slug,
            auto_sync=request.auto_sync,
            sync_interval_minutes=request.sync_interval_minutes,
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)

    return {
        "success": True,
        "integration_id": integration.id,
        "repo_id": integration.repo_id,
        "repo_name": integration.repo_name,
    }


@router.delete("/disable/{repo_id}")
async def disable_codeclimate_integration(
    repo_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Disable CodeClimate integration for a repository."""
    stmt = select(CodeClimateIntegration).where(
        CodeClimateIntegration.repo_id == repo_id
    )
    integration = db.execute(stmt).scalar_one_or_none()

    if not integration:
        raise HTTPException(status_code=404, detail="CodeClimate integration not found")

    db.delete(integration)
    db.commit()

    return {"success": True, "message": "CodeClimate integration disabled"}


@router.get("/integrations")
async def list_codeclimate_integrations(
    db: Session = Depends(get_db),
) -> list[dict]:
    """List all CodeClimate integrations."""
    stmt = select(CodeClimateIntegration)
    integrations = db.execute(stmt).scalars().all()

    return [
        {
            "id": integration.id,
            "repo_id": integration.repo_id,
            "repo_name": integration.repo_name,
            "repo_slug": integration.repo_slug,
            "github_slug": integration.github_slug,
            "enabled": integration.enabled,
            "auto_sync": integration.auto_sync,
            "sync_interval_minutes": integration.sync_interval_minutes,
            "last_synced": integration.last_synced.isoformat() if integration.last_synced else None,
            "metadata": integration.repo_metadata,
        }
        for integration in integrations
    ]


@router.post("/sync/{repo_id}")
async def sync_codeclimate_data(
    repo_id: str,
    db: Session = Depends(get_db),
    client: CodeClimateClient = Depends(get_codeclimate_client),
) -> CodeClimateSyncResult:
    """Sync CodeClimate data (snapshots, coverage) for a repository."""
    stmt = select(CodeClimateIntegration).where(
        CodeClimateIntegration.repo_id == repo_id
    )
    integration = db.execute(stmt).scalar_one_or_none()

    if not integration:
        raise HTTPException(status_code=404, detail="CodeClimate integration not found")

    try:
        # Get latest snapshot
        snapshot_data = client.get_repo_snapshot(repo_id)
        snapshots_synced = 0

        if snapshot_data:
            # Check if snapshot already exists
            stmt_snapshot = select(DBCodeClimateSnapshot).where(
                DBCodeClimateSnapshot.snapshot_id == snapshot_data["id"]
            )
            existing_snapshot = db.execute(stmt_snapshot).scalar_one_or_none()

            # Get stats for comprehensive data
            stats = client.get_repo_stats(repo_id)

            if not existing_snapshot:
                # Create new snapshot
                new_snapshot = DBCodeClimateSnapshot(
                    integration_id=integration.id,
                    snapshot_id=snapshot_data["id"],
                    commit_sha=snapshot_data["commit_sha"],
                    committed_at=datetime.fromisoformat(
                        snapshot_data["committed_at"].rstrip("Z")
                    ),
                    gpa=snapshot_data.get("gpa"),
                    lines_of_code=snapshot_data.get("lines_of_code", 0),
                    test_coverage=int(stats.get("test_coverage", 0)),
                    coverage_rating=stats.get("coverage_rating"),
                    total_issues=stats.get("total_issues", 0),
                    technical_debt_hours=int(stats.get("technical_debt_hours", 0)),
                    snapshot_data=snapshot_data,
                )
                db.add(new_snapshot)
                snapshots_synced += 1

        # Update integration last_synced
        integration.last_synced = datetime.now()
        db.commit()

        return CodeClimateSyncResult(
            success=True,
            repo_name=integration.repo_name,
            snapshots_synced=snapshots_synced,
            last_synced=integration.last_synced,
        )

    except Exception as e:
        return CodeClimateSyncResult(
            success=False,
            repo_name=integration.repo_name,
            error=str(e),
        )


@router.get("/{repo_id}/snapshots")
async def get_repo_snapshots(
    repo_id: str,
    limit: int = 10,
    db: Session = Depends(get_db),
) -> list[dict]:
    """Get cached CodeClimate snapshots for a repository."""
    stmt = select(CodeClimateIntegration).where(
        CodeClimateIntegration.repo_id == repo_id
    )
    integration = db.execute(stmt).scalar_one_or_none()

    if not integration:
        raise HTTPException(status_code=404, detail="CodeClimate integration not found")

    stmt_snapshots = select(DBCodeClimateSnapshot).where(
        DBCodeClimateSnapshot.integration_id == integration.id
    ).order_by(DBCodeClimateSnapshot.committed_at.desc()).limit(limit)

    snapshots = db.execute(stmt_snapshots).scalars().all()

    return [
        {
            "id": snapshot.snapshot_id,
            "commit_sha": snapshot.commit_sha,
            "committed_at": snapshot.committed_at.isoformat(),
            "gpa": snapshot.gpa,
            "lines_of_code": snapshot.lines_of_code,
            "test_coverage": snapshot.test_coverage,
            "coverage_rating": snapshot.coverage_rating,
            "total_issues": snapshot.total_issues,
            "technical_debt_hours": snapshot.technical_debt_hours,
        }
        for snapshot in snapshots
    ]
