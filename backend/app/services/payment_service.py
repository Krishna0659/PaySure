import uuid
import hmac
import hashlib
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.payment import Payment, PaymentType, PaymentStatus
from app.models.escrow import Escrow
from app.schemas.payment import PaymentOrderCreate, PaymentVerify
from app.core.config import settings
from app.services.escrow_service import get_escrow_by_invoice, create_escrow, fund_escrow
from app.schemas.escrow import EscrowCreate


def get_razorpay_client():
    """
    Lazily initializes the Razorpay client using keys from settings.
    Returns None if keys are not yet configured (sandbox placeholder).
    """
    if (not settings.RAZORPAY_KEY_ID or 
        not settings.RAZORPAY_KEY_SECRET or
        settings.RAZORPAY_KEY_ID == "your_razorpay_test_key_id" or
        settings.RAZORPAY_KEY_SECRET == "your_razorpay_test_key_secret"):
        return None
    try:
        import razorpay
        return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    except Exception:
        return None


def create_payment_order(db: Session, data: PaymentOrderCreate, client_id: uuid.UUID) -> dict:
    """
    Creates a Razorpay order for the invoice total amount.
    Also creates the escrow record if it doesn't exist yet.
    Returns the Razorpay order details needed by the frontend.
    """
    # Get or create escrow for this invoice
    try:
        escrow = get_escrow_by_invoice(db, data.invoice_id)
    except HTTPException:
        escrow = create_escrow(db, EscrowCreate(
            invoice_id=data.invoice_id,
            total_amount=data.amount,
            currency=data.currency,
        ))

    razorpay_client = get_razorpay_client()

    # If Razorpay not configured, return mock order for development
    if not razorpay_client:
        mock_order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
        payment = Payment(
            escrow_id=escrow.id,
            razorpay_order_id=mock_order_id,
            amount=data.amount,
            currency=data.currency,
            payment_type=PaymentType.deposit,
            status=PaymentStatus.pending,
            notes="Mock order — Razorpay not configured",
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return {
            "razorpay_order_id": mock_order_id,
            "amount": data.amount,
            "currency": data.currency,
            "payment_id": payment.id,
        }

    # Real Razorpay order — amount in paise (multiply by 100)
    order = razorpay_client.order.create({
        "amount": int(data.amount * 100),
        "currency": data.currency,
        "payment_capture": 1,
    })

    payment = Payment(
        escrow_id=escrow.id,
        razorpay_order_id=order["id"],
        amount=data.amount,
        currency=data.currency,
        payment_type=PaymentType.deposit,
        status=PaymentStatus.pending,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return {
        "razorpay_order_id": order["id"],
        "amount": data.amount,
        "currency": data.currency,
        "payment_id": payment.id,
    }


def verify_payment(db: Session, data: PaymentVerify) -> Payment:
    """
    Verifies Razorpay payment signature to prevent tampering.
    On success, marks payment as captured and funds the escrow.
    """
    payment = db.query(Payment).filter(Payment.id == data.payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment record not found")

    # Signature verification using HMAC-SHA256
    body = f"{data.razorpay_order_id}|{data.razorpay_payment_id}"
    expected_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        body.encode(),
        hashlib.sha256,
    ).hexdigest()

    # Skip verification in dev if using mock orders
    is_mock = payment.notes and "Mock order" in payment.notes

    if not is_mock and expected_signature != data.razorpay_signature:
        payment.status = PaymentStatus.failed
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment signature verification failed")

    # Mark payment as captured
    payment.razorpay_payment_id = data.razorpay_payment_id
    payment.razorpay_signature = data.razorpay_signature
    payment.status = PaymentStatus.captured

    db.commit()

    # Fund the escrow — activates the project
    fund_escrow(db, payment.escrow.invoice_id)

    db.refresh(payment)
    return payment


def get_payments_for_escrow(db: Session, escrow_id: uuid.UUID) -> list[Payment]:
    """Returns all payment records linked to an escrow — for audit trail."""
    return db.query(Payment).filter(Payment.escrow_id == escrow_id).all()