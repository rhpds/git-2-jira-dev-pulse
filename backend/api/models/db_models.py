"""SQLAlchemy database models."""
import json
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    DateTime,
    Boolean,
    Text,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.types import TypeDecorator

# Create declarative base for models
Base = declarative_base()


class JSONType(TypeDecorator):
    """Custom type for JSON serialization."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Serialize to JSON string."""
        if value is not None:
            return json.dumps(value)
        return None

    def process_result_value(self, value, dialect):
        """Deserialize from JSON string."""
        if value is not None:
            return json.loads(value)
        return None


class AnalysisRun(Base):
    """Stores information about each analysis run."""

    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    repos_analyzed = Column(JSONType, nullable=False)  # List of repo paths/names
    project_key = Column(String(50), nullable=True, index=True)
    analysis_metadata = Column(JSONType, nullable=True)  # Additional info (commit counts, etc.)

    # Relationship to suggestions
    suggestions = relationship(
        "AnalysisSuggestion",
        back_populates="analysis_run",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        repos_list = self.repos_analyzed if isinstance(self.repos_analyzed, list) else []
        return f"<AnalysisRun(id={self.id}, timestamp={self.timestamp}, repos={len(repos_list)})>"


class TicketTemplate(Base):
    """Stores ticket templates for different types of work."""

    __tablename__ = "ticket_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    summary_pattern = Column(String(500), nullable=False)
    description_template = Column(Text, nullable=False)
    issue_type = Column(String(50), nullable=False, default="Task")
    priority = Column(String(20), nullable=False, default="Medium")
    labels = Column(JSONType, nullable=True)  # List of label strings
    is_default = Column(Boolean, nullable=False, default=False)

    def __repr__(self):
        return f"<TicketTemplate(id={self.id}, name={self.name}, is_default={self.is_default})>"


class AnalysisSuggestion(Base):
    """Stores individual ticket suggestions from an analysis run."""

    __tablename__ = "analysis_suggestions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_run_id = Column(
        Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False
    )
    suggestion_id = Column(String(100), nullable=False)  # UUID or identifier
    summary = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    issue_type = Column(String(50), nullable=False)
    priority = Column(String(20), nullable=False)
    source_repo = Column(String(500), nullable=True)
    labels = Column(JSONType, nullable=True)  # List of label strings
    was_created = Column(Boolean, nullable=False, default=False)
    jira_key = Column(String(50), nullable=True)  # e.g., "RHDPOPS-1234"
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationship to analysis run
    analysis_run = relationship("AnalysisRun", back_populates="suggestions")

    def __repr__(self):
        return f"<AnalysisSuggestion(id={self.id}, summary={self.summary[:50]}, was_created={self.was_created})>"


class GitHubIntegration(Base):
    """Stores GitHub integration data for repositories."""

    __tablename__ = "github_integrations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    repo_path = Column(String(1000), nullable=False, unique=True, index=True)
    repo_name = Column(String(500), nullable=False)
    github_owner = Column(String(100), nullable=True)  # e.g., "octocat"
    github_repo = Column(String(100), nullable=True)  # e.g., "hello-world"
    remote_url = Column(String(1000), nullable=True)
    last_synced = Column(DateTime, nullable=True)
    sync_enabled = Column(Boolean, nullable=False, default=True)
    repo_metadata = Column(JSONType, nullable=True)  # Store repo info, PR counts, etc.
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<GitHubIntegration(repo={self.repo_name}, github={self.github_owner}/{self.github_repo})>"


