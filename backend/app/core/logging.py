import logging
import sys
from app.core.config import settings


def setup_logging() -> logging.Logger:
    """
    Configures the root logger with a clean format.
    DEBUG level in development, INFO level in production.
    Returns a named logger for use across the app.
    """
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),  # Prints to console
        ],
    )

    # Silence noisy third-party loggers in production
    if not settings.DEBUG:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    logger = logging.getLogger("paysure")
    logger.info(f"Logging initialized — level: {'DEBUG' if settings.DEBUG else 'INFO'}")
    return logger


# Single shared logger instance — import this everywhere
logger = setup_logging()