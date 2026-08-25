from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging import logger
from app.core.limiter import limiter  # Defined in core to avoid circular imports
from app.api.v1.routes import api_router
from app.api.v1.webhook import router as webhook_router
from app.utils.exceptions import http_exception_handler, validation_exception_handler


def create_app() -> FastAPI:
    """
    Application factory — creates and configures the FastAPI instance
    with all middleware, routers, and exception handlers attached.
    """
    # Hide interactive docs in production to avoid exposing API schema
    docs_url = "/docs" if settings.DEBUG else None
    redoc_url = "/redoc" if settings.DEBUG else None

    app = FastAPI(
        title=settings.APP_NAME,
        description="Milestone-Based Escrow Payment Protection Platform",
        version="1.0.0",
        docs_url=docs_url,
        redoc_url=redoc_url,
    )

    # ─── Rate Limiter ────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ─── CORS ───────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ─── Exception Handlers ─────────────────────────────────
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    # ─── Routers ────────────────────────────────────────────
    app.include_router(api_router)
    app.include_router(webhook_router)  # bypass Clerk auth middleware

    # ─── Health Check ───────────────────────────────────────
    @app.get("/health", tags=["Health"])
    def health_check():
        """Quick endpoint to verify the server is running."""
        return {"status": "ok", "app": settings.APP_NAME}

    logger.info(f"{settings.APP_NAME} started in {settings.APP_ENV} mode")
    return app


app = create_app()