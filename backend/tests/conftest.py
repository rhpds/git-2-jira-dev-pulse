"""Pytest configuration and fixtures."""
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from api.main import app
from api.database import Base, get_db
from api.config import Settings


@pytest.fixture
def test_settings():
    """Test settings fixture."""
    return Settings(
        jira_url="https://test-jira.atlassian.net",
        jira_api_token="test_token",
        jira_default_project="TEST",
        repos_base_path="/tmp/test_repos",
        db_path=":memory:",
    )


@pytest.fixture
def test_db():
    """Create test database fixture."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_app(test_db):
    """Test FastAPI application fixture."""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    return app


@pytest.fixture
def client(test_app):
    """Test client fixture."""
    return TestClient(test_app)


@pytest.fixture
def sample_repo_info():
    """Sample RepoInfo fixture."""
    return {
        "name": "test-repo",
        "path": "/tmp/test-repo",
        "current_branch": "main",
        "status": "clean",
        "uncommitted_count": 0,
        "recent_commit_count": 5,
        "has_remote": True,
    }


@pytest.fixture
def sample_commit_data():
    """Sample commit data fixture."""
    return [
        {
            "sha": "abc123",
            "short_sha": "abc123",
            "message": "Test commit 1",
            "author": "Test Author",
            "author_email": "test@example.com",
            "date": "2024-01-01T12:00:00Z",
            "files_changed": 3,
            "insertions": 10,
            "deletions": 2,
            "jira_refs": ["TEST-123"],
        }
    ]


@pytest.fixture
def mock_jira_client(mocker):
    """Mock Jira client fixture."""
    mock = mocker.Mock()
    mock.test_connection.return_value = True
    mock.get_projects.return_value = [{"key": "TEST", "name": "Test Project"}]
    mock.create_ticket.return_value = {
        "key": "TEST-123",
        "url": "https://test.jira.com/browse/TEST-123",
        "summary": "Test ticket",
    }
    return mock
