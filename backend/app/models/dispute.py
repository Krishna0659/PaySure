import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.base import Base


class DisputeStatus(str, enum.Enum):
    open = "open"
    under_review = "under_review"
    resolved_release = "resolved_release"   # Admin's decision: pay freelancer
    resolved_refund = "resolved_refund"     # Admin's decision: refund client
    resolved = "resolved"                   # Final status after resolution
    closed = "closed"


class Dispute(Base):
    __tablename__ = "disputes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Dispute is always tied to a specific milestone
    milestone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("milestones.id"), unique=True, nullable=False
    )

    # Who raised it
    raised_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[DisputeStatus] = mapped_column(
        SAEnum(DisputeStatus, name="disputestatus"),
        nullable=False,
        default=DisputeStatus.open,
    )

    # Admin resolution notes
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    milestone: Mapped["Milestone"] = relationship("Milestone", back_populates="dispute")
    raised_by: Mapped["User"] = relationship("User", foreign_keys=[raised_by_id])
    resolved_by: Mapped["User | None"] = relationship("User", foreign_keys=[resolved_by_id])

    def __repr__(self) -> str:
        return f"<Dispute {self.id} - {self.status}>"