import uuid
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.milestone import MilestoneCreate, MilestoneUpdate, MilestoneResponse
from app.services.milestone_service import (
    create_milestone, get_milestone_by_id, get_milestones_for_invoice,
    update_milestone, submit_milestone, approve_milestone, dispute_milestone,
    reject_milestone, check_and_apply_auto_approval,
)
from app.services.escrow_service import release_milestone_payment
from app.core.security import get_current_user
from app.utils.response import success_response

router = APIRouter(prefix="/milestones", tags=["Milestones"])


class RejectBody(BaseModel):
    feedback: str | None = None


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_new_milestone(
    data: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Freelancer adds a milestone to an invoice."""
    milestone = create_milestone(db, data)
    return success_response(
        data=MilestoneResponse.model_validate(milestone),
        message="Milestone created successfully",
    )


@router.get("/invoice/{invoice_id}")
def list_milestones(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns all milestones for a given invoice in order."""
    milestones = get_milestones_for_invoice(db, invoice_id)
    return success_response(data=[MilestoneResponse.model_validate(m) for m in milestones])


@router.get("/{milestone_id}")
def get_single_milestone(
    milestone_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns a single milestone by ID."""
    milestone = get_milestone_by_id(db, milestone_id)
    return success_response(data=MilestoneResponse.model_validate(milestone))


@router.put("/{milestone_id}")
def update_existing_milestone(
    milestone_id: uuid.UUID,
    data: MilestoneUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Updates milestone details — only in pending/in_progress state."""
    milestone = update_milestone(db, milestone_id, data)
    return success_response(
        data=MilestoneResponse.model_validate(milestone),
        message="Milestone updated",
    )


@router.post("/{milestone_id}/submit")
def submit_work(
    milestone_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Freelancer marks milestone work as submitted — IN_PROGRESS → SUBMITTED."""
    milestone = submit_milestone(db, milestone_id, freelancer_id=current_user.id)
    return success_response(
        data=MilestoneResponse.model_validate(milestone),
        message="Milestone submitted for review",
    )


@router.post("/{milestone_id}/approve")
def approve_work(
    milestone_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Client approves submitted milestone — SUBMITTED → APPROVED."""
    milestone = approve_milestone(db, milestone_id, client_id=current_user.id)
    return success_response(
        data=MilestoneResponse.model_validate(milestone),
        message="Milestone approved",
    )


@router.post("/{milestone_id}/dispute")
def dispute_work(
    milestone_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Client raises a dispute on submitted work — SUBMITTED → DISPUTED."""
    milestone = dispute_milestone(db, milestone_id, client_id=current_user.id)
    return success_response(
        data=MilestoneResponse.model_validate(milestone),
        message="Dispute raised — admin will review",
    )


@router.post("/{milestone_id}/reject")
def reject_work(
    milestone_id: uuid.UUID,
    data: RejectBody = RejectBody(),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Client rejects submitted milestone — SUBMITTED → IN_PROGRESS (rework)."""
    milestone = reject_milestone(
        db, milestone_id, client_id=current_user.id, feedback=data.feedback
    )
    return success_response(
        data=MilestoneResponse.model_validate(milestone),
        message="Milestone rejected — freelancer must resubmit",
    )


@router.post("/{milestone_id}/release")
def release_payment(
    milestone_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Approve + release payment for milestone in one step.
    SUBMITTED → APPROVED → RELEASED with escrow payment.
    """
    # Approve first if still submitted
    milestone = get_milestone_by_id(db, milestone_id)
    from app.models.milestone import MilestoneStatus
    if milestone.status == MilestoneStatus.submitted:
        milestone = approve_milestone(db, milestone_id, client_id=current_user.id)

    # Then release
    escrow = release_milestone_payment(db, milestone_id)
    milestone = get_milestone_by_id(db, milestone_id)
    return success_response(
        data=MilestoneResponse.model_validate(milestone),
        message="Payment released to freelancer",
    )