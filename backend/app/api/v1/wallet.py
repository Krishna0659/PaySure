from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.schemas.wallet import WalletResponse, WalletTransactionResponse, DepositRequest
from app.services.wallet_service import (
    get_wallet, deposit_to_wallet, get_wallet_transactions,
)
from app.utils.response import success_response

router = APIRouter(prefix="/wallet", tags=["Wallet"])


@router.get("")
def get_my_wallet(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns the current user's wallet balance and escrow balance."""
    wallet = get_wallet(db, current_user.id)
    return success_response(data=WalletResponse.model_validate(wallet))


@router.post("/deposit")
def deposit_funds(
    data: DepositRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Simulates a Razorpay deposit — adds funds to the user's wallet balance.
    In production this would be triggered by the Razorpay webhook after payment.
    """
    wallet = deposit_to_wallet(db, current_user.id, data.amount)
    return success_response(
        data=WalletResponse.model_validate(wallet),
        message=f"₹{data.amount:,.2f} added to your wallet",
    )


@router.get("/transactions")
def list_transactions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns the current user's wallet transaction history."""
    txns = get_wallet_transactions(db, current_user.id)
    return success_response(
        data=[WalletTransactionResponse.model_validate(t) for t in txns]
    )
