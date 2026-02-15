"""AI Standup & Sprint Report Generator API routes.

Auto-generates daily standups and sprint reports by correlating
git activity across all repos with Jira ticket data.
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

router = APIRouter(prefix="/api/standups", tags=["standups"])


class StandupEntry(BaseModel):
    repo_name: str
    repo_path: str
    branch: str
    commits: list[dict]
    uncommitted_files: int
    jira_refs: list[str]


class StandupReport(BaseModel):
    generated_at: str
    period: str
    summary: str
    entries: list[StandupEntry]
    total_commits: int
    total_files_changed: int
    total_jira_refs: list[str]
    in_progress: list[dict]
    natural_language: str


class SprintReport(BaseModel):
    generated_at: str
    sprint_days: int
    summary: str
    repos_touched: int
    total_commits: int
    total_files_changed: int
    total_insertions: int
    total_deletions: int
    jira_tickets: list[str]
    top_repos: list[dict]
    daily_breakdown: list[dict]
    contributors: list[dict]
    natural_language: str


@router.get("/daily", response_model=StandupReport)
async def generate_daily_standup(
    author: str = Query(None, description="Filter by commit author (partial match)"),
    since_hours: int = Query(24, description="Look back N hours"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a daily standup report from git activity."""
    scanner = FolderScanner()
    repos = scanner.scan()
    analyzer = GitAnalyzer()

    since_dt = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    entries: list[StandupEntry] = []
    all_jira_refs: set[str] = set()
    total_commits = 0
    total_files = 0
    in_progress: list[dict] = []

    for repo in repos:
        try:
            summary = analyzer.get_work_summary_cached(repo.path, max_commits=50, since_days=2)
        except Exception:
            continue

        # Filter commits by time window and optional author
        recent = []
        for c in summary.recent_commits:
            if c.date.replace(tzinfo=timezone.utc) < since_dt:
                continue
            if author and author.lower() not in c.author.lower():
                continue
            recent.append({
                "sha": c.short_sha,
                "message": c.message.split("\n")[0][:120],
                "author": c.author,
                "date": c.date.isoformat(),
                "files_changed": c.files_changed,
            })
            all_jira_refs.update(c.jira_refs)
            total_files += c.files_changed

        # Track in-progress work (uncommitted changes)
        uncommitted_count = (
            len(summary.uncommitted.staged)
            + len(summary.uncommitted.unstaged)
            + len(summary.uncommitted.untracked)
        )
        if uncommitted_count > 0:
            in_progress.append({
                "repo": summary.repo_name,
                "branch": summary.current_branch,
                "staged": len(summary.uncommitted.staged),
                "unstaged": len(summary.uncommitted.unstaged),
                "untracked": len(summary.uncommitted.untracked),
            })

        if recent or uncommitted_count > 0:
            commit_jira = set()
            for c in recent:
                commit_jira.update(
                    ref for commit in summary.recent_commits
                    for ref in commit.jira_refs
                    if commit.short_sha == c["sha"]
                )

            entries.append(StandupEntry(
                repo_name=summary.repo_name,
                repo_path=summary.repo_path,
                branch=summary.current_branch,
                commits=recent,
                uncommitted_files=uncommitted_count,
                jira_refs=sorted(commit_jira),
            ))
            total_commits += len(recent)

    # Generate natural language standup
    jira_list = sorted(all_jira_refs)
    lines = []
    if entries:
        completed = [e for e in entries if e.commits]
        wip = [e for e in entries if e.uncommitted_files > 0]

        if completed:
            lines.append("Yesterday:")
            for e in completed:
                msgs = [c["message"] for c in e.commits[:3]]
                jira_part = f" ({', '.join(e.jira_refs)})" if e.jira_refs else ""
                lines.append(f"  - {e.repo_name}: {'; '.join(msgs)}{jira_part}")

        if wip:
            lines.append("In progress:")
            for e in wip:
                lines.append(
                    f"  - {e.repo_name} ({e.branch}): "
                    f"{e.uncommitted_files} uncommitted changes"
                )

        if jira_list:
            lines.append(f"Jira tickets touched: {', '.join(jira_list)}")
    else:
        lines.append("No git activity found in the specified time window.")

    return StandupReport(
        generated_at=datetime.now(timezone.utc).isoformat(),
        period=f"Last {since_hours} hours",
        summary=f"{total_commits} commits across {len(entries)} repos, {len(jira_list)} Jira tickets",
        entries=entries,
        total_commits=total_commits,
        total_files_changed=total_files,
        total_jira_refs=jira_list,
        in_progress=in_progress,
        natural_language="\n".join(lines),
    )


