"""Notification API routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User
from ..services.notification_service import (
    get_notifications,
    get_unread_count,
    mark_as_read,
    mark_all_as_read,
    delete_notification,
)
from ..middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("/")
async def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get notifications for the current user."""
    notifications, total = get_notifications(
        db, user.id, unread_only=unread_only, limit=limit, offset=offset
    )
    return {
        "notifications": [
            {
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "metadata": n.extra_data,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ],
        "total": total,
        "unread_count": get_unread_count(db, user.id),
    }


@router.get("/unread-count")
async def notification_unread_count(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the count of unread notifications."""
    count = get_unread_count(db, user.id)
    return {"unread_count": count}


@router.post("/{notification_id}/read")
async def read_notification(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    success = mark_as_read(db, notification_id, user.id)
    return {"success": success}


@router.post("/read-all")
async def read_all_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    count = mark_all_as_read(db, user.id)
    return {"marked_read": count}


@router.delete("/{notification_id}")
async def remove_notification(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a notification."""
    success = delete_notification(db, notification_id, user.id)
    return {"success": success}
