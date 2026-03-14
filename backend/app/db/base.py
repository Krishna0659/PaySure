from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    All SQLAlchemy models inherit from this Base.
    It keeps all model metadata in one registry,
    which Alembic uses to auto-generate migrations.
    """
    pass