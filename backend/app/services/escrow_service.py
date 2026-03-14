import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.escrow import Escrow, EscrowStatus
from app.models.milestone import Milestone, MilestoneStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.schemas.escrow import EscrowCreate


def get_escrow_by_invoice(db: Session, invoice_id: uuid.UUID) -> Escrow:
    """Fetches the escrow record linked to a specific invoice."""
    escrow = db.query(Escrow).filter(Escrow.invoice_id == invoice_id).first()
    if not escrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escrow not found for this invoice")
    return escrow


def get_escrow_by_id(db: Session, escrow_id: uuid.UUID) -> Escrow:
    """Fetches escrow by its own UUID."""
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    if not escrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escrow not found")
    return escrow


def create_escrow(db: Session, data: EscrowCreate) -> Escrow:
    """
    Creates an escrow record for an invoice.
    Called internally when client initiates payment — not directly by API.
    """
    # Prevent duplicate escrow records for the same invoice
    existing = db.query(Escrow).filter(Escrow.invoice_id == data.invoice_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Escrow already exists for this invoice")

    escrow = Escrow(
        invoice_id=data.invoice_id,
        total_amount=data.total_amount,
        currency=data.currency,
        status=EscrowStatus.created,
    )
    db.add(escrow)
    db.commit()
    db.refresh(escrow)
    return escrow


def fund_escrow(db: Session, invoice_id: uuid.UUID) -> Escrow:
    """
    Marks escrow as FUNDED after Razorpay payment is verified.
    Also transitions the invoice to IN_PROGRESS state.
    """
    escrow = get_escrow_by_invoice(db, invoice_id)
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    if escrow.status != EscrowStatus.created:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Escrow already funded")

    escrow.status = EscrowStatus.funded
    escrow.funded_at = datetime.now(timezone.utc)

    # Move invoice to in_progress and first milestone to in_progress
    invoice.status = InvoiceStatus.in_progress
    first_milestone = (
        db.query(Milestone)
        .filter(Milestone.invoice_id == invoice_id)
        .order_by(Milestone.order)
        .first()
    )
    if first_milestone:
        first_milestone.status = MilestoneStatus.in_progress

    db.commit()
    db.refresh(escrow)
    return escrow


def release_milestone_payment(db: Session, milestone_id: uuid.UUID) -> Escrow:
    """
    Releases payment for an approved milestone.
    Transitions: APPROVED → RELEASED
    Updates escrow released_amount and checks if fully released.
    """
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")

    if milestone.status != MilestoneStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Milestone must be approved before payment release",
        )

    escrow = get_escrow_by_invoice(db, milestone.invoice_id)

    if escrow.status not in [EscrowStatus.funded, EscrowStatus.partially_released]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Escrow is not in a releasable state")

    # Update milestone state
    milestone.status = MilestoneStatus.released
    milestone.released_at = datetime.now(timezone.utc)

    # Update escrow amounts
    escrow.released_amount = float(escrow.released_amount) + float(milestone.amount)

    # Activate next pending milestone automatically
    next_milestone = (
        db.query(Milestone)
        .filter(
            Milestone.invoice_id == milestone.invoice_id,
            Milestone.status == MilestoneStatus.pending,
        )
        .order_by(Milestone.order)
        .first()
    )
    if next_milestone:
        next_milestone.status = MilestoneStatus.in_progress
        escrow.status = EscrowStatus.partially_released
    else:
        # No more milestones — escrow fully released
        escrow.status = EscrowStatus.fully_released
        escrow.fully_released_at = datetime.now(timezone.utc)
        milestone.invoice.status = InvoiceStatus.completed

    db.commit()
    db.refresh(escrow)
    return escrow


def refund_escrow(db: Session, invoice_id: uuid.UUID, amount: float) -> Escrow:
    """
    Processes a refund back to the client.
    Called by admin after dispute resolution in client's favor.
    """
    escrow = get_escrow_by_invoice(db, invoice_id)

    remaining = float(escrow.total_amount) - float(escrow.released_amount) - float(escrow.refunded_amount)

    if amount > remaining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Refund amount exceeds available escrow balance of {remaining}",
        )

    escrow.refunded_amount = float(escrow.refunded_amount) + amount
    escrow.status = EscrowStatus.refunded

    db.commit()
    db.refresh(escrow)
    return escrow