from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from ..dependencies import get_git_analyzer
from ..services.git_analyzer import GitAnalyzer
from ..middleware.auth_middleware import get_current_user
from ..models.db_models import User
from ..services.path_validator import validate_repo_path

router = APIRouter(prefix="/api/git", tags=["git"])


class PullRequest(BaseModel):
    path: str
    branch: str


@router.get("/status")
def git_status(
    path: str = Query(..., description="Repo path"),
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
    user: User = Depends(get_current_user),
):
    validated = validate_repo_path(path)
    return analyzer.get_uncommitted(str(validated))


@router.get("/commits")
def git_commits(
    path: str = Query(..., description="Repo path"),
    max_commits: int = Query(30),
    since_days: int = Query(30),
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
    user: User = Depends(get_current_user),
):
    validated = validate_repo_path(path)
    return analyzer.get_commits(str(validated), max_commits, since_days)


@router.get("/branches")
def git_branches(
    path: str = Query(..., description="Repo path"),
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
    user: User = Depends(get_current_user),
):
    validated = validate_repo_path(path)
    return analyzer.get_branches(str(validated))


@router.get("/diff")
def git_diff(
    path: str = Query(..., description="Repo path"),
    commit: str | None = Query(None, description="Commit SHA"),
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
    user: User = Depends(get_current_user),
):
    validated = validate_repo_path(path)
    return {"diff": analyzer.get_diff(str(validated), commit)}


@router.get("/remote-branches")
def remote_branches(
    path: str = Query(..., description="Repo path"),
    user: User = Depends(get_current_user),
):
    validated = validate_repo_path(path)
    return GitAnalyzer.get_remote_branches(str(validated))


@router.post("/pull")
def git_pull(req: PullRequest, user: User = Depends(get_current_user)):
    validated = validate_repo_path(req.path)
    return GitAnalyzer.git_pull(str(validated), req.branch)
