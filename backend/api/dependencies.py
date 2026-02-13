from functools import lru_cache

from .config import Settings, settings
from .services.folder_scanner import FolderScanner
from .services.git_analyzer import GitAnalyzer
from .services.jira_client import JiraClient
from .services.ticket_suggester import TicketSuggester


@lru_cache
def get_settings() -> Settings:
    return settings


def get_folder_scanner() -> FolderScanner:
    return FolderScanner(settings.repos_base_path)


def get_git_analyzer() -> GitAnalyzer:
    return GitAnalyzer()


def get_jira_client() -> JiraClient:
    return JiraClient(
        server=settings.jira_url,
        token=settings.jira_api_token,
    )


def get_ticket_suggester() -> TicketSuggester:
    return TicketSuggester(default_assignee=settings.jira_default_assignee)
