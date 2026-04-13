import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_service import get_user_by_id, update_user, get_all_users
from app.core.security import get_current_user, require_role
from app.utils.response import success_response

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me")
def get_my_profile(current_user=Depends(get_current_user)):
    """Returns the currently authenticated user's profile."""
    return success_response(data=UserResponse.model_validate(current_user))


from app.schemas.dashboard import DashboardResponse
from app.services.dashboard_service import get_dashboard_data

@router.get("/me/dashboard", response_model=dict)
def get_my_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Returns aggregated dashboard stats and recent lists."""
    data = get_dashboard_data(db, current_user)
    return success_response(data=DashboardResponse.model_validate(data).model_dump())


@router.put("/me")
def update_my_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Updates the currently authenticated user's profile fields.
    
    ROLE PROTECTION: Role can ONLY be set during onboarding (is_onboarded=False).
    Once onboarded, role changes are rejected to prevent accidental flipping.
    """
    # If user is already onboarded, strip any role change from the update
    if current_user.is_onboarded and data.role is not None:
        data.role = None  # Silently ignore — role is locked after onboarding
    
    user = update_user(db, current_user.id, data)
    return success_response(
        data=UserResponse.model_validate(user),
        message="Profile updated successfully",
    )


@router.get("/{user_id}")
def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Fetches any user by ID — admin only."""
    user = get_user_by_id(db, user_id)
    return success_response(data=UserResponse.model_validate(user))


@router.get("/")
def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Returns paginated list of all users — admin only."""
    users = get_all_users(db, skip=skip, limit=limit)
    return success_response(data=[UserResponse.model_validate(u) for u in users])