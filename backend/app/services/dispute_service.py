import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.dispute import Dispute, DisputeStatus
from app.models.milestone import MilestoneStatus
from app.schemas.dispute import DisputeCreate, DisputeResolve
from app.services.escrow_service import release_milestone_payment, refund_escrow


def get_dispute_by_id(db: Session, dispute_id: uuid.UUID) -> Dispute:
    """Fetches dispute by UUID — raises 404 if not found."""
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")
    return dispute


def get_all_disputes(db: Session, skip: int = 0, limit: int = 50) -> list[Dispute]:
    """Returns all disputes — admin dashboard view."""
    return db.query(Dispute).offset(skip).limit(limit).all()


def get_disputes_for_user(db: Session, user_id: uuid.UUID) -> list[Dispute]:
    """Returns disputes raised by a specific user."""
    return db.query(Dispute).filter(Dispute.raised_by_id == user_id).all()


def raise_dispute(db: Session, data: DisputeCreate, raised_by_id: uuid.UUID) -> Dispute:
    """
    Client raises a dispute against a submitted milestone.
    Checks that no existing dispute already exists for this milestone.
    """
    from app.models.user import User, UserRole
    current_user = db.query(User).filter(User.id == raised_by_id).first()
    if not current_user or current_user.role != UserRole.client:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can raise disputes"
        )
    # Prevent duplicate disputes on the same milestone
    existing = db.query(Dispute).filter(Dispute.milestone_id == data.milestone_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A dispute already exists for this milestone",
        )

    dispute = Dispute(
        milestone_id=data.milestone_id,
        raised_by_id=raised_by_id,
        reason=data.reason,
        description=data.description,
        status=DisputeStatus.open,
    )
    db.add(dispute)
    db.commit()
    db.refresh(dispute)

    try:
        from app.services.email_service import notify_dispute_raised
        notify_dispute_raised(dispute)
    except Exception:
        pass  # Email failure must never interrupt the primary flow

    return dispute


def resolve_dispute(
    db: Session,
    dispute_id: uuid.UUID,
    data: DisputeResolve,
    admin_id: uuid.UUID,
) -> Dispute:
    """
    Admin resolves a dispute by deciding to either:
    - release payment to freelancer (resolved_release)
    - refund payment to client (resolved_refund)
    Triggers the appropriate escrow action automatically.
    """
    dispute = get_dispute_by_id(db, dispute_id)

    if dispute.status not in [DisputeStatus.open, DisputeStatus.under_review]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dispute is already resolved or closed",
        )

    if data.status not in [DisputeStatus.resolved_release, DisputeStatus.resolved_refund]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resolution must be either resolved_release or resolved_refund",
        )

    milestone = dispute.milestone

    if data.status == DisputeStatus.resolved_release:
        # Admin sides with freelancer — approve and release payment
        milestone.status = MilestoneStatus.approved
        db.commit()
        release_milestone_payment(db, milestone.id)

    elif data.status == DisputeStatus.resolved_refund:
        # Admin sides with client — refund milestone amount
        milestone.status = MilestoneStatus.refunded
        db.commit()
        refund_escrow(db, milestone.invoice_id, float(milestone.amount))

    # Update dispute record
    # Record decision in admin_notes prefix, set final status to resolved
    decision_prefix = f"[{data.status}] "
    dispute.admin_notes = decision_prefix + (data.admin_notes or "")
    dispute.status = DisputeStatus.resolved
    dispute.admin_notes = data.admin_notes
    dispute.resolved_by_id = admin_id
    dispute.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(dispute)
    return dispute


def update_dispute_status(db: Session, dispute_id: uuid.UUID, new_status: DisputeStatus) -> Dispute:
    """Admin moves dispute to under_review state while investigating."""
    dispute = get_dispute_by_id(db, dispute_id)
    dispute.status = new_status
    db.commit()
    db.refresh(dispute)
    return dispute