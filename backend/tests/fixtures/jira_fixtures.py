"""Jira-related test fixtures."""


def create_mock_jira_response(key="TEST-123", summary="Test Ticket"):
    """Create a mock Jira API response."""
    return {
        "key": key,
        "fields": {
            "summary": summary,
            "status": {"name": "Open"},
            "issuetype": {"name": "Task"},
            "priority": {"name": "Major"},
            "created": "2024-01-01T12:00:00.000+0000",
            "updated": "2024-01-01T12:00:00.000+0000",
        },
        "self": f"https://jira.example.com/rest/api/2/issue/{key}",
    }


def create_mock_search_response(issues=None):
    """Create a mock Jira search response."""
    if issues is None:
        issues = [create_mock_jira_response()]

    return {
        "total": len(issues),
        "startAt": 0,
        "maxResults": 50,
        "issues": issues,
    }
