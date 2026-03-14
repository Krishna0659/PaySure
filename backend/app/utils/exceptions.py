from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Returns a clean JSON error response for all HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "status_code": exc.status_code,
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Returns readable validation errors when request body
    fails Pydantic schema checks — instead of raw Pydantic output.
    """
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " -> ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
        })
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "Validation failed",
            "details": errors,
        },
    )