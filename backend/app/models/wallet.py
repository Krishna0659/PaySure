import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Numeric, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.base import Base


class WalletTransactionType(str, enum.Enum):
    deposit = "deposit"           # Client adds money to wallet
    escrow_lock = "escrow_lock"   # Client funds a project (wallet → escrow)
    release = "release"           # Freelancer receives milestone payment
    refund = "refund"             # Escrow returned to client wallet


class WalletTransactionStatus(str, enum.Enum):
    completed = "completed"
    pending = "pending"
    failed = "failed"


class Wallet(Base):
    __tablename__ = "wallets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False
    )

    # Available balance — can be used to fund projects
    balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)

    # Funds locked in active project escrows
    escrow_balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)

    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="wallet")
    transactions: Mapped[list["WalletTransaction"]] = relationship(
        "WalletTransaction", back_populates="wallet",
        cascade="all, delete-orphan", order_by="WalletTransaction.created_at.desc()"
    )

    def __repr__(self) -> str:
        return f"<Wallet user={self.user_id} balance={self.balance} escrow={self.escrow_balance}>"


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wallets.id"), nullable=False
    )

    transaction_type: Mapped[WalletTransactionType] = mapped_column(
        SAEnum(WalletTransactionType, name="wallettransactiontype"), nullable=False
    )

    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)

    # Optional link to the invoice this transaction relates to
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=True
    )

    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    status: Mapped[WalletTransactionStatus] = mapped_column(
        SAEnum(WalletTransactionStatus, name="wallettransactionstatus"),
        nullable=False,
        default=WalletTransactionStatus.completed,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    wallet: Mapped["Wallet"] = relationship("Wallet", back_populates="transactions")
    invoice: Mapped["Invoice | None"] = relationship("Invoice")

    def __repr__(self) -> str:
        return f"<WalletTransaction {self.transaction_type} {self.amount}>"
