import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceDetailResponse
from app.services.invoice_service import (
    create_invoice, get_invoice_by_id, get_invoices_for_user,
    update_invoice, send_invoice, cancel_invoice, terminate_invoice,
)
from app.models.invoice import InvoiceStatus
from app.core.security import get_current_user
from app.utils.response import success_response

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_new_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Creates a new invoice in DRAFT status."""
    invoice = create_invoice(db, data, user_id=current_user.id, role=current_user.role)
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
    """
    Returns a single invoice with milestones, participant info,
    and applies auto-approval checks on submitted milestones.
    """
    invoice = get_invoice_by_id(db, invoice_id)

    # Apply auto-approval checks on all submitted milestones
    from app.services.milestone_service import check_and_apply_auto_approval
    for m in invoice.milestones:
        check_and_apply_auto_approval(db, m)

    # Re-fetch after potential auto-approvals
    db.refresh(invoice)

    detail = InvoiceDetailResponse.model_validate(invoice)

    # Enrich with participant info
    enriched = detail.model_dump()
    enriched["client_name"] = invoice.client.full_name if invoice.client else None
    enriched["client_email"] = invoice.client.email if invoice.client else None
    enriched["freelancer_name"] = invoice.freelancer.full_name if invoice.freelancer else None
    enriched["freelancer_email"] = invoice.freelancer.email if invoice.freelancer else None

    # Escrow info
    if invoice.escrow:
        from app.schemas.escrow import EscrowResponse
        enriched["escrow"] = EscrowResponse.model_validate(invoice.escrow).model_dump()
    else:
        enriched["escrow"] = None

    return success_response(data=enriched)


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


@router.post("/{invoice_id}/terminate")
def terminate_project(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Client terminates an active project. Remaining escrow refunded,
    freelancer keeps approved payments only.
    """
    invoice = terminate_invoice(db, invoice_id, requester_id=current_user.id)
    return success_response(
        data=InvoiceResponse.model_validate(invoice),
        message="Project terminated — remaining funds refunded",
    )


@router.post("/{invoice_id}/fund")
def fund_invoice_directly(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Direct funding endpoint — checks wallet balance, locks funds, creates escrow, and funds it.
    In production, Razorpay webhook also calls fund_escrow after payment capture.
    """
    from app.services.escrow_service import create_escrow, fund_escrow, get_escrow_by_invoice
    from app.services.wallet_service import get_wallet
    from app.schemas.escrow import EscrowCreate
    from fastapi import HTTPException

    invoice = get_invoice_by_id(db, invoice_id)

    if invoice.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the client can fund this invoice")

    if invoice.status not in [InvoiceStatus.draft, InvoiceStatus.sent]:
        raise HTTPException(status_code=400, detail=f"Invoice cannot be funded in status: {invoice.status}")

    # Check wallet balance
    wallet = get_wallet(db, current_user.id)
    required = float(invoice.total_amount)
    if float(wallet.balance) < required:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient wallet balance. Available: ₹{wallet.balance:,.2f}, Required: ₹{required:,.2f}. Please top up your wallet first.",
        )

    # Create escrow if it doesn't exist yet
    try:
        get_escrow_by_invoice(db, invoice_id)
    except HTTPException:
        create_escrow(db, EscrowCreate(
            invoice_id=invoice_id,
            total_amount=required,
            currency=invoice.currency,
        ))

    # Fund the escrow — transitions invoice to in_progress + locks wallet funds
    fund_escrow(db, invoice_id)

    db.refresh(invoice)
    return success_response(
        data=InvoiceResponse.model_validate(invoice),
        message="Project funded successfully — work can now begin",
    )


# Rebuild model to resolve forward references
from app.schemas.milestone import MilestoneResponse
InvoiceDetailResponse.model_rebuild()