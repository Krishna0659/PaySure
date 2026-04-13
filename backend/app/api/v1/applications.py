import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.schemas.application import ApplicationCreate, ApplicationResponse
from app.services.application_service import (
    apply_to_invoice,
    get_applications_for_invoice,
    get_my_applications,
    approve_application,
    reject_application,
)
from app.utils.response import success_response

router = APIRouter(prefix="/applications", tags=["Applications"])


def _enrich(app) -> dict:
    """Add freelancer name/email to application response."""
    data = ApplicationResponse.model_validate(app).model_dump()
    data["freelancer_name"] = app.freelancer.full_name if app.freelancer else None
    data["freelancer_email"] = app.freelancer.email if app.freelancer else None
    return data


@router.post("/")
def apply(
    data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Freelancer applies to a funded project."""
    application = apply_to_invoice(
        db,
        invoice_id=data.invoice_id,
        freelancer_id=current_user.id,
        proposal_text=data.proposal_text,
    )
    return success_response(data=_enrich(application), message="Application submitted successfully")


@router.get("/mine")
def my_applications(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Freelancer views their own applications."""
    apps = get_my_applications(db, current_user.id)
    return success_response(data=[_enrich(a) for a in apps])


@router.get("/invoice/{invoice_id}")
def invoice_applications(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Client views all applications for their invoice."""
    apps = get_applications_for_invoice(db, invoice_id, current_user.id)
    return success_response(data=[_enrich(a) for a in apps])


@router.post("/{application_id}/approve")
def approve(
    application_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Client approves an application — assigns freelancer and starts project."""
    application = approve_application(db, application_id, current_user.id)
    return success_response(data=_enrich(application), message="Application approved — project is now in progress")


@router.post("/{application_id}/reject")
def reject(
    application_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Client rejects an application."""
    application = reject_application(db, application_id, current_user.id)
    return success_response(data=_enrich(application), message="Application rejected")
