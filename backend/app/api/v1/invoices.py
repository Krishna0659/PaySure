import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceDetailResponse
from app.services.invoice_service import (
    create_invoice, get_invoice_by_id, get_invoices_for_user,
    update_invoice, send_invoice, cancel_invoice,
)
from app.core.security import get_current_user
from app.utils.response import success_response

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_new_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Freelancer creates a new invoice in DRAFT status."""
    invoice = create_invoice(db, data, freelancer_id=current_user.id)
    return success_response(
        data=InvoiceResponse.model_validate(invoice),
        message="Invoice created successfully",
    )


@router.get("/")
def list_my_invoices(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns all invoices relevant to the current user based on their role."""
    invoices = get_invoices_for_user(db, current_user.id, current_user.role)
    return success_response(data=[InvoiceResponse.model_validate(i) for i in invoices])


@router.get("/{invoice_id}")
def get_invoice(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns a single invoice with all its milestones nested inside."""
    invoice = get_invoice_by_id(db, invoice_id)
    return success_response(data=InvoiceDetailResponse.model_validate(invoice))


@router.put("/{invoice_id}")
def update_existing_invoice(
    invoice_id: uuid.UUID,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Freelancer updates invoice details — only allowed in draft/sent state."""
    invoice = update_invoice(db, invoice_id, data, requester_id=current_user.id)
    return success_response(
        data=InvoiceResponse.model_validate(invoice),
        message="Invoice updated successfully",
    )


@router.post("/{invoice_id}/send")
def send_invoice_to_client(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Freelancer sends invoice to client — transitions DRAFT → SENT."""
    invoice = send_invoice(db, invoice_id, requester_id=current_user.id)
    return success_response(
        data=InvoiceResponse.model_validate(invoice),
        message="Invoice sent to client",
    )


@router.post("/{invoice_id}/cancel")
def cancel_existing_invoice(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Cancels an invoice — only before it's funded."""
    invoice = cancel_invoice(db, invoice_id, requester_id=current_user.id)
    return success_response(
        data=InvoiceResponse.model_validate(invoice),
        message="Invoice cancelled",
    )

# Add this at the very BOTTOM of app/api/v1/invoices.py
from app.schemas.milestone import MilestoneResponse
InvoiceDetailResponse.model_rebuild()