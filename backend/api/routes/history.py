"""API routes for analysis history."""
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.history_service import HistoryService
from ..models.jira_models import TicketSuggestion

router = APIRouter(prefix="/api/history", tags=["history"])


# Response models
class AnalysisRunSummary(BaseModel):
    """Summary of an analysis run for list views."""

    id: int
    timestamp: datetime
    repos_count: int
    repos_analyzed: List[str]
    project_key: Optional[str]
    total_suggestions: int
    created_tickets: int

    class Config:
        from_attributes = True


class SuggestionDetail(BaseModel):
    """Detail of a single suggestion."""

    id: int
    summary: str
    description: str
    issue_type: str
    priority: str
    source_repo: Optional[str]
    labels: List[str]
    was_created: bool
    jira_key: Optional[str]

    class Config:
        from_attributes = True


class AnalysisRunDetail(BaseModel):
    """Full details of an analysis run."""

    id: int
    timestamp: datetime
    repos_analyzed: List[str]
    project_key: Optional[str]
    metadata: dict
    suggestions: List[SuggestionDetail]

    class Config:
        from_attributes = True


def get_history_service(db: Session = Depends(get_db)) -> HistoryService:
    """Dependency injection for history service."""
    return HistoryService(db)


@router.get("/runs", response_model=List[AnalysisRunSummary])
def get_analysis_runs(
    limit: int = 50,
    project_key: Optional[str] = None,
    history_service: HistoryService = Depends(get_history_service),
):
    """
    Get recent analysis runs.

    Args:
        limit: Maximum number of runs to return (default: 50)
        project_key: Filter by Jira project key

    Returns:
        List of analysis run summaries
    """
    runs = history_service.get_recent_runs(limit=limit, project_key=project_key)

    return [
        AnalysisRunSummary(
            id=run.id,
            timestamp=run.timestamp,
            repos_count=len(run.repos_analyzed) if isinstance(run.repos_analyzed, list) else 0,
            repos_analyzed=run.repos_analyzed if isinstance(run.repos_analyzed, list) else [],
            project_key=run.project_key,
            total_suggestions=len(run.suggestions),
            created_tickets=sum(1 for s in run.suggestions if s.was_created),
        )
        for run in runs
    ]


@router.get("/runs/{run_id}", response_model=AnalysisRunDetail)
def get_analysis_run_detail(
    run_id: int,
    history_service: HistoryService = Depends(get_history_service),
):
    """
    Get full details of an analysis run.

    Args:
        run_id: Analysis run ID

    Returns:
        Full analysis run details including all suggestions
    """
    run = history_service.get_run_detail(run_id)

    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    return AnalysisRunDetail(
        id=run.id,
        timestamp=run.timestamp,
        repos_analyzed=run.repos_analyzed if isinstance(run.repos_analyzed, list) else [],
        project_key=run.project_key,
        metadata=run.metadata or {},
        suggestions=[
            SuggestionDetail(
                id=s.id,
                summary=s.summary,
                description=s.description,
                issue_type=s.issue_type,
                priority=s.priority,
                source_repo=s.source_repo,
                labels=s.labels if isinstance(s.labels, list) else [],
                was_created=s.was_created,
                jira_key=s.jira_key,
            )
            for s in run.suggestions
        ],
    )


@router.delete("/runs/{run_id}")
def delete_analysis_run(
    run_id: int,
    history_service: HistoryService = Depends(get_history_service),
):
    """
    Delete an analysis run.

    Args:
        run_id: Analysis run ID

    Returns:
        Success message
    """
    deleted = history_service.delete_run(run_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    return {"message": "Analysis run deleted successfully"}


@router.post("/runs/{run_id}/restore", response_model=List[TicketSuggestion])
def restore_analysis_run(
    run_id: int,
    history_service: HistoryService = Depends(get_history_service),
):
    """
    Restore ticket suggestions from a historical run.

    Args:
        run_id: Analysis run ID

    Returns:
        List of ticket suggestions that can be loaded into the dashboard
    """
    suggestions = history_service.get_suggestions_for_run(run_id)

    if not suggestions:
        raise HTTPException(
            status_code=404,
            detail="Analysis run not found or has no suggestions",
        )

    return suggestions
