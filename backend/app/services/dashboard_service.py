# app/services/dashboard_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.invoice import Invoice, InvoiceStatus
from app.models.milestone import Milestone, MilestoneStatus
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.user import User, UserRole

def format_currency(amount: float) -> str:
    """Format float into INR currency string eg. ₹84,000"""
    return f"₹{amount:,.0f}"

def get_dashboard_data(db: Session, user: User) -> dict:
    role = user.role
    
    # Base queries for visibility
    if role == UserRole.freelancer:
        invoice_query = db.query(Invoice).filter(Invoice.freelancer_id == user.id)
    else:
        invoice_query = db.query(Invoice).filter(Invoice.client_id == user.id)

    # 1. Total Earned / Total Paid Out (from captured release payments)
    # Get all invoices for user
    user_invoice_ids = [i.id for i in invoice_query.with_entities(Invoice.id).all()]
    
    # We find payments linked to these invoices through escrow
    # In a fully fleshed out escrow model, payment.escrow.invoice_id links back
    # For now, we simply query payments matching the user's invoice IDs
    # Since Escrow 1:1 Invoice, Escrow ID = Invoice ID or we join
    
    # Escrow logic in this app means invoice.escrow exists. 
    # But wait, Escrow id is not necessarily Invoice id. 
    # Let's join: Payment -> Escrow -> Invoice
    from app.models.escrow import Escrow
    
    released_payments_query = db.query(func.sum(Payment.amount)).join(Escrow).filter(
        Escrow.invoice_id.in_(user_invoice_ids),
        Payment.payment_type == PaymentType.release,
        Payment.status == PaymentStatus.captured
    )
    total_released = released_payments_query.scalar() or 0.0

    # 2. Active Projects
    active_invoices_count = invoice_query.filter(
        Invoice.status.in_([InvoiceStatus.funded, InvoiceStatus.in_progress])
    ).count()

    # 3. Pending/Awaiting Approval
    # Milestones that are submitted
    submitted_milestones_count = db.query(Milestone).filter(
        Milestone.invoice_id.in_(user_invoice_ids),
        Milestone.status == MilestoneStatus.submitted
    ).count()

    # 4. Escrow Locked / Escrow Balance
    # Milestones that are funded but not released
    escrow_locked_query = db.query(func.sum(Milestone.amount)).filter(
        Milestone.invoice_id.in_(user_invoice_ids),
        Milestone.status == MilestoneStatus.funded if hasattr(MilestoneStatus, 'funded') else Milestone.status == MilestoneStatus.approved
    )
    # The models show milestone status: pending, in_progress, submitted, approved, disputed, released, refunded
    # Let's count 'approved' and 'in_progress' and 'submitted' if they are under a funded invoice, or simply sum invoice escrow balances
    escrow_balance_query = db.query(
        func.sum(Escrow.total_amount - Escrow.released_amount - Escrow.refunded_amount)
    ).filter(
        Escrow.invoice_id.in_(user_invoice_ids)
    )
    escrow_locked = escrow_balance_query.scalar() or 0.0

    # Build Stats Array
    stats = []
    if role == UserRole.freelancer:
        stats = [
            {"label": "Total Earned", "value": format_currency(total_released), "sub": "All time"},
            {"label": "Active Projects", "value": str(active_invoices_count), "sub": "In progress"},
            {"label": "Pending Approval", "value": str(submitted_milestones_count), "sub": "Awaiting client"},
            {"label": "Escrow Locked", "value": format_currency(escrow_locked), "sub": "Funds protected"},
        ]
    else:
        stats = [
            {"label": "Escrow Balance", "value": format_currency(escrow_locked), "sub": "Funds protected"},
            {"label": "Active Projects", "value": str(active_invoices_count), "sub": "In progress"},
            {"label": "Awaiting Approval", "value": str(submitted_milestones_count), "sub": "Work submitted"},
            {"label": "Total Paid Out", "value": format_currency(total_released), "sub": "All time"},
        ]

    # Get Lists (Latest 5)
    recent_invoices = invoice_query.order_by(Invoice.created_at.desc()).limit(5).all()
    
    recent_milestones = db.query(Milestone).filter(
        Milestone.invoice_id.in_(user_invoice_ids)
    ).order_by(Milestone.updated_at.desc()).limit(5).all()

    recent_payments = db.query(Payment).join(Escrow).filter(
        Escrow.invoice_id.in_(user_invoice_ids)
    ).order_by(Payment.created_at.desc()).limit(5).all()

    return {
        "stats": stats,
        "invoices": recent_invoices,
        "milestones": recent_milestones,
        "payments": recent_payments
    }
