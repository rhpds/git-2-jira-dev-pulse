"""Integration health dashboard API routes."""
from __future__ import annotations

import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import (
    User,
    GitHubIntegration,
    LinearIntegration,
    CodeClimateIntegration,
)
from ..middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


def _check_jira_connection() -> dict:
    """Check Jira connectivity."""
    jira_url = os.environ.get("JIRA_URL") or ""
    jira_token = os.environ.get("JIRA_API_TOKEN") or ""

    configured = bool(jira_url and jira_token)
    if not configured:
        return {
            "name": "Jira",
            "status": "not_configured",
            "configured": False,
            "connected": False,
            "message": "Jira credentials not configured",
            "last_synced": None,
            "item_count": 0,
        }

    # Try a basic connection test
    try:
        from jira import JIRA
        jira = JIRA(server=jira_url, token_auth=jira_token)
        myself = jira.myself()
        return {
            "name": "Jira",
            "status": "healthy",
            "configured": True,
            "connected": True,
            "message": f"Connected as {myself.get('displayName', 'Unknown')}",
            "last_synced": datetime.now(timezone.utc).isoformat(),
            "item_count": 0,
        }
    except Exception as e:
        return {
            "name": "Jira",
            "status": "error",
            "configured": True,
            "connected": False,
            "message": f"Connection failed: {str(e)[:100]}",
            "last_synced": None,
            "item_count": 0,
        }


@router.get("/health")
async def integration_health(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get health status of all integrations."""
    integrations = []

    # Jira
    integrations.append(_check_jira_connection())

    # GitHub
    gh_count = db.execute(select(func.count(GitHubIntegration.id))).scalar() or 0
    gh_enabled = db.execute(
        select(func.count(GitHubIntegration.id)).where(GitHubIntegration.sync_enabled == True)
    ).scalar() or 0
    gh_last = db.execute(
        select(func.max(GitHubIntegration.last_synced))
    ).scalar()

    github_token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GITHUB_OAUTH_CLIENT_ID") or ""
    integrations.append({
        "name": "GitHub",
        "status": "healthy" if gh_count > 0 else ("not_configured" if not github_token else "idle"),
        "configured": bool(github_token),
        "connected": gh_count > 0,
        "message": f"{gh_enabled} repos syncing" if gh_count > 0 else "No repositories connected",
        "last_synced": gh_last.isoformat() if gh_last else None,
        "item_count": gh_count,
    })

    # Linear
    linear_count = db.execute(select(func.count(LinearIntegration.id))).scalar() or 0
    linear_enabled = db.execute(
        select(func.count(LinearIntegration.id)).where(LinearIntegration.enabled == True)
    ).scalar() or 0
    linear_last = db.execute(
        select(func.max(LinearIntegration.last_synced))
    ).scalar()

    linear_token = os.environ.get("LINEAR_API_KEY") or ""
    integrations.append({
        "name": "Linear",
        "status": "healthy" if linear_count > 0 else ("not_configured" if not linear_token else "idle"),
        "configured": bool(linear_token),
        "connected": linear_count > 0,
        "message": f"{linear_enabled} teams syncing" if linear_count > 0 else "No teams connected",
        "last_synced": linear_last.isoformat() if linear_last else None,
        "item_count": linear_count,
    })

    # CodeClimate
    cc_count = db.execute(select(func.count(CodeClimateIntegration.id))).scalar() or 0
    cc_enabled = db.execute(
        select(func.count(CodeClimateIntegration.id)).where(CodeClimateIntegration.enabled == True)
    ).scalar() or 0
    cc_last = db.execute(
        select(func.max(CodeClimateIntegration.last_synced))
    ).scalar()

    cc_token = os.environ.get("CODECLIMATE_API_KEY") or ""
    integrations.append({
        "name": "CodeClimate",
        "status": "healthy" if cc_count > 0 else ("not_configured" if not cc_token else "idle"),
        "configured": bool(cc_token),
        "connected": cc_count > 0,
        "message": f"{cc_enabled} repos monitored" if cc_count > 0 else "No repositories monitored",
        "last_synced": cc_last.isoformat() if cc_last else None,
        "item_count": cc_count,
    })

    # Summary
    total = len(integrations)
    healthy = sum(1 for i in integrations if i["status"] == "healthy")
    errored = sum(1 for i in integrations if i["status"] == "error")

    return {
        "integrations": integrations,
        "summary": {
            "total": total,
            "healthy": healthy,
            "errored": errored,
            "not_configured": total - healthy - errored,
        },
    }
