from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from ..dependencies import get_git_analyzer
from ..services.git_analyzer import GitAnalyzer

router = APIRouter(prefix="/api/git", tags=["git"])


class PullRequest(BaseModel):
    path: str
    branch: str


@router.get("/status")
def git_status(
    path: str = Query(..., description="Repo path"),
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
):
    return analyzer.get_uncommitted(path)


@router.get("/commits")
def git_commits(
    path: str = Query(..., description="Repo path"),
    max_commits: int = Query(30),
    since_days: int = Query(30),
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
):
    return analyzer.get_commits(path, max_commits, since_days)


@router.get("/branches")
def git_branches(
    path: str = Query(..., description="Repo path"),
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
):
    return analyzer.get_branches(path)


@router.get("/diff")
def git_diff(
    path: str = Query(..., description="Repo path"),
    commit: str | None = Query(None, description="Commit SHA"),
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
):
    return {"diff": analyzer.get_diff(path, commit)}


@router.get("/remote-branches")
def remote_branches(
    path: str = Query(..., description="Repo path"),
):
    return GitAnalyzer.get_remote_branches(path)


@router.post("/pull")
def git_pull(req: PullRequest):
    return GitAnalyzer.git_pull(req.path, req.branch)
