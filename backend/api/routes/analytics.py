"""Dashboard analytics API routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import (
    GitHubIntegration,
    LinearIntegration,
    CodeClimateIntegration,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/integrations")
async def get_integration_status(db: Session = Depends(get_db)) -> dict:
    """Get status summary of all configured integrations."""
    github_rows = db.execute(select(GitHubIntegration)).scalars().all()
    linear_rows = db.execute(select(LinearIntegration)).scalars().all()
    codeclimate_rows = db.execute(select(CodeClimateIntegration)).scalars().all()

    def _integration_info(rows, name):
        if not rows:
            return {"name": name, "connected": False, "count": 0, "items": []}
        items = []
        for r in rows:
            item = {"id": r.id}
            if hasattr(r, "org_name"):
                item["label"] = r.org_name
            elif hasattr(r, "organization_name"):
                item["label"] = r.organization_name
            elif hasattr(r, "name"):
                item["label"] = r.name
            else:
                item["label"] = f"{name} #{r.id}"
            if hasattr(r, "last_synced_at"):
                item["last_synced"] = r.last_synced_at.isoformat() if r.last_synced_at else None
            items.append(item)
        return {
            "name": name,
            "connected": True,
            "count": len(rows),
            "items": items,
        }

    return {
        "github": _integration_info(github_rows, "GitHub"),
        "linear": _integration_info(linear_rows, "Linear"),
        "codeclimate": _integration_info(codeclimate_rows, "CodeClimate"),
        "total_integrations": len(github_rows) + len(linear_rows) + len(codeclimate_rows),
    }
