import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.base import Base


class UserRole(str, enum.Enum):
    freelancer = "freelancer"
    client = "client"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    # Primary key — uses UUID for security (no sequential ID guessing)
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Clerk user ID — links our DB user to Clerk's auth system
    clerk_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)

    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_onboarded: Mapped[bool] = mapped_column(Boolean, server_default="false", default=False)

    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="userrole"), nullable=False, default=UserRole.freelancer
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    invoices_created: Mapped[list["Invoice"]] = relationship(
        "Invoice", foreign_keys="Invoice.freelancer_id", back_populates="freelancer"
    )
    invoices_received: Mapped[list["Invoice"]] = relationship(
        "Invoice", foreign_keys="Invoice.client_id", back_populates="client"
    )
    wallet: Mapped["Wallet | None"] = relationship(
        "Wallet", back_populates="user", uselist=False
    )

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"