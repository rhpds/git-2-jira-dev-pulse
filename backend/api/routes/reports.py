"""PDF report generation API routes."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import (
    User,
    AuditLog,
    AnalysisRun,
    AnalysisSuggestion,
)
from ..services.auth_service import get_user_organization, get_org_subscription
from ..middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _generate_text_report(
    org_name: str,
    plan: str,
    period_days: int,
    stats: dict,
    recent_scans: list,
    top_actions: list,
) -> str:
    """Generate a formatted text report."""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=period_days)

    lines = []
    lines.append("=" * 60)
    lines.append(f"  DevPulse Pro - Organization Report")
    lines.append("=" * 60)
    lines.append("")
    lines.append(f"  Organization:  {org_name}")
    lines.append(f"  Plan:          {plan}")
    lines.append(f"  Report Period: {start_date.strftime('%Y-%m-%d')} to {now.strftime('%Y-%m-%d')}")
    lines.append(f"  Generated:     {now.strftime('%Y-%m-%d %H:%M UTC')}")
    lines.append("")
    lines.append("-" * 60)
    lines.append("  SUMMARY STATISTICS")
    lines.append("-" * 60)
    lines.append("")

    for key, value in stats.items():
        label = key.replace("_", " ").title()
        lines.append(f"  {label:30s}  {value}")

    lines.append("")
    lines.append("-" * 60)
    lines.append("  RECENT ANALYSIS RUNS")
    lines.append("-" * 60)
    lines.append("")

    if recent_scans:
        lines.append(f"  {'Date':20s}  {'Repos':10s}  {'Suggestions':12s}")
        lines.append(f"  {'─' * 20}  {'─' * 10}  {'─' * 12}")
        for scan in recent_scans:
            lines.append(
                f"  {scan['date']:20s}  {scan['repos']:10s}  {scan['suggestions']:12s}"
            )
    else:
        lines.append("  No analysis runs in this period.")

    lines.append("")
    lines.append("-" * 60)
    lines.append("  TOP ACTIVITY ACTIONS")
    lines.append("-" * 60)
    lines.append("")

    if top_actions:
        for action, count in top_actions:
            bar = "█" * min(count, 40)
            lines.append(f"  {action:25s}  {count:4d}  {bar}")
    else:
        lines.append("  No activity recorded in this period.")

    lines.append("")
    lines.append("=" * 60)
    lines.append("  End of Report")
    lines.append("=" * 60)
    lines.append("")

    return "\n".join(lines)


@router.get("/organization")
async def generate_org_report(
    period: int = Query(30, ge=7, le=90),
    format: str = Query("text"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate an organization report for the given period."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        return {"error": "No organization found"}

    org, _role = org_info
    subscription = get_org_subscription(db, org.id)
    plan = subscription.plan if subscription else "free"
    cutoff = datetime.now(timezone.utc) - timedelta(days=period)

    # Gather stats
    total_scans = db.execute(
        select(func.count(AnalysisRun.id)).where(
            AnalysisRun.timestamp >= cutoff
        )
    ).scalar() or 0

    total_suggestions = db.execute(
        select(func.count(AnalysisSuggestion.id)).where(
            AnalysisSuggestion.created_at >= cutoff
        )
    ).scalar() or 0

    tickets_created = db.execute(
        select(func.count(AnalysisSuggestion.id)).where(
            AnalysisSuggestion.created_at >= cutoff,
            AnalysisSuggestion.was_created == True,
        )
    ).scalar() or 0

    audit_events = db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.org_id == org.id,
            AuditLog.created_at >= cutoff,
        )
    ).scalar() or 0

    stats = {
        "total_scans": total_scans,
        "total_suggestions": total_suggestions,
        "tickets_created": tickets_created,
        "audit_events": audit_events,
        "period_days": period,
    }

    # Recent scans
    recent_runs = db.execute(
        select(AnalysisRun)
        .where(AnalysisRun.timestamp >= cutoff)
        .order_by(desc(AnalysisRun.timestamp))
        .limit(10)
    ).scalars().all()

    recent_scans = []
    for run in recent_runs:
        suggestion_count = db.execute(
            select(func.count(AnalysisSuggestion.id)).where(
                AnalysisSuggestion.analysis_run_id == run.id
            )
        ).scalar() or 0
        repos = run.repos_analyzed if isinstance(run.repos_analyzed, list) else []
        recent_scans.append({
            "date": run.timestamp.strftime("%Y-%m-%d %H:%M") if run.timestamp else "N/A",
            "repos": str(len(repos)),
            "suggestions": str(suggestion_count),
        })

    # Top audit actions
    action_counts = db.execute(
        select(AuditLog.action, func.count(AuditLog.id))
        .where(AuditLog.org_id == org.id, AuditLog.created_at >= cutoff)
        .group_by(AuditLog.action)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
    ).all()

    if format == "text":
        report_text = _generate_text_report(
            org_name=org.name,
            plan=plan,
            period_days=period,
            stats=stats,
            recent_scans=recent_scans,
            top_actions=action_counts,
        )

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"devpulse_report_{timestamp}.txt"

        return StreamingResponse(
            iter([report_text]),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    # JSON format (default fallback)
    return {
        "organization": org.name,
        "plan": plan,
        "period_days": period,
        "stats": stats,
        "recent_scans": recent_scans,
        "top_actions": [{"action": a, "count": c} for a, c in action_counts],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
