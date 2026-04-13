# Implementation Plan: Razorpay Webhook Phase 2

## Overview

Three additive features: (1) a Razorpay webhook handler with HMAC-SHA256 verification and idempotent event processing, (2) real-time WebSocket chat replacing the 5-second polling loop, and (3) a pluggable email notification service triggered at key lifecycle events. All new code is introduced in new files; existing services receive targeted notification hook additions only.

## Tasks

- [x] 1. Implement HMAC verifier and webhook service
  - [x] 1.1 Create `backend/app/services/webhook_service.py` with signature verification and event handlers
    - Implement `verify_razorpay_signature(raw_body: bytes, secret: str, signature: str) -> bool` using `hmac.compare_digest` for constant-time comparison
    - Implement `handle_payment_captured(db, payload)` — look up `Payment` by `razorpay_order_id`, guard idempotency on `status == captured`, call `fund_escrow()`, return status dict
    - Implement `handle_payment_failed(db, payload)` — look up by `razorpay_order_id`, set `status = failed` if pending, guard idempotency
    - Implement `handle_refund_processed(db, payload)` — look up by `razorpay_payment_id`, set `status = refunded`
    - _Requirements: 2.1, 2.2, 2.6, 3.1–3.7, 4.1–4.5, 5.1–5.4_

  - [ ]* 1.2 Write property test for HMAC accepts valid signatures (P1)
    - **Property 1: HMAC Signature Verification Accepts Valid Signatures**
    - Use `hypothesis` — generate `body: bytes` and `secret: str`; compute expected HMAC; assert `verify_razorpay_signature` returns `True`
    - Tag: `# Feature: razorpay-webhook-phase2, Property 1`
    - **Validates: Requirements 2.2, 2.5**

  - [ ]* 1.3 Write property test for HMAC rejects invalid signatures (P2)
    - **Property 2: HMAC Signature Verification Rejects Invalid Signatures**
    - Use `hypothesis` — generate `body: bytes` and `wrong_sig: str` filtered to not equal correct HMAC; assert `verify_razorpay_signature` returns `False`
    - Tag: `# Feature: razorpay-webhook-phase2, Property 2`
    - **Validates: Requirements 2.4**

- [x] 2. Implement webhook HTTP endpoint and register route
  - [x] 2.1 Create `backend/app/api/v1/webhook.py` with the unauthenticated POST route
    - Define `router = APIRouter()` with `POST /payments/webhook`
    - Read raw body via `await request.body()` before any JSON parsing
    - Return HTTP 503 if `settings.RAZORPAY_WEBHOOK_SECRET` is empty
    - Return HTTP 400 if `X-Razorpay-Signature` header is absent
    - Return HTTP 400 if signature verification fails
    - Dispatch to `webhook_service` handlers based on `event` field; return HTTP 200 `{"status": "ignored"}` for unknown events; log unknown event type at INFO level
    - Wrap entire handler in try/except — log unexpected errors, always return HTTP 200 to prevent Razorpay retries
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.3, 2.4, 2.5, 6.1, 6.2_

  - [x] 2.2 Register webhook router in `backend/app/main.py`
    - Import `webhook_router` from `app.api.v1.webhook`
    - Call `app.include_router(webhook_router)` directly on the `app` instance (outside `api_router`) so the route is unauthenticated
    - _Requirements: 1.1, 1.2_

  - [ ]* 2.3 Write property test for webhook idempotency (P3)
    - **Property 3: Webhook Idempotency**
    - Use `hypothesis` — generate valid `payment.captured` payloads; process 2–5 times against a test DB session; assert final `Payment.status` and `Escrow.status` equal single-processing outcome
    - Tag: `# Feature: razorpay-webhook-phase2, Property 3`
    - **Validates: Requirements 3.4, 4.4, 7.1, 7.2, 7.3**

  - [ ]* 2.4 Write property test for unknown events ignored (P4)
    - **Property 4: Unknown Event Types Are Ignored**
    - Use `hypothesis` — generate random event type strings not in `{"payment.captured", "payment.failed", "refund.processed"}`; call handler; assert HTTP 200 + `{"status": "ignored"}` + no DB mutations
    - Tag: `# Feature: razorpay-webhook-phase2, Property 4`
    - **Validates: Requirements 6.1**

