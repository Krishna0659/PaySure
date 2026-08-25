import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.user import UserRole


# ─── Base ───────────────────────────────────────────────────
class UserBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    role: UserRole = UserRole.freelancer
    is_onboarded: bool = False


# ─── Create (Registration) ──────────────────────────────────
class UserCreate(UserBase):
    # Password is optional — users logging in via Clerk won't need it
    password: str = Field(..., min_length=8, max_length=128)


# ─── Self-Update (PUT /users/me) ────────────────────────────
# Deliberately excludes is_active to prevent self-deactivation.
# Role is handled separately via onboarding logic in the route.
class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    role: UserRole | None = None
    is_onboarded: bool | None = None
    # NOTE: is_active intentionally omitted — users cannot deactivate their own account.
    # Admins use AdminUserUpdate for account status changes.


# ─── Admin-Update (PUT /users/{id}) — admin use only ────────
class AdminUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    role: UserRole | None = None
    is_onboarded: bool | None = None
    is_active: bool | None = None  # Only admins can activate/deactivate accounts


# ─── Response (what API returns) ────────────────────────────
class UserResponse(UserBase):
    id: uuid.UUID
    clerk_id: str | None = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Short version for nesting inside other responses ───────
class UserShort(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    role: UserRole

    model_config = {"from_attributes": True}