from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Loads our app settings and all models so Alembic can detect table changes
from app.core.config import settings
from app.db.base import Base

# Import all models — Alembic needs to see them to generate migrations
import app.models  # noqa: F401

# Alembic Config object — provides access to alembic.ini values
config = context.config

# Override sqlalchemy.url with value from our .env file
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Sets up Python logging from alembic.ini config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# This is the metadata Alembic uses to detect model changes for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations without an active DB connection.
    Useful for generating SQL scripts to review before applying.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations with a live DB connection.
    This is what actually creates/alters tables in Neon PostgreSQL.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # NullPool is best for serverless DBs like Neon
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()