- [x] 3. Checkpoint — webhook feature complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement WebSocketManager
  - [x] 4.1 Create `backend/app/services/websocket_manager.py`
    - Define `WebSocketManager` class with `_rooms: dict[str, list[WebSocket]]`
    - Implement `async connect(invoice_id: str, ws: WebSocket)` — call `ws.accept()`, append to room list
    - Implement `disconnect(invoice_id: str, ws: WebSocket)` — remove from room list, clean up empty room key
    - Implement `async broadcast(invoice_id: str, message: dict)` — iterate room connections, send JSON, silently remove stale connections that raise on send
    - Implement `is_connected(invoice_id: str, user_id: str) -> bool` — check if any connection in the room carries the given `user_id` (store user_id on connect via a parallel dict or subclass)
    - Expose module-level singleton: `manager = WebSocketManager()`
    - _Requirements: 8.4, 8.5, 8.6, 9.2, 9.3, 9.4_

  - [ ]* 4.2 Write property test for WebSocket registry connect/disconnect round-trip (P6)
    - **Property 6: WebSocket Registry Connect/Disconnect Round-Trip**
    - Use `hypothesis` — generate random invoice ID strings; mock WebSocket objects; connect then disconnect; assert connection absent from registry after disconnect
    - Tag: `# Feature: razorpay-webhook-phase2, Property 6`
    - **Validates: Requirements 8.4, 8.5**

  - [ ]* 4.3 Write property test for broadcast reaches all room connections (P7)
    - **Property 7: Message Broadcast Reaches All Room Connections**
    - Use `hypothesis` — generate N (1–10) mock WebSocket connections in a room; call `broadcast()`; assert all N mocks received the message
    - Tag: `# Feature: razorpay-webhook-phase2, Property 7`
    - **Validates: Requirements 9.2, 9.3**

- [x] 5. Implement WebSocket chat endpoint
  - [x] 5.1 Create `backend/app/api/v1/chat_ws.py` with the WebSocket route
    - Define `router = APIRouter()` with `@router.websocket("/ws/chat/{invoice_id}")`
    - Accept `token: str = Query(...)` for JWT-via-query-param auth; verify via existing `security` module; close with code 4001 on invalid/expired token
    - Load invoice from DB; close with code 4004 if not found
    - Verify connecting user is `client_id` or `freelancer_id`; close with code 4003 if not
    - Call `manager.connect(invoice_id, websocket)` on successful auth
    - Message loop: receive JSON, call `message_service.send_message()`, call `manager.broadcast()` with enriched `MessageResponse`
    - After broadcast, call `manager.is_connected()` for the recipient; if not connected, call `email_service.notify_chat_message()`
    - Handle `WebSocketDisconnect` and malformed JSON gracefully; call `manager.disconnect()` in `finally`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 16.1, 16.2_

  - [x] 5.2 Register WebSocket router in `backend/app/api/v1/routes.py` and `backend/app/main.py`
    - In `routes.py`: import `chat_ws_router` and include it in `api_router`
    - In `main.py`: ensure the WebSocket route is reachable (it will be via `api_router` include)
    - _Requirements: 8.1_

  - [ ]* 5.3 Write property test for WebSocket rejects non-participants (P5)
    - **Property 5: WebSocket Authorization Rejects Non-Participants**
    - Use `hypothesis` — generate random user/invoice pairs where user ID is neither `client_id` nor `freelancer_id`; assert connection closed with code 4003
    - Tag: `# Feature: razorpay-webhook-phase2, Property 5`
    - **Validates: Requirements 8.2, 8.3**

  - [ ]* 5.4 Write property test for message persistence round-trip (P8)
    - **Property 8: Chat Message Persistence Round-Trip**
    - Use `hypothesis` — generate random `content: str`; send via WebSocket test client; query DB; assert stored content matches sent content and sender metadata is correct
    - Tag: `# Feature: razorpay-webhook-phase2, Property 8`
    - **Validates: Requirements 9.1**

