import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Numeric, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.base import Base


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    funded = "funded"       # Client has deposited into escrow
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    disputed = "disputed"


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Human-readable invoice number e.g. INV-2024-001
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Total amount for the entire project
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR")

    status: Mapped[InvoiceStatus] = mapped_column(
        SAEnum(InvoiceStatus, name="invoicestatus"),
        nullable=False,
        default=InvoiceStatus.draft,
    )

    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Foreign Keys — who created it and who needs to pay
    freelancer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    freelancer: Mapped["User"] = relationship(
        "User", foreign_keys=[freelancer_id], back_populates="invoices_created"
    )
    client: Mapped["User"] = relationship(
        "User", foreign_keys=[client_id], back_populates="invoices_received"
    )
    milestones: Mapped[list["Milestone"]] = relationship(
        "Milestone", back_populates="invoice", cascade="all, delete-orphan"
    )
    escrow: Mapped["Escrow | None"] = relationship(
        "Escrow", back_populates="invoice", uselist=False
    )
    applications: Mapped[list["Application"]] = relationship(
        "Application", back_populates="invoice", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Invoice {self.invoice_number} - {self.status}>"