import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Numeric, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.base import Base


class PaymentType(str, enum.Enum):
    deposit = "deposit"       # Client funding escrow
    release = "release"       # Releasing to freelancer
    refund = "refund"         # Returning to client


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    captured = "captured"     # Razorpay confirmed the payment
    failed = "failed"
    refunded = "refunded"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    escrow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("escrow.id"), nullable=False
    )

    # Razorpay identifiers for tracking and verification
    razorpay_order_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    razorpay_signature: Mapped[str | None] = mapped_column(String(512), nullable=True)

    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR")

    payment_type: Mapped[PaymentType] = mapped_column(
        SAEnum(PaymentType, name="paymenttype"), nullable=False
    )
    status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus, name="paymentstatus"),
        nullable=False,
        default=PaymentStatus.pending,
    )

    # Optional notes — useful for audit trail
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    escrow: Mapped["Escrow"] = relationship("Escrow", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment {self.razorpay_payment_id} - {self.status}>"