import uuid
from datetime import datetime
from pydantic import BaseModel


class MessageCreate(BaseModel):
    invoice_id: uuid.UUID
    content: str
    file_url: str | None = None
    file_name: str | None = None


class MessageResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str | None = None
    sender_role: str | None = None
    content: str
    file_url: str | None
    file_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
