import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.application import Application, ApplicationStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.milestone import Milestone, MilestoneStatus
from app.models.user import User, UserRole
from app.core.logging import logger


def apply_to_invoice(
    db: Session,
    invoice_id: uuid.UUID,
    freelancer_id: uuid.UUID,
    proposal_text: str | None,
) -> Application:
    """
    Freelancer applies to a funded project.
    Rules:
    - Invoice must be FUNDED
    - No duplicate applications from same freelancer
    - Project must not already be IN_PROGRESS
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status != InvoiceStatus.funded:
        if invoice.status == InvoiceStatus.in_progress:
            raise HTTPException(status_code=400, detail="Project already assigned to a freelancer")
        raise HTTPException(status_code=400, detail=f"Cannot apply to a project in status: {invoice.status}")

    # Prevent client from applying to their own project
    if invoice.client_id == freelancer_id:
        raise HTTPException(status_code=403, detail="You cannot apply to your own project")

    # Prevent duplicate applications
    existing = db.query(Application).filter(
        Application.invoice_id == invoice_id,
        Application.freelancer_id == freelancer_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this project")

    application = Application(
        invoice_id=invoice_id,
        freelancer_id=freelancer_id,
        proposal_text=proposal_text,
        status=ApplicationStatus.pending,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def get_applications_for_invoice(
    db: Session,
    invoice_id: uuid.UUID,
    requester_id: uuid.UUID,
) -> list[Application]:
    """
    Returns all applications for an invoice.
    Only the client who owns the invoice can see all applications.
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.client_id != requester_id:
        # Check if admin
        user = db.query(User).filter(User.id == requester_id).first()
        if not user or user.role != UserRole.admin:
            raise HTTPException(status_code=403, detail="Only the client can view applications")

    return (
        db.query(Application)
        .filter(Application.invoice_id == invoice_id)
        .order_by(Application.created_at.asc())
        .all()
    )


def get_my_applications(db: Session, freelancer_id: uuid.UUID) -> list[Application]:
    """Returns all applications submitted by a freelancer."""
    return (
        db.query(Application)
        .filter(Application.freelancer_id == freelancer_id)
        .order_by(Application.created_at.desc())
        .all()
    )


def approve_application(
    db: Session,
    application_id: uuid.UUID,
    client_id: uuid.UUID,
) -> Application:
    """
    Client approves one application:
    1. Set application.status = ACCEPTED
    2. Set invoice.freelancer_id = freelancer_id
    3. Set invoice.status = IN_PROGRESS
    4. Activate first milestone
    5. Reject ALL other pending applications automatically
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    invoice = application.invoice
    if invoice.client_id != client_id:
        raise HTTPException(status_code=403, detail="Only the project client can approve applications")

    if invoice.status != InvoiceStatus.funded:
        raise HTTPException(status_code=400, detail=f"Cannot approve application — project is {invoice.status}")

    if application.status != ApplicationStatus.pending:
        raise HTTPException(status_code=400, detail=f"Application is already {application.status}")

    # Accept this application
    application.status = ApplicationStatus.accepted
    application.updated_at = datetime.now(timezone.utc)

    # Assign freelancer and activate project
    invoice.freelancer_id = application.freelancer_id
    invoice.status = InvoiceStatus.in_progress

    # Activate first milestone
    first_milestone = (
        db.query(Milestone)
        .filter(Milestone.invoice_id == invoice.id)
        .order_by(Milestone.order)
        .first()
    )
    if first_milestone:
        first_milestone.status = MilestoneStatus.in_progress

    db.commit()

    # Reject all other pending applications
    db.query(Application).filter(
        Application.invoice_id == invoice.id,
        Application.id != application_id,
        Application.status == ApplicationStatus.pending,
    ).update(
        {"status": ApplicationStatus.rejected, "updated_at": datetime.now(timezone.utc)},
        synchronize_session=False,
    )
    db.commit()
    db.refresh(application)

    # Send email to accepted freelancer
    try:
        from app.services.email_service import get_email_service
        from app.core.config import settings
        freelancer = application.freelancer
        if freelancer and freelancer.email:
            html = (
                f"<p>Hi {freelancer.full_name},</p>"
                f"<p>Your application for <strong>{invoice.title}</strong> has been <strong>accepted</strong>!</p>"
                f"<p>The project is now active. Log in to start working on the milestones.</p>"
                f'<p><a href="{settings.FRONTEND_URL}/invoices/{invoice.id}">View Project</a></p>'
            )
            get_email_service().send(
                to=freelancer.email,
                subject="Your application has been accepted — PaySure",
                html_body=html,
            )
    except Exception:
        pass

    return application


def reject_application(
    db: Session,
    application_id: uuid.UUID,
    client_id: uuid.UUID,
) -> Application:
    """Client rejects a single application."""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    invoice = application.invoice
    if invoice.client_id != client_id:
        raise HTTPException(status_code=403, detail="Only the project client can reject applications")

    if application.status != ApplicationStatus.pending:
        raise HTTPException(status_code=400, detail=f"Application is already {application.status}")

    application.status = ApplicationStatus.rejected
    application.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(application)

    # Send rejection email
    try:
        from app.services.email_service import get_email_service
        from app.core.config import settings
        freelancer = application.freelancer
        if freelancer and freelancer.email:
            html = (
                f"<p>Hi {freelancer.full_name},</p>"
                f"<p>Thank you for applying to <strong>{invoice.title}</strong>.</p>"
                f"<p>Unfortunately, your application was not selected this time.</p>"
                f'<p><a href="{settings.FRONTEND_URL}/invoices">Browse other projects</a></p>'
            )
            get_email_service().send(
                to=freelancer.email,
                subject="Your application was not selected — PaySure",
                html_body=html,
            )
    except Exception:
        pass

    return application
