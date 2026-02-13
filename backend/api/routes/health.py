from fastapi import APIRouter, Depends

from ..dependencies import get_jira_client
from ..services.jira_client import JiraClient

router = APIRouter(tags=["health"])


@router.get("/api/health")
def health_check(jira: JiraClient = Depends(get_jira_client)):
    jira_status = jira.check_connection()
    return {
        "status": "ok",
        "jira": jira_status,
    }
