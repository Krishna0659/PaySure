import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Numeric, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.base import Base


class EscrowStatus(str, enum.Enum):
    created = "created"       # Escrow record initialized
    funded = "funded"         # Client deposited funds
    partially_released = "partially_released"  # Some milestones paid out
    fully_released = "fully_released"          # All milestones paid out
    refunded = "refunded"     # Funds returned to client
    disputed = "disputed"     # Under admin review


class Escrow(Base):
    __tablename__ = "escrow"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # One escrow per invoice
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), unique=True, nullable=False
    )

    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    released_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00)
    refunded_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00)

    # Remaining = total - released - refunded (computed in service layer)
    currency: Mapped[str] = mapped_column(String(10), default="INR")

    status: Mapped[EscrowStatus] = mapped_column(
        SAEnum(EscrowStatus, name="escrowstatus"),
        nullable=False,
        default=EscrowStatus.created,
    )

    funded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fully_released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="escrow")
    payments: Mapped[list["Payment"]] = relationship(
        "Payment", back_populates="escrow", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Escrow {self.id} - {self.status} - {self.total_amount}>"