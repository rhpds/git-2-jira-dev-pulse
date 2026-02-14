"""Seed default feature flags."""
from sqlalchemy.orm import Session

from .models.db_models import FeatureFlag


DEFAULT_FEATURES = [
    {"key": "basic_scanning", "name": "Basic Repository Scanning", "min_plan": "free"},
    {"key": "jira_integration", "name": "Jira Ticket Integration", "min_plan": "free"},
    {"key": "manual_sync", "name": "Manual Data Sync", "min_plan": "free"},
    {"key": "github_integration", "name": "GitHub Integration", "min_plan": "pro"},
    {"key": "auto_discovery", "name": "Auto-Discovery", "min_plan": "pro"},
    {"key": "export", "name": "Data Export", "min_plan": "pro"},
    {"key": "themes", "name": "Custom Themes", "min_plan": "pro"},
    {"key": "history", "name": "Analysis History", "min_plan": "pro"},
    {"key": "linear_integration", "name": "Linear Integration", "min_plan": "team"},
    {"key": "auto_sync", "name": "Automatic Sync", "min_plan": "team"},
    {"key": "api_keys", "name": "API Keys", "min_plan": "team"},
    {"key": "codeclimate_integration", "name": "CodeClimate Integration", "min_plan": "business"},
    {"key": "priority_support", "name": "Priority Support", "min_plan": "business"},
    {"key": "custom_templates", "name": "Custom Ticket Templates", "min_plan": "business"},
    {"key": "sso", "name": "Single Sign-On (SSO)", "min_plan": "enterprise"},
    {"key": "audit_log", "name": "Audit Log", "min_plan": "enterprise"},
    {"key": "dedicated_support", "name": "Dedicated Support", "min_plan": "enterprise"},
]


def seed_feature_flags(db: Session):
    """Create default feature flags if they don't exist."""
    existing_count = db.query(FeatureFlag).count()
    if existing_count > 0:
        return

    for feature in DEFAULT_FEATURES:
        flag = FeatureFlag(
            key=feature["key"],
            name=feature["name"],
            min_plan=feature["min_plan"],
            enabled=True,
        )
        db.add(flag)

    db.commit()
