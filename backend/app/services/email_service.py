"""
Email service with pluggable provider adapters.

Supports SendGrid, Resend, and a no-op fallback.
Provider is selected via settings.EMAIL_PROVIDER.
"""
from __future__ import annotations

from app.core.logging import logger
from app.core.config import settings


# ---------------------------------------------------------------------------
# Base class
# ---------------------------------------------------------------------------

class EmailService:
    """Fire-and-forget email sender. Never raises."""

    def send(self, to: str, subject: str, html_body: str) -> None:
        try:
            self._send(to, subject, html_body)
        except Exception as exc:
            logger.error("EmailService.send failed to=%s subject=%r: %s", to, subject, exc)

    def _send(self, to: str, subject: str, html_body: str) -> None:  # pragma: no cover
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Adapters
# ---------------------------------------------------------------------------

class NoOpEmailService(EmailService):
    def _send(self, to: str, subject: str, html_body: str) -> None:
        logger.debug("NoOpEmailService: skipping email to=%s subject=%r", to, subject)


class SendGridAdapter(EmailService):
    def _send(self, to: str, subject: str, html_body: str) -> None:
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail

            sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
            mail = Mail(
                from_email=settings.EMAIL_FROM,
                to_emails=to,
                subject=subject,
                html_content=html_body,
            )
            sg.send(mail)
        except Exception as exc:
            logger.error("SendGridAdapter.send failed to=%s subject=%r: %s", to, subject, exc)


class ResendAdapter(EmailService):
    def _send(self, to: str, subject: str, html_body: str) -> None:
        try:
            import resend

            resend.api_key = settings.RESEND_API_KEY
            resend.Emails.send({
                "from": settings.EMAIL_FROM,
                "to": [to],
                "subject": subject,
                "html": html_body,
            })
        except Exception as exc:
            logger.error("ResendAdapter.send failed to=%s subject=%r: %s", to, subject, exc)


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_email_service() -> EmailService:
    provider = (settings.EMAIL_PROVIDER or "").lower()
    if provider == "sendgrid":
        return SendGridAdapter()
    if provider == "resend":
        return ResendAdapter()
    return NoOpEmailService()


# ---------------------------------------------------------------------------
# Notification helpers
# ---------------------------------------------------------------------------

def notify_milestone_submitted(milestone) -> None:
    """Notify client that a milestone has been submitted for review."""
    try:
        invoice = milestone.invoice
        deep_link = f"{settings.FRONTEND_URL}/invoices/{milestone.invoice_id}"
        html_body = (
            f"<p>The milestone <strong>{milestone.title}</strong> has been submitted for review.</p>"
            f"<p>Invoice: {invoice.title}</p>"
            f'<p><a href="{deep_link}">View invoice</a></p>'
        )
        get_email_service().send(
            to=invoice.client.email,
            subject=f"[PaySure] Milestone submitted: {milestone.title}",
            html_body=html_body,
        )
    except Exception as exc:
        logger.warning("notify_milestone_submitted failed for milestone %s: %s", milestone.id, exc)


def notify_milestone_released(milestone) -> None:
    """Notify freelancer that payment has been released for a milestone."""
    try:
        invoice = milestone.invoice
        deep_link = f"{settings.FRONTEND_URL}/invoices/{milestone.invoice_id}"
        html_body = (
            f"<p>Payment of <strong>{milestone.amount}</strong> has been released for milestone "
            f"<strong>{milestone.title}</strong>.</p>"
            f"<p>Invoice: {invoice.title}</p>"
            f'<p><a href="{deep_link}">View invoice</a></p>'
        )
        get_email_service().send(
            to=invoice.freelancer.email,
            subject=f"[PaySure] Payment released: {milestone.title}",
            html_body=html_body,
        )
    except Exception as exc:
        logger.warning("notify_milestone_released failed for milestone %s: %s", milestone.id, exc)


def notify_dispute_raised(dispute) -> None:
    """Notify both client and freelancer that a dispute has been raised."""
    try:
        invoice = dispute.milestone.invoice
        deep_link = f"{settings.FRONTEND_URL}/invoices/{invoice.id}"
        html_body = (
            f"<p>A dispute has been raised on invoice <strong>{invoice.title}</strong>.</p>"
            f"<p>Reason: {dispute.reason}</p>"
            f'<p><a href="{deep_link}">View invoice</a></p>'
        )
        subject = f"[PaySure] Dispute raised on: {invoice.title}"
        svc = get_email_service()
        svc.send(to=invoice.client.email, subject=subject, html_body=html_body)
        svc.send(to=invoice.freelancer.email, subject=subject, html_body=html_body)
    except Exception as exc:
        logger.warning("notify_dispute_raised failed for dispute %s: %s", dispute.id, exc)


def notify_payment_confirmed(escrow, invoice) -> None:
    """Notify client that their escrow payment has been confirmed."""
    try:
        deep_link = f"{settings.FRONTEND_URL}/invoices/{invoice.id}"
        html_body = (
            f"<p>Your payment of <strong>{escrow.total_amount} {escrow.currency}</strong> "
            f"has been confirmed for invoice <strong>{invoice.title}</strong>.</p>"
            f'<p><a href="{deep_link}">View invoice</a></p>'
        )
        get_email_service().send(
            to=invoice.client.email,
            subject=f"[PaySure] Payment confirmed: {invoice.title}",
            html_body=html_body,
        )
    except Exception as exc:
        logger.warning("notify_payment_confirmed failed for invoice %s: %s", invoice.id, exc)


def notify_chat_message(message, invoice) -> None:
    """Notify the other party about a new chat message."""
    try:
        if message.sender_id == invoice.client_id:
            recipient = invoice.freelancer
        else:
            recipient = invoice.client

        deep_link = f"{settings.FRONTEND_URL}/invoices/{invoice.id}"
        preview = (message.content or "")[:200]
        html_body = (
            f"<p>You have a new message from <strong>{message.sender.full_name}</strong>.</p>"
            f"<p>{preview}</p>"
            f'<p><a href="{deep_link}">View conversation</a></p>'
        )
        get_email_service().send(
            to=recipient.email,
            subject=f"[PaySure] New message from {message.sender.full_name}",
            html_body=html_body,
        )
    except Exception as exc:
        logger.warning("notify_chat_message failed for message %s: %s", message.id, exc)
