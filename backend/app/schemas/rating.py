import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator


class RatingCreate(BaseModel):
    invoice_id: uuid.UUID
    rating: int
    review: str | None = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class RatingResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    client_id: uuid.UUID
    freelancer_id: uuid.UUID
    rating: int
    review: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
