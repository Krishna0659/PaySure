import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.escrow import EscrowResponse
from app.services.escrow_service import (
    get_escrow_by_invoice, get_escrow_by_id, release_milestone_payment,
)
from app.core.security import get_current_user, require_role
from app.utils.response import success_response

router = APIRouter(prefix="/escrow", tags=["Escrow"])


@router.get("/invoice/{invoice_id}")
def get_escrow_status(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns the escrow record for a given invoice including amounts and status."""
    escrow = get_escrow_by_invoice(db, invoice_id)
    return success_response(data=EscrowResponse.model_validate(escrow))


@router.get("/{escrow_id}")
def get_escrow_by_id_route(
    escrow_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns a single escrow record by its own UUID."""
    escrow = get_escrow_by_id(db, escrow_id)
    return success_response(data=EscrowResponse.model_validate(escrow))


@router.post("/release/{milestone_id}")
def release_payment(
    milestone_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Releases escrow payment for an approved milestone.
    Called after client approves — APPROVED → RELEASED.
    """
    escrow = release_milestone_payment(db, milestone_id)
    return success_response(
        data=EscrowResponse.model_validate(escrow),
        message="Payment released to freelancer successfully",
    )