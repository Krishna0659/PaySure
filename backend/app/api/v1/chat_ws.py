import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from jose import JWTError
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.logging import logger
from app.core.security import decode_clerk_token
from app.db.session import get_db
from app.models.invoice import Invoice
from app.schemas.message import MessageCreate
from app.services.message_service import send_message, enrich_message_response
from app.services.user_service import get_user_by_clerk_id
from app.services.websocket_manager import manager

router = APIRouter()


@router.websocket("/ws/chat/{invoice_id}")
async def chat_websocket(
    websocket: WebSocket,
    invoice_id: uuid.UUID,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    # ── Auth: decode JWT ──────────────────────────────────────────────────────
    try:
        payload = decode_clerk_token(token)
    except (JWTError, HTTPException):
        await websocket.close(code=4001, reason="Invalid token")
        return

    clerk_id = payload.get("sub")
    user = get_user_by_clerk_id(db, clerk_id) if clerk_id else None
    if not user:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # ── Load invoice ──────────────────────────────────────────────────────────
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        await websocket.close(code=4004, reason="Invoice not found")
        return

    # ── Authorisation: must be client or freelancer ───────────────────────────
    if user.id != invoice.client_id and user.id != invoice.freelancer_id:
        await websocket.close(code=4003, reason="Not authorized")
        return

    # ── Accept connection ─────────────────────────────────────────────────────
    await manager.connect(str(invoice_id), websocket, str(user.id))
    logger.info(f"WebSocket connected: user={user.id} invoice={invoice_id}")

    try:
        while True:
            data = await websocket.receive_text()

            # Parse JSON
            try:
                msg_payload = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
                continue

            # Build and persist message
            msg_create = MessageCreate(
                invoice_id=invoice_id,
                content=msg_payload["content"],
                file_url=msg_payload.get("file_url"),
                file_name=msg_payload.get("file_name"),
            )
            message = send_message(db, msg_create, user.id)

            # Enrich and broadcast
            response = enrich_message_response(message)
            await manager.broadcast(str(invoice_id), response.model_dump(mode="json"))

            # Email notification for offline recipient
            recipient_id = (
                invoice.freelancer_id
                if user.id == invoice.client_id
                else invoice.client_id
            )
            if recipient_id and not manager.is_connected(str(invoice_id), str(recipient_id)):
                try:
                    from app.services.email_service import get_email_service
                    get_email_service().notify_chat_message(message, invoice)
                except Exception as exc:
                    logger.warning(f"Email notification failed: {exc}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user={user.id} invoice={invoice_id}")
    finally:
        manager.disconnect(str(invoice_id), websocket)
