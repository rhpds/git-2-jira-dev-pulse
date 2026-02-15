"""Global search API route - searches across multiple entities."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import (
    User,
    AuditLog,
    Webhook,
    Notification,
    OrganizationMember,
    Organization,
)
from ..services.auth_service import get_user_organization
from ..middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/")
async def global_search(
    q: str = Query(..., min_length=2, max_length=200),
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search across audit logs, members, webhooks, and notifications."""
    org_info = get_user_organization(db, user.id)
    org_id = org_info[0].id if org_info else None

    results = []
    pattern = f"%{q}%"

    # Search audit logs (admin only)
    if org_info and org_info[1] in ("owner", "admin"):
        audit_logs = db.execute(
            select(AuditLog)
            .where(
                AuditLog.org_id == org_id,
                or_(
                    AuditLog.action.ilike(pattern),
                    AuditLog.actor_email.ilike(pattern),
                    AuditLog.resource_type.ilike(pattern),
                    AuditLog.resource_id.ilike(pattern),
                ),
            )
            .order_by(AuditLog.created_at.desc())
            .limit(5)
        ).scalars().all()

        for log in audit_logs:
            results.append({
                "type": "audit_log",
                "id": log.id,
                "title": log.action,
                "description": f"{log.actor_email or 'System'} - {log.resource_type or ''} {log.resource_id or ''}".strip(),
                "timestamp": log.created_at.isoformat() if log.created_at else None,
                "link": "/settings",
            })

    # Search organization members
    if org_id:
        members = db.execute(
            select(User)
            .join(OrganizationMember, OrganizationMember.user_id == User.id)
            .where(
                OrganizationMember.org_id == org_id,
                or_(
                    User.full_name.ilike(pattern),
                    User.email.ilike(pattern),
                ),
            )
            .limit(5)
        ).scalars().all()

        for m in members:
            results.append({
                "type": "member",
                "id": m.id,
                "title": m.full_name,
                "description": m.email,
                "timestamp": m.created_at.isoformat() if m.created_at else None,
                "link": "/settings",
            })

    # Search webhooks (admin only)
    if org_info and org_info[1] in ("owner", "admin"):
        webhooks = db.execute(
            select(Webhook)
            .where(
                Webhook.org_id == org_id,
                or_(
                    Webhook.url.ilike(pattern),
                    Webhook.description.ilike(pattern),
                ),
            )
            .limit(5)
        ).scalars().all()

        for wh in webhooks:
            results.append({
                "type": "webhook",
                "id": wh.id,
                "title": wh.url,
                "description": wh.description or ", ".join(wh.events or []),
                "timestamp": wh.created_at.isoformat() if wh.created_at else None,
                "link": "/settings",
            })

    # Search notifications
    notifications = db.execute(
        select(Notification)
        .where(
            Notification.user_id == user.id,
            or_(
                Notification.title.ilike(pattern),
                Notification.message.ilike(pattern),
            ),
        )
        .order_by(Notification.created_at.desc())
        .limit(5)
    ).scalars().all()

    for n in notifications:
        results.append({
            "type": "notification",
            "id": n.id,
            "title": n.title,
            "description": n.message,
            "timestamp": n.created_at.isoformat() if n.created_at else None,
            "link": None,
        })

    # Trim to limit
    results = results[:limit]

    return {
        "query": q,
        "results": results,
        "total": len(results),
    }
