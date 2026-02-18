from typing import Optional, Literal
from concurrent.futures import ThreadPoolExecutor, as_completed

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from ..config import settings
from ..dependencies import get_folder_scanner, get_git_analyzer
from ..models.git_models import AnalyzeRequest, WorkSummary, RepoStatus, UncommittedChanges
from ..services.folder_scanner import FolderScanner
from ..services.git_analyzer import GitAnalyzer
from ..services.config_service import get_config_service
from ..logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/folders", tags=["folders"])


class HideRepoRequest(BaseModel):
    """Request body for hiding a repo."""
    repo_name: str


@router.get("/")
def list_folders(
    status_filter: Optional[RepoStatus] = Query(None, description="Filter by repo status"),
    has_uncommitted: Optional[bool] = Query(None, description="Filter by uncommitted changes"),
    min_commits: int = Query(0, description="Minimum number of recent commits"),
    sort_by: Literal["name", "status", "uncommitted", "commits", "activity"] = Query(
        "name", description="Field to sort by"
    ),
    sort_desc: bool = Query(False, description="Sort in descending order"),
    scanner: FolderScanner = Depends(get_folder_scanner),
):
    """
    List git repositories with optional filtering and sorting.

    Args:
        status_filter: Filter by CLEAN or DIRTY status
        has_uncommitted: True for repos with uncommitted changes, False for clean repos
        min_commits: Minimum number of recent commits (last 30)
        sort_by: Sort field (name, status, uncommitted, commits, activity)
        sort_desc: Sort in descending order

    Returns:
        List of repository information
    """
    # If no filters/sorting requested, use simple scan for backward compatibility
    if (
        status_filter is None
        and has_uncommitted is None
        and min_commits == 0
        and sort_by == "name"
        and not sort_desc
    ):
        return scanner.scan()

    return scanner.scan_with_filters(
        status_filter=status_filter,
        has_uncommitted=has_uncommitted,
        min_commits=min_commits,
        sort_by=sort_by,
        sort_desc=sort_desc,
    )


@router.post("/analyze", response_model=list[WorkSummary])
def analyze_folders(
    req: AnalyzeRequest,
    use_cache: bool = Query(True, description="Use cached analysis results"),
    parallel: bool = Query(True, description="Analyze repos in parallel"),
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
):
    """
    Analyze multiple git repositories.

    Args:
        req: Analysis request with repo paths and parameters
        use_cache: Whether to use cached results (default: True)
        parallel: Whether to analyze repos in parallel (default: True)
        analyzer: Git analyzer service

    Returns:
        List of work summaries for each repository
    """
    analyze_func = analyzer.get_work_summary_cached if use_cache else analyzer.get_work_summary

    def analyze_repo(path: str) -> WorkSummary:
        """Analyze a single repo with error handling."""
        try:
            return analyze_func(path, req.max_commits, req.since_days)
        except Exception as e:
            logger.error(f"Error analyzing {path}: {str(e)}")
            return WorkSummary(
                repo_name=path.split("/")[-1],
                repo_path=path,
                current_branch="error",
                uncommitted=UncommittedChanges(),
                recent_commits=[],
                branches=[],
            )

    if parallel and len(req.paths) > 1:
        # Parallel execution
        results = [None] * len(req.paths)
        with ThreadPoolExecutor(max_workers=settings.max_parallel_workers) as executor:
            future_to_index = {
                executor.submit(analyze_repo, path): i
                for i, path in enumerate(req.paths)
            }

            for future in as_completed(future_to_index):
                index = future_to_index[future]
                results[index] = future.result()

        return results
    else:
        # Sequential execution
        return [analyze_repo(path) for path in req.paths]


@router.get("/hidden")
def get_hidden_repos():
    """Get list of hidden repositories."""
    config_service = get_config_service()
    return {"hidden_repos": config_service.get_hidden_repos()}


@router.post("/hide")
def hide_repo(request: HideRepoRequest):
    """Hide a repository from scan results.

    The repo is not deleted — it's just excluded from the UI.
    """
    config_service = get_config_service()
    config_service.hide_repo(request.repo_name)
    return {"success": True, "hidden": request.repo_name}


@router.delete("/hide/{repo_name}")
def unhide_repo(repo_name: str):
    """Restore a hidden repository to scan results."""
    config_service = get_config_service()
    config_service.unhide_repo(repo_name)
    return {"success": True, "restored": repo_name}


@router.post("/clear-cache")
def clear_analysis_cache(
    repo_path: Optional[str] = Query(None, description="Specific repo path to clear, or all if omitted"),
):
    """
    Clear the git analysis cache.

    Args:
        repo_path: Optional specific repo path. If omitted, clears entire cache.

    Returns:
        Success message
    """
    GitAnalyzer.clear_cache(repo_path)
    if repo_path:
        return {"message": f"Cleared cache for {repo_path}"}
    else:
        return {"message": "Cleared entire analysis cache"}
