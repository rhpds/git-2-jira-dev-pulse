"""Webhook management API routes."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User
from ..services.auth_service import get_user_organization
from ..services.webhook_service import (
    WEBHOOK_EVENTS,
    create_webhook,
    list_webhooks,
    get_webhook,
    update_webhook,
    delete_webhook,
    deliver_webhook,
    get_webhook_deliveries,
)
from ..middleware.auth_middleware import get_current_user, require_org_role

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


class WebhookCreateRequest(BaseModel):
    url: str
    events: list[str]
    description: Optional[str] = None


class WebhookUpdateRequest(BaseModel):
    url: Optional[str] = None
    events: Optional[list[str]] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None


def _webhook_to_dict(wh):
    return {
        "id": wh.id,
        "url": wh.url,
        "events": wh.events,
        "is_active": wh.is_active,
        "description": wh.description,
        "created_at": wh.created_at.isoformat() if wh.created_at else None,
        "updated_at": wh.updated_at.isoformat() if wh.updated_at else None,
    }


@router.get("/events")
async def list_event_types():
    """List all available webhook event types."""
    return {"events": WEBHOOK_EVENTS}


@router.get("/")
async def list_org_webhooks(
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """List all webhooks for the organization."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        return {"webhooks": []}

    org, _role = org_info
    webhooks = list_webhooks(db, org.id)
    return {"webhooks": [_webhook_to_dict(wh) for wh in webhooks]}


@router.post("/")
async def create_org_webhook(
    body: WebhookCreateRequest,
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """Create a new webhook."""
    # Validate events
    invalid = [e for e in body.events if e not in WEBHOOK_EVENTS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid events: {invalid}")

    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=404, detail="No organization found")

    org, _role = org_info
    wh = create_webhook(
        db,
        org.id,
        url=body.url,
        events=body.events,
        description=body.description,
        created_by=user.id,
    )
    return _webhook_to_dict(wh)


@router.put("/{webhook_id}")
async def update_org_webhook(
    webhook_id: int,
    body: WebhookUpdateRequest,
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """Update a webhook."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=404, detail="No organization found")

    org, _role = org_info
    wh = get_webhook(db, webhook_id, org.id)
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")

    if body.events:
        invalid = [e for e in body.events if e not in WEBHOOK_EVENTS]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid events: {invalid}")

    updated = update_webhook(
        db,
        wh,
        url=body.url,
        events=body.events,
        is_active=body.is_active,
        description=body.description,
    )
    return _webhook_to_dict(updated)


@router.delete("/{webhook_id}")
async def delete_org_webhook(
    webhook_id: int,
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """Delete a webhook."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=404, detail="No organization found")

    org, _role = org_info
    wh = get_webhook(db, webhook_id, org.id)
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")

    delete_webhook(db, wh)
    return {"detail": "Webhook deleted"}


@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: int,
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """Send a test delivery to a webhook."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=404, detail="No organization found")

    org, _role = org_info
    wh = get_webhook(db, webhook_id, org.id)
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")

    test_payload = {
        "event": "test.ping",
        "organization": org.name,
        "message": "This is a test webhook delivery from DevPulse Pro",
    }
    delivery = await deliver_webhook(db, wh, "test.ping", test_payload)
    return {
        "success": delivery.success,
        "response_status": delivery.response_status,
        "response_body": delivery.response_body,
        "delivered_at": delivery.delivered_at.isoformat() if delivery.delivered_at else None,
    }


@router.get("/{webhook_id}/deliveries")
async def list_deliveries(
    webhook_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """Get recent deliveries for a webhook."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=404, detail="No organization found")

    org, _role = org_info
    wh = get_webhook(db, webhook_id, org.id)
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")

    deliveries = get_webhook_deliveries(db, webhook_id, limit=limit, offset=offset)
    return {
        "deliveries": [
            {
                "id": d.id,
                "event": d.event,
                "response_status": d.response_status,
                "success": d.success,
                "attempt": d.attempt,
                "delivered_at": d.delivered_at.isoformat() if d.delivered_at else None,
            }
            for d in deliveries
        ]
    }
