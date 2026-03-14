import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.dispute import DisputeCreate, DisputeResolve, DisputeResponse
from app.services.dispute_service import (
    raise_dispute, resolve_dispute, get_dispute_by_id,
    get_all_disputes, get_disputes_for_user, update_dispute_status,
)
from app.models.dispute import DisputeStatus
from app.core.security import get_current_user, require_role
from app.utils.response import success_response

router = APIRouter(prefix="/disputes", tags=["Disputes"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_dispute(
    data: DisputeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Client raises a dispute against a submitted milestone."""
    dispute = raise_dispute(db, data, raised_by_id=current_user.id)
    return success_response(
        data=DisputeResponse.model_validate(dispute),
        message="Dispute raised — admin will review shortly",
    )


@router.get("/my")
def list_my_disputes(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns all disputes raised by the current user."""
    disputes = get_disputes_for_user(db, current_user.id)
    return success_response(data=[DisputeResponse.model_validate(d) for d in disputes])


@router.get("/")
def list_all_disputes(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Returns all disputes across the platform — admin only."""
    disputes = get_all_disputes(db, skip=skip, limit=limit)
    return success_response(data=[DisputeResponse.model_validate(d) for d in disputes])


@router.get("/{dispute_id}")
def get_single_dispute(
    dispute_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns a single dispute by ID."""
    dispute = get_dispute_by_id(db, dispute_id)
    return success_response(data=DisputeResponse.model_validate(dispute))


@router.post("/{dispute_id}/review")
def mark_under_review(
    dispute_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Admin marks a dispute as under review — OPEN → UNDER_REVIEW."""
    dispute = update_dispute_status(db, dispute_id, DisputeStatus.under_review)
    return success_response(
        data=DisputeResponse.model_validate(dispute),
        message="Dispute marked as under review",
    )


@router.post("/{dispute_id}/resolve")
def resolve_existing_dispute(
    dispute_id: uuid.UUID,
    data: DisputeResolve,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """
    Admin resolves the dispute — either releases payment to
    freelancer or refunds to client, triggering escrow action.
    """
    dispute = resolve_dispute(db, dispute_id, data, admin_id=current_user.id)
    return success_response(
        data=DisputeResponse.model_validate(dispute),
        message="Dispute resolved successfully",
    )