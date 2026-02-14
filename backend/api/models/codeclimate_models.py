"""Pydantic models for CodeClimate integration."""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CodeClimateConnectionStatus(BaseModel):
    """CodeClimate connection status response."""

    connected: bool
    orgs_count: Optional[int] = None
    error: Optional[str] = None


class CodeClimateOrg(BaseModel):
    """CodeClimate organization information."""

    id: str
    name: str
    avatar_url: str = ""


class CodeClimateRepo(BaseModel):
    """CodeClimate repository information."""

    id: str
    name: str
    slug: str
    badge_token: str = ""
    github_slug: str = ""
    analysis_version: int = 0
    last_activity_at: Optional[str] = None
    created_at: Optional[str] = None


class CodeClimateSnapshot(BaseModel):
    """CodeClimate quality snapshot."""

    id: str
    commit_sha: str
    committed_at: str
    created_at: str
    gpa: Optional[float] = None  # 0-4
    worker_version: int = 0
    lines_of_code: int = 0
    ratings: list = Field(default_factory=list)


class CodeClimateTestCoverage(BaseModel):
    """CodeClimate test coverage report."""

    id: str
    commit_sha: str
    committed_at: str
    covered_percent: float = 0.0
    lines_covered: int = 0
    lines_total: int = 0
    rating: Optional[str] = None  # A, B, C, D, F
    received_at: Optional[str] = None


class CodeClimateIssue(BaseModel):
    """CodeClimate code quality issue."""

    id: str
    check_name: str
    description: str = ""
    category: list[str] = Field(default_factory=list)
    severity: str = ""
    remediation_points: int = 0
    location: dict = Field(default_factory=dict)
    fingerprint: str = ""


class CodeClimateStats(BaseModel):
    """Comprehensive CodeClimate statistics."""

    repo_id: str
    maintainability_score: Optional[float] = None
    maintainability_grade: str = "N/A"
    test_coverage: float = 0.0
    coverage_rating: str = "N/A"
    lines_of_code: int = 0
    total_issues: int = 0
    technical_debt_hours: float = 0.0
    last_snapshot_at: Optional[str] = None
    last_coverage_at: Optional[str] = None
    error: Optional[str] = None


class EnableCodeClimateIntegrationRequest(BaseModel):
    """Request to enable CodeClimate integration for a repository."""

    repo_id: str
    repo_name: Optional[str] = None  # Auto-detected if None
    repo_slug: Optional[str] = None  # Auto-detected if None
    github_slug: Optional[str] = None
    auto_sync: bool = True
    sync_interval_minutes: int = 60


class CodeClimateSyncResult(BaseModel):
    """Result of syncing CodeClimate data."""

    success: bool
    repo_name: str
    snapshots_synced: int = 0
    issues_synced: int = 0
    error: Optional[str] = None
    last_synced: Optional[datetime] = None
