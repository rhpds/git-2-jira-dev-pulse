"""Billing and subscription management API routes."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, Organization, OrganizationMember, Subscription, UsageRecord
from ..models.billing_models import (
    PLAN_LIMITS,
    PlanInfo,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    CustomerPortalResponse,
    UsageSummary,
    BillingOverview,
    SubscriptionDetail,
)
from ..services.auth_service import get_user_organization, get_org_subscription
from ..services.stripe_service import (
    is_stripe_configured,
    create_checkout_session,
    create_customer_portal,
    handle_webhook,
)
from ..middleware.auth_middleware import get_current_user, require_org_role

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.get("/plans")
async def list_plans(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PlanInfo]:
    """List all available subscription plans."""
    org_info = get_user_organization(db, user.id)
    current_plan = "free"
    if org_info:
        org, _role = org_info
        sub = get_org_subscription(db, org.id)
        if sub:
            current_plan = sub.plan

    plans = []
    for plan_id, config in PLAN_LIMITS.items():
        plans.append(PlanInfo(
            id=plan_id,
            name=config["name"],
            price_monthly=config["price_monthly"],
            seats=config["seats"],
            repos=config["repos"],
            integrations=config["integrations"],
            features=config["features"],
            is_current=(plan_id == current_plan),
        ))

    return plans


@router.get("/overview")
async def get_billing_overview(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BillingOverview:
    """Get complete billing overview including subscription, usage, and plans."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=403, detail="No organization found")

    org, _role = org_info
    subscription = get_org_subscription(db, org.id)

    # Build subscription detail
    sub_detail = None
    current_plan = "free"
    if subscription:
        current_plan = subscription.plan
        plan_config = PLAN_LIMITS.get(current_plan, PLAN_LIMITS["free"])
        sub_detail = SubscriptionDetail(
            plan=subscription.plan,
            plan_name=plan_config["name"],
            status=subscription.status,
            price_monthly=plan_config["price_monthly"],
            current_period_start=subscription.current_period_start,
            current_period_end=subscription.current_period_end,
            trial_end=subscription.trial_end,
            cancel_at=subscription.cancel_at,
        )

    # Build usage summary
    member_count = db.execute(
        select(func.count(OrganizationMember.id)).where(
            OrganizationMember.org_id == org.id
        )
    ).scalar() or 0

    plan_limits = PLAN_LIMITS.get(current_plan, PLAN_LIMITS["free"])
    usage = UsageSummary(
        repos_scanned=0,  # TODO: Track actual usage
        repos_limit=plan_limits["repos"],
        tickets_created=0,
        api_calls=0,
        integrations_active=0,
        integrations_limit=plan_limits["integrations"],
        seats_used=member_count,
        seats_limit=plan_limits["seats"],
    )

    # Build plans list
    plans = []
    for plan_id, config in PLAN_LIMITS.items():
        plans.append(PlanInfo(
            id=plan_id,
            name=config["name"],
            price_monthly=config["price_monthly"],
            seats=config["seats"],
            repos=config["repos"],
            integrations=config["integrations"],
            features=config["features"],
            is_current=(plan_id == current_plan),
        ))

    return BillingOverview(
        subscription=sub_detail,
        usage=usage,
        plans=plans,
    )


@router.post("/checkout")
async def create_checkout(
    request: CheckoutSessionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckoutSessionResponse:
    """Create a Stripe checkout session for subscribing to a plan."""
    if not is_stripe_configured():
        raise HTTPException(status_code=503, detail="Stripe billing is not configured")

    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=403, detail="No organization found")

    org, _role = org_info

    try:
        result = create_checkout_session(
            db,
            org=org,
            email=user.email,
            plan=request.plan,
            billing_period=request.billing_period,
            success_url=request.success_url,
            cancel_url=request.cancel_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return CheckoutSessionResponse(**result)


@router.post("/portal")
async def customer_portal(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CustomerPortalResponse:
    """Create a Stripe Customer Portal session for managing billing."""
    if not is_stripe_configured():
        raise HTTPException(status_code=503, detail="Stripe billing is not configured")

    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=403, detail="No organization found")

    org, _role = org_info

    try:
        result = create_customer_portal(db, org=org, email=user.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return CustomerPortalResponse(**result)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        result = handle_webhook(db, payload, sig_header)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/usage")
async def get_usage(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UsageSummary:
    """Get current usage metrics for the organization."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=403, detail="No organization found")

    org, _role = org_info
    subscription = get_org_subscription(db, org.id)
    current_plan = subscription.plan if subscription else "free"
    plan_limits = PLAN_LIMITS.get(current_plan, PLAN_LIMITS["free"])

    member_count = db.execute(
        select(func.count(OrganizationMember.id)).where(
            OrganizationMember.org_id == org.id
        )
    ).scalar() or 0

    return UsageSummary(
        repos_scanned=0,
        repos_limit=plan_limits["repos"],
        tickets_created=0,
        api_calls=0,
        integrations_active=0,
        integrations_limit=plan_limits["integrations"],
        seats_used=member_count,
        seats_limit=plan_limits["seats"],
    )


@router.get("/stripe-status")
async def get_stripe_status() -> dict:
    """Check if Stripe is configured."""
    return {"configured": is_stripe_configured()}
