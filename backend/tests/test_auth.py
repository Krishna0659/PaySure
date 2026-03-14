import pytest


class TestAuthRegister:
    """Tests for POST /api/v1/auth/register"""

    def test_register_freelancer_success(self, client):
        """Freelancer can register with valid data."""
        response = client.post("/api/v1/auth/register", json={
            "full_name": "Auth Test Freelancer",
            "email": "auth_freelancer@pytest.com",
            "password": "PyTest1234",
            "role": "freelancer"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert "access_token" in data["data"]
        assert data["data"]["user"]["email"] == "auth_freelancer@pytest.com"
        assert data["data"]["user"]["role"] == "freelancer"
        # Password must never be returned
        assert "password" not in data["data"]["user"]
        assert "hashed_password" not in data["data"]["user"]

    def test_register_client_success(self, client):
        """Client can register with valid data."""
        response = client.post("/api/v1/auth/register", json={
            "full_name": "Auth Test Client",
            "email": "auth_client@pytest.com",
            "password": "PyTest1234",
            "role": "client"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["data"]["user"]["role"] == "client"

    def test_register_admin_success(self, client):
        """Admin can register with valid data."""
        response = client.post("/api/v1/auth/register", json={
            "full_name": "Auth Test Admin",
            "email": "auth_admin@pytest.com",
            "password": "PyTest1234",
            "role": "admin"
        })
        assert response.status_code == 201

    def test_register_duplicate_email_fails(self, client):
        """Registering with an already used email returns 400."""
        payload = {
            "full_name": "Duplicate User",
            "email": "duplicate@pytest.com",
            "password": "PyTest1234",
            "role": "freelancer"
        }
        client.post("/api/v1/auth/register", json=payload)
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 400
        assert response.json()["success"] is False

    def test_register_invalid_email_fails(self, client):
        """Invalid email format returns 422 validation error."""
        response = client.post("/api/v1/auth/register", json={
            "full_name": "Bad Email User",
            "email": "not-an-email",
            "password": "PyTest1234",
            "role": "freelancer"
        })
        assert response.status_code == 422

    def test_register_missing_password_fails(self, client):
        """Missing password returns 422 validation error."""
        response = client.post("/api/v1/auth/register", json={
            "full_name": "No Password",
            "email": "nopass@pytest.com",
            "role": "freelancer"
        })
        assert response.status_code == 422

    def test_register_invalid_role_fails(self, client):
        """Invalid role value returns 422 validation error."""
        response = client.post("/api/v1/auth/register", json={
            "full_name": "Bad Role",
            "email": "badrole@pytest.com",
            "password": "PyTest1234",
            "role": "superuser"
        })
        assert response.status_code == 422

    def test_register_returns_uuid(self, client):
        """Registered user should have a valid UUID as ID."""
        response = client.post("/api/v1/auth/register", json={
            "full_name": "UUID Test",
            "email": "uuidtest@pytest.com",
            "password": "PyTest1234",
            "role": "freelancer"
        })
        assert response.status_code == 201
        user_id = response.json()["data"]["user"]["id"]
        assert len(user_id) == 36  # UUID format: 8-4-4-4-12


class TestAuthLogin:
    """Tests for POST /api/v1/auth/login"""

    def test_login_success(self, client):
        """User can login with correct credentials."""
        # Register first
        client.post("/api/v1/auth/register", json={
            "full_name": "Login Test User",
            "email": "logintest@pytest.com",
            "password": "PyTest1234",
            "role": "freelancer"
        })
        # Then login
        response = client.post("/api/v1/auth/login", json={
            "full_name": "Login Test User",
            "email": "logintest@pytest.com",
            "password": "PyTest1234",
            "role": "freelancer"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "access_token" in data["data"]

    def test_login_wrong_password_fails(self, client):
        """Login with wrong password returns 401."""
        client.post("/api/v1/auth/register", json={
            "full_name": "Wrong Pass User",
            "email": "wrongpass@pytest.com",
            "password": "PyTest1234",
            "role": "client"
        })
        response = client.post("/api/v1/auth/login", json={
            "full_name": "Wrong Pass User",
            "email": "wrongpass@pytest.com",
            "password": "WrongPassword",
            "role": "client"
        })
        assert response.status_code == 401

    def test_login_nonexistent_email_fails(self, client):
        """Login with email that doesn't exist returns 401."""
        response = client.post("/api/v1/auth/login", json={
            "full_name": "Ghost User",
            "email": "ghost@nobody.com",
            "password": "PyTest1234",
            "role": "freelancer"
        })
        assert response.status_code == 401

    def test_login_token_is_string(self, client):
        """JWT token returned must be a non-empty string."""
        client.post("/api/v1/auth/register", json={
            "full_name": "Token Test",
            "email": "tokentest@pytest.com",
            "password": "PyTest1234",
            "role": "freelancer"
        })
        response = client.post("/api/v1/auth/login", json={
            "full_name": "Token Test",
            "email": "tokentest@pytest.com",
            "password": "PyTest1234",
            "role": "freelancer"
        })
        token = response.json()["data"]["access_token"]
        assert isinstance(token, str)
        assert len(token) > 20
        # JWT has 3 parts separated by dots
        assert token.count(".") == 2