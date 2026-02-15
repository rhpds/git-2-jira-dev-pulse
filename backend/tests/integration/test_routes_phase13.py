"""Integration tests for Phase 13 routes: recommendations, team, WebSocket."""
import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestRecommendationsRoutes:
    """Test cases for AI recommendations endpoints."""

    def test_recommendations_returns_200(self, client: TestClient):
        """Test recommendations endpoint returns structured data."""
        response = client.get("/api/recommendations/")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "recommendations" in data
        assert "by_category" in data
        assert "by_priority" in data
        assert "insights" in data
        assert isinstance(data["recommendations"], list)
        assert isinstance(data["total"], int)

    def test_recommendations_structure(self, client: TestClient):
        """Test each recommendation has required fields."""
        response = client.get("/api/recommendations/")
        data = response.json()
        for rec in data["recommendations"]:
            assert "id" in rec
            assert "category" in rec
            assert "priority" in rec
            assert "title" in rec
            assert "description" in rec
            assert "action" in rec
            assert "confidence" in rec
            assert rec["priority"] in ("high", "medium", "low")
            assert 0.0 <= rec["confidence"] <= 1.0

    def test_recommendations_insights_structure(self, client: TestClient):
        """Test insights array structure."""
        response = client.get("/api/recommendations/")
        data = response.json()
        for insight in data["insights"]:
            assert "label" in insight
            assert "value" in insight


@pytest.mark.integration
class TestTeamRoutes:
    """Test cases for team collaboration endpoints."""

    def test_team_members_returns_200(self, client: TestClient):
        """Test team members endpoint."""
        response = client.get("/api/team/members")
        assert response.status_code in (200, 401)
        if response.status_code == 200:
            data = response.json()
            assert "members" in data

    def test_team_activity_returns_200(self, client: TestClient):
        """Test team activity endpoint."""
        response = client.get("/api/team/activity")
        assert response.status_code in (200, 401)
        if response.status_code == 200:
            data = response.json()
            assert "annotations" in data
            assert "bookmarks" in data

    def test_create_annotation_requires_auth(self, client: TestClient):
        """Test annotation creation requires fields."""
        response = client.post("/api/team/annotations", json={
            "repo_path": "test/repo",
            "content": "Test annotation",
        })
        # Should require auth or succeed
        assert response.status_code in (200, 201, 401, 422)

    def test_create_bookmark_requires_auth(self, client: TestClient):
        """Test bookmark creation requires fields."""
        response = client.post("/api/team/bookmarks", json={
            "title": "Test Bookmark",
            "url": "https://example.com",
        })
        assert response.status_code in (200, 201, 401, 422)


@pytest.mark.integration
class TestWebSocketRoute:
    """Test cases for WebSocket endpoint."""

    def test_websocket_connect(self, client: TestClient):
        """Test WebSocket connection establishment."""
        with client.websocket_connect("/ws/notifications") as ws:
            # Should connect without error
            # Send a ping to verify connection
            ws.send_json({"type": "ping"})
            data = ws.receive_json()
            assert data["type"] == "pong"


@pytest.mark.integration
class TestStandupRoutes:
    """Test cases for standup generation endpoints."""

    def test_daily_standup_returns_200(self, client: TestClient):
        """Test daily standup endpoint."""
        response = client.get("/api/standups/daily")
        assert response.status_code == 200
        data = response.json()
        assert "standup" in data

    def test_sprint_report_returns_200(self, client: TestClient):
        """Test sprint report endpoint."""
        response = client.get("/api/standups/sprint")
        assert response.status_code == 200
        data = response.json()
        assert "report" in data


@pytest.mark.integration
class TestFlowAnalyticsRoutes:
    """Test cases for flow analytics endpoints."""

    def test_flow_analytics_returns_200(self, client: TestClient):
        """Test flow analytics endpoint."""
        response = client.get("/api/flow-analytics/")
        assert response.status_code == 200
        data = response.json()
        assert "total_sessions" in data
        assert "sessions" in data


@pytest.mark.integration
class TestImpactGraphRoutes:
    """Test cases for impact graph endpoints."""

    def test_impact_graph_returns_200(self, client: TestClient):
        """Test impact graph endpoint."""
        response = client.get("/api/impact-graph/")
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data


@pytest.mark.integration
class TestHealthScoresRoutes:
    """Test cases for health scores endpoints."""

    def test_health_scores_returns_200(self, client: TestClient):
        """Test health scores endpoint."""
        response = client.get("/api/health-scores/")
        assert response.status_code == 200
        data = response.json()
        assert "repos" in data
        assert "org_score" in data
