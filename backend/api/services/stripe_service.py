"""Stripe billing service for subscription management."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

import stripe
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.db_models import Organization, Subscription
from ..models.billing_models import PLAN_LIMITS
from ..logging_config import get_logger

logger = get_logger(__name__)

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# Price IDs mapped to plans (configure via environment)
STRIPE_PRICE_MAP = {
    "pro_monthly": os.getenv("STRIPE_PRICE_PRO_MONTHLY", ""),
    "pro_yearly": os.getenv("STRIPE_PRICE_PRO_YEARLY", ""),
    "team_monthly": os.getenv("STRIPE_PRICE_TEAM_MONTHLY", ""),
    "team_yearly": os.getenv("STRIPE_PRICE_TEAM_YEARLY", ""),
    "business_monthly": os.getenv("STRIPE_PRICE_BUSINESS_MONTHLY", ""),
    "business_yearly": os.getenv("STRIPE_PRICE_BUSINESS_YEARLY", ""),
    "enterprise_monthly": os.getenv("STRIPE_PRICE_ENTERPRISE_MONTHLY", ""),
    "enterprise_yearly": os.getenv("STRIPE_PRICE_ENTERPRISE_YEARLY", ""),
}


def is_stripe_configured() -> bool:
    return bool(stripe.api_key)


def get_or_create_customer(db: Session, org: Organization, email: str) -> str:
    """Get or create a Stripe customer for the organization."""
    if org.stripe_customer_id:
        return org.stripe_customer_id

    customer = stripe.Customer.create(
        email=email,
        name=org.name,
        metadata={"org_id": str(org.id), "org_slug": org.slug},
    )

    org.stripe_customer_id = customer.id
    db.commit()
    db.refresh(org)

    logger.info(f"Created Stripe customer {customer.id} for org {org.slug}")
    return customer.id


def create_checkout_session(
    db: Session,
    org: Organization,
    email: str,
    plan: str,
    billing_period: str = "monthly",
    success_url: Optional[str] = None,
    cancel_url: Optional[str] = None,
) -> dict:
    """Create a Stripe Checkout session for subscription."""
    if not is_stripe_configured():
        raise ValueError("Stripe is not configured")

    customer_id = get_or_create_customer(db, org, email)
    price_key = f"{plan}_{billing_period}"
    price_id = STRIPE_PRICE_MAP.get(price_key)

    if not price_id:
        raise ValueError(f"No Stripe price configured for {price_key}")

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url or "http://localhost:6100/settings?billing=success",
        cancel_url=cancel_url or "http://localhost:6100/settings?billing=canceled",
        metadata={"org_id": str(org.id), "plan": plan},
    )

    return {"checkout_url": session.url, "session_id": session.id}


def create_customer_portal(db: Session, org: Organization, email: str) -> dict:
    """Create a Stripe Customer Portal session for managing billing."""
    if not is_stripe_configured():
        raise ValueError("Stripe is not configured")

    customer_id = get_or_create_customer(db, org, email)

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url="http://localhost:6100/settings",
    )

    return {"portal_url": session.url}


def handle_webhook(db: Session, payload: bytes, sig_header: str) -> dict:
    """Handle Stripe webhook events."""
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise ValueError("Invalid webhook signature")

    event_type = event["type"]
    data = event["data"]["object"]

    logger.info(f"Stripe webhook: {event_type}")

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(db, data)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(db, data)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(db, data)
    elif event_type == "invoice.payment_failed":
        _handle_payment_failed(db, data)

    return {"status": "ok", "event_type": event_type}


def _handle_checkout_completed(db: Session, session_data: dict):
    """Process successful checkout."""
    org_id = session_data.get("metadata", {}).get("org_id")
    plan = session_data.get("metadata", {}).get("plan")
    subscription_id = session_data.get("subscription")

    if not org_id or not plan:
        logger.warning("Checkout completed without org_id or plan metadata")
        return

    stmt = select(Subscription).where(Subscription.org_id == int(org_id))
    subscription = db.execute(stmt).scalar_one_or_none()

    if subscription:
        plan_limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
        subscription.plan = plan
        subscription.status = "active"
        subscription.stripe_subscription_id = subscription_id
        subscription.seats_limit = plan_limits["seats"]
        subscription.repos_limit = plan_limits["repos"]
        subscription.integrations_limit = plan_limits["integrations"]
        subscription.updated_at = datetime.now(timezone.utc)
        db.commit()

    logger.info(f"Checkout completed: org={org_id}, plan={plan}")


def _handle_subscription_updated(db: Session, sub_data: dict):
    """Process subscription updates (upgrades, downgrades)."""
    stripe_sub_id = sub_data.get("id")
    status = sub_data.get("status")

    stmt = select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    subscription = db.execute(stmt).scalar_one_or_none()

    if subscription:
        subscription.status = status
        period = sub_data.get("current_period_end")
        if period:
            subscription.current_period_end = datetime.fromtimestamp(period, tz=timezone.utc)
        cancel_at = sub_data.get("cancel_at")
        if cancel_at:
            subscription.cancel_at = datetime.fromtimestamp(cancel_at, tz=timezone.utc)
        subscription.updated_at = datetime.now(timezone.utc)
        db.commit()

    logger.info(f"Subscription updated: {stripe_sub_id}, status={status}")


def _handle_subscription_deleted(db: Session, sub_data: dict):
    """Process subscription cancellation — downgrade to free."""
    stripe_sub_id = sub_data.get("id")

    stmt = select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    subscription = db.execute(stmt).scalar_one_or_none()

    if subscription:
        free_limits = PLAN_LIMITS["free"]
        subscription.plan = "free"
        subscription.status = "active"
        subscription.stripe_subscription_id = None
        subscription.stripe_price_id = None
        subscription.seats_limit = free_limits["seats"]
        subscription.repos_limit = free_limits["repos"]
        subscription.integrations_limit = free_limits["integrations"]
        subscription.cancel_at = None
        subscription.updated_at = datetime.now(timezone.utc)
        db.commit()

    logger.info(f"Subscription deleted (downgraded to free): {stripe_sub_id}")


def _handle_payment_failed(db: Session, invoice_data: dict):
    """Handle failed payment."""
    subscription_id = invoice_data.get("subscription")

    stmt = select(Subscription).where(Subscription.stripe_subscription_id == subscription_id)
    subscription = db.execute(stmt).scalar_one_or_none()

    if subscription:
        subscription.status = "past_due"
        subscription.updated_at = datetime.now(timezone.utc)
        db.commit()

    logger.warning(f"Payment failed for subscription: {subscription_id}")
