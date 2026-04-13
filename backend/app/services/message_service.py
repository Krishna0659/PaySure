import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.message import Message
from app.schemas.message import MessageCreate, MessageResponse


def send_message(db: Session, data: MessageCreate, sender_id: uuid.UUID) -> Message:
    """
    Stores a new message in the DB.
    Verifies the sender is a participant in this invoice (client or freelancer).
    """
    from app.models.invoice import Invoice

    invoice = db.query(Invoice).filter(Invoice.id == data.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    # Only the client or assigned freelancer can message
    if invoice.client_id != sender_id and invoice.freelancer_id != sender_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project participants can send messages",
        )

    message = Message(
        invoice_id=data.invoice_id,
        sender_id=sender_id,
        content=data.content,
        file_url=data.file_url,
        file_name=data.file_name,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_messages_for_invoice(
    db: Session, invoice_id: uuid.UUID, requester_id: uuid.UUID
) -> list[Message]:
    """
    Returns all messages for a given invoice, ordered oldest-first.
    Verifies the requester is a participant.
    """
    from app.models.invoice import Invoice

    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    # Admin can also view messages
    from app.models.user import User, UserRole
    user = db.query(User).filter(User.id == requester_id).first()
    is_admin = user and user.role == UserRole.admin

    if not is_admin and invoice.client_id != requester_id and invoice.freelancer_id != requester_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view these messages",
        )

    return (
        db.query(Message)
        .filter(Message.invoice_id == invoice_id)
        .order_by(Message.created_at.asc())
        .all()
    )


def enrich_message_response(msg: Message) -> MessageResponse:
    """Build a MessageResponse with sender name/role from the loaded relationship."""
    return MessageResponse(
        id=msg.id,
        invoice_id=msg.invoice_id,
        sender_id=msg.sender_id,
        sender_name=msg.sender.full_name if msg.sender else None,
        sender_role=msg.sender.role.value if msg.sender else None,
        content=msg.content,
        file_url=msg.file_url,
        file_name=msg.file_name,
        created_at=msg.created_at,
    )
