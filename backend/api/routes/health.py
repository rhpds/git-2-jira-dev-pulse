from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

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


@router.get("/api/healthz")
def liveness():
    """Liveness probe -- is the process alive?"""
    return {"status": "ok"}


@router.get("/api/ready")
def readiness(jira: JiraClient = Depends(get_jira_client)):
    """Readiness probe -- can the app serve traffic?"""
    jira_status = jira.check_connection()
    if not jira_status.get("connected", False):
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "jira": jira_status},
        )
    return {"status": "ready", "jira": jira_status}
