import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.wallet import Wallet, WalletTransaction, WalletTransactionType, WalletTransactionStatus
from app.models.user import User
from app.core.logging import logger


# ─── Get or create wallet ────────────────────────────────────────────────────

def get_or_create_wallet(db: Session, user_id: uuid.UUID) -> Wallet:
    """Returns the user's wallet, creating one if it doesn't exist yet."""
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        wallet = Wallet(
            user_id=user_id,
            balance=0.00,
            escrow_balance=0.00,
            currency="INR",
        )
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet


def get_wallet(db: Session, user_id: uuid.UUID) -> Wallet:
    """Returns wallet or raises 404."""
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        # Auto-create on first access
        return get_or_create_wallet(db, user_id)
    return wallet


# ─── Deposit ─────────────────────────────────────────────────────────────────

def deposit_to_wallet(db: Session, user_id: uuid.UUID, amount: float) -> Wallet:
    """
    Simulates a deposit (e.g. Razorpay top-up).
    Increases wallet.balance and records a WalletTransaction.
    """
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Deposit amount must be greater than 0")

    wallet = get_or_create_wallet(db, user_id)
    wallet.balance = float(wallet.balance) + amount
    wallet.updated_at = datetime.now(timezone.utc)

    txn = WalletTransaction(
        wallet_id=wallet.id,
        transaction_type=WalletTransactionType.deposit,
        amount=amount,
        currency=wallet.currency,
        description=f"Wallet top-up of ₹{amount:,.2f}",
        status=WalletTransactionStatus.completed,
    )
    db.add(txn)
    db.commit()
    db.refresh(wallet)
    return wallet


# ─── Fund project (wallet → escrow) ──────────────────────────────────────────

def lock_funds_for_project(
    db: Session,
    user_id: uuid.UUID,
    amount: float,
    invoice_id: uuid.UUID,
) -> Wallet:
    """
    Deducts amount from wallet.balance and adds to wallet.escrow_balance.
    Called when a client funds a project.
    Raises 400 if insufficient balance.
    """
    wallet = get_or_create_wallet(db, user_id)

    if float(wallet.balance) < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient wallet balance. Available: ₹{wallet.balance:,.2f}, Required: ₹{amount:,.2f}",
        )

    wallet.balance = float(wallet.balance) - amount
    wallet.escrow_balance = float(wallet.escrow_balance) + amount
    wallet.updated_at = datetime.now(timezone.utc)

    txn = WalletTransaction(
        wallet_id=wallet.id,
        transaction_type=WalletTransactionType.escrow_lock,
        amount=amount,
        currency=wallet.currency,
        invoice_id=invoice_id,
        description=f"Escrow locked for project",
        status=WalletTransactionStatus.completed,
    )
    db.add(txn)
    db.commit()
    db.refresh(wallet)
    return wallet


# ─── Release milestone payment (escrow → freelancer wallet) ──────────────────

def release_to_freelancer(
    db: Session,
    client_user_id: uuid.UUID,
    freelancer_user_id: uuid.UUID,
    amount: float,
    invoice_id: uuid.UUID,
    milestone_title: str = "",
) -> tuple[Wallet, Wallet]:
    """
    Moves amount from client's escrow_balance to freelancer's wallet balance.
    Returns (client_wallet, freelancer_wallet).
    """
    client_wallet = get_or_create_wallet(db, client_user_id)
    freelancer_wallet = get_or_create_wallet(db, freelancer_user_id)

    # Deduct from client escrow
    client_wallet.escrow_balance = max(0.0, float(client_wallet.escrow_balance) - amount)
    client_wallet.updated_at = datetime.now(timezone.utc)

    client_txn = WalletTransaction(
        wallet_id=client_wallet.id,
        transaction_type=WalletTransactionType.escrow_lock,
        amount=amount,
        currency=client_wallet.currency,
        invoice_id=invoice_id,
        description=f"Milestone released: {milestone_title}",
        status=WalletTransactionStatus.completed,
    )
    db.add(client_txn)

    # Credit freelancer wallet
    freelancer_wallet.balance = float(freelancer_wallet.balance) + amount
    freelancer_wallet.updated_at = datetime.now(timezone.utc)

    freelancer_txn = WalletTransaction(
        wallet_id=freelancer_wallet.id,
        transaction_type=WalletTransactionType.release,
        amount=amount,
        currency=freelancer_wallet.currency,
        invoice_id=invoice_id,
        description=f"Payment received: {milestone_title}",
        status=WalletTransactionStatus.completed,
    )
    db.add(freelancer_txn)

    db.commit()
    db.refresh(client_wallet)
    db.refresh(freelancer_wallet)
    return client_wallet, freelancer_wallet


# ─── Refund (escrow → client wallet) ─────────────────────────────────────────

def refund_to_client(
    db: Session,
    client_user_id: uuid.UUID,
    amount: float,
    invoice_id: uuid.UUID,
    reason: str = "Project refund",
) -> Wallet:
    """
    Returns locked escrow funds back to client's available balance.
    Called on project termination or dispute resolution in client's favour.
    """
    wallet = get_or_create_wallet(db, client_user_id)

    wallet.escrow_balance = max(0.0, float(wallet.escrow_balance) - amount)
    wallet.balance = float(wallet.balance) + amount
    wallet.updated_at = datetime.now(timezone.utc)

    txn = WalletTransaction(
        wallet_id=wallet.id,
        transaction_type=WalletTransactionType.refund,
        amount=amount,
        currency=wallet.currency,
        invoice_id=invoice_id,
        description=reason,
        status=WalletTransactionStatus.completed,
    )
    db.add(txn)
    db.commit()
    db.refresh(wallet)
    return wallet


# ─── Read ─────────────────────────────────────────────────────────────────────

def get_wallet_transactions(
    db: Session,
    user_id: uuid.UUID,
    limit: int = 50,
) -> list[WalletTransaction]:
    """Returns the user's transaction history, newest first."""
    wallet = get_or_create_wallet(db, user_id)
    return (
        db.query(WalletTransaction)
        .filter(WalletTransaction.wallet_id == wallet.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(limit)
        .all()
    )
