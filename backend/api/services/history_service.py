"""Service for managing analysis run history."""
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models.db_models import AnalysisRun, AnalysisSuggestion
from ..models.jira_models import TicketSuggestion


class HistoryService:
    """Service for storing and retrieving analysis history."""

    def __init__(self, db: Session):
        self.db = db

    def save_analysis_run(
        self,
        repos_analyzed: List[str],
        suggestions: List[TicketSuggestion],
        project_key: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> int:
        """
        Save an analysis run with its suggestions to the database.

        Args:
            repos_analyzed: List of repository paths/names that were analyzed
            suggestions: List of ticket suggestions generated
            project_key: Jira project key for the suggestions
            metadata: Additional metadata (commit counts, PR counts, etc.)

        Returns:
            The ID of the created analysis run
        """
        # Create analysis run
        run = AnalysisRun(
            timestamp=datetime.now(timezone.utc),
            repos_analyzed=repos_analyzed,
            project_key=project_key,
            analysis_metadata=metadata or {},
        )
        self.db.add(run)
        self.db.flush()  # Get the ID without committing

        # Create suggestion records
        for suggestion in suggestions:
            db_suggestion = AnalysisSuggestion(
                analysis_run_id=run.id,  # type: ignore
                suggestion_id=suggestion.id,  # Use the suggestion's ID
                summary=suggestion.summary,
                description=suggestion.description,
                issue_type=suggestion.issue_type,
                priority=suggestion.priority,
                source_repo=suggestion.source_repo or None,
                labels=suggestion.labels or [],
                was_created=False,
                jira_key=None,
            )
            self.db.add(db_suggestion)

        self.db.commit()
        return run.id  # type: ignore

    def update_created_tickets(
        self,
        run_id: int,
        created_tickets: dict[str, str],  # {suggestion_id: jira_key}
    ):
        """
        Update suggestions to mark them as created with their Jira keys.

        Args:
            run_id: Analysis run ID
            created_tickets: Mapping of suggestion IDs to Jira keys
        """
        suggestions = (
            self.db.query(AnalysisSuggestion)
            .filter(AnalysisSuggestion.analysis_run_id == run_id)
            .filter(AnalysisSuggestion.suggestion_id.in_(list(created_tickets.keys())))
            .all()
        )

        for suggestion in suggestions:
            suggestion.was_created = True  # type: ignore
            suggestion.jira_key = created_tickets[suggestion.suggestion_id]  # type: ignore

        self.db.commit()

    def get_recent_runs(
        self,
        limit: int = 50,
        project_key: Optional[str] = None,
    ) -> List[AnalysisRun]:
        """
        Get recent analysis runs.

        Args:
            limit: Maximum number of runs to return
            project_key: Filter by project key if provided

        Returns:
            List of analysis runs ordered by most recent first
        """
        query = self.db.query(AnalysisRun).order_by(desc(AnalysisRun.timestamp))

        if project_key:
            query = query.filter(AnalysisRun.project_key == project_key)

        return query.limit(limit).all()

    def get_run_detail(self, run_id: int) -> Optional[AnalysisRun]:
        """
        Get full details of an analysis run including suggestions.

        Args:
            run_id: Analysis run ID

        Returns:
            Analysis run with suggestions loaded, or None if not found
        """
        return (
            self.db.query(AnalysisRun)
            .filter(AnalysisRun.id == run_id)
            .first()
        )

    def delete_run(self, run_id: int) -> bool:
        """
        Delete an analysis run and its suggestions.

        Args:
            run_id: Analysis run ID

        Returns:
            True if deleted, False if not found
        """
        run = self.db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()

        if run:
            self.db.delete(run)
            self.db.commit()
            return True

        return False

    def get_suggestions_for_run(self, run_id: int) -> List[TicketSuggestion]:
        """
        Get ticket suggestions from a historical run.

        Args:
            run_id: Analysis run ID

        Returns:
            List of ticket suggestions
        """
        run = self.get_run_detail(run_id)
        if not run:
            return []

        # Convert DB suggestions back to TicketSuggestion models
        project_key_val: str = str(run.project_key) if run.project_key else ""  # type: ignore
        return [
            TicketSuggestion(
                id=sug.suggestion_id,
                summary=sug.summary,
                description=sug.description,
                issue_type=sug.issue_type,
                priority=sug.priority,
                labels=sug.labels or [],
                source_repo=sug.source_repo or "",
                assignee="",
                pr_urls=[],
                project_key=project_key_val,
                source_branch="",
                source_commits=[],
                source_files=[],
                already_tracked=sug.was_created,
                existing_jira=[],
                selected=True,
            )
            for sug in run.suggestions
        ]
