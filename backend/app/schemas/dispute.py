import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.dispute import DisputeStatus


# ─── Raise a Dispute (client raises against a milestone) ────
class DisputeCreate(BaseModel):
    milestone_id: uuid.UUID
    reason: str
    description: str | None = None


# ─── Admin resolves the dispute ─────────────────────────────
class DisputeResolve(BaseModel):
    status: DisputeStatus  # resolved_release or resolved_refund
    admin_notes: str | None = None


# ─── Update ─────────────────────────────────────────────────
class DisputeUpdate(BaseModel):
    status: DisputeStatus | None = None
    admin_notes: str | None = None


# ─── Response ───────────────────────────────────────────────
class DisputeResponse(BaseModel):
    id: uuid.UUID
    milestone_id: uuid.UUID
    raised_by_id: uuid.UUID
    reason: str
    description: str | None
    status: DisputeStatus
    admin_notes: str | None
    resolved_by_id: uuid.UUID | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}