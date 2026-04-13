# Importing all models here ensures SQLAlchemy and Alembic
# can detect every table when generating/running migrations.

from app.models.user import User, UserRole
from app.models.invoice import Invoice, InvoiceStatus
from app.models.milestone import Milestone, MilestoneStatus
from app.models.escrow import Escrow, EscrowStatus
from app.models.payment import Payment, PaymentType, PaymentStatus
from app.models.dispute import Dispute, DisputeStatus
from app.models.message import Message
from app.models.rating import Rating
from app.models.wallet import Wallet, WalletTransaction, WalletTransactionType, WalletTransactionStatus
from app.models.application import Application, ApplicationStatus

__all__ = [
    "User", "UserRole",
    "Invoice", "InvoiceStatus",
    "Milestone", "MilestoneStatus",
    "Escrow", "EscrowStatus",
    "Payment", "PaymentType", "PaymentStatus",
    "Dispute", "DisputeStatus",
    "Message",
    "Rating",
    "Wallet", "WalletTransaction", "WalletTransactionType", "WalletTransactionStatus",
    "Application", "ApplicationStatus",
]