import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.rating import RatingCreate, RatingResponse
from app.services.rating_service import (
    create_rating, get_rating_for_invoice, get_freelancer_avg_rating,
)
from app.core.security import get_current_user
from app.utils.response import success_response

router = APIRouter(prefix="/ratings", tags=["Ratings"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def submit_rating(
    data: RatingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Client rates freelancer after project completion."""
    rating = create_rating(db, data, client_id=current_user.id)
    return success_response(
        data=RatingResponse.model_validate(rating),
        message="Rating submitted successfully",
    )


@router.get("/invoice/{invoice_id}")
def get_invoice_rating(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns the rating for a given invoice project."""
    rating = get_rating_for_invoice(db, invoice_id)
    if not rating:
        return success_response(data=None, message="No rating yet")
    return success_response(data=RatingResponse.model_validate(rating))


@router.get("/freelancer/{freelancer_id}")
def get_freelancer_rating(
    freelancer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns average rating and count for a freelancer."""
    stats = get_freelancer_avg_rating(db, freelancer_id)
    return success_response(data=stats)
