import uuid
from datetime import datetime
from pydantic import BaseModel, computed_field
from app.models.escrow import EscrowStatus


# ─── Create (internal — created when invoice is funded) ─────
class EscrowCreate(BaseModel):
    invoice_id: uuid.UUID
    total_amount: float
    currency: str = "INR"


# ─── Update (internal — updated on release/refund) ──────────
class EscrowUpdate(BaseModel):
    status: EscrowStatus | None = None
    released_amount: float | None = None
    refunded_amount: float | None = None
    funded_at: datetime | None = None
    fully_released_at: datetime | None = None


# ─── Response ───────────────────────────────────────────────
class EscrowResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    total_amount: float
    released_amount: float
    refunded_amount: float
    currency: str
    status: EscrowStatus
    funded_at: datetime | None
    fully_released_at: datetime | None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def remaining_amount(self) -> float:
        # Dynamically calculates how much is still locked in escrow
        return round(self.total_amount - self.released_amount - self.refunded_amount, 2)

    model_config = {"from_attributes": True}