from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import logger
from app.api.v1.routes import api_router
from app.api.v1.webhook import router as webhook_router
from app.utils.exceptions import http_exception_handler, validation_exception_handler


def create_app() -> FastAPI:
    """
    Application factory — creates and configures the FastAPI instance
    with all middleware, routers, and exception handlers attached.
    """
    app = FastAPI(
        title=settings.APP_NAME,
        description="Milestone-Based Escrow Payment Protection Platform",
        version="1.0.0",
        docs_url="/docs",       # Swagger UI
        redoc_url="/redoc",     # ReDoc UI
    )

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