"""Custom exceptions for git-2-jira-dev-pulse."""
from typing import Any, Dict, Optional


class Git2JiraException(Exception):
    """Base exception for all git-2-jira errors."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = 500,
    ):
        super().__init__(message)
        self.message = message
        self.details = details or {}
        self.status_code = status_code

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        return {
            "error": self.__class__.__name__,
            "message": self.message,
            "details": self.details,
        }


class GitAnalysisError(Git2JiraException):
    """Exception raised when git analysis fails."""

    def __init__(self, message: str, repo_path: str = "", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details=details or {}, status_code=500)
        self.details["repo_path"] = repo_path


class JiraConnectionError(Git2JiraException):
    """Exception raised when connecting to Jira fails."""

    def __init__(self, message: str, jira_url: str = "", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details=details or {}, status_code=503)
        self.details["jira_url"] = jira_url


class JiraTicketCreationError(Git2JiraException):
    """Exception raised when creating a Jira ticket fails."""

    def __init__(
        self,
        message: str,
        ticket_summary: str = "",
        project_key: str = "",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message, details=details or {}, status_code=500)
        self.details["ticket_summary"] = ticket_summary
        self.details["project_key"] = project_key


class DatabaseError(Git2JiraException):
    """Exception raised when database operations fail."""

    def __init__(self, message: str, operation: str = "", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details=details or {}, status_code=500)
        self.details["operation"] = operation


class TemplateError(Git2JiraException):
    """Exception raised when template operations fail."""

    def __init__(
        self,
        message: str,
        template_name: str = "",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message, details=details or {}, status_code=400)
        self.details["template_name"] = template_name


class ExportError(Git2JiraException):
    """Exception raised when export operations fail."""

    def __init__(
        self,
        message: str,
        export_format: str = "",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message, details=details or {}, status_code=500)
        self.details["export_format"] = export_format
