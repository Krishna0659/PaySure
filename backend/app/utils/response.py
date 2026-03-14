from typing import Any


def success_response(data: Any = None, message: str = "Success", status_code: int = 200) -> dict:
    """
    Wraps any data in a consistent success response shape.
    Every API endpoint returns this structure for predictability.
    """
    return {
        "success": True,
        "message": message,
        "data": data,
    }


def paginated_response(data: list, total: int, skip: int, limit: int) -> dict:
    """Returns a paginated response with metadata for list endpoints."""
    return {
        "success": True,
        "data": data,
        "pagination": {
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": (skip + limit) < total,
        },
    }