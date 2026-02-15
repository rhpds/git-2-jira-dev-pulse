"""Audit log API routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User
from ..services.auth_service import get_user_organization
from ..services.audit_service import query_audit_logs, get_audit_actions
from ..middleware.auth_middleware import get_current_user, require_org_role

router = APIRouter(prefix="/api/admin/audit-logs", tags=["audit"])


@router.get("/")
async def list_audit_logs(
    action: str | None = Query(None),
    resource_type: str | None = Query(None),
    actor_email: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """List audit logs for the organization. Requires admin role."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        return {"logs": [], "total": 0}

    org, _role = org_info
    logs, total = query_audit_logs(
        db,
        org.id,
        action=action,
        resource_type=resource_type,
        actor_email=actor_email,
        limit=limit,
        offset=offset,
    )

    return {
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "actor_email": log.actor_email,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/actions")
async def list_audit_actions(
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """Get distinct audit action types for filter dropdowns."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        return {"actions": []}

    org, _role = org_info
    actions = get_audit_actions(db, org.id)
    return {"actions": actions}
