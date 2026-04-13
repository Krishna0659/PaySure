import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.wallet import WalletTransactionType, WalletTransactionStatus


class WalletResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    balance: float
    escrow_balance: float
    currency: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WalletTransactionResponse(BaseModel):
    id: uuid.UUID
    wallet_id: uuid.UUID
    transaction_type: WalletTransactionType
    amount: float
    currency: str
    invoice_id: uuid.UUID | None
    description: str | None
    status: WalletTransactionStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class DepositRequest(BaseModel):
    amount: float
    currency: str = "INR"
