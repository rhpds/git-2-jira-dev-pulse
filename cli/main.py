"""CLI for Git-to-Jira ticket workflow.

Usage:
    python cli/main.py scan
    python cli/main.py analyze ~/repos/jira-mcp
    python cli/main.py suggest ~/repos/jira-mcp --project RHDPOPS
    python cli/main.py create --project RHDPOPS --summary "Fix bug" --type Bug
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

import typer
from rich.console import Console
from rich.table import Table

from api.config import settings
from api.services.folder_scanner import FolderScanner
from api.services.git_analyzer import GitAnalyzer
from api.services.jira_client import JiraClient
from api.services.ticket_suggester import TicketSuggester

app = typer.Typer(help="Git-to-Jira: Scan repos, suggest tickets, push to Jira")
console = Console()

scanner = FolderScanner(settings.repos_base_path)
analyzer = GitAnalyzer()
jira_client = JiraClient(server=settings.jira_url, token=settings.jira_api_token)
suggester = TicketSuggester()


@app.command()
def scan():
    """Scan ~/repos/ for git repositories."""
    repos = scanner.scan()
    table = Table(title="Git Repositories")
    table.add_column("Name", style="bold")
    table.add_column("Branch", style="cyan")
    table.add_column("Status")
    table.add_column("Uncommitted", justify="right")
    table.add_column("Commits", justify="right")

    for repo in repos:
        status_style = "red" if repo.status == "dirty" else "green"
        table.add_row(
            repo.name,
            repo.current_branch,
            f"[{status_style}]{repo.status}[/{status_style}]",
            str(repo.uncommitted_count),
            str(repo.recent_commit_count),
        )
    console.print(table)


@app.command()
def analyze(
    path: str = typer.Argument(..., help="Path to git repository"),
    max_commits: int = typer.Option(30, help="Max recent commits"),
    since_days: int = typer.Option(30, help="Only commits from last N days"),
):
    """Analyze a git repository."""
    summary = analyzer.get_work_summary(path, max_commits, since_days)

    console.print(f"\n[bold]{summary.repo_name}[/bold] on [cyan]{summary.current_branch}[/cyan]\n")

    uncommitted_count = (
        len(summary.uncommitted.staged)
        + len(summary.uncommitted.unstaged)
        + len(summary.uncommitted.untracked)
    )
    if uncommitted_count:
        console.print(f"[orange1]Uncommitted changes: {uncommitted_count}[/orange1]")
        for f in summary.uncommitted.staged:
            console.print(f"  [green]staged[/green]    {f.path}")
        for f in summary.uncommitted.unstaged:
            console.print(f"  [yellow]unstaged[/yellow]  {f.path}")
        for f in summary.uncommitted.untracked:
            console.print(f"  [dim]untracked[/dim] {f}")

    if summary.recent_commits:
        table = Table(title=f"Recent Commits ({len(summary.recent_commits)})")
        table.add_column("SHA", style="dim")
        table.add_column("Message")
        table.add_column("Author")
        table.add_column("Date")
        table.add_column("Files", justify="right")

        for c in summary.recent_commits[:20]:
            msg = c.message.split("\n")[0][:60]
            jira = f" [blue]({', '.join(c.jira_refs)})[/blue]" if c.jira_refs else ""
            table.add_row(
                c.short_sha,
                f"{msg}{jira}",
                c.author,
                c.date.strftime("%Y-%m-%d"),
                str(c.files_changed),
            )
        console.print(table)

    if summary.branches:
        console.print(f"\n[bold]Branches ({len(summary.branches)}):[/bold]")
        for b in summary.branches:
            marker = "* " if b.is_active else "  "
            tracking = f" -> {b.tracking}" if b.tracking else ""
            jira = f" ({', '.join(b.jira_refs)})" if b.jira_refs else ""
            console.print(f"  {marker}[cyan]{b.name}[/cyan]{tracking}{jira}")


@app.command()
def suggest(
    paths: list[str] = typer.Argument(..., help="Repo paths to analyze"),
    project: str = typer.Option(settings.jira_default_project, help="Jira project key"),
):
    """Generate Jira ticket suggestions from git activity."""
    summaries = []
    for p in paths:
        try:
            summaries.append(analyzer.get_work_summary(p))
        except Exception as e:
            console.print(f"[red]Error analyzing {p}: {e}[/red]")

    suggestions = suggester.suggest(summaries, project)

    for s in suggestions:
        console.print(f"\n[bold]{s.issue_type.value}[/bold] ({s.priority.value})")
        console.print(f"  Summary: {s.summary}")
        console.print(f"  Repo: {s.source_repo} / {s.source_branch}")
        if s.source_commits:
            console.print(f"  Commits: {', '.join(s.source_commits[:5])}")

    console.print(f"\n[bold]Total suggestions: {len(suggestions)}[/bold]")


@app.command()
def create(
    project: str = typer.Option(..., help="Jira project key"),
    summary: str = typer.Option(..., help="Ticket summary"),
    description: str = typer.Option("", help="Ticket description"),
    issue_type: str = typer.Option("Task", help="Story, Task, or Bug"),
    priority: str = typer.Option("Major", help="Blocker, Critical, Major, Normal, Minor"),
):
    """Create a single Jira ticket."""
    from api.models.jira_models import IssueType, Priority, TicketCreateRequest

    req = TicketCreateRequest(
        project_key=project,
        summary=summary,
        description=description or summary,
        issue_type=IssueType(issue_type),
        priority=Priority(priority),
    )
    result = jira_client.create_ticket(req)

    if result.error:
        console.print(f"[red]Error: {result.error}[/red]")
    else:
        console.print(f"[green]Created: {result.key}[/green]")
        console.print(f"  URL: {result.url}")


@app.command()
def health():
    """Check Jira connection status."""
    status = jira_client.check_connection()
    if status.get("connected"):
        console.print(f"[green]Connected to {status['server']}[/green]")
        console.print(f"  User: {status.get('user', 'N/A')}")
        console.print(f"  Email: {status.get('email', 'N/A')}")
    else:
        console.print(f"[red]Not connected: {status.get('error', 'Unknown')}[/red]")


if __name__ == "__main__":
    app()
