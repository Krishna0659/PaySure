import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.application import ApplicationStatus


class ApplicationCreate(BaseModel):
    invoice_id: uuid.UUID
    proposal_text: str | None = None


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    freelancer_id: uuid.UUID
    proposal_text: str | None
    status: ApplicationStatus
    created_at: datetime
    updated_at: datetime
    # Enriched fields
    freelancer_name: str | None = None
    freelancer_email: str | None = None

    model_config = {"from_attributes": True}
