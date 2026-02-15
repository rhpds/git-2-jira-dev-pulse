from __future__ import annotations

from enum import Enum
from pydantic import BaseModel, Field


class IssueType(str, Enum):
    STORY = "Story"
    TASK = "Task"
    BUG = "Bug"


class Priority(str, Enum):
    BLOCKER = "Blocker"
    CRITICAL = "Critical"
    MAJOR = "Major"
    NORMAL = "Normal"
    MINOR = "Minor"


AVAILABLE_LABELS = [
    "ops-development",
    "ansible-agent",
    "cost-focused",
    "devpulse-automation",
]


class ExistingJiraMatch(BaseModel):
    key: str
    summary: str
    status: str
    url: str


class TicketSuggestion(BaseModel):
    id: str
    summary: str
    description: str
    issue_type: IssueType = IssueType.TASK
    priority: Priority = Priority.MAJOR
    labels: list[str] = Field(default_factory=list)
    assignee: str = ""
    pr_urls: list[str] = Field(default_factory=list)
    project_key: str = ""
    source_repo: str = ""
    source_branch: str = ""
    source_commits: list[str] = Field(default_factory=list)
    source_files: list[str] = Field(default_factory=list)
    already_tracked: bool = False
    existing_jira: list[ExistingJiraMatch] = Field(default_factory=list)
    selected: bool = True


class TicketCreateRequest(BaseModel):
    project_key: str
    summary: str
    description: str
    issue_type: IssueType = IssueType.TASK
    priority: Priority = Priority.MAJOR
    labels: list[str] = Field(default_factory=list)
    assignee: str = ""
    pr_urls: list[str] = Field(default_factory=list)


class BatchCreateRequest(BaseModel):
    tickets: list[TicketCreateRequest]
    skip_duplicates: bool = True


class CreatedTicket(BaseModel):
    key: str
    url: str
    summary: str
    duplicate: bool = False
    error: str | None = None


class BatchCreateResult(BaseModel):
    created: list[CreatedTicket] = Field(default_factory=list)
    skipped_duplicates: int = 0
    errors: int = 0


class DuplicateCheckResult(BaseModel):
    is_duplicate: bool
    existing_keys: list[str] = Field(default_factory=list)
