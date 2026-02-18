import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..dependencies import get_git_analyzer
from ..services.git_analyzer import GitAnalyzer
from ..services.config_service import get_config_service
from ..config import settings

router = APIRouter(prefix="/api/git", tags=["git"])


def _validate_repo_path(path: str) -> Path:
    """Resolve a path and verify it is under an allowed scan directory or repos_base_path.

    Raises HTTPException 403 if the path escapes the allowed directories.
    """
    resolved = Path(os.path.expanduser(os.path.expandvars(path))).resolve()

    # Gather all allowed roots
    allowed_roots: list[Path] = []

    # From config service scan directories
    try:
        config_service = get_config_service()
        config = config_service.get_config()
        for scan_dir in config.scan_directories:
            if scan_dir.enabled:
                allowed_roots.append(Path(scan_dir.path).resolve())
    except Exception:
        pass

    # From settings repos_base_path
    if settings.repos_base_path:
        allowed_roots.append(Path(os.path.expanduser(settings.repos_base_path)).resolve())

    # Default fallback: user home repos directory
    if not allowed_roots:
        allowed_roots.append(Path.home() / "repos")

    # Check that the resolved path is under at least one allowed root
    for root in allowed_roots:
        try:
            resolved.relative_to(root)
            return resolved
        except ValueError:
            continue

    raise HTTPException(
        status_code=403,
        detail=f"Access denied: path is not under any configured scan directory",
    )


class PullRequest(BaseModel):
    path: str
    branch: str


@router.get("/status")
def git_status(
    path: str = Query(..., description="Repo path"),
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
):
    validated = _validate_repo_path(path)
    return analyzer.get_uncommitted(str(validated))


@router.get("/commits")
def git_commits(
    path: str = Query(..., description="Repo path"),
    max_commits: int = Query(30),
    since_days: int = Query(30),
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
):
    validated = _validate_repo_path(path)
    return analyzer.get_commits(str(validated), max_commits, since_days)


@router.get("/branches")
def git_branches(
    path: str = Query(..., description="Repo path"),
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
):
    validated = _validate_repo_path(path)
    return analyzer.get_branches(str(validated))


@router.get("/diff")
def git_diff(
    path: str = Query(..., description="Repo path"),
    commit: str | None = Query(None, description="Commit SHA"),
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
):
    validated = _validate_repo_path(path)
    return {"diff": analyzer.get_diff(str(validated), commit)}


@router.get("/remote-branches")
def remote_branches(
    path: str = Query(..., description="Repo path"),
):
    validated = _validate_repo_path(path)
    return GitAnalyzer.get_remote_branches(str(validated))


@router.post("/pull")
def git_pull(req: PullRequest):
    validated = _validate_repo_path(req.path)
    return GitAnalyzer.git_pull(str(validated), req.branch)
