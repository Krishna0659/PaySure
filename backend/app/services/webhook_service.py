import hmac
import hashlib
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.payment import Payment, PaymentStatus
from app.services.escrow_service import fund_escrow
from app.core.logging import logger


def verify_razorpay_signature(raw_body: bytes, secret: str, signature: str) -> bool:
    """
    Verify Razorpay webhook signature using HMAC-SHA256.
    Uses constant-time comparison to prevent timing attacks.
    """
    expected = hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def handle_payment_captured(db: Session, payload: dict) -> dict:
    """
    Idempotent handler for payment.captured events.
    Looks up Payment by razorpay_order_id, funds escrow if pending.
    """
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = entity.get("order_id")
    payment_id = entity.get("id")

    payment = db.query(Payment).filter(Payment.razorpay_order_id == order_id).first()

    if not payment:
        logger.info(f"payment.captured: no Payment found for order_id={order_id}")
        return {"status": "ignored", "reason": "order not found"}

    if payment.status == PaymentStatus.captured:
        logger.info(f"payment.captured: already processed for order_id={order_id}")
        return {"status": "already_processed"}

    # Update payment record
    payment.razorpay_payment_id = payment_id
    payment.status = PaymentStatus.captured
    payment.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(payment)

    # Fund the escrow
    invoice_id = payment.escrow.invoice_id
    try:
        fund_escrow(db, invoice_id)
    except HTTPException as exc:
        if "already funded" in str(exc.detail).lower():
            logger.warning(
                f"payment.captured: escrow already funded for invoice_id={invoice_id}"
            )
        else:
            raise

    return {"status": "ok"}


def handle_payment_failed(db: Session, payload: dict) -> dict:
    """
    Idempotent handler for payment.failed events.
    Sets Payment status to failed if currently pending.
    """
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = entity.get("order_id")

    payment = db.query(Payment).filter(Payment.razorpay_order_id == order_id).first()

    if not payment:
        logger.info(f"payment.failed: no Payment found for order_id={order_id}")
        return {"status": "ignored", "reason": "order not found"}

    if payment.status in (PaymentStatus.failed, PaymentStatus.captured):
        logger.info(f"payment.failed: already processed for order_id={order_id}")
        return {"status": "already_processed"}

    payment.status = PaymentStatus.failed
    payment.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"status": "ok"}


def handle_refund_processed(db: Session, payload: dict) -> dict:
    """
    Handler for refund.processed events.
    Looks up Payment by razorpay_payment_id and sets status to refunded.
    """
    entity = payload.get("payload", {}).get("refund", {}).get("entity", {})
    payment_id = entity.get("payment_id")

    payment = db.query(Payment).filter(Payment.razorpay_payment_id == payment_id).first()

    if not payment:
        logger.info(f"refund.processed: no Payment found for payment_id={payment_id}")
        return {"status": "ignored", "reason": "payment not found"}

    payment.status = PaymentStatus.refunded
    payment.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"status": "ok"}
