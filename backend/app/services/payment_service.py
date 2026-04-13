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


def get_wallet_summary(db: Session, user_id: uuid.UUID) -> dict:
    """
    Returns aggregated wallet/financial data for a user.
    Client sees: total deposited, total locked, total released.
    Freelancer sees: total earned, in escrow, released payments.
    Works by aggregating across all escrow and payment records tied to the user.
    """
    from app.models.invoice import Invoice
    from app.models.escrow import Escrow
    from app.models.user import User, UserRole
    from sqlalchemy import func

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {}

    if user.role == UserRole.client:
        # Client: their funded escrows
        funded_escrows = (
            db.query(Escrow)
            .join(Invoice, Invoice.id == Escrow.invoice_id)
            .filter(Invoice.client_id == user_id)
            .all()
        )

        total_deposited = sum(float(e.total_amount) for e in funded_escrows if e.status != "created")
        total_released = sum(float(e.released_amount) for e in funded_escrows)
        total_refunded = sum(float(e.refunded_amount) for e in funded_escrows)
        locked = total_deposited - total_released - total_refunded

        # Transaction history: payments on client's escrows
        escrow_ids = [e.id for e in funded_escrows]
        transactions = []
        if escrow_ids:
            transactions = (
                db.query(Payment)
                .filter(Payment.escrow_id.in_(escrow_ids))
                .order_by(Payment.created_at.desc())
                .all()
            )

        return {
            "role": "client",
            "total_deposited": round(total_deposited, 2),
            "locked_in_escrow": round(max(locked, 0.0), 2),
            "total_released": round(total_released, 2),
            "total_refunded": round(total_refunded, 2),
            "transactions": transactions,
        }

    else:
        # Freelancer: invoices where they are the freelancer
        invoices = (
            db.query(Invoice)
            .filter(Invoice.freelancer_id == user_id)
            .all()
        )

        from app.models.milestone import Milestone, MilestoneStatus

        total_earned = 0.0
        in_escrow = 0.0
        total_released = 0.0

        for inv in invoices:
            milestones = db.query(Milestone).filter(Milestone.invoice_id == inv.id).all()
            for m in milestones:
                if m.status == MilestoneStatus.released:
                    total_earned += float(m.amount)
                    total_released += float(m.amount)
                elif m.status in [MilestoneStatus.in_progress, MilestoneStatus.submitted, MilestoneStatus.approved]:
                    in_escrow += float(m.amount)

        # Transaction history: escrow releases on freelancer's invoices
        invoice_ids = [inv.id for inv in invoices]
        transactions = []
        if invoice_ids:
            escrows = db.query(Escrow).filter(Escrow.invoice_id.in_(invoice_ids)).all()
            escrow_ids = [e.id for e in escrows]
            if escrow_ids:
                transactions = (
                    db.query(Payment)
                    .filter(
                        Payment.escrow_id.in_(escrow_ids),
                        Payment.payment_type == PaymentType.release,
                    )
                    .order_by(Payment.created_at.desc())
                    .all()
                )

        return {
            "role": "freelancer",
            "total_earned": round(total_earned, 2),
            "in_escrow": round(in_escrow, 2),
            "total_released": round(total_released, 2),
            "transactions": transactions,
        }