class GitHubPullRequest(Base):
    """Stores cached GitHub pull request data."""

    __tablename__ = "github_pull_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    integration_id = Column(Integer, ForeignKey("github_integrations.id", ondelete="CASCADE"), nullable=False)
    pr_number = Column(Integer, nullable=False)
    title = Column(String(500), nullable=False)
    state = Column(String(20), nullable=False)  # open, closed, merged
    url = Column(String(1000), nullable=False)
    branch = Column(String(200), nullable=False)
    base_branch = Column(String(200), nullable=False)
    author = Column(String(100), nullable=False)
    created_at_gh = Column(DateTime, nullable=False)  # GitHub creation time
    merged_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    jira_key = Column(String(50), nullable=True)  # Linked Jira ticket
    pr_data = Column(JSONType, nullable=True)  # Full PR details
    last_synced = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<GitHubPullRequest(pr=#{self.pr_number}, state={self.state}, jira={self.jira_key})>"


class LinearIntegration(Base):
    """Stores Linear integration configuration."""

    __tablename__ = "linear_integrations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_id = Column(String(100), nullable=False, unique=True, index=True)
    team_name = Column(String(200), nullable=False)
    team_key = Column(String(50), nullable=False)
    enabled = Column(Boolean, nullable=False, default=True)
    auto_sync = Column(Boolean, nullable=False, default=True)
    sync_interval_minutes = Column(Integer, nullable=False, default=30)
    last_synced = Column(DateTime, nullable=True)
    team_metadata = Column(JSONType, nullable=True)  # Store team info
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<LinearIntegration(team={self.team_name}, key={self.team_key})>"


class LinearIssue(Base):
    """Stores cached Linear issue data."""

    __tablename__ = "linear_issues"

    id = Column(Integer, primary_key=True, autoincrement=True)
    integration_id = Column(Integer, ForeignKey("linear_integrations.id", ondelete="CASCADE"), nullable=False)
    linear_id = Column(String(100), nullable=False, unique=True, index=True)
    identifier = Column(String(50), nullable=False)  # e.g., "ENG-123"
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    state_name = Column(String(100), nullable=False)
    state_type = Column(String(50), nullable=False)  # backlog, unstarted, started, completed, canceled
    priority = Column(Integer, nullable=False, default=0)
    url = Column(String(1000), nullable=False)
    assignee_id = Column(String(100), nullable=True)
    assignee_name = Column(String(200), nullable=True)
    project_id = Column(String(100), nullable=True)
    project_name = Column(String(200), nullable=True)
    created_at_linear = Column(DateTime, nullable=False)
    updated_at_linear = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    jira_key = Column(String(50), nullable=True)  # Linked Jira ticket
    issue_data = Column(JSONType, nullable=True)  # Full issue details
    last_synced = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<LinearIssue(id={self.identifier}, state={self.state_name}, jira={self.jira_key})>"


class CodeClimateIntegration(Base):
    """Stores CodeClimate integration configuration."""

    __tablename__ = "codeclimate_integrations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    repo_id = Column(String(100), nullable=False, unique=True, index=True)
    repo_name = Column(String(200), nullable=False)
    repo_slug = Column(String(200), nullable=False)
    github_slug = Column(String(200), nullable=True)
    enabled = Column(Boolean, nullable=False, default=True)
    auto_sync = Column(Boolean, nullable=False, default=True)
    sync_interval_minutes = Column(Integer, nullable=False, default=60)
    last_synced = Column(DateTime, nullable=True)
    repo_metadata = Column(JSONType, nullable=True)  # Store repo info
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<CodeClimateIntegration(repo={self.repo_name}, slug={self.repo_slug})>"


class CodeClimateSnapshot(Base):
    """Stores cached CodeClimate quality snapshots."""

    __tablename__ = "codeclimate_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    integration_id = Column(Integer, ForeignKey("codeclimate_integrations.id", ondelete="CASCADE"), nullable=False)
    snapshot_id = Column(String(100), nullable=False, unique=True, index=True)
    commit_sha = Column(String(100), nullable=False)
    committed_at = Column(DateTime, nullable=False)
    gpa = Column(Integer, nullable=True)  # Maintainability score 0-4
    lines_of_code = Column(Integer, nullable=False, default=0)
    test_coverage = Column(Integer, nullable=True)  # Percentage 0-100
    coverage_rating = Column(String(10), nullable=True)  # A, B, C, D, F
    total_issues = Column(Integer, nullable=False, default=0)
    technical_debt_hours = Column(Integer, nullable=True)
    snapshot_data = Column(JSONType, nullable=True)  # Full snapshot details
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<CodeClimateSnapshot(sha={self.commit_sha[:7]}, gpa={self.gpa})>"


# ============================================================================
# Phase 2: Authentication, Organizations, and Billing Models
# ============================================================================


class User(Base):
    """User accounts for multi-tenancy."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=False)
    avatar_url = Column(String(1000), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    role = Column(String(20), nullable=False, default="user")  # user, admin, superadmin
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)

    # Relationships
    memberships = relationship("OrganizationMember", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


class Organization(Base):
    """Organizations for team-based multi-tenancy."""

    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    stripe_customer_id = Column(String(100), nullable=True, unique=True, index=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="organization", uselist=False, cascade="all, delete-orphan")
    usage_records = relationship("UsageRecord", back_populates="organization", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Organization(id={self.id}, name={self.name}, slug={self.slug})>"


class OrganizationMember(Base):
    """Membership linking users to organizations with roles."""

    __tablename__ = "organization_members"
    __table_args__ = (
        UniqueConstraint("user_id", "org_id", name="uq_user_org"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False, default="member")  # owner, admin, member, viewer
    joined_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="memberships")
    organization = relationship("Organization", back_populates="members")

    def __repr__(self):
        return f"<OrganizationMember(user={self.user_id}, org={self.org_id}, role={self.role})>"


class Subscription(Base):
    """Subscription plans tied to organizations."""

    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True)
    plan = Column(String(20), nullable=False, default="free")  # free, pro, team, business, enterprise
    status = Column(String(20), nullable=False, default="active")  # active, trialing, past_due, canceled, paused
    stripe_subscription_id = Column(String(100), nullable=True, unique=True, index=True)
    stripe_price_id = Column(String(100), nullable=True)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)
    cancel_at = Column(DateTime, nullable=True)
    seats_limit = Column(Integer, nullable=False, default=1)
    repos_limit = Column(Integer, nullable=False, default=5)
    integrations_limit = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    organization = relationship("Organization", back_populates="subscription")

    def __repr__(self):
        return f"<Subscription(org={self.org_id}, plan={self.plan}, status={self.status})>"


class UsageRecord(Base):
    """Tracks usage metrics per organization for billing and quotas."""

    __tablename__ = "usage_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    metric = Column(String(50), nullable=False, index=True)  # repos_scanned, tickets_created, api_calls, integrations_active
    value = Column(Float, nullable=False, default=0)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    recorded_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    organization = relationship("Organization", back_populates="usage_records")

    def __repr__(self):
        return f"<UsageRecord(org={self.org_id}, metric={self.metric}, value={self.value})>"


class APIKey(Base):
    """API keys for programmatic access."""

    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key_hash = Column(String(255), nullable=False, unique=True, index=True)
    name = Column(String(100), nullable=False)
    prefix = Column(String(10), nullable=False)  # First 8 chars for identification
    scopes = Column(JSONType, nullable=True)  # List of allowed scopes
    last_used = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="api_keys")

    def __repr__(self):
        return f"<APIKey(id={self.id}, name={self.name}, prefix={self.prefix}...)>"


class FeatureFlag(Base):
    """Feature flags for tier-based access control."""

    __tablename__ = "feature_flags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), nullable=False, unique=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    min_plan = Column(String(20), nullable=False, default="free")  # Minimum plan required
    enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<FeatureFlag(key={self.key}, min_plan={self.min_plan})>"
