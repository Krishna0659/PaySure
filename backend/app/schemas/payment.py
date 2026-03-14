import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.payment import PaymentType, PaymentStatus


# ─── Create Razorpay Order (client initiates payment) ───────
class PaymentOrderCreate(BaseModel):
    invoice_id: uuid.UUID
    amount: float
    currency: str = "INR"


# ─── Razorpay Order Response (returned to frontend) ─────────
class PaymentOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: float
    currency: str
    payment_id: uuid.UUID  # Our internal payment record ID


# ─── Verify Payment (frontend sends back after Razorpay success) ─
class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    payment_id: uuid.UUID  # Our internal payment record ID


# ─── Response ───────────────────────────────────────────────
class PaymentResponse(BaseModel):
    id: uuid.UUID
    escrow_id: uuid.UUID
    razorpay_order_id: str | None
    razorpay_payment_id: str | None
    amount: float
    currency: str
    payment_type: PaymentType
    status: PaymentStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}