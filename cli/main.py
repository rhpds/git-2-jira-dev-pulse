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
from rich import box
import json
from collections import defaultdict

from api.config import settings
from api.services.folder_scanner import FolderScanner
from api.services.git_analyzer import GitAnalyzer
from api.services.jira_client import JiraClient
from api.services.ticket_suggester import TicketSuggester
from api.services.config_service import get_config_service, ScanDirectory

app = typer.Typer(help="Git-to-Jira: Scan repos, suggest tickets, push to Jira")
config_app = typer.Typer(help="Manage configuration")
app.add_typer(config_app, name="config")

console = Console()

scanner = FolderScanner(settings.repos_base_path)
analyzer = GitAnalyzer()
jira_client = JiraClient(server=settings.jira_url, token=settings.jira_api_token)
suggester = TicketSuggester()
config_service = get_config_service()


# ============================================================================
# Configuration Commands
# ============================================================================

@config_app.command("list")
def config_list():
    """Show all configured scan directories."""
    config = config_service.get_config()

    console.print("\n[bold cyan]Git-2-Jira Configuration[/bold cyan]\n")

    # Scan Directories
    if config.scan_directories:
        table = Table(title="Scan Directories", box=box.ROUNDED)
        table.add_column("Path", style="cyan")
        table.add_column("Status", justify="center")
        table.add_column("Recursive", justify="center")
        table.add_column("Max Depth", justify="center")
        table.add_column("Exclusions", style="dim")

        for scan_dir in config.scan_directories:
            status = "[green]✓ enabled[/green]" if scan_dir.enabled else "[dim]disabled[/dim]"
            recursive = "✓" if scan_dir.recursive else "✗"
            exclusions = ", ".join(scan_dir.exclude_patterns[:3])
            if len(scan_dir.exclude_patterns) > 3:
                exclusions += f" +{len(scan_dir.exclude_patterns) - 3} more"

            table.add_row(
                scan_dir.path,
                status,
                recursive,
                str(scan_dir.max_depth),
                exclusions or "none"
            )

        console.print(table)
    else:
        console.print("[yellow]No scan directories configured[/yellow]")

    # Auto-discovery
    console.print(f"\n[bold]Auto-discovery:[/bold] {'[green]enabled[/green]' if config.auto_discovery.enabled else '[dim]disabled[/dim]'}")
    if config.auto_discovery.watch_paths:
        console.print(f"  Watch paths: {', '.join(config.auto_discovery.watch_paths)}")

    # UI Preferences
    console.print(f"\n[bold]UI Theme:[/bold] {config.ui.theme}")
    console.print(f"[bold]Animations:[/bold] {'enabled' if config.ui.animations_enabled else 'disabled'}")
    console.print(f"[bold]Visualizations:[/bold] {'enabled' if config.ui.show_visualizations else 'disabled'}\n")


@config_app.command("add")
def config_add(
    path: str = typer.Argument(..., help="Directory path to scan"),
    recursive: bool = typer.Option(False, "--recursive", "-r", help="Scan recursively"),
    max_depth: int = typer.Option(3, "--max-depth", "-d", help="Maximum recursion depth"),
    exclude: list[str] = typer.Option(
        None,
        "--exclude",
        "-e",
        help="Exclusion patterns (can be used multiple times)"
    ),
):
    """Add a new scan directory."""
    exclude_patterns = list(exclude) if exclude else ["node_modules", ".venv", ".git"]

    scan_dir = ScanDirectory(
        path=path,
        enabled=True,
        recursive=recursive,
        max_depth=max_depth,
        exclude_patterns=exclude_patterns,
        exclude_folders=[]
    )

    config = config_service.add_scan_directory(scan_dir)

    console.print(f"\n[green]✓[/green] Added scan directory: [cyan]{scan_dir.path}[/cyan]")
    console.print(f"  Recursive: {recursive}")
    console.print(f"  Max depth: {max_depth}")
    console.print(f"  Exclusions: {', '.join(exclude_patterns)}\n")


@config_app.command("remove")
def config_remove(path: str = typer.Argument(..., help="Directory path to remove")):
    """Remove a scan directory."""
    config = config_service.remove_scan_directory(path)
    console.print(f"\n[green]✓[/green] Removed scan directory: [cyan]{path}[/cyan]\n")


