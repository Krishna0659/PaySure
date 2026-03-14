import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.milestone import Milestone, MilestoneStatus
from app.schemas.milestone import MilestoneCreate, MilestoneUpdate


def get_milestone_by_id(db: Session, milestone_id: uuid.UUID) -> Milestone:
    """Fetches milestone by UUID — raises 404 if not found."""
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
    return milestone


def get_milestones_for_invoice(db: Session, invoice_id: uuid.UUID) -> list[Milestone]:
    """Returns all milestones for a given invoice, ordered by their sequence number."""
    return (
        db.query(Milestone)
        .filter(Milestone.invoice_id == invoice_id)
        .order_by(Milestone.order)
        .all()
    )


def create_milestone(db: Session, data: MilestoneCreate) -> Milestone:
    """Creates a new milestone linked to an invoice in PENDING state."""
    milestone = Milestone(
        invoice_id=data.invoice_id,
        title=data.title,
        description=data.description,
        order=data.order,
        amount=data.amount,
        due_date=data.due_date,
        status=MilestoneStatus.pending,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


def update_milestone(db: Session, milestone_id: uuid.UUID, data: MilestoneUpdate) -> Milestone:
    """Updates milestone fields — only allowed while still in pending/in_progress state."""
    milestone = get_milestone_by_id(db, milestone_id)

    if milestone.status not in [MilestoneStatus.pending, MilestoneStatus.in_progress]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit milestone after submission",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(milestone, field, value)

    db.commit()
    db.refresh(milestone)
    return milestone


def submit_milestone(db: Session, milestone_id: uuid.UUID, freelancer_id: uuid.UUID) -> Milestone:
    """
    Freelancer marks milestone as submitted.
    Transitions: IN_PROGRESS → SUBMITTED
    """
    milestone = get_milestone_by_id(db, milestone_id)

    # Verify the freelancer owns this milestone's invoice
    if milestone.invoice.freelancer_id != freelancer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if milestone.status != MilestoneStatus.in_progress:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only in-progress milestones can be submitted",
        )

    milestone.status = MilestoneStatus.submitted
    milestone.submitted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(milestone)
    return milestone


def approve_milestone(db: Session, milestone_id: uuid.UUID, client_id: uuid.UUID) -> Milestone:
    """
    Client approves submitted milestone work.
    Transitions: SUBMITTED → APPROVED
    Payment release is handled separately in escrow_service.
    """
    milestone = get_milestone_by_id(db, milestone_id)

    if milestone.invoice.client_id != client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if milestone.status != MilestoneStatus.submitted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only submitted milestones can be approved",
        )

    milestone.status = MilestoneStatus.approved
    milestone.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(milestone)
    return milestone


def dispute_milestone(db: Session, milestone_id: uuid.UUID, client_id: uuid.UUID) -> Milestone:
    """
    Client raises a dispute on a submitted milestone.
    Transitions: SUBMITTED → DISPUTED
    """
    milestone = get_milestone_by_id(db, milestone_id)

    if milestone.invoice.client_id != client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if milestone.status != MilestoneStatus.submitted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only submitted milestones can be disputed",
        )

    milestone.status = MilestoneStatus.disputed
    db.commit()
    db.refresh(milestone)
    return milestone