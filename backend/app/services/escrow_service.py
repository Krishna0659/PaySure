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
    Marks escrow as FUNDED after payment is verified.
    Also transitions the invoice to IN_PROGRESS state and locks funds in wallet.
    """
    escrow = get_escrow_by_invoice(db, invoice_id)
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    if escrow.status != EscrowStatus.created:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Escrow already funded")

    escrow.status = EscrowStatus.funded
    escrow.funded_at = datetime.now(timezone.utc)

    # Invoice moves to FUNDED — waiting for freelancer applications
    # (in_progress only happens after a freelancer is accepted)
    invoice.status = InvoiceStatus.funded
    # NOTE: milestones stay PENDING until a freelancer is accepted

    db.commit()
    db.refresh(escrow)

    # Lock funds in client wallet (wallet balance → escrow_balance)
    try:
        from app.services.wallet_service import lock_funds_for_project
        if invoice.client_id:
            lock_funds_for_project(db, invoice.client_id, float(escrow.total_amount), invoice_id)
    except Exception:
        pass  # Wallet update failure must not block the escrow flow

    try:
        from app.services.email_service import notify_payment_confirmed
        notify_payment_confirmed(escrow, invoice)
    except Exception:
        pass

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

    # Move funds from client escrow_balance to freelancer wallet balance
    try:
        from app.services.wallet_service import release_to_freelancer
        invoice = milestone.invoice
        if invoice.client_id and invoice.freelancer_id:
            release_to_freelancer(
                db,
                client_user_id=invoice.client_id,
                freelancer_user_id=invoice.freelancer_id,
                amount=float(milestone.amount),
                invoice_id=invoice.id,
                milestone_title=milestone.title,
            )
    except Exception:
        pass  # Wallet update failure must not block the escrow flow

    try:
        from app.services.email_service import notify_milestone_released
        notify_milestone_released(milestone)
    except Exception:
        pass  # Email failure must never interrupt the primary flow

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

    # Return funds to client wallet
    try:
        from app.services.wallet_service import refund_to_client
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if invoice and invoice.client_id:
            refund_to_client(db, invoice.client_id, amount, invoice_id, reason="Escrow refund")
    except Exception:
        pass  # Wallet update failure must not block the escrow flow

    return escrow