@config_app.command("migrate")
def config_migrate():
    """Migrate from legacy .rh-jira-mcp.env to YAML config."""
    try:
        config = config_service.migrate_from_env()
        backup_path = config_service.LEGACY_ENV_PATH.with_suffix(".env.backup")

        console.print(f"\n[green]✓[/green] Successfully migrated configuration!")
        console.print(f"  New config: [cyan]{config_service.config_path}[/cyan]")
        console.print(f"  Backup created: [dim]{backup_path}[/dim]\n")

        # Show the migrated config
        config_list()

    except FileNotFoundError as e:
        console.print(f"\n[red]Error:[/red] {e}\n")
        raise typer.Exit(1)


@config_app.command("export")
def config_export(
    output: str = typer.Option(None, "--output", "-o", help="Output file path"),
    format: str = typer.Option("yaml", "--format", "-f", help="Export format (yaml or json)")
):
    """Export configuration to file."""
    config = config_service.get_config()
    config_dict = config.model_dump(mode="json")

    if format == "json":
        content = json.dumps(config_dict, indent=2)
    else:
        import yaml
        content = yaml.dump(config_dict, default_flow_style=False, sort_keys=False)

    if output:
        Path(output).write_text(content)
        console.print(f"\n[green]✓[/green] Configuration exported to: [cyan]{output}[/cyan]\n")
    else:
        console.print(content)


@config_app.command("watcher")
def watcher_status():
    """Show auto-discovery watcher status."""
    import httpx

    try:
        response = httpx.get("http://localhost:8000/api/config/auto-discovery/status")
        status = response.json()

        console.print("\n[bold cyan]Auto-Discovery Watcher Status[/bold cyan]\n")

        # Status
        if status["running"]:
            console.print("[green]● Running[/green]")
        else:
            console.print("[dim]○ Stopped[/dim]")

        console.print(f"Enabled: {'[green]yes[/green]' if status['enabled'] else '[dim]no[/dim]'}")
        console.print(f"Scan interval: {status['scan_interval_seconds']} seconds")
        console.print(f"Discovered repos: {status['discovered_count']}")

        if status["watch_paths"]:
            console.print(f"\nWatch paths ({len(status['watch_paths'])}):")
            for path in status["watch_paths"]:
                console.print(f"  • {path}")
        else:
            console.print("\n[yellow]No watch paths configured[/yellow]")

        console.print()

    except Exception as e:
        console.print(f"\n[red]Error: {e}[/red]\n")
        raise typer.Exit(1)


# ============================================================================
# Repository Scanning Commands
# ============================================================================

@app.command()
def scan(
    group_by_dir: bool = typer.Option(False, "--group", "-g", help="Group repos by source directory")
):
    """Scan configured directories for git repositories."""
    # Use multi-directory scanner
    multi_scanner = FolderScanner()  # No base_path = multi-directory mode
    repos = multi_scanner.scan()

    if not repos:
        console.print("\n[yellow]No repositories found[/yellow]\n")
        return

    if group_by_dir:
        # Group repos by parent directory
        grouped = defaultdict(list)
        for repo in repos:
            parent = str(Path(repo.path).parent)
            grouped[parent].append(repo)

        for parent_dir in sorted(grouped.keys()):
            console.print(f"\n[bold cyan]{parent_dir}[/bold cyan] ({len(grouped[parent_dir])} repos)")

            table = Table(box=box.SIMPLE)
            table.add_column("Name", style="bold")
            table.add_column("Branch", style="cyan")
            table.add_column("Status")
            table.add_column("Changes", justify="right")
            table.add_column("Commits", justify="right")

            for repo in grouped[parent_dir]:
                status_value = repo.status.value if hasattr(repo.status, 'value') else str(repo.status)
                status_style = "red" if status_value == "dirty" else "green"
                table.add_row(
                    repo.name,
                    repo.current_branch,
                    f"[{status_style}]{status_value}[/{status_style}]",
                    str(repo.uncommitted_count),
                    str(repo.recent_commit_count),
                )

            console.print(table)

        console.print(f"\n[bold]Total repositories: {len(repos)}[/bold]\n")
    else:
        # Flat list
        table = Table(title=f"Git Repositories ({len(repos)})", box=box.ROUNDED)
        table.add_column("Name", style="bold")
        table.add_column("Branch", style="cyan")
        table.add_column("Status")
        table.add_column("Changes", justify="right")
        table.add_column("Commits", justify="right")

        for repo in repos:
            status_value = repo.status.value if hasattr(repo.status, 'value') else str(repo.status)
            status_style = "red" if status_value == "dirty" else "green"
            table.add_row(
                repo.name,
                repo.current_branch,
                f"[{status_style}]{status_value}[/{status_style}]",
                str(repo.uncommitted_count),
                str(repo.recent_commit_count),
            )

        console.print(f"\n")
        console.print(table)
        console.print(f"\n")


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
