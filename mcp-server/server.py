"""MCP Server for Git-to-Jira ticket workflow.

Wraps the same backend services used by the FastAPI app and CLI.
"""

import json
import sys
from pathlib import Path

# Add backend to path so we can import services directly
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from dotenv import load_dotenv
from fastmcp import FastMCP

from api.config import settings
from api.services.folder_scanner import FolderScanner
from api.services.git_analyzer import GitAnalyzer
from api.services.jira_client import JiraClient
from api.services.ticket_suggester import TicketSuggester

load_dotenv(Path.home() / ".git2jira.env")

mcp = FastMCP("git-to-jira")

scanner = FolderScanner(settings.repos_base_path)
analyzer = GitAnalyzer()
jira = JiraClient(server=settings.jira_url, token=settings.jira_api_token)
suggester = TicketSuggester()


@mcp.tool()
def scan_repos() -> str:
    """Scan ~/repos/ for git repositories and return their status."""
    repos = scanner.scan()
    return json.dumps([r.model_dump() for r in repos], indent=2, default=str)


@mcp.tool()
def analyze_repo(path: str, max_commits: int = 30, since_days: int = 30) -> str:
    """Analyze a git repository: commits, branches, uncommitted changes.

    Args:
        path: Absolute path to the git repository
        max_commits: Maximum number of recent commits to return
        since_days: Only include commits from the last N days
    """
    summary = analyzer.get_work_summary(path, max_commits, since_days)
    return json.dumps(summary.model_dump(), indent=2, default=str)


@mcp.tool()
def suggest_tickets(paths: list[str], project_key: str) -> str:
    """Generate Jira ticket suggestions from git activity in the given repos.

    Args:
        paths: List of absolute repo paths to analyze
        project_key: Jira project key (e.g. MYPROJECT)
    """
    summaries = [analyzer.get_work_summary(p) for p in paths]
    suggestions = suggester.suggest(summaries, project_key)
    return json.dumps([s.model_dump() for s in suggestions], indent=2, default=str)


@mcp.tool()
def create_jira_ticket(
    project_key: str,
    summary: str,
    description: str,
    issue_type: str = "Task",
    priority: str = "Major",
) -> str:
    """Create a single Jira ticket.

    Args:
        project_key: Jira project key
        summary: Ticket title
        description: Ticket description
        issue_type: Story, Task, or Bug
        priority: Blocker, Critical, Major, Normal, or Minor
    """
    from api.models.jira_models import IssueType, Priority, TicketCreateRequest

    req = TicketCreateRequest(
        project_key=project_key,
        summary=summary,
        description=description,
        issue_type=IssueType(issue_type),
        priority=Priority(priority),
    )
    result = jira.create_ticket(req)
    return json.dumps(result.model_dump(), indent=2, default=str)


@mcp.tool()
def check_jira_connection() -> str:
    """Check if the Jira connection is working and return user info."""
    return json.dumps(jira.check_connection(), indent=2)


if __name__ == "__main__":
    mcp.run()
