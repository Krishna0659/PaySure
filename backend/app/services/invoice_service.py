import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
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
    Freelancers see invoices they created; clients see invoices assigned to them.
    """
    if role == UserRole.freelancer:
        return db.query(Invoice).filter(Invoice.freelancer_id == user_id).all()
    elif role == UserRole.client:
        return db.query(Invoice).filter(Invoice.client_id == user_id).all()
    else:
        # Admin sees all invoices
        return db.query(Invoice).all()


def create_invoice(db: Session, data: InvoiceCreate, freelancer_id: uuid.UUID) -> Invoice:
    """Creates a new invoice with an auto-generated invoice number in DRAFT status."""
    invoice = Invoice(
        invoice_number=generate_invoice_number(db),
        title=data.title,
        description=data.description,
        total_amount=data.total_amount,
        currency=data.currency,
        due_date=data.due_date,
        freelancer_id=freelancer_id,
        client_id=data.client_id,
        status=InvoiceStatus.draft,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def update_invoice(db: Session, invoice_id: uuid.UUID, data: InvoiceUpdate, requester_id: uuid.UUID) -> Invoice:
    """
    Updates invoice fields. Only the freelancer who created it
    can update it, and only while it's still in draft/sent state.
    """
    invoice = get_invoice_by_id(db, invoice_id)

    if invoice.freelancer_id != requester_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this invoice")

    if invoice.status not in [InvoiceStatus.draft, InvoiceStatus.sent]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update invoice after funding")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(invoice, field, value)

    db.commit()
    db.refresh(invoice)
    return invoice


def send_invoice(db: Session, invoice_id: uuid.UUID, requester_id: uuid.UUID) -> Invoice:
    """Transitions invoice from DRAFT → SENT so client can review and fund it."""
    invoice = get_invoice_by_id(db, invoice_id)

    if invoice.freelancer_id != requester_id:
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

    if invoice.freelancer_id != requester_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if invoice.status == InvoiceStatus.funded:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel a funded invoice")

    invoice.status = InvoiceStatus.cancelled
    db.commit()
    db.refresh(invoice)
    return invoice