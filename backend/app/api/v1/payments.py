import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.payment import PaymentOrderCreate, PaymentVerify, PaymentResponse
from app.services.payment_service import (
    create_payment_order, verify_payment, get_payments_for_escrow,
    get_wallet_summary,
)
from app.core.security import get_current_user
from app.utils.response import success_response

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/summary")
def wallet_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns wallet summary for the current user based on their role.
    Client: total deposited, locked, released, refunded.
    Freelancer: total earned, in escrow, released.
    """
    summary = get_wallet_summary(db, current_user.id)
    # Serialize transactions
    txns = summary.pop("transactions", [])
    summary["transactions"] = [PaymentResponse.model_validate(t).model_dump() for t in txns]
    return success_response(data=summary)


@router.post("/create-order")
def initiate_payment(
    data: PaymentOrderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Client initiates payment for an invoice.
    Creates a Razorpay order and returns order details to the frontend.
    """
    order = create_payment_order(db, data, client_id=current_user.id)
    return success_response(
        data=order,
        message="Payment order created — complete payment on frontend",
    )


@router.post("/verify")
def confirm_payment(
    data: PaymentVerify,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Frontend sends Razorpay callback data here for verification.
    On success, escrow is funded and project activates.
    """
    payment = verify_payment(db, data)
    return success_response(
        data=PaymentResponse.model_validate(payment),
        message="Payment verified — escrow funded successfully",
    )


@router.get("/escrow/{escrow_id}")
def get_payment_history(
    escrow_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns full payment history for an escrow — audit trail."""
    payments = get_payments_for_escrow(db, escrow_id)
    return success_response(data=[PaymentResponse.model_validate(p) for p in payments])