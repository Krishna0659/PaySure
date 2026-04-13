import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.message import MessageCreate, MessageResponse
from app.services.message_service import (
    send_message, get_messages_for_invoice, enrich_message_response,
)
from app.core.security import get_current_user
from app.utils.response import success_response

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def post_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Send a message in an invoice's project chat."""
    msg = send_message(db, data, sender_id=current_user.id)
    return success_response(
        data=enrich_message_response(msg),
        message="Message sent",
    )


@router.get("/invoice/{invoice_id}")
def get_invoice_messages(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Fetches all messages for a given invoice project chat — newest-last."""
    messages = get_messages_for_invoice(db, invoice_id, requester_id=current_user.id)
    return success_response(
        data=[enrich_message_response(m) for m in messages]
    )
