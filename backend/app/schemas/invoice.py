import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from pydantic import BaseModel, field_validator
from app.models.invoice import InvoiceStatus

if TYPE_CHECKING:
    from app.schemas.milestone import MilestoneResponse


# ─── Base ───────────────────────────────────────────────────
class InvoiceBase(BaseModel):
    title: str
    description: str | None = None
    total_amount: float
    currency: str = "INR"
    due_date: datetime | None = None

    @field_validator("total_amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        # Ensures no zero or negative invoice amounts are accepted
        if v <= 0:
            raise ValueError("Total amount must be greater than 0")
        return v


# ─── Create ─────────────────────────────────────────────────
class InvoiceCreate(InvoiceBase):
    freelancer_id: uuid.UUID | None = None  # Can assign freelancer later
    client_id: uuid.UUID | None = None


# ─── Update ─────────────────────────────────────────────────
class InvoiceUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    total_amount: float | None = None
    due_date: datetime | None = None
    freelancer_id: uuid.UUID | None = None
    client_id: uuid.UUID | None = None
    status: InvoiceStatus | None = None


# ─── Response ───────────────────────────────────────────────
class InvoiceResponse(InvoiceBase):
    id: uuid.UUID
    invoice_number: str
    status: InvoiceStatus
    freelancer_id: uuid.UUID | None
    client_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Response with milestones nested ────────────────────────
class InvoiceDetailResponse(InvoiceResponse):
    milestones: list["MilestoneResponse"] = []

    model_config = {"from_attributes": True}