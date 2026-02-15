"""Admin dashboard API routes - requires superadmin role."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import (
    User,
    Organization,
    OrganizationMember,
    Subscription,
    UsageRecord,
    FeatureFlag,
    AuditLog,
    GitHubIntegration,
    LinearIntegration,
    CodeClimateIntegration,
    AnalysisRun,
    Notification,
    Webhook,
)
from ..middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _require_superadmin(user: User):
    """Validate user has superadmin role."""
    if user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")


# ── System Stats ──


@router.get("/stats")
async def get_system_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get system-wide statistics."""
    _require_superadmin(user)

    total_users = db.execute(select(func.count(User.id))).scalar() or 0
    active_users = db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    ).scalar() or 0
    total_orgs = db.execute(select(func.count(Organization.id))).scalar() or 0
    total_subs = db.execute(
        select(func.count(Subscription.id)).where(Subscription.status == "active")
    ).scalar() or 0

    # Plan distribution
    plan_dist = db.execute(
        select(Subscription.plan, func.count(Subscription.id))
        .where(Subscription.status == "active")
        .group_by(Subscription.plan)
    ).all()

    # Integration counts
    github_count = db.execute(select(func.count(GitHubIntegration.id))).scalar() or 0
    linear_count = db.execute(select(func.count(LinearIntegration.id))).scalar() or 0
    cc_count = db.execute(select(func.count(CodeClimateIntegration.id))).scalar() or 0

    # Analysis runs this month
    month_start = datetime.now(timezone.utc).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    scans_this_month = db.execute(
        select(func.count(AnalysisRun.id)).where(
            AnalysisRun.timestamp >= month_start
        )
    ).scalar() or 0

    # Audit events today
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    events_today = db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.created_at >= today_start)
    ).scalar() or 0

    total_webhooks = db.execute(
        select(func.count(Webhook.id)).where(Webhook.is_active == True)
    ).scalar() or 0

    return {
        "users": {"total": total_users, "active": active_users},
        "organizations": total_orgs,
        "subscriptions": {
            "active": total_subs,
            "plan_distribution": {row[0]: row[1] for row in plan_dist},
        },
        "integrations": {
            "github": github_count,
            "linear": linear_count,
            "codeclimate": cc_count,
            "total": github_count + linear_count + cc_count,
        },
        "scans_this_month": scans_this_month,
        "audit_events_today": events_today,
        "active_webhooks": total_webhooks,
    }


# ── Usage Trends ──


@router.get("/usage-trends")
async def get_usage_trends(
    days: int = Query(30, ge=7, le=90),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get system-wide usage trends over time."""
    _require_superadmin(user)

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Daily scan counts from AnalysisRun
    scans = db.execute(
        select(
            func.date(AnalysisRun.timestamp).label("day"),
            func.count(AnalysisRun.id).label("count"),
        )
        .where(AnalysisRun.timestamp >= cutoff)
        .group_by(func.date(AnalysisRun.timestamp))
        .order_by(func.date(AnalysisRun.timestamp))
    ).all()

    # Daily new users
    signups = db.execute(
        select(
            func.date(User.created_at).label("day"),
            func.count(User.id).label("count"),
        )
        .where(User.created_at >= cutoff)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
    ).all()

    # Daily audit events
    events = db.execute(
        select(
            func.date(AuditLog.created_at).label("day"),
            func.count(AuditLog.id).label("count"),
        )
        .where(AuditLog.created_at >= cutoff)
        .group_by(func.date(AuditLog.created_at))
        .order_by(func.date(AuditLog.created_at))
    ).all()

    return {
        "period_days": days,
        "scans": [{"date": str(row[0]), "count": row[1]} for row in scans],
        "signups": [{"date": str(row[0]), "count": row[1]} for row in signups],
        "audit_events": [{"date": str(row[0]), "count": row[1]} for row in events],
    }


# ── Organizations ──


@router.get("/orgs")
async def list_organizations(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all organizations with details."""
    _require_superadmin(user)

    total = db.execute(select(func.count(Organization.id))).scalar() or 0

    orgs = db.execute(
        select(Organization).order_by(desc(Organization.created_at)).offset(offset).limit(limit)
    ).scalars().all()

    result = []
    for org in orgs:
        member_count = db.execute(
            select(func.count(OrganizationMember.id)).where(
                OrganizationMember.org_id == org.id
            )
        ).scalar() or 0

        sub = db.execute(
            select(Subscription).where(Subscription.org_id == org.id)
        ).scalar_one_or_none()

        result.append({
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "member_count": member_count,
            "plan": sub.plan if sub else "free",
            "subscription_status": sub.status if sub else "none",
            "created_at": org.created_at.isoformat() if org.created_at else None,
        })

    return {"organizations": result, "total": total}


# ── Users ──


@router.get("/users")
async def list_users(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all users."""
    _require_superadmin(user)

    total = db.execute(select(func.count(User.id))).scalar() or 0

    users = db.execute(
        select(User).order_by(desc(User.created_at)).offset(offset).limit(limit)
    ).scalars().all()

    result = []
    for u in users:
        result.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    return {"users": result, "total": total}


# ── Feature Flags ──


@router.get("/feature-flags")
async def list_feature_flags(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all feature flags."""
    _require_superadmin(user)

    flags = db.execute(
        select(FeatureFlag).order_by(FeatureFlag.min_plan, FeatureFlag.key)
    ).scalars().all()

    return {
        "flags": [
            {
                "id": f.id,
                "key": f.key,
                "name": f.name,
                "description": f.description,
                "min_plan": f.min_plan,
                "enabled": f.enabled,
            }
            for f in flags
        ]
    }


class FeatureFlagUpdate(BaseModel):
    enabled: bool | None = None
    min_plan: str | None = None


@router.put("/feature-flags/{key}")
async def update_feature_flag(
    key: str,
    body: FeatureFlagUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a feature flag."""
    _require_superadmin(user)

    flag = db.execute(
        select(FeatureFlag).where(FeatureFlag.key == key)
    ).scalar_one_or_none()

    if not flag:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    if body.enabled is not None:
        flag.enabled = body.enabled
    if body.min_plan is not None:
        valid_plans = ["free", "pro", "team", "business", "enterprise"]
        if body.min_plan not in valid_plans:
            raise HTTPException(status_code=400, detail=f"Invalid plan: {body.min_plan}")
        flag.min_plan = body.min_plan

    db.flush()

    return {
        "id": flag.id,
        "key": flag.key,
        "name": flag.name,
        "min_plan": flag.min_plan,
        "enabled": flag.enabled,
    }
