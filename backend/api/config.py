from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    jira_url: str = "https://issues.redhat.com"
    jira_api_url: str = ""  # e.g. https://issues.redhat.com/rest/api/2/  — auto-derived from jira_url if empty
    jira_api_token: str = ""
    jira_default_project: str = ""
    jira_default_assignee: str = ""
    repos_base_path: str = str(Path.home() / "repos")
    max_commits_default: int = 30
    since_days_default: int = 30

    # Database settings
    db_path: str = str(Path.home() / ".git2jira.db")

    # Cache settings
    cache_ttl_seconds: int = 300

    # Performance settings
    max_parallel_workers: int = 10

    # Logging settings
    log_level: str = "INFO"

    model_config = {
        "env_file": str(Path.home() / ".rh-jira-mcp.env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
