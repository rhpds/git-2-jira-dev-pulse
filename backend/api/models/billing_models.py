"""Pydantic models for billing and subscription management."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# Plan definitions with limits
PLAN_LIMITS = {
    "free": {
        "name": "Free",
        "price_monthly": 0,
        "seats": 1,
        "repos": 5,
        "integrations": 1,
        "features": [
            "basic_scanning",
            "jira_integration",
            "manual_sync",
        ],
    },
    "pro": {
        "name": "Pro",
        "price_monthly": 19,
        "seats": 1,
        "repos": 25,
        "integrations": 3,
        "features": [
            "basic_scanning",
            "jira_integration",
            "manual_sync",
            "github_integration",
            "auto_discovery",
            "export",
            "themes",
            "history",
        ],
    },
    "team": {
        "name": "Team",
        "price_monthly": 49,
        "seats": 10,
        "repos": 100,
        "integrations": 5,
        "features": [
            "basic_scanning",
            "jira_integration",
            "manual_sync",
            "github_integration",
            "linear_integration",
            "auto_discovery",
            "export",
            "themes",
            "history",
            "auto_sync",
            "api_keys",
        ],
    },
    "business": {
        "name": "Business",
        "price_monthly": 149,
        "seats": 50,
        "repos": 500,
        "integrations": 10,
        "features": [
            "basic_scanning",
            "jira_integration",
            "manual_sync",
            "github_integration",
            "linear_integration",
            "codeclimate_integration",
            "auto_discovery",
            "export",
            "themes",
            "history",
            "auto_sync",
            "api_keys",
            "priority_support",
            "custom_templates",
        ],
    },
    "enterprise": {
        "name": "Enterprise",
        "price_monthly": 499,
        "seats": -1,  # Unlimited
        "repos": -1,
        "integrations": -1,
        "features": [
            "basic_scanning",
            "jira_integration",
            "manual_sync",
            "github_integration",
            "linear_integration",
            "codeclimate_integration",
            "auto_discovery",
            "export",
            "themes",
            "history",
            "auto_sync",
            "api_keys",
            "priority_support",
            "custom_templates",
            "sso",
            "audit_log",
            "dedicated_support",
        ],
    },
}


class PlanInfo(BaseModel):
    id: str
    name: str
    price_monthly: int
    seats: int  # -1 = unlimited
    repos: int
    integrations: int
    features: list[str]
    is_current: bool = False


class CheckoutSessionRequest(BaseModel):
    plan: str = Field(..., pattern="^(pro|team|business|enterprise)$")
    billing_period: str = Field("monthly", pattern="^(monthly|yearly)$")
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str


class CustomerPortalResponse(BaseModel):
    portal_url: str


class UsageSummary(BaseModel):
    repos_scanned: int = 0
    repos_limit: int = 5
    tickets_created: int = 0
    api_calls: int = 0
    integrations_active: int = 0
    integrations_limit: int = 1
    seats_used: int = 0
    seats_limit: int = 1
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class BillingOverview(BaseModel):
    subscription: Optional[SubscriptionDetail] = None
    usage: UsageSummary
    plans: list[PlanInfo]


class SubscriptionDetail(BaseModel):
    plan: str
    plan_name: str
    status: str
    price_monthly: int
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    cancel_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# Forward reference resolution
BillingOverview.model_rebuild()
