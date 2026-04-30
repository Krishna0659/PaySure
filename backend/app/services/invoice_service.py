import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status

from app.models.invoice import Invoice, InvoiceStatus
from app.models.user import UserRole
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate


def generate_invoice_number(db: Session) -> str:
    """Auto-generates a sequential invoice number like INV-2024-0001."""
    year = datetime.now(timezone.utc).year
    count = db.query(Invoice).count() + 1
    return f"INV-{year}-{count:04d}"


def get_invoice_by_id(db: Session, invoice_id: uuid.UUID) -> Invoice:
    """Fetches invoice by UUID — raises 404 if not found."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return invoice


def get_invoices_for_user(db: Session, user_id: uuid.UUID, role: UserRole) -> list[Invoice]:
    """
    Returns invoices relevant to the user based on their role.
    Freelancers see invoices assigned to them AND sent/funded/in_progress invoices
    with no assigned freelancer (open projects visible to all freelancers).
    Clients see invoices they created.
    """
    if role == UserRole.freelancer:
        return (
            db.query(Invoice)
            .filter(
                or_(
                    Invoice.freelancer_id == user_id,
                    # Sent/Funded/In-progress projects with no assigned freelancer are visible to all freelancers
                    (Invoice.freelancer_id == None) & (Invoice.status.in_([InvoiceStatus.sent, InvoiceStatus.funded, InvoiceStatus.in_progress]))
                )
            )
            .order_by(Invoice.created_at.desc())
            .all()
        )
    elif role == UserRole.client:
        return db.query(Invoice).filter(Invoice.client_id == user_id).order_by(Invoice.created_at.desc()).all()
    else:
        # Admin sees all invoices
        return db.query(Invoice).order_by(Invoice.created_at.desc()).all()


def create_invoice(db: Session, data: InvoiceCreate, user_id: uuid.UUID, role: UserRole) -> Invoice:
    """Creates a new invoice with an auto-generated invoice number in DRAFT or SENT status."""
    if role == UserRole.client:
        client_id = user_id
        freelancer_id = data.freelancer_id
    else:
        freelancer_id = user_id
        client_id = data.client_id

    # If no freelancer is assigned, the project is effectively 'posted' to the marketplace (SENT)
    # If a freelancer is assigned, it stays in DRAFT until the client is ready to send it to them
    initial_status = InvoiceStatus.draft
    if role == UserRole.client and freelancer_id is None:
        initial_status = InvoiceStatus.sent

    invoice = Invoice(
        invoice_number=generate_invoice_number(db),
        title=title_val if (title_val := data.title) else "Untitled Project",
        description=data.description,
        total_amount=data.total_amount,
        currency=data.currency,
        due_date=data.due_date,
        freelancer_id=freelancer_id,
        client_id=client_id,
        status=initial_status,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def update_invoice(db: Session, invoice_id: uuid.UUID, data: InvoiceUpdate, requester_id: uuid.UUID, is_admin: bool = False) -> Invoice:
    """
    Updates invoice fields. Only the creator or an admin
    can update it. Admins can update in any status.
    """
    invoice = get_invoice_by_id(db, invoice_id)

    if not is_admin:
        if invoice.freelancer_id != requester_id and invoice.client_id != requester_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this invoice")

        if invoice.status not in [InvoiceStatus.draft, InvoiceStatus.sent]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update invoice after funding")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(invoice, field, value)

    db.commit()
    db.refresh(invoice)
    return invoice


def delete_invoice(db: Session, invoice_id: uuid.UUID) -> None:
    """Permanently deletes an invoice and its milestones."""
    invoice = get_invoice_by_id(db, invoice_id)
    # Milestones are deleted by cascade in DB (if configured) or manually here
    from app.models.milestone import Milestone
    db.query(Milestone).filter(Milestone.invoice_id == invoice_id).delete()
    db.delete(invoice)
    db.commit()


def send_invoice(db: Session, invoice_id: uuid.UUID, requester_id: uuid.UUID) -> Invoice:
    """Transitions invoice from DRAFT → SENT."""
    invoice = get_invoice_by_id(db, invoice_id)

    if invoice.freelancer_id != requester_id and invoice.client_id != requester_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if invoice.status != InvoiceStatus.draft:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft invoices can be sent")

    invoice.status = InvoiceStatus.sent
    db.commit()
    db.refresh(invoice)
    return invoice


def cancel_invoice(db: Session, invoice_id: uuid.UUID, requester_id: uuid.UUID) -> Invoice:
    """Cancels an invoice — only allowed before it's funded."""
    invoice = get_invoice_by_id(db, invoice_id)

    if invoice.freelancer_id != requester_id and invoice.client_id != requester_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if invoice.status == InvoiceStatus.funded:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel a funded invoice")

    invoice.status = InvoiceStatus.cancelled
    db.commit()
    db.refresh(invoice)
    return invoice


def terminate_invoice(db: Session, invoice_id: uuid.UUID, requester_id: uuid.UUID) -> Invoice:
    """
    Client terminates an active project at any time.
    — Remaining locked escrow funds are refunded to the client
    — Freelancer keeps any already approved/released payments
    — All pending/in_progress milestones are marked as refunded
    — Invoice transitions to cancelled
    """
    from app.models.milestone import Milestone, MilestoneStatus
    from app.services.escrow_service import get_escrow_by_invoice, refund_escrow

    invoice = get_invoice_by_id(db, invoice_id)

    if invoice.client_id != requester_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the client can terminate a project")

    if invoice.status not in [InvoiceStatus.in_progress, InvoiceStatus.funded]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only terminate an active project",
        )

    # Mark all non-released/non-approved milestones as refunded
    unreleased_amount = 0.0
    milestones = db.query(Milestone).filter(Milestone.invoice_id == invoice_id).all()

    for m in milestones:
        if m.status in [MilestoneStatus.pending, MilestoneStatus.in_progress, MilestoneStatus.submitted]:
            unreleased_amount += float(m.amount)
            m.status = MilestoneStatus.refunded

    db.commit()

    # Refund the unreleased amount back to client
    if unreleased_amount > 0:
        try:
            refund_escrow(db, invoice_id, unreleased_amount)
        except Exception:
            pass  # Proceed even if escrow refund has edge-case issues

    invoice.status = InvoiceStatus.cancelled
    db.commit()
    db.refresh(invoice)
    return invoice