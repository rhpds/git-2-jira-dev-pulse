"""Activity feed API routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, AuditLog
from ..services.auth_service import get_user_organization
from ..middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/activity", tags=["activity"])

# Activity types with display metadata
ACTIVITY_ICONS = {
    "created": "plus",
    "updated": "edit",
    "deleted": "trash",
    "invited": "user-plus",
    "removed": "user-minus",
    "enabled": "check",
    "disabled": "times",
    "scanned": "search",
    "synced": "sync",
    "exported": "download",
    "login": "sign-in",
}


@router.get("/feed")
async def get_activity_feed(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    resource_type: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the activity feed for the user's organization."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        return {"activities": [], "total": 0}

    org, _role = org_info

    # Build query for org-scoped audit logs
    stmt = select(AuditLog).where(AuditLog.org_id == org.id)

    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar() or 0

    # Fetch paginated results
    stmt = stmt.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit)
    logs = list(db.execute(stmt).scalars().all())

    activities = []
    for log in logs:
        action_verb = log.action or "unknown"
        icon = "circle"
        for key, icon_name in ACTIVITY_ICONS.items():
            if key in action_verb.lower():
                icon = icon_name
                break

        activities.append({
            "id": log.id,
            "action": log.action,
            "actor_email": log.actor_email,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "icon": icon,
            "timestamp": log.created_at.isoformat() if log.created_at else None,
        })

    return {
        "activities": activities,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/feed/types")
async def get_activity_types(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get distinct resource types for filter dropdown."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        return {"types": []}

    org, _role = org_info

    stmt = (
        select(AuditLog.resource_type)
        .where(AuditLog.org_id == org.id)
        .distinct()
    )
    types = [row[0] for row in db.execute(stmt).all() if row[0]]
    return {"types": sorted(types)}


@router.get("/feed/summary")
async def get_activity_summary(
    days: int = Query(7, ge=1, le=30),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get activity summary stats for the past N days."""
    from datetime import datetime, timedelta, timezone

    org_info = get_user_organization(db, user.id)
    if not org_info:
        return {"summary": {}}

    org, _role = org_info
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Total events
    total = db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.org_id == org.id,
            AuditLog.created_at >= cutoff,
        )
    ).scalar() or 0

    # Events by action
    action_counts = db.execute(
        select(AuditLog.action, func.count(AuditLog.id)).where(
            AuditLog.org_id == org.id,
            AuditLog.created_at >= cutoff,
        ).group_by(AuditLog.action)
    ).all()

    # Unique actors
    unique_actors = db.execute(
        select(func.count(func.distinct(AuditLog.actor_email))).where(
            AuditLog.org_id == org.id,
            AuditLog.created_at >= cutoff,
        )
    ).scalar() or 0

    return {
        "summary": {
            "total_events": total,
            "unique_actors": unique_actors,
            "period_days": days,
            "by_action": {action: count for action, count in action_counts},
        }
    }
