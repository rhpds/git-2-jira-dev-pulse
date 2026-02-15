"""AI-Powered Recommendations Engine API routes.

Generates smart suggestions from repo data — commit pattern insights,
ticket recommendations, code review hints. Heuristic-based AI engine.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User
from ..middleware.auth_middleware import get_current_user
from ..services.folder_scanner import FolderScanner
from ..services.git_analyzer import GitAnalyzer

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


class Recommendation(BaseModel):
    id: str
    category: str  # "commit", "review", "maintenance", "productivity", "jira"
    priority: str  # "high", "medium", "low"
    title: str
    description: str
    action: str
    repo: str | None = None
    jira_ref: str | None = None
    confidence: float  # 0-1


class RecommendationsResponse(BaseModel):
    generated_at: str
    total: int
    by_category: dict[str, int]
    by_priority: dict[str, int]
    recommendations: list[Recommendation]
    insights: list[dict]


@router.get("/", response_model=RecommendationsResponse)
async def get_recommendations(
    days: int = Query(14, description="Analysis period"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate AI-powered recommendations from repo analysis."""
    scanner = FolderScanner()
    repos = scanner.scan()
    analyzer = GitAnalyzer()

    recs: list[Recommendation] = []
    insights: list[dict] = []
    rec_id = 0

    now = datetime.now(timezone.utc)
    since_dt = now - timedelta(days=days)

    all_authors: dict[str, int] = defaultdict(int)
    stale_repos: list[str] = []
    dirty_repos: list[str] = []
    orphan_branches: list[dict] = []
    large_uncommitted: list[dict] = []
    single_author_repos: list[str] = []
    jira_orphans: list[dict] = []  # commits without jira refs
    active_jira: set[str] = set()

    for repo in repos:
        try:
            summary = analyzer.get_work_summary_cached(repo.path, max_commits=100, since_days=days)
        except Exception:
            continue

        # Collect stats
        recent_commits = [
            c for c in summary.recent_commits
            if (c.date.replace(tzinfo=timezone.utc) if c.date.tzinfo is None else c.date) >= since_dt
        ]

        uncommitted = (
            len(summary.uncommitted.staged)
            + len(summary.uncommitted.unstaged)
            + len(summary.uncommitted.untracked)
        )

        # Authors
        repo_authors: set[str] = set()
        no_jira_commits = 0
        for c in recent_commits:
            all_authors[c.author] += 1
            repo_authors.add(c.author)
            active_jira.update(c.jira_refs)
            if not c.jira_refs:
                no_jira_commits += 1

        # Stale repo detection
        if len(recent_commits) == 0:
            stale_repos.append(repo.name)

        # Dirty repo detection
        if uncommitted > 0:
            dirty_repos.append(repo.name)

        # Large uncommitted
        if uncommitted > 10:
            large_uncommitted.append({"repo": repo.name, "count": uncommitted})

        # Single author risk
        if len(repo_authors) == 1 and len(recent_commits) > 3:
            single_author_repos.append(repo.name)

        # Orphan branches (stale, behind, no tracking)
        for b in summary.branches:
            if b.last_commit_date:
                b_date = b.last_commit_date.replace(tzinfo=timezone.utc) if b.last_commit_date.tzinfo is None else b.last_commit_date
                if (now - b_date).days > 30 and not b.is_active:
                    orphan_branches.append({"repo": repo.name, "branch": b.name, "days": (now - b_date).days})

        # Jira orphan commits
        if no_jira_commits > 3:
            jira_orphans.append({"repo": repo.name, "count": no_jira_commits})

    # Generate recommendations

    # 1. Stale repos
    if stale_repos:
        rec_id += 1
        recs.append(Recommendation(
            id=f"rec-{rec_id}",
            category="maintenance",
            priority="medium",
            title=f"{len(stale_repos)} repos have no recent activity",
            description=f"The following repos have no commits in the last {days} days: {', '.join(stale_repos[:5])}{'...' if len(stale_repos) > 5 else ''}. Consider archiving or scheduling maintenance.",
            action="Review stale repos and archive or update them",
            confidence=0.9,
        ))

    # 2. Large uncommitted changes
    for item in large_uncommitted:
        rec_id += 1
        recs.append(Recommendation(
            id=f"rec-{rec_id}",
            category="commit",
            priority="high",
            title=f"{item['repo']} has {item['count']} uncommitted changes",
            description=f"Large numbers of uncommitted changes risk data loss and make code review difficult. Consider committing in smaller, focused batches.",
            action="Commit or stash uncommitted changes",
            repo=item["repo"],
            confidence=0.95,
        ))

    # 3. Orphan branches
    if len(orphan_branches) > 3:
        rec_id += 1
        repos_affected = list(set(b["repo"] for b in orphan_branches))
        recs.append(Recommendation(
            id=f"rec-{rec_id}",
            category="maintenance",
            priority="medium",
            title=f"{len(orphan_branches)} stale branches need cleanup",
            description=f"Found branches with no activity in 30+ days across {len(repos_affected)} repos. Stale branches clutter the repository and can cause confusion.",
            action="Delete or merge stale branches",
            confidence=0.85,
        ))

    # 4. Single author repos (bus factor risk)
    if single_author_repos:
        rec_id += 1
        recs.append(Recommendation(
            id=f"rec-{rec_id}",
            category="review",
            priority="high",
            title=f"{len(single_author_repos)} repos have bus factor risk",
            description=f"The following repos are maintained by a single contributor: {', '.join(single_author_repos[:5])}. If that person is unavailable, no one else knows the code.",
            action="Schedule code reviews or pair programming sessions to spread knowledge",
            confidence=0.9,
        ))

    # 5. Commits without Jira references
    for item in jira_orphans:
        rec_id += 1
        recs.append(Recommendation(
            id=f"rec-{rec_id}",
            category="jira",
            priority="medium",
            title=f"{item['repo']}: {item['count']} commits without Jira references",
            description=f"Commits without Jira ticket references make it hard to track work and generate accurate reports. Include ticket IDs in commit messages.",
            action="Add Jira ticket IDs to commit messages (e.g., PROJ-123: description)",
            repo=item["repo"],
            confidence=0.8,
        ))

    # 6. Dirty repos that should be committed
    if len(dirty_repos) > len(repos) * 0.5:
        rec_id += 1
        recs.append(Recommendation(
            id=f"rec-{rec_id}",
            category="commit",
            priority="medium",
            title=f"Over half your repos have uncommitted changes",
            description=f"{len(dirty_repos)} of {len(repos)} repos have uncommitted work. This increases risk of losing work and makes it harder to track progress.",
            action="Review and commit or stash changes across repos",
            confidence=0.85,
        ))

    # 7. Productivity insight — most active author
    if all_authors:
        top_author = max(all_authors, key=lambda a: all_authors[a])
        rec_id += 1
        recs.append(Recommendation(
            id=f"rec-{rec_id}",
            category="productivity",
            priority="low",
            title=f"Top contributor: {top_author} ({all_authors[top_author]} commits)",
            description=f"In the last {days} days, {top_author} has been the most active contributor. Consider recognizing their work and ensuring they're not overloaded.",
            action="Review workload distribution across the team",
            confidence=0.7,
        ))

    # 8. Jira ticket velocity insight
    if active_jira:
        rec_id += 1
        recs.append(Recommendation(
            id=f"rec-{rec_id}",
            category="jira",
            priority="low",
            title=f"{len(active_jira)} Jira tickets touched in {days} days",
            description=f"Active tickets: {', '.join(sorted(active_jira)[:10])}{'...' if len(active_jira) > 10 else ''}. Good velocity indicates healthy sprint progress.",
            action="Review sprint board for completion targets",
            confidence=0.75,
        ))

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recs.sort(key=lambda r: priority_order.get(r.priority, 3))

    # Category and priority counts
    by_cat: dict[str, int] = defaultdict(int)
    by_pri: dict[str, int] = defaultdict(int)
    for r in recs:
        by_cat[r.category] += 1
        by_pri[r.priority] += 1

    # Generate insights
    insights = [
        {"label": "Total Repos", "value": len(repos)},
        {"label": "Active Repos", "value": len(repos) - len(stale_repos)},
        {"label": "Dirty Repos", "value": len(dirty_repos)},
        {"label": "Unique Contributors", "value": len(all_authors)},
        {"label": "Active Jira Tickets", "value": len(active_jira)},
        {"label": "Stale Branches", "value": len(orphan_branches)},
    ]

    return RecommendationsResponse(
        generated_at=now.isoformat(),
        total=len(recs),
        by_category=dict(by_cat),
        by_priority=dict(by_pri),
        recommendations=recs,
        insights=insights,
    )
