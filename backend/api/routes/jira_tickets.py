import re
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel

from ..dependencies import get_jira_client, get_ticket_suggester
from ..models.git_models import WorkSummary
from ..models.jira_models import (
    BatchCreateRequest,
    BatchCreateResult,
    TicketCreateRequest,
    TicketSuggestion,
)
from ..services.jira_client import JiraClient
from ..services.ticket_suggester import TicketSuggester
from ..middleware.auth_middleware import get_current_user
from ..models.db_models import User

router = APIRouter(prefix="/api/jira", tags=["jira"])


class SuggestTicketsRequest(BaseModel):
    summaries: list[WorkSummary]
    project_key: str


@router.post("/suggest", response_model=list[TicketSuggestion])
def suggest_tickets(
    req: SuggestTicketsRequest,
    suggester: TicketSuggester = Depends(get_ticket_suggester),
    jira: JiraClient = Depends(get_jira_client),
    user: User = Depends(get_current_user),
):
    suggestions = suggester.suggest(req.summaries, req.project_key)

    # Check each suggestion against existing Jira tickets
    for suggestion in suggestions:
        existing = jira.find_existing(
            project_key=req.project_key,
            repo_name=suggestion.source_repo,
            branch=suggestion.source_branch,
            pr_urls=suggestion.pr_urls,
        )
        if existing:
            suggestion.existing_jira = existing
            suggestion.already_tracked = True
            suggestion.selected = False

    return suggestions


@router.post("/create")
def create_ticket(
    req: TicketCreateRequest,
    jira: JiraClient = Depends(get_jira_client),
    user: User = Depends(get_current_user),
):
    return jira.create_ticket(req)


@router.post("/create-batch", response_model=BatchCreateResult)
def create_batch(
    req: BatchCreateRequest,
    jira: JiraClient = Depends(get_jira_client),
    user: User = Depends(get_current_user),
):
    result = BatchCreateResult()
    for ticket in req.tickets:
        if req.skip_duplicates:
            dup = jira.check_duplicate(ticket.summary, ticket.project_key)
            if dup.is_duplicate:
                result.skipped_duplicates += 1
                continue

        created = jira.create_ticket(ticket)
        if created.error:
            result.errors += 1
        result.created.append(created)
    return result


@router.get("/projects")
def list_projects(jira: JiraClient = Depends(get_jira_client), user: User = Depends(get_current_user)):
    return jira.get_projects()


@router.get("/repo-tickets")
def repo_tickets(
    project_key: str = Query(...),
    repo_name: str = Query(...),
    since: str = Query(default=""),
    jira: JiraClient = Depends(get_jira_client),
    user: User = Depends(get_current_user),
):
    """Get Jira tickets related to a specific repo."""
    if not re.match(r"^[A-Z][A-Z0-9_]{1,20}$", project_key):
        raise HTTPException(status_code=400, detail="Invalid project key format")
    clean_repo = repo_name.replace("\\", "\\\\").replace('"', '\\"')
    jql = f'project = {project_key} AND summary ~ "{clean_repo}"'
    if since:
        clean_since = since.replace("\\", "").replace('"', "")
        jql += f' AND created >= "{clean_since}"'
    jql += " ORDER BY created DESC"
    return jira.search_issues(jql, max_results=50)


@router.get("/search")
def search_issues(
    jql: str,
    max_results: int = 20,
    jira: JiraClient = Depends(get_jira_client),
    user: User = Depends(get_current_user),
):
    if max_results > 100:
        max_results = 100
    return jira.search_issues(jql, max_results)
