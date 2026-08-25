"""
PaySure Test Configuration
===========================
Since PaySure uses Clerk for authentication, tests use deterministic test tokens
(e.g., test_token_freelancer, test_token_client, test_token_admin) which decode_clerk_token
resolves to persistent test users in the test database.

This enables end-to-end testing of:
    - HTTP Authorization headers
    - Token validation & rejection
    - Database user lookups
    - Role-based access control (RBAC)
    - Full multi-user escrow, payment, and dispute workflows
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.security import hash_password
from app.core.limiter import limiter
from app.models.user import User, UserRole

# Disable rate limiting during automated test suite execution
limiter.enabled = False

# ─── Test Database Setup ────────────────────────────────────────────────────
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
    """Provides a clean DB session per test function with rollback isolation."""
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


# ─── User Creation Helpers ──────────────────────────────────────────────────

def make_user(
    db,
    email: str,
    role: UserRole,
    full_name: str = "Test User",
    password: str = "TestPassword123!",
    clerk_id: str | None = None,
    is_onboarded: bool = True,
    is_active: bool = True,
    is_verified: bool = True,
) -> User:
    """Creates a user directly in the test DB."""
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return existing

    user = User(
        id=uuid.uuid4(),
        clerk_id=clerk_id or f"test_clerk_{uuid.uuid4().hex[:8]}",
        full_name=full_name,
        email=email,
        role=role,
        hashed_password=hash_password(password),
        is_onboarded=is_onboarded,
        is_active=is_active,
        is_verified=is_verified,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ─── Session-Scoped Test Users ─────────────────────────────────────────────

@pytest.fixture(scope="session")
def session_db():
    """Provides a session-scoped DB for creating persistent test users."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session")
def freelancer_user(session_db):
    """A freelancer user that persists for the whole test session."""
    return make_user(
        session_db,
        email="freelancer@example.com",
        role=UserRole.freelancer,
        full_name="Test Freelancer",
        clerk_id="test_clerk_freelancer",
    )


@pytest.fixture(scope="session")
def client_user(session_db):
    """A client user that persists for the whole test session."""
    return make_user(
        session_db,
        email="client@example.com",
        role=UserRole.client,
        full_name="Test Client",
        clerk_id="test_clerk_client",
    )


@pytest.fixture(scope="session")
def admin_user(session_db):
    """An admin user that persists for the whole test session."""
    return make_user(
        session_db,
        email="admin@example.com",
        role=UserRole.admin,
        full_name="Test Admin",
        clerk_id="test_clerk_admin",
    )


# ─── Auth Headers Fixtures ──────────────────────────────────────────────────

@pytest.fixture(scope="session")
def freelancer_headers(freelancer_user):
    return {"Authorization": "Bearer test_token_freelancer"}


@pytest.fixture(scope="session")
def client_headers(client_user):
    return {"Authorization": "Bearer test_token_client"}


@pytest.fixture(scope="session")
def admin_headers(admin_user):
    return {"Authorization": "Bearer test_token_admin"}


# ─── Context Fixtures ───────────────────────────────────────────────────────

@pytest.fixture
def as_freelancer(client, freelancer_headers):
    return client, freelancer_headers


@pytest.fixture
def as_client_user(client, client_headers):
    return client, client_headers


@pytest.fixture
def as_admin(client, admin_headers):
    return client, admin_headers


@pytest.fixture
def no_auth(client):
    return client


# ─── Test Data Dict Fixtures ────────────────────────────────────────────────

@pytest.fixture(scope="session")
def freelancer_data():
    return {
        "full_name": "Test Freelancer",
        "email": "freelancer@example.com",
        "password": "TestPassword123!",
        "role": "freelancer",
    }


@pytest.fixture(scope="session")
def client_data():
    return {
        "full_name": "Test Client",
        "email": "client@example.com",
        "password": "TestPassword123!",
        "role": "client",
    }


@pytest.fixture(scope="session")
def admin_data():
    return {
        "full_name": "Test Admin",
        "email": "admin@example.com",
        "password": "TestPassword123!",
        "role": "admin",
    }


# ─── ID Fixtures ────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def freelancer_id(freelancer_user):
    return str(freelancer_user.id)


@pytest.fixture(scope="session")
def client_user_id(client_user):
    return str(client_user.id)


@pytest.fixture(scope="session")
def admin_user_id(admin_user):
    return str(admin_user.id)