from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    jira_url: str = "https://issues.redhat.com"
    jira_api_token: str = ""
    jira_default_project: str = "RHDPOPS"
    jira_default_assignee: str = ""
    repos_base_path: str = str(Path.home() / "repos")
    max_commits_default: int = 30
    since_days_default: int = 30

    model_config = {
        "env_file": str(Path.home() / ".rh-jira-mcp.env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
