"""Integration tests for health routes."""
import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestHealthRoutes:
    """Test cases for health check endpoints."""

    def test_health_check(self, client: TestClient):
        """Test health check endpoint returns 200."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["ok", "error"]

    def test_health_check_jira_connection(self, client: TestClient):
        """Test health check includes Jira connection status."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "jira" in data
        assert "connected" in data["jira"]
        assert isinstance(data["jira"]["connected"], bool)
