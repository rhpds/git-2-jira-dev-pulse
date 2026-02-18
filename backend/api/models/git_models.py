from __future__ import annotations

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class RepoStatus(str, Enum):
    CLEAN = "clean"
    DIRTY = "dirty"


class FileChange(BaseModel):
    path: str
    change_type: str  # added, modified, deleted, renamed, untracked
    diff: str | None = None


class CommitInfo(BaseModel):
    sha: str
    short_sha: str
    message: str
    author: str
    author_email: str
    date: datetime
    files_changed: int
    insertions: int = 0
    deletions: int = 0
    jira_refs: list[str] = Field(default_factory=list)


class BranchInfo(BaseModel):
    name: str
    is_active: bool = False
    tracking: str | None = None
    ahead: int = 0
    behind: int = 0
    last_commit_date: datetime | None = None
    jira_refs: list[str] = Field(default_factory=list)


class StaleBranch(BaseModel):
    name: str
    last_commit_date: datetime | None = None
    days_stale: int = 0
    is_merged: bool = False


class RepoInfo(BaseModel):
    name: str
    path: str
    current_branch: str
    status: RepoStatus
    uncommitted_count: int = 0
    recent_commit_count: int = 0
    has_remote: bool = False
    unpushed_count: int = 0
    untracked_count: int = 0
    stale_branches: list[StaleBranch] = Field(default_factory=list)


class UncommittedChanges(BaseModel):
    staged: list[FileChange] = Field(default_factory=list)
    unstaged: list[FileChange] = Field(default_factory=list)
    untracked: list[str] = Field(default_factory=list)


class PullRequestInfo(BaseModel):
    number: int
    title: str
    url: str
    branch: str
    state: str  # OPEN, MERGED, CLOSED
    created_at: datetime | None = None
    merged_at: datetime | None = None
    closed_at: datetime | None = None


class UnpushedCommit(BaseModel):
    sha: str
    short_sha: str
    message: str
    author: str
    date: datetime


class WorkSummary(BaseModel):
    repo_name: str
    repo_path: str
    current_branch: str
    uncommitted: UncommittedChanges
    recent_commits: list[CommitInfo] = Field(default_factory=list)
    branches: list[BranchInfo] = Field(default_factory=list)
    pull_requests: list[PullRequestInfo] = Field(default_factory=list)
    unpushed_commits: list[UnpushedCommit] = Field(default_factory=list)
    stale_branches: list[StaleBranch] = Field(default_factory=list)


class AnalyzeRequest(BaseModel):
    paths: list[str]
    max_commits: int = 100
    since_days: int = 120
