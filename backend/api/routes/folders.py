from fastapi import APIRouter, Depends

from ..dependencies import get_folder_scanner, get_git_analyzer
from ..models.git_models import AnalyzeRequest, WorkSummary
from ..services.folder_scanner import FolderScanner
from ..services.git_analyzer import GitAnalyzer

router = APIRouter(prefix="/api/folders", tags=["folders"])


@router.get("/")
def list_folders(scanner: FolderScanner = Depends(get_folder_scanner)):
    return scanner.scan()


@router.post("/analyze", response_model=list[WorkSummary])
def analyze_folders(
    req: AnalyzeRequest,
    analyzer: GitAnalyzer = Depends(get_git_analyzer),
):
    results = []
    for path in req.paths:
        try:
            results.append(
                analyzer.get_work_summary(path, req.max_commits, req.since_days)
            )
        except Exception:
            results.append(
                WorkSummary(
                    repo_name=path.split("/")[-1],
                    repo_path=path,
                    current_branch="error",
                    uncommitted={"staged": [], "unstaged": [], "untracked": []},
                    recent_commits=[],
                    branches=[],
                )
            )
    return results
