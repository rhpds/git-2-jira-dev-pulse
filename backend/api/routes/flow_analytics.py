"""Developer Flow State Analytics API routes.

Detects and visualizes deep work patterns from commit cadence —
burst activity, sustained focus windows, time-of-day productivity curves.
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

router = APIRouter(prefix="/api/flow-analytics", tags=["flow-analytics"])


class FlowSession(BaseModel):
    start: str
    end: str
    duration_minutes: int
    commits: int
    repos: list[str]
    jira_refs: list[str]
    intensity: str  # "light", "moderate", "deep"


class HourlyProductivity(BaseModel):
    hour: int
    commits: int
    files_changed: int
    avg_commit_size: float


class DailyPattern(BaseModel):
    day: str  # "Monday", "Tuesday", etc.
    commits: int
    files_changed: int
    flow_sessions: int
    avg_session_minutes: float


class WeeklyInsight(BaseModel):
    week_start: str
    commits: int
    flow_sessions: int
    deep_work_hours: float
    most_productive_day: str
    most_productive_hour: int
    repos_touched: int


class FlowAnalyticsReport(BaseModel):
    generated_at: str
    period_days: int
    author: str | None
    total_commits: int
    total_flow_sessions: int
    total_deep_work_hours: float
    avg_session_duration_minutes: float
    most_productive_hour: int
    most_productive_day: str
    longest_flow_session_minutes: int
    flow_sessions: list[FlowSession]
    hourly_productivity: list[HourlyProductivity]
    daily_patterns: list[DailyPattern]
    weekly_insights: list[WeeklyInsight]
    interruption_score: float  # 0-100, lower = more interruptions
    focus_score: float  # 0-100, higher = better sustained focus


# Flow session detection: commits within this gap are part of the same session
FLOW_GAP_MINUTES = 45


@router.get("/", response_model=FlowAnalyticsReport)
async def get_flow_analytics(
    days: int = Query(30, description="Analysis period in days"),
    author: str = Query(None, description="Filter by commit author"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Analyze developer flow state patterns from commit history."""
    scanner = FolderScanner()
    repos = scanner.scan()
    analyzer = GitAnalyzer()

    since_dt = datetime.now(timezone.utc) - timedelta(days=days)

    # Collect all commits with timestamps
    all_commits: list[dict] = []

    for repo in repos:
        try:
            summary = analyzer.get_work_summary_cached(repo.path, max_commits=500, since_days=days)
        except Exception:
            continue

        for c in summary.recent_commits:
            cdate = c.date.replace(tzinfo=timezone.utc) if c.date.tzinfo is None else c.date
            if cdate < since_dt:
                continue
            if author and author.lower() not in c.author.lower():
                continue

            all_commits.append({
                "date": cdate,
                "repo": summary.repo_name,
                "files_changed": c.files_changed,
                "insertions": c.insertions,
                "deletions": c.deletions,
                "jira_refs": c.jira_refs,
                "author": c.author,
            })

    # Sort by date
    all_commits.sort(key=lambda x: x["date"])

    # Detect flow sessions
    flow_sessions: list[FlowSession] = []
    if all_commits:
        session_commits = [all_commits[0]]
        for commit in all_commits[1:]:
            gap = (commit["date"] - session_commits[-1]["date"]).total_seconds() / 60
            if gap <= FLOW_GAP_MINUTES:
                session_commits.append(commit)
            else:
                # Close current session
                flow_sessions.append(_build_flow_session(session_commits))
                session_commits = [commit]
        # Close last session
        flow_sessions.append(_build_flow_session(session_commits))

    # Hourly productivity
    hourly: dict[int, dict] = defaultdict(lambda: {"commits": 0, "files": 0})
    for c in all_commits:
        h = c["date"].hour
        hourly[h]["commits"] += 1
        hourly[h]["files"] += c["files_changed"]

    hourly_productivity = [
        HourlyProductivity(
            hour=h,
            commits=v["commits"],
            files_changed=v["files"],
            avg_commit_size=v["files"] / v["commits"] if v["commits"] > 0 else 0,
        )
        for h, v in sorted(hourly.items())
    ]

    # Daily patterns
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    daily: dict[int, dict] = defaultdict(lambda: {"commits": 0, "files": 0})
    for c in all_commits:
        dow = c["date"].weekday()
        daily[dow]["commits"] += 1
        daily[dow]["files"] += c["files_changed"]

    # Count flow sessions per day of week
    session_day_count: dict[int, list] = defaultdict(list)
    for s in flow_sessions:
        start_dt = datetime.fromisoformat(s.start)
        dow = start_dt.weekday()
        session_day_count[dow].append(s.duration_minutes)

    daily_patterns = [
        DailyPattern(
            day=day_names[d],
            commits=daily[d]["commits"],
            files_changed=daily[d]["files"],
            flow_sessions=len(session_day_count.get(d, [])),
            avg_session_minutes=(
                sum(session_day_count[d]) / len(session_day_count[d])
                if session_day_count.get(d)
                else 0
            ),
        )
        for d in range(7)
    ]

    # Weekly insights
    weekly_map: dict[str, dict] = defaultdict(
        lambda: {"commits": 0, "sessions": 0, "deep_hours": 0.0, "day_commits": defaultdict(int), "hour_commits": defaultdict(int), "repos": set()}
    )
    for c in all_commits:
        week_start = (c["date"] - timedelta(days=c["date"].weekday())).strftime("%Y-%m-%d")
        weekly_map[week_start]["commits"] += 1
        weekly_map[week_start]["day_commits"][c["date"].weekday()] += 1
        weekly_map[week_start]["hour_commits"][c["date"].hour] += 1
        weekly_map[week_start]["repos"].add(c["repo"])

    for s in flow_sessions:
        start_dt = datetime.fromisoformat(s.start)
        week_start = (start_dt - timedelta(days=start_dt.weekday())).strftime("%Y-%m-%d")
        weekly_map[week_start]["sessions"] += 1
        if s.intensity == "deep":
            weekly_map[week_start]["deep_hours"] += s.duration_minutes / 60

    weekly_insights = []
    for wk, v in sorted(weekly_map.items()):
        best_day = max(v["day_commits"], key=v["day_commits"].get) if v["day_commits"] else 0
        best_hour = max(v["hour_commits"], key=v["hour_commits"].get) if v["hour_commits"] else 9
        weekly_insights.append(WeeklyInsight(
            week_start=wk,
            commits=v["commits"],
            flow_sessions=v["sessions"],
            deep_work_hours=round(v["deep_hours"], 1),
            most_productive_day=day_names[best_day],
            most_productive_hour=best_hour,
            repos_touched=len(v["repos"]),
        ))

    # Aggregate stats
    total_commits = len(all_commits)
    total_sessions = len(flow_sessions)
    total_deep_hours = sum(
        s.duration_minutes / 60 for s in flow_sessions if s.intensity == "deep"
    )
    avg_duration = (
        sum(s.duration_minutes for s in flow_sessions) / total_sessions
        if total_sessions > 0
        else 0
    )
    longest = max((s.duration_minutes for s in flow_sessions), default=0)

    # Most productive hour/day
    best_hour = max(hourly, key=lambda h: hourly[h]["commits"]) if hourly else 9
    best_day_idx = max(range(7), key=lambda d: daily[d]["commits"]) if daily else 0

    # Interruption score: fewer short sessions = fewer interruptions
    if total_sessions > 0:
        short_sessions = sum(1 for s in flow_sessions if s.duration_minutes < 15)
        interruption_score = max(0, 100 - (short_sessions / total_sessions * 100))
    else:
        interruption_score = 50.0

    # Focus score: based on deep work ratio and session lengths
    if total_sessions > 0:
        deep_count = sum(1 for s in flow_sessions if s.intensity == "deep")
        focus_score = min(100, (deep_count / total_sessions * 60) + (min(avg_duration, 60) / 60 * 40))
    else:
        focus_score = 0.0

    return FlowAnalyticsReport(
        generated_at=datetime.now(timezone.utc).isoformat(),
        period_days=days,
        author=author,
        total_commits=total_commits,
        total_flow_sessions=total_sessions,
        total_deep_work_hours=round(total_deep_hours, 1),
        avg_session_duration_minutes=round(avg_duration, 1),
        most_productive_hour=best_hour,
        most_productive_day=day_names[best_day_idx],
        longest_flow_session_minutes=longest,
        flow_sessions=flow_sessions,
        hourly_productivity=hourly_productivity,
        daily_patterns=daily_patterns,
        weekly_insights=weekly_insights,
        interruption_score=round(interruption_score, 1),
        focus_score=round(focus_score, 1),
    )


def _build_flow_session(commits: list[dict]) -> FlowSession:
    """Build a FlowSession from a list of consecutive commits."""
    start = commits[0]["date"]
    end = commits[-1]["date"]
    duration = max(1, int((end - start).total_seconds() / 60))
    repos = sorted(set(c["repo"] for c in commits))
    jira_refs = sorted(set(ref for c in commits for ref in c["jira_refs"]))

    # Classify intensity
    if len(commits) >= 5 and duration >= 60:
        intensity = "deep"
    elif len(commits) >= 3 and duration >= 20:
        intensity = "moderate"
    else:
        intensity = "light"

    return FlowSession(
        start=start.isoformat(),
        end=end.isoformat(),
        duration_minutes=duration,
        commits=len(commits),
        repos=repos,
        jira_refs=jira_refs,
        intensity=intensity,
    )
