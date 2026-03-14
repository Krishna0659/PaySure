import pytest


class TestUsersMe:
    """Tests for GET /api/v1/users/me"""

    def test_get_my_profile_success(self, client, freelancer_headers, freelancer_data):
        """Authenticated user can fetch their own profile."""
        response = client.get("/api/v1/users/me", headers=freelancer_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["email"] == freelancer_data["email"]
        assert data["data"]["role"] == "freelancer"

    def test_get_profile_without_token_fails(self, client):
        """Unauthenticated request returns 401."""
        response = client.get("/api/v1/users/me")
        assert response.status_code == 401

    def test_get_profile_with_bad_token_fails(self, client):
        """Request with an invalid/fake token returns 401."""
        headers = {"Authorization": "Bearer this.is.fake"}
        response = client.get("/api/v1/users/me", headers=headers)
        assert response.status_code == 401

    def test_profile_has_no_password(self, client, client_headers):
        """Profile response must never include hashed_password."""
        response = client.get("/api/v1/users/me", headers=client_headers)
        data = response.json()["data"]
        assert "hashed_password" not in data
        assert "password" not in data

    def test_profile_has_correct_fields(self, client, freelancer_headers):
        """Profile response includes all expected fields."""
        response = client.get("/api/v1/users/me", headers=freelancer_headers)
        data = response.json()["data"]
        assert "id" in data
        assert "email" in data
        assert "full_name" in data
        assert "role" in data
        assert "created_at" in data


class TestUpdateProfile:
    """Tests for PUT /api/v1/users/me"""

    def test_update_full_name_success(self, client, freelancer_headers):
        """User can update their full name."""
        response = client.put("/api/v1/users/me",
            headers=freelancer_headers,
            json={"full_name": "Updated Freelancer Name"}
        )
        assert response.status_code == 200
        assert response.json()["data"]["full_name"] == "Updated Freelancer Name"

    def test_update_without_token_fails(self, client):
        """Update without auth returns 401."""
        response = client.put("/api/v1/users/me", json={"full_name": "Hacker"})
        assert response.status_code == 401