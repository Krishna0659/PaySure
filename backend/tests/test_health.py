class TestHealthCheck:
    """Tests for GET /health"""

    def test_health_returns_200(self, client):
        """Health check endpoint returns 200 OK."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_structure(self, client):
        """Health check returns expected JSON structure."""
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"

    def test_docs_available(self, client):
        """Swagger UI docs are accessible at /docs."""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_openapi_schema_available(self, client):
        """OpenAPI schema JSON is accessible."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert "openapi" in schema
        assert "paths" in schema

    def test_unknown_route_returns_404(self, client):
        """Non-existent route returns 404."""
        response = client.get("/api/v1/doesnotexist")
        assert response.status_code == 404