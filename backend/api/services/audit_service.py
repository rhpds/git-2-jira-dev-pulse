"""Audit logging service for recording and querying user/system actions."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from ..models.db_models import AuditLog


def record_audit_event(
    db: Session,
    action: str,
    *,
    org_id: Optional[int] = None,
    user_id: Optional[int] = None,
    actor_email: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    """Record an audit log entry."""
    entry = AuditLog(
        org_id=org_id,
        user_id=user_id,
        actor_email=actor_email,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    db.flush()
    return entry


def query_audit_logs(
    db: Session,
    org_id: int,
    *,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    actor_email: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[AuditLog], int]:
    """Query audit logs with optional filters. Returns (logs, total_count)."""
    stmt = select(AuditLog).where(AuditLog.org_id == org_id)

    if action:
        stmt = stmt.where(AuditLog.action == action)
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)
    if actor_email:
        stmt = stmt.where(AuditLog.actor_email == actor_email)

    # Count total
    from sqlalchemy import func
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar() or 0

    # Fetch paginated results
    stmt = stmt.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit)
    logs = list(db.execute(stmt).scalars().all())

    return logs, total


def get_audit_actions(db: Session, org_id: int) -> list[str]:
    """Get distinct action types for an org (for filter dropdowns)."""
    stmt = (
        select(AuditLog.action)
        .where(AuditLog.org_id == org_id)
        .distinct()
        .order_by(AuditLog.action)
    )
    return [row for row in db.execute(stmt).scalars().all()]
