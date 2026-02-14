"""Usage tracking and quota enforcement service."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..models.db_models import (
    UsageRecord,
    Subscription,
    Organization,
    OrganizationMember,
    GitHubIntegration,
    LinearIntegration,
    CodeClimateIntegration,
)
from ..models.billing_models import PLAN_LIMITS
from ..logging_config import get_logger

logger = get_logger(__name__)


def get_current_period() -> tuple[datetime, datetime]:
    """Get the current billing period (calendar month)."""
    now = datetime.now(timezone.utc)
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        period_end = period_start.replace(year=now.year + 1, month=1)
    else:
        period_end = period_start.replace(month=now.month + 1)
    return period_start, period_end


def record_usage(db: Session, org_id: int, metric: str, value: float = 1.0):
    """Record a usage metric for the organization."""
    period_start, period_end = get_current_period()

    # Find existing record for this period
    stmt = select(UsageRecord).where(
        UsageRecord.org_id == org_id,
        UsageRecord.metric == metric,
        UsageRecord.period_start == period_start,
    )
    record = db.execute(stmt).scalar_one_or_none()

    if record:
        record.value = record.value + value
        record.recorded_at = datetime.now(timezone.utc)
    else:
        record = UsageRecord(
            org_id=org_id,
            metric=metric,
            value=value,
            period_start=period_start,
            period_end=period_end,
        )
        db.add(record)

    db.commit()


def get_usage_summary(db: Session, org_id: int) -> dict:
    """Get current usage metrics for the organization."""
    period_start, period_end = get_current_period()

    # Get metrics for current period
    stmt = select(UsageRecord).where(
        UsageRecord.org_id == org_id,
        UsageRecord.period_start == period_start,
    )
    records = db.execute(stmt).scalars().all()
    metrics = {r.metric: r.value for r in records}

    # Count active integrations
    github_count = db.execute(
        select(func.count(GitHubIntegration.id))
    ).scalar() or 0
    linear_count = db.execute(
        select(func.count(LinearIntegration.id))
    ).scalar() or 0
    codeclimate_count = db.execute(
        select(func.count(CodeClimateIntegration.id))
    ).scalar() or 0
    integrations_active = github_count + linear_count + codeclimate_count

    # Count members
    member_count = db.execute(
        select(func.count(OrganizationMember.id)).where(
            OrganizationMember.org_id == org_id
        )
    ).scalar() or 0

    # Get plan limits
    subscription = db.execute(
        select(Subscription).where(Subscription.org_id == org_id)
    ).scalar_one_or_none()
    plan = subscription.plan if subscription else "free"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

    return {
        "repos_scanned": int(metrics.get("repos_scanned", 0)),
        "repos_limit": limits["repos"],
        "tickets_created": int(metrics.get("tickets_created", 0)),
        "api_calls": int(metrics.get("api_calls", 0)),
        "integrations_active": integrations_active,
        "integrations_limit": limits["integrations"],
        "seats_used": member_count,
        "seats_limit": limits["seats"],
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
    }


def check_quota(db: Session, org_id: int, metric: str) -> tuple[bool, str]:
    """Check if the organization is within quota for a metric.

    Returns (allowed, message).
    """
    subscription = db.execute(
        select(Subscription).where(Subscription.org_id == org_id)
    ).scalar_one_or_none()
    plan = subscription.plan if subscription else "free"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

    if metric == "repos":
        limit = limits["repos"]
        if limit == -1:
            return True, ""
        period_start, _ = get_current_period()
        stmt = select(UsageRecord).where(
            UsageRecord.org_id == org_id,
            UsageRecord.metric == "repos_scanned",
            UsageRecord.period_start == period_start,
        )
        record = db.execute(stmt).scalar_one_or_none()
        current = int(record.value) if record else 0
        if current >= limit:
            return False, f"Repository scan limit reached ({limit}). Upgrade your plan."
        return True, ""

    elif metric == "integrations":
        limit = limits["integrations"]
        if limit == -1:
            return True, ""
        github_count = db.execute(
            select(func.count(GitHubIntegration.id))
        ).scalar() or 0
        linear_count = db.execute(
            select(func.count(LinearIntegration.id))
        ).scalar() or 0
        codeclimate_count = db.execute(
            select(func.count(CodeClimateIntegration.id))
        ).scalar() or 0
        current = github_count + linear_count + codeclimate_count
        if current >= limit:
            return False, f"Integration limit reached ({limit}). Upgrade your plan."
        return True, ""

    elif metric == "seats":
        limit = limits["seats"]
        if limit == -1:
            return True, ""
        current = db.execute(
            select(func.count(OrganizationMember.id)).where(
                OrganizationMember.org_id == org_id
            )
        ).scalar() or 0
        if current >= limit:
            return False, f"Seat limit reached ({limit}). Upgrade your plan."
        return True, ""

    return True, ""
