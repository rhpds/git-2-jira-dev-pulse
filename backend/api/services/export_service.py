"""Service for exporting data to various formats."""
import csv
import json
from io import StringIO
from typing import List

from ..models.git_models import WorkSummary
from ..models.jira_models import TicketSuggestion


class ExportService:
    """Service for exporting data to CSV and JSON formats."""

    @staticmethod
    def export_suggestions_csv(suggestions: List[TicketSuggestion]) -> str:
        """
        Export ticket suggestions to CSV format.

        Args:
            suggestions: List of ticket suggestions

        Returns:
            CSV string
        """
        output = StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "ID",
            "Summary",
            "Issue Type",
            "Priority",
            "Source Repo",
            "Source Branch",
            "Labels",
            "PR URLs",
            "Already Tracked",
        ])

        # Rows
        for sug in suggestions:
            writer.writerow([
                sug.id,
                sug.summary,
                sug.issue_type,
                sug.priority,
                sug.source_repo,
                sug.source_branch,
                ", ".join(sug.labels),
                ", ".join(sug.pr_urls),
                "Yes" if sug.already_tracked else "No",
            ])

        return output.getvalue()

    @staticmethod
    def export_suggestions_json(suggestions: List[TicketSuggestion]) -> str:
        """
        Export ticket suggestions to JSON format.

        Args:
            suggestions: List of ticket suggestions

        Returns:
            JSON string
        """
        data = [sug.model_dump() for sug in suggestions]
        return json.dumps(data, indent=2)

    @staticmethod
    def export_work_summary_csv(summaries: List[WorkSummary]) -> str:
        """
        Export work summaries to CSV format.

        Args:
            summaries: List of work summaries

        Returns:
            CSV string
        """
        output = StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "Repo Name",
            "Current Branch",
            "Uncommitted (Staged)",
            "Uncommitted (Unstaged)",
            "Uncommitted (Untracked)",
            "Recent Commits",
            "Branches",
            "Pull Requests",
        ])

        # Rows
        for summary in summaries:
            writer.writerow([
                summary.repo_name,
                summary.current_branch,
                len(summary.uncommitted.staged),
                len(summary.uncommitted.unstaged),
                len(summary.uncommitted.untracked),
                len(summary.recent_commits),
                len(summary.branches),
                len(summary.pull_requests),
            ])

        return output.getvalue()

    @staticmethod
    def export_work_summary_json(summaries: List[WorkSummary]) -> str:
        """
        Export work summaries to JSON format.

        Args:
            summaries: List of work summaries

        Returns:
            JSON string
        """
        data = [summary.model_dump() for summary in summaries]
        return json.dumps(data, indent=2)