@router.get("/sprint", response_model=SprintReport)
async def generate_sprint_report(
    days: int = Query(14, description="Sprint length in days"),
    author: str = Query(None, description="Filter by commit author"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a sprint report summarizing work across all repos."""
    scanner = FolderScanner()
    repos = scanner.scan()
    analyzer = GitAnalyzer()

    since_dt = datetime.now(timezone.utc) - timedelta(days=days)
    all_jira: set[str] = set()
    total_commits = 0
    total_files = 0
    total_ins = 0
    total_del = 0
    repo_stats: list[dict] = []
    daily_map: dict[str, dict] = defaultdict(lambda: {"commits": 0, "files": 0})
    contributor_map: dict[str, dict] = defaultdict(lambda: {"commits": 0, "files": 0, "repos": set()})

    for repo in repos:
        try:
            summary = analyzer.get_work_summary_cached(repo.path, max_commits=200, since_days=days)
        except Exception:
            continue

        repo_commits = 0
        repo_files = 0
        repo_ins = 0
        repo_del = 0
        repo_jira: set[str] = set()

        for c in summary.recent_commits:
            cdate = c.date.replace(tzinfo=timezone.utc) if c.date.tzinfo is None else c.date
            if cdate < since_dt:
                continue
            if author and author.lower() not in c.author.lower():
                continue

            repo_commits += 1
            repo_files += c.files_changed
            repo_ins += c.insertions
            repo_del += c.deletions
            repo_jira.update(c.jira_refs)

            day_key = cdate.strftime("%Y-%m-%d")
            daily_map[day_key]["commits"] += 1
            daily_map[day_key]["files"] += c.files_changed

            contributor_map[c.author]["commits"] += 1
            contributor_map[c.author]["files"] += c.files_changed
            contributor_map[c.author]["repos"].add(summary.repo_name)

        if repo_commits > 0:
            repo_stats.append({
                "repo": summary.repo_name,
                "commits": repo_commits,
                "files_changed": repo_files,
                "insertions": repo_ins,
                "deletions": repo_del,
                "jira_refs": sorted(repo_jira),
                "branch": summary.current_branch,
            })
            total_commits += repo_commits
            total_files += repo_files
            total_ins += repo_ins
            total_del += repo_del
            all_jira.update(repo_jira)

    # Sort repos by commits
    repo_stats.sort(key=lambda x: x["commits"], reverse=True)

    # Build daily breakdown sorted by date
    daily_breakdown = [
        {"date": k, **v} for k, v in sorted(daily_map.items())
    ]

    # Build contributors list
    contributors = [
        {
            "author": k,
            "commits": v["commits"],
            "files_changed": v["files"],
            "repos_touched": len(v["repos"]),
        }
        for k, v in sorted(contributor_map.items(), key=lambda x: x[1]["commits"], reverse=True)
    ]

    jira_list = sorted(all_jira)

    # Natural language sprint summary
    lines = [f"Sprint Report ({days}-day period):", ""]
    lines.append(f"Total: {total_commits} commits, {total_files} files changed "
                 f"(+{total_ins}/-{total_del}) across {len(repo_stats)} repos.")
    if jira_list:
        lines.append(f"Jira tickets: {', '.join(jira_list[:20])}")
        if len(jira_list) > 20:
            lines.append(f"  ...and {len(jira_list) - 20} more")
    lines.append("")
    if repo_stats:
        lines.append("Top repos:")
        for r in repo_stats[:5]:
            lines.append(f"  - {r['repo']}: {r['commits']} commits, {r['files_changed']} files")
    if contributors:
        lines.append("")
        lines.append("Contributors:")
        for c in contributors[:5]:
            lines.append(f"  - {c['author']}: {c['commits']} commits across {c['repos_touched']} repos")

    return SprintReport(
        generated_at=datetime.now(timezone.utc).isoformat(),
        sprint_days=days,
        summary=f"{total_commits} commits across {len(repo_stats)} repos, {len(jira_list)} Jira tickets",
        repos_touched=len(repo_stats),
        total_commits=total_commits,
        total_files_changed=total_files,
        total_insertions=total_ins,
        total_deletions=total_del,
        jira_tickets=jira_list,
        top_repos=repo_stats[:10],
        daily_breakdown=daily_breakdown,
        contributors=contributors,
        natural_language="\n".join(lines),
    )
