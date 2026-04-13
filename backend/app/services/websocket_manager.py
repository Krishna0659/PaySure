from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self._rooms: dict[str, list[WebSocket]] = {}
        self._user_map: dict[WebSocket, str] = {}

    async def connect(self, invoice_id: str, ws: WebSocket, user_id: str) -> None:
        await ws.accept()
        if invoice_id not in self._rooms:
            self._rooms[invoice_id] = []
        self._rooms[invoice_id].append(ws)
        self._user_map[ws] = user_id

    def disconnect(self, invoice_id: str, ws: WebSocket) -> None:
        room = self._rooms.get(invoice_id, [])
        if ws in room:
            room.remove(ws)
        if not room and invoice_id in self._rooms:
            del self._rooms[invoice_id]
        self._user_map.pop(ws, None)

    async def broadcast(self, invoice_id: str, message: dict) -> None:
        stale = []
        for ws in list(self._rooms.get(invoice_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(invoice_id, ws)

    def is_connected(self, invoice_id: str, user_id: str) -> bool:
        return any(
            self._user_map.get(ws) == user_id
            for ws in self._rooms.get(invoice_id, [])
        )


manager = WebSocketManager()
