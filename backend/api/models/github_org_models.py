"""Pydantic models for GitHub organization endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AddGitHubOrgRequest(BaseModel):
    org_login: str = Field(..., min_length=1, max_length=100)


class AddGitHubRepoRequest(BaseModel):
    owner: str = Field(..., min_length=1, max_length=100)
    repo: str = Field(..., min_length=1, max_length=100)


class GitHubOrgResponse(BaseModel):
    id: int
    org_login: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    description: Optional[str] = None
    public_repos: Optional[int] = None
    last_synced: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class GitHubOrgRepoResponse(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    url: str
    default_branch: str = "main"
    private: bool = False
    language: Optional[str] = None
    pushed_at: Optional[str] = None
    stars: int = 0
    forks: int = 0
    open_issues: int = 0
    is_added: bool = False
