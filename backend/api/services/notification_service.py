"""Notification service for creating and managing in-app notifications."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select, desc, func, update
from sqlalchemy.orm import Session

from ..models.db_models import Notification

# Notification types
NOTIFICATION_TYPES = [
    "quota_warning",
    "quota_exceeded",
    "member_joined",
    "member_removed",
    "scan_completed",
    "ticket_created",
    "integration_status",
    "subscription_changed",
    "webhook_failure",
    "system",
]


def create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str,
    *,
    org_id: Optional[int] = None,
    extra_data: Optional[dict] = None,
) -> Notification:
    """Create a new notification for a user."""
    notif = Notification(
        user_id=user_id,
        org_id=org_id,
        type=type,
        title=title,
        message=message,
        extra_data=extra_data,
    )
    db.add(notif)
    db.flush()
    return notif


def get_notifications(
    db: Session,
    user_id: int,
    *,
    unread_only: bool = False,
    limit: int = 30,
    offset: int = 0,
) -> tuple[list[Notification], int]:
    """Get notifications for a user. Returns (notifications, total_count)."""
    stmt = select(Notification).where(Notification.user_id == user_id)

    if unread_only:
        stmt = stmt.where(Notification.is_read == False)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar() or 0

    stmt = stmt.order_by(desc(Notification.created_at)).offset(offset).limit(limit)
    notifications = list(db.execute(stmt).scalars().all())

    return notifications, total


def get_unread_count(db: Session, user_id: int) -> int:
    """Get count of unread notifications."""
    stmt = select(func.count(Notification.id)).where(
        Notification.user_id == user_id,
        Notification.is_read == False,
    )
    return db.execute(stmt).scalar() or 0


def mark_as_read(db: Session, notification_id: int, user_id: int) -> bool:
    """Mark a single notification as read."""
    stmt = (
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == user_id)
        .values(is_read=True)
    )
    result = db.execute(stmt)
    db.flush()
    return result.rowcount > 0


def mark_all_as_read(db: Session, user_id: int) -> int:
    """Mark all notifications as read. Returns count updated."""
    stmt = (
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)
        .values(is_read=True)
    )
    result = db.execute(stmt)
    db.flush()
    return result.rowcount


def delete_notification(db: Session, notification_id: int, user_id: int) -> bool:
    """Delete a single notification."""
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    )
    notif = db.execute(stmt).scalar_one_or_none()
    if notif:
        db.delete(notif)
        db.flush()
        return True
    return False
