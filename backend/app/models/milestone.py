import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Numeric, DateTime, ForeignKey, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.base import Base


class MilestoneStatus(str, enum.Enum):
    pending = "pending"         # Not yet started
    in_progress = "in_progress" # Freelancer working on it
    submitted = "submitted"     # Freelancer marked as done
    approved = "approved"       # Client approved
    disputed = "disputed"       # Client raised dispute
    released = "released"       # Payment released to freelancer
    refunded = "refunded"       # Payment refunded to client


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Order of this milestone within the invoice (1, 2, 3...)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    status: Mapped[MilestoneStatus] = mapped_column(
        SAEnum(MilestoneStatus, name="milestonestatus"),
        nullable=False,
        default=MilestoneStatus.pending,
    )

    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Timestamps for state transitions — used for audit trail
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="milestones")
    dispute: Mapped["Dispute | None"] = relationship(
        "Dispute", back_populates="milestone", uselist=False
    )

    def __repr__(self) -> str:
        return f"<Milestone {self.title} - {self.status}>"