import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db

# ─── Test Database Setup ────────────────────────────────────────────────────
# Uses in-memory SQLite for tests — fast, isolated, no Neon dependency
SQLITE_URL = "sqlite:///./test_paysure.db"

engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


def override_get_db():
    """Overrides the real DB session with test SQLite session."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override the real DB dependency with test DB
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Creates all tables at start of test session, drops them at end."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db():
    """Provides a clean DB session per test function."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="session")
def client():
    """Provides a FastAPI TestClient for the entire test session."""
    with TestClient(app) as c:
        yield c


# ─── Reusable Test Data Fixtures ────────────────────────────────────────────

@pytest.fixture(scope="session")
def freelancer_data():
    return {
        "full_name": "Test Freelancer",
        "email": "freelancer@pytest.com",
        "password": "PyTest1234",
        "role": "freelancer"
    }


@pytest.fixture(scope="session")
def client_data():
    return {
        "full_name": "Test Client",
        "email": "client@pytest.com",
        "password": "PyTest1234",
        "role": "client"
    }


@pytest.fixture(scope="session")
def admin_data():
    return {
        "full_name": "Test Admin",
        "email": "admin@pytest.com",
        "password": "PyTest1234",
        "role": "admin"
    }


@pytest.fixture(scope="session")
def registered_freelancer(client, freelancer_data):
    """Registers a freelancer once for the whole test session."""
    response = client.post("/api/v1/auth/register", json=freelancer_data)
    assert response.status_code == 201
    return response.json()["data"]


@pytest.fixture(scope="session")
def registered_client(client, client_data):
    """Registers a client once for the whole test session."""
    response = client.post("/api/v1/auth/register", json=client_data)
    assert response.status_code == 201
    return response.json()["data"]


@pytest.fixture(scope="session")
def registered_admin(client, admin_data):
    """Registers an admin once for the whole test session."""
    response = client.post("/api/v1/auth/register", json=admin_data)
    assert response.status_code == 201
    return response.json()["data"]


@pytest.fixture(scope="session")
def freelancer_token(registered_freelancer):
    """Returns the freelancer's JWT token."""
    return registered_freelancer["access_token"]


@pytest.fixture(scope="session")
def client_token(registered_client):
    """Returns the client's JWT token."""
    return registered_client["access_token"]


@pytest.fixture(scope="session")
def admin_token(registered_admin):
    """Returns the admin's JWT token."""
    return registered_admin["access_token"]


@pytest.fixture(scope="session")
def freelancer_headers(freelancer_token):
    return {"Authorization": f"Bearer {freelancer_token}"}


@pytest.fixture(scope="session")
def client_headers(client_token):
    return {"Authorization": f"Bearer {client_token}"}


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def freelancer_id(registered_freelancer):
    return registered_freelancer["user"]["id"]


@pytest.fixture(scope="session")
def client_user_id(registered_client):
    return registered_client["user"]["id"]