- [x] 6. Checkpoint — WebSocket feature complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement EmailService with SendGrid and Resend adapters
  - [x] 7.1 Create `backend/app/services/email_service.py`
    - Define `EmailService` base with `send(to, subject, html_body)` — fire-and-forget, never raises; log at ERROR on provider exception
    - Implement `SendGridAdapter.send()` using `sendgrid` SDK; read `SENDGRID_API_KEY` from settings
    - Implement `ResendAdapter.send()` using `resend` SDK; read `RESEND_API_KEY` from settings
    - Implement no-op mode: if `EMAIL_PROVIDER` is empty, log at DEBUG and return
    - Implement `get_email_service() -> EmailService` factory reading `EMAIL_PROVIDER` env var
    - Implement notification helpers: `notify_milestone_submitted()`, `notify_milestone_released()`, `notify_dispute_raised()`, `notify_payment_confirmed()`, `notify_chat_message()` — each builds HTML body with required fields and calls `send()`
    - Deep links use `settings.FRONTEND_URL`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 13.1, 13.2, 14.1, 14.2, 15.1, 15.2, 16.3_

  - [x] 7.2 Add new config fields to `backend/app/core/config.py`
    - Add `EMAIL_PROVIDER: str = ""`, `EMAIL_FROM: str = ""`, `SENDGRID_API_KEY: str = ""`, `RESEND_API_KEY: str = ""`, `FRONTEND_URL: str = "http://localhost:5173"`
    - _Requirements: 11.1, 11.2_

  - [ ]* 7.3 Write property test for email content completeness (P9)
    - **Property 9: Email Notification Content Completeness**
    - Use `hypothesis` — generate random notification event data for each of the 5 event types; call the corresponding notify helper with a mock `send`; assert all required fields (title, amount, sender name, deep link) appear in the captured `html_body`
    - Tag: `# Feature: razorpay-webhook-phase2, Property 9`
    - **Validates: Requirements 12.2, 13.2, 14.2, 15.2, 16.3**

  - [ ]* 7.4 Write property test for email failures do not propagate (P11)
    - **Property 11: Email Failures Do Not Propagate**
    - Use `hypothesis` — generate arbitrary exception types from a mock provider; call `EmailService.send()`; assert no exception is raised by the caller
    - Tag: `# Feature: razorpay-webhook-phase2, Property 11`
    - **Validates: Requirements 11.4**

- [x] 8. Wire email notifications into existing services
  - [x] 8.1 Add notification call in `backend/app/services/milestone_service.py`
    - In `submit_milestone()`, after `db.commit()`, call `get_email_service().notify_milestone_submitted(milestone)` wrapped in try/except
    - _Requirements: 12.1, 12.2_

  - [x] 8.2 Add notification calls in `backend/app/services/escrow_service.py`
    - In `fund_escrow()`, after `db.commit()`, call `get_email_service().notify_payment_confirmed(escrow, invoice)`
    - In `release_milestone_payment()`, after `db.commit()`, call `get_email_service().notify_milestone_released(milestone)`
    - _Requirements: 13.1, 13.2, 15.1, 15.2_

  - [x] 8.3 Add notification call in `backend/app/services/dispute_service.py`
    - In `raise_dispute()`, after `db.commit()`, call `get_email_service().notify_dispute_raised(dispute)` to email both client and freelancer
    - _Requirements: 14.1, 14.2_

  - [ ]* 8.4 Write property test for chat email suppression when recipient connected (P10)
    - **Property 10: Chat Email Suppressed When Recipient Is Connected**
    - Use `hypothesis` — generate random room states (recipient connected / not connected); send a message via the WebSocket endpoint; assert `notify_chat_message` was called iff recipient was not connected
    - Tag: `# Feature: razorpay-webhook-phase2, Property 10`
    - **Validates: Requirements 16.1, 16.2**

- [x] 9. Checkpoint — email notification feature complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement frontend WebSocket hook
  - [x] 10.1 Create `frontend/src/hooks/useWebSocketChat.js`
    - Accept `(invoiceId, { enabled, getToken, onMessage })` parameters
    - On mount (when `enabled` is true): fetch Clerk JWT, open `WebSocket` to `${VITE_WS_URL}/api/v1/ws/chat/${invoiceId}?token=<jwt>`
    - Append incoming messages to local state via `onMessage` callback
    - On unexpected close: reconnect with exponential backoff (base 1s, multiplier 2×, max 5 retries)
    - Expose `{ connected, messages, sendMessage }` — `sendMessage` serialises payload as JSON and calls `ws.send()`
    - Clean up WebSocket on unmount or when `enabled` becomes false
    - _Requirements: 10.1, 10.2, 10.3, 10.6_

- [x] 11. Migrate InvoiceDetailPage chat from polling to WebSocket
  - [x] 11.1 Update `frontend/src/pages/InvoiceDetailPage.jsx`
    - Import `useWebSocketChat` hook
    - Replace the `setInterval(fetchMessages, 5000)` polling block and `pollRef` with `useWebSocketChat(id, { enabled: activeTab === 'chat', getToken, onMessage: msg => setMessages(prev => [...prev, msg]) })`
    - Remove `pollRef` ref and the `fetchMessages` polling `useEffect`
    - Wire `sendMessage` from the hook into `handleSendChat` (replace the `apiFetch('/messages/', ...)` call)
    - Add a connection status indicator in the chat tab header: green dot when `connected === true`, grey dot otherwise
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 12. Final checkpoint — all features integrated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `hypothesis` (Python backend) — run with `pytest backend/tests/`
- The webhook route must be registered directly on `app` (not under `api_router`) to bypass Clerk auth middleware
- `WebSocketManager` is an in-process singleton; horizontal scaling would require a Redis pub/sub backend swap behind the same interface
- `EmailService` is always fire-and-forget — exceptions are logged and swallowed, never propagated
