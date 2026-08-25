"""
Authentication Tests
=====================
PaySure uses Clerk for authentication (signup, login, OTP, password reset).
There are no /auth/register or /auth/login endpoints in this backend.

These tests verify:
  - GET /users/me: authenticated user can fetch their profile
  - Role-based access control
  - Onboarding guard
  - Unauthenticated requests are rejected
  - Protected endpoints cannot be accessed without auth
  - Admin-only endpoints reject non-admin users
"""
import uuid
import pytest
from app.main import app


class TestGetProfile:
    """Tests for GET /api/v1/users/me"""

    def test_authenticated_user_can_fetch_profile(self, as_freelancer):
        """Authenticated freelancer can fetch their own profile."""
        client, headers = as_freelancer
        response = client.get("/api/v1/users/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        user = data["data"]
        assert user["email"] == "freelancer@example.com"
        assert user["role"] == "freelancer"

    def test_profile_never_returns_password(self, as_freelancer):
        """Profile response must never include password or hash."""
        client, headers = as_freelancer
        response = client.get("/api/v1/users/me", headers=headers)
        assert response.status_code == 200
        user = response.json()["data"]
        assert "password" not in user
        assert "hashed_password" not in user

    def test_profile_contains_expected_fields(self, as_client_user):
        """Profile response contains required fields."""
        client, headers = as_client_user
        response = client.get("/api/v1/users/me", headers=headers)
        assert response.status_code == 200
        user = response.json()["data"]
        assert "id" in user
        assert "email" in user
        assert "role" in user
        assert "is_onboarded" in user
        assert "is_active" in user
        assert "created_at" in user

    def test_unauthenticated_request_rejected(self, no_auth, client):
        """Request without Authorization header is rejected with 403."""
        response = client.get("/api/v1/users/me")
        assert response.status_code in (401, 403)

    def test_client_user_profile(self, as_client_user):
        """Client user fetches their own profile correctly."""
        client, headers = as_client_user
        response = client.get("/api/v1/users/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["data"]["role"] == "client"

    def test_admin_profile(self, as_admin):
        """Admin user fetches their own profile correctly."""
        client, headers = as_admin
        response = client.get("/api/v1/users/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["data"]["role"] == "admin"


class TestRoleBasedAccessControl:
    """Tests for role enforcement on protected endpoints."""

    def test_admin_endpoint_rejects_freelancer(self, as_freelancer):
        """Freelancer cannot access admin-only endpoints."""
        client, headers = as_freelancer
        response = client.get("/api/v1/admin/stats", headers=headers)
        assert response.status_code == 403

    def test_admin_endpoint_rejects_client(self, as_client_user):
        """Client cannot access admin-only endpoints."""
        client, headers = as_client_user
        response = client.get("/api/v1/admin/stats", headers=headers)
        assert response.status_code == 403

    def test_admin_endpoint_allows_admin(self, as_admin):
        """Admin can access admin-only endpoints."""
        client, headers = as_admin
        response = client.get("/api/v1/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert "total_users" in data

    def test_admin_users_list_rejects_freelancer(self, as_freelancer):
        """Freelancer cannot list all users — admin-only endpoint."""
        client, headers = as_freelancer
        response = client.get("/api/v1/admin/users", headers=headers)
        assert response.status_code == 403


class TestProfileUpdate:
    """Tests for PUT /api/v1/users/me"""

    def test_user_can_update_name(self, as_freelancer):
        """User can update their full name."""
        client, headers = as_freelancer
        response = client.put(
            "/api/v1/users/me",
            json={"full_name": "Updated Name"},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["data"]["full_name"] == "Updated Name"

    def test_user_cannot_set_is_active_false(self, as_client_user):
        """User cannot deactivate their own account via PUT /users/me."""
        client, headers = as_client_user
        response = client.put(
            "/api/v1/users/me",
            json={"is_active": False},
            headers=headers,
        )
        # Either 422 (field rejected by schema) or 200 with is_active unchanged
        # UserUpdate schema does not include is_active — so it should be 422 or ignored
        if response.status_code == 200:
            # If server accepts it (backward compat), verify is_active didn't change
            assert response.json()["data"]["is_active"] is True
        else:
            assert response.status_code == 422

    def test_name_max_length_enforced(self, as_freelancer):
        """Name exceeding 255 characters is rejected."""
        client, headers = as_freelancer
        long_name = "A" * 300
        response = client.put(
            "/api/v1/users/me",
            json={"full_name": long_name},
            headers=headers,
        )
        assert response.status_code == 422


class TestProtectedRouteAccess:
    """Tests verifying that business endpoints require authentication."""

    def test_invoices_require_auth(self, no_auth, client):
        """Invoice listing is not accessible without auth."""
        response = client.get("/api/v1/invoices")
        assert response.status_code in (401, 403)

    def test_wallet_requires_auth(self, no_auth, client):
        """Wallet endpoint is not accessible without auth."""
        response = client.get("/api/v1/wallet")
        assert response.status_code in (401, 403)

    def test_payments_require_auth(self, no_auth, client):
        """Payment summary is not accessible without auth."""
        response = client.get("/api/v1/payments/summary")
        assert response.status_code in (401, 403)

    def test_health_check_is_public(self, client):
        """Health check endpoint is public — no auth required."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"