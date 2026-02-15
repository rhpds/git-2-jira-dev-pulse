"""Webhook service for registration, triggering, and delivery tracking."""
from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from ..models.db_models import Webhook, WebhookDelivery

# Supported event types
WEBHOOK_EVENTS = [
    "ticket.created",
    "ticket.updated",
    "scan.completed",
    "member.invited",
    "member.removed",
    "integration.enabled",
    "integration.disabled",
    "subscription.changed",
]


def create_webhook(
    db: Session,
    org_id: int,
    url: str,
    events: list[str],
    *,
    description: Optional[str] = None,
    created_by: Optional[int] = None,
) -> Webhook:
    """Register a new webhook endpoint."""
    secret = secrets.token_hex(32)
    webhook = Webhook(
        org_id=org_id,
        url=url,
        secret=secret,
        events=events,
        description=description,
        created_by=created_by,
    )
    db.add(webhook)
    db.flush()
    return webhook


def list_webhooks(db: Session, org_id: int) -> list[Webhook]:
    """List all webhooks for an organization."""
    stmt = (
        select(Webhook)
        .where(Webhook.org_id == org_id)
        .order_by(desc(Webhook.created_at))
    )
    return list(db.execute(stmt).scalars().all())


def get_webhook(db: Session, webhook_id: int, org_id: int) -> Optional[Webhook]:
    """Get a single webhook by ID."""
    stmt = select(Webhook).where(Webhook.id == webhook_id, Webhook.org_id == org_id)
    return db.execute(stmt).scalar_one_or_none()


def update_webhook(
    db: Session,
    webhook: Webhook,
    *,
    url: Optional[str] = None,
    events: Optional[list[str]] = None,
    is_active: Optional[bool] = None,
    description: Optional[str] = None,
) -> Webhook:
    """Update webhook settings."""
    if url is not None:
        webhook.url = url
    if events is not None:
        webhook.events = events
    if is_active is not None:
        webhook.is_active = is_active
    if description is not None:
        webhook.description = description
    webhook.updated_at = datetime.now(timezone.utc)
    db.flush()
    return webhook


def delete_webhook(db: Session, webhook: Webhook) -> None:
    """Delete a webhook and all its deliveries."""
    db.delete(webhook)
    db.flush()


def _sign_payload(secret: str, payload: str) -> str:
    """Create HMAC-SHA256 signature for a webhook payload."""
    return hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


async def deliver_webhook(
    db: Session,
    webhook: Webhook,
    event: str,
    payload: dict,
) -> WebhookDelivery:
    """Send a webhook delivery and record the result."""
    payload_str = json.dumps(payload, default=str)
    signature = _sign_payload(webhook.secret, payload_str) if webhook.secret else ""

    delivery = WebhookDelivery(
        webhook_id=webhook.id,
        event=event,
        payload=payload,
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                webhook.url,
                content=payload_str,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Event": event,
                    "X-Webhook-Signature": f"sha256={signature}",
                },
            )
        delivery.response_status = response.status_code
        delivery.response_body = response.text[:2000]
        delivery.success = 200 <= response.status_code < 300
    except Exception as exc:
        delivery.response_status = 0
        delivery.response_body = str(exc)[:2000]
        delivery.success = False

    db.add(delivery)
    db.flush()
    return delivery


async def trigger_event(
    db: Session,
    org_id: int,
    event: str,
    payload: dict,
) -> list[WebhookDelivery]:
    """Fire an event to all matching active webhooks for an org."""
    stmt = select(Webhook).where(
        Webhook.org_id == org_id,
        Webhook.is_active == True,
    )
    webhooks = list(db.execute(stmt).scalars().all())

    deliveries = []
    for wh in webhooks:
        if event in (wh.events or []):
            delivery = await deliver_webhook(db, wh, event, payload)
            deliveries.append(delivery)

    return deliveries


def get_webhook_deliveries(
    db: Session,
    webhook_id: int,
    *,
    limit: int = 20,
    offset: int = 0,
) -> list[WebhookDelivery]:
    """Get recent deliveries for a webhook."""
    stmt = (
        select(WebhookDelivery)
        .where(WebhookDelivery.webhook_id == webhook_id)
        .order_by(desc(WebhookDelivery.delivered_at))
        .offset(offset)
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())
