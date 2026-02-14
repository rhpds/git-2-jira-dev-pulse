"""API routes for exporting data."""
from typing import List
from datetime import datetime

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..models.git_models import WorkSummary
from ..models.jira_models import TicketSuggestion
from ..services.export_service import ExportService

router = APIRouter(prefix="/api/export", tags=["export"])


class ExportSuggestionsRequest(BaseModel):
    """Request body for exporting suggestions."""
    suggestions: List[TicketSuggestion]


class ExportWorkSummaryRequest(BaseModel):
    """Request body for exporting work summaries."""
    summaries: List[WorkSummary]


@router.post("/suggestions/csv")
def export_suggestions_csv(req: ExportSuggestionsRequest):
    """
    Export ticket suggestions to CSV.

    Args:
        req: Request with list of suggestions

    Returns:
        CSV file as streaming response
    """
    csv_data = ExportService.export_suggestions_csv(req.suggestions)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"ticket_suggestions_{timestamp}.csv"

    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/suggestions/json")
def export_suggestions_json(req: ExportSuggestionsRequest):
    """
    Export ticket suggestions to JSON.

    Args:
        req: Request with list of suggestions

    Returns:
        JSON file as streaming response
    """
    json_data = ExportService.export_suggestions_json(req.suggestions)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"ticket_suggestions_{timestamp}.json"

    return StreamingResponse(
        iter([json_data]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/work-summary/csv")
def export_work_summary_csv(req: ExportWorkSummaryRequest):
    """
    Export work summaries to CSV.

    Args:
        req: Request with list of work summaries

    Returns:
        CSV file as streaming response
    """
    csv_data = ExportService.export_work_summary_csv(req.summaries)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"work_summary_{timestamp}.csv"

    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/work-summary/json")
def export_work_summary_json(req: ExportWorkSummaryRequest):
    """
    Export work summaries to JSON.

    Args:
        req: Request with list of work summaries

    Returns:
        JSON file as streaming response
    """
    json_data = ExportService.export_work_summary_json(req.summaries)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"work_summary_{timestamp}.json"

    return StreamingResponse(
        iter([json_data]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
