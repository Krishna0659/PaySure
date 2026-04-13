import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.session import get_db
from app.core.security import require_role
from app.utils.response import success_response

from app.models.user import User, UserRole
from app.models.invoice import Invoice, InvoiceStatus
from app.models.dispute import Dispute, DisputeStatus
from app.models.payment import Payment, PaymentType, PaymentStatus
from app.models.escrow import Escrow

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
def get_platform_stats(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Returns platform-wide statistics for the admin dashboard."""
    total_users = db.query(func.count(User.id)).scalar()
    total_clients = db.query(func.count(User.id)).filter(User.role == UserRole.client).scalar()
    total_freelancers = db.query(func.count(User.id)).filter(User.role == UserRole.freelancer).scalar()
    total_invoices = db.query(func.count(Invoice.id)).scalar()
    active_invoices = db.query(func.count(Invoice.id)).filter(Invoice.status == InvoiceStatus.in_progress).scalar()
    completed_invoices = db.query(func.count(Invoice.id)).filter(Invoice.status == InvoiceStatus.completed).scalar()

    total_disputes = db.query(func.count(Dispute.id)).scalar()
    open_disputes = db.query(func.count(Dispute.id)).filter(Dispute.status == DisputeStatus.open).scalar()
    review_disputes = db.query(func.count(Dispute.id)).filter(Dispute.status == DisputeStatus.under_review).scalar()

    total_volume = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.captured,
        Payment.payment_type == PaymentType.deposit,
    ).scalar() or 0

    return success_response(data={
        "total_users": total_users,
        "total_clients": total_clients,
        "total_freelancers": total_freelancers,
        "total_invoices": total_invoices,
        "active_invoices": active_invoices,
        "completed_invoices": completed_invoices,
        "total_disputes": total_disputes,
        "open_disputes": open_disputes,
        "review_disputes": review_disputes,
        "total_volume": float(total_volume),
    })


@router.get("/invoices")
def list_all_invoices(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Returns all invoices across the platform — admin view."""
    from app.schemas.invoice import InvoiceResponse
    invoices = db.query(Invoice).order_by(desc(Invoice.created_at)).offset(skip).limit(limit).all()
    return success_response(data=[InvoiceResponse.model_validate(i) for i in invoices])


@router.get("/users")
def list_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Returns all registered users."""
    from app.schemas.user import UserResponse
    users = db.query(User).offset(skip).limit(limit).all()
    return success_response(data=[UserResponse.model_validate(u) for u in users])


@router.get("/transactions")
def list_all_transactions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Returns all payment transactions platform-wide."""
    from app.schemas.payment import PaymentResponse
    payments = db.query(Payment).order_by(desc(Payment.created_at)).offset(skip).limit(limit).all()
    return success_response(data=[PaymentResponse.model_validate(p) for p in payments])


@router.get("/logs")
def get_activity_log(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Returns recent dispute + payment activity as a simple log."""
    from app.schemas.dispute import DisputeResponse
    from app.schemas.payment import PaymentResponse

    recent_disputes = db.query(Dispute).order_by(desc(Dispute.created_at)).limit(limit).all()
    recent_payments = db.query(Payment).order_by(desc(Payment.created_at)).limit(limit).all()

    return success_response(data={
        "recent_disputes": [DisputeResponse.model_validate(d) for d in recent_disputes],
        "recent_payments": [PaymentResponse.model_validate(p) for p in recent_payments],
    })
