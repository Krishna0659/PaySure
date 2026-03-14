from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.core.config import settings


# Creates the actual connection to Neon PostgreSQL using the DATABASE_URL from .env
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # Checks connection health before using it from pool
    pool_size=5,              # Max 5 persistent connections in the pool
    max_overflow=10,          # Up to 10 extra connections allowed under heavy load
    echo=settings.DEBUG,      # Logs all SQL queries to console in DEBUG mode
)

# Factory that creates new Session objects bound to our engine
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,   # We manually commit transactions for safety
    autoflush=False,    # We manually flush to control when changes hit the DB
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency — yields a DB session per request
    and guarantees it closes even if an error occurs.
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()