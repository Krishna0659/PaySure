import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator
from app.models.milestone import MilestoneStatus


# ─── Base ───────────────────────────────────────────────────
class MilestoneBase(BaseModel):
    title: str
    description: str | None = None
    order: int = 1
    amount: float
    due_date: datetime | None = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Milestone amount must be greater than 0")
        return v


# ─── Create ─────────────────────────────────────────────────
class MilestoneCreate(MilestoneBase):
    invoice_id: uuid.UUID


# ─── Update ─────────────────────────────────────────────────
class MilestoneUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    order: int | None = None
    amount: float | None = None
    due_date: datetime | None = None
    status: MilestoneStatus | None = None


# ─── Status Transition (freelancer submits / client approves) ─
class MilestoneStatusUpdate(BaseModel):
    # Used for explicit state transitions — submit, approve, dispute
    status: MilestoneStatus


# ─── Response ───────────────────────────────────────────────
class MilestoneResponse(MilestoneBase):
    id: uuid.UUID
    invoice_id: uuid.UUID
    status: MilestoneStatus
    submitted_at: datetime | None
    approved_at: datetime | None
    released_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}