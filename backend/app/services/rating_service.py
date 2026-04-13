import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sqlalchemy import func

from app.models.rating import Rating
from app.schemas.rating import RatingCreate


def create_rating(
    db: Session, data: RatingCreate, client_id: uuid.UUID
) -> Rating:
    """
    Client submits a rating after project completion.
    Only one rating per invoice is allowed.
    """
    from app.models.invoice import Invoice, InvoiceStatus

    invoice = db.query(Invoice).filter(Invoice.id == data.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    if invoice.client_id != client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the client can rate")

    if invoice.status != InvoiceStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only rate completed projects",
        )

    if not invoice.freelancer_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No freelancer assigned")

    # Prevent duplicate ratings
    existing = db.query(Rating).filter(Rating.invoice_id == data.invoice_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already rated this project")

    rating = Rating(
        invoice_id=data.invoice_id,
        client_id=client_id,
        freelancer_id=invoice.freelancer_id,
        rating=data.rating,
        review=data.review,
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


def get_rating_for_invoice(db: Session, invoice_id: uuid.UUID) -> Rating | None:
    """Returns the rating for a given invoice, or None if not yet rated."""
    return db.query(Rating).filter(Rating.invoice_id == invoice_id).first()


def get_freelancer_avg_rating(db: Session, freelancer_id: uuid.UUID) -> dict:
    """Returns average rating and count for a freelancer."""
    result = db.query(
        func.avg(Rating.rating).label("average"),
        func.count(Rating.id).label("count"),
    ).filter(Rating.freelancer_id == freelancer_id).first()

    avg = round(float(result.average), 1) if result.average else None
    return {"average": avg, "count": result.count or 0}
