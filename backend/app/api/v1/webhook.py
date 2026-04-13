import json

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.db.session import get_db
from app.services.webhook_service import (
    handle_payment_captured,
    handle_payment_failed,
    handle_refund_processed,
    verify_razorpay_signature,
)

router = APIRouter()

EVENT_HANDLERS = {
    "payment.captured": handle_payment_captured,
    "payment.failed": handle_payment_failed,
    "refund.processed": handle_refund_processed,
}


@router.post("/payments/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    # Read raw body BEFORE any JSON parsing (required for signature verification)
    raw_body = await request.body()

    try:
        # 1. Reject if webhook secret is not configured
        if not settings.RAZORPAY_WEBHOOK_SECRET:
            return Response(status_code=503)

        # 2. Require signature header
        signature = request.headers.get("X-Razorpay-Signature")
        if not signature:
            return Response(
                content='{"detail":"Missing signature header"}',
                status_code=400,
                media_type="application/json",
            )

        # 3. Verify signature
        if not verify_razorpay_signature(raw_body, settings.RAZORPAY_WEBHOOK_SECRET, signature):
            return Response(
                content='{"detail":"Signature verification failed"}',
                status_code=400,
                media_type="application/json",
            )

        # 4. Parse payload and dispatch to handler
        payload = json.loads(raw_body)
        event = payload.get("event")

        handler = EVENT_HANDLERS.get(event)
        if handler is None:
            logger.info(f"razorpay_webhook: unknown event type '{event}' — ignoring")
            return {"status": "ignored"}

        result = handler(db, payload)
        return result

    except Exception as exc:
        logger.error(f"razorpay_webhook: unexpected error — {exc}", exc_info=True)
        return {"status": "ok"}
