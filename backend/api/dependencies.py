from functools import lru_cache

from sqlalchemy.orm import Session

from .config import Settings, settings
from .database import get_db
from .services.folder_scanner import FolderScanner
from .services.git_analyzer import GitAnalyzer
from .services.jira_client import JiraClient
from .services.ticket_suggester import TicketSuggester
from .services.history_service import HistoryService
from .services.template_service import TemplateService
from .services.export_service import ExportService


@lru_cache
def get_settings() -> Settings:
    return settings


def get_folder_scanner() -> FolderScanner:
    return FolderScanner()


def get_git_analyzer() -> GitAnalyzer:
    return GitAnalyzer()


def get_jira_client() -> JiraClient:
    return JiraClient(
        server=settings.jira_url,
        token=settings.jira_api_token,
    )


def get_ticket_suggester() -> TicketSuggester:
    return TicketSuggester(default_assignee=settings.jira_default_assignee)


def get_history_service(db: Session = get_db) -> HistoryService:
    """Get history service with database session."""
    return HistoryService(db)


def get_template_service(db: Session = get_db) -> TemplateService:
    """Get template service with database session."""
    return TemplateService(db)


def get_export_service() -> ExportService:
    """Get export service."""
    return ExportService
