"""Pydantic models for ticket templates."""
from typing import List, Optional
from pydantic import BaseModel, Field

from .jira_models import IssueType, Priority


class TemplateCreate(BaseModel):
    """Model for creating a new template."""

    name: str = Field(..., min_length=1, max_length=100)
    summary_pattern: str = Field(..., min_length=1, max_length=500)
    description_template: str = Field(..., min_length=1)
    issue_type: IssueType = IssueType.TASK
    priority: Priority = Priority.MAJOR
    labels: List[str] = Field(default_factory=list)
    is_default: bool = False


class TemplateUpdate(BaseModel):
    """Model for updating an existing template."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    summary_pattern: Optional[str] = Field(None, min_length=1, max_length=500)
    description_template: Optional[str] = Field(None, min_length=1)
    issue_type: Optional[IssueType] = None
    priority: Optional[Priority] = None
    labels: Optional[List[str]] = None
    is_default: Optional[bool] = None


class TemplateResponse(BaseModel):
    """Model for template responses."""

    id: int
    name: str
    summary_pattern: str
    description_template: str
    issue_type: str
    priority: str
    labels: List[str]
    is_default: bool

    class Config:
        from_attributes = True
