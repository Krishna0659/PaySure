# Requirements Document

## Introduction

Phase 2 of PaySure focuses on production stabilization and platform enrichment for the milestone-based escrow payment system. The existing platform supports manual payment verification via `POST /payments/verify`, but this flow is fragile — if the browser closes mid-payment, the escrow is never funded and the project never activates. Phase 2 addresses this with a reliable async webhook handler, upgrades the invoice chat from polling to WebSocket connections, and adds email notifications for key lifecycle events.

The three features in scope are:

1. **Razorpay Webhook Handler** — Async payment event processing with HMAC-SHA256 verification, idempotent escrow funding, and resilience against browser-close scenarios.
2. **Real-Time WebSocket Chat** — Replace the 5-second polling loop in `InvoiceDetailPage` with persistent WebSocket connections per invoice room.
3. **Email Notifications** — Transactional emails via SendGrid or Resend for milestone submissions, approvals, disputes, chat messages, and payment confirmations.

---

## Glossary

- **Webhook_Handler**: The FastAPI endpoint at `POST /payments/webhook` that receives and processes async Razorpay events.
- **Webhook_Secret**: The `RAZORPAY_WEBHOOK_SECRET` value stored in `Settings`, used to verify HMAC-SHA256 signatures on incoming webhook payloads.
- **Payment**: The SQLAlchemy `Payment` model storing `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `status`, and `payment_type`.
- **Escrow**: The SQLAlchemy `Escrow` model tracking escrow lifecycle (`created → funded → partially_released → fully_released`).
- **Escrow_Service**: The `fund_escrow()` function in `escrow_service.py` that transitions escrow to `funded` and activates the first milestone.
- **WebSocket_Manager**: The server-side connection manager that maintains active WebSocket connections grouped by `invoice_id` room.
- **Chat_Room**: A logical grouping of WebSocket connections for a single invoice, identified by `invoice_id`.
- **Email_Service**: The module responsible for sending transactional emails via the configured provider (SendGrid or Resend).
- **Notification_Event**: A typed trigger (e.g., `milestone_submitted`, `payment_confirmed`) that causes the Email_Service to dispatch an email.
- **Idempotency**: The property that processing the same webhook event multiple times produces the same outcome as processing it once.
- **HMAC_Verifier**: The component that computes and compares HMAC-SHA256 signatures to authenticate webhook payloads.

---

## Requirements

### Requirement 1: Webhook Endpoint Registration

**User Story:** As a platform operator, I want a dedicated webhook endpoint, so that Razorpay can deliver async payment events to PaySure independently of the browser session.

#### Acceptance Criteria

1. THE Webhook_Handler SHALL expose a `POST /payments/webhook` endpoint that accepts raw request bodies.
2. THE Webhook_Handler SHALL NOT require Clerk authentication, as Razorpay calls it server-to-server.
3. WHEN the `RAZORPAY_WEBHOOK_SECRET` setting is empty or unset, THE Webhook_Handler SHALL return HTTP 503 with a descriptive error message.
4. THE Webhook_Handler SHALL parse the request body as JSON after signature verification is complete.

---

### Requirement 2: Webhook Signature Verification

**User Story:** As a platform operator, I want all incoming webhook payloads verified with HMAC-SHA256, so that only authentic Razorpay events trigger escrow state changes.

#### Acceptance Criteria

1. WHEN a webhook request arrives, THE HMAC_Verifier SHALL read the raw request body bytes before any JSON parsing.
2. THE HMAC_Verifier SHALL compute `HMAC-SHA256(raw_body, RAZORPAY_WEBHOOK_SECRET)` and compare it to the `X-Razorpay-Signature` header value.
3. IF the `X-Razorpay-Signature` header is absent, THEN THE Webhook_Handler SHALL return HTTP 400 with the message "Missing signature header".
4. IF the computed signature does not match the header value, THEN THE Webhook_Handler SHALL return HTTP 400 with the message "Signature verification failed".
5. IF the computed signature matches the header value, THEN THE Webhook_Handler SHALL proceed to event processing.
6. THE HMAC_Verifier SHALL use a constant-time comparison to prevent timing attacks.

---

### Requirement 3: Payment Captured Event Handling

**User Story:** As a client, I want my escrow to be funded even if my browser closes after payment, so that the project activates reliably without requiring me to stay on the page.

#### Acceptance Criteria

1. WHEN a verified webhook payload contains `event: "payment.captured"`, THE Webhook_Handler SHALL extract `payload.payment.entity.order_id` and `payload.payment.entity.id`.
2. WHEN a `payment.captured` event is received, THE Webhook_Handler SHALL look up the `Payment` record by `razorpay_order_id`.
3. IF no `Payment` record matches the `order_id`, THEN THE Webhook_Handler SHALL return HTTP 200 with body `{"status": "ignored", "reason": "order not found"}` to prevent Razorpay retries.
4. IF the matched `Payment` record already has `status = captured`, THEN THE Webhook_Handler SHALL return HTTP 200 with body `{"status": "already_processed"}` without re-triggering escrow funding (idempotency).
5. WHEN the `Payment` record has `status = pending`, THE Webhook_Handler SHALL update `razorpay_payment_id`, set `status = captured`, and call `Escrow_Service.fund_escrow()`.
6. WHEN `fund_escrow()` raises an exception indicating the escrow is already funded, THE Webhook_Handler SHALL log the condition and return HTTP 200 without error.
7. THE Webhook_Handler SHALL return HTTP 200 with body `{"status": "ok"}` upon successful processing of a `payment.captured` event.

---

### Requirement 4: Payment Failed Event Handling

**User Story:** As a platform operator, I want failed payments recorded in the database, so that the audit trail is complete and clients can retry payment.

#### Acceptance Criteria

1. WHEN a verified webhook payload contains `event: "payment.failed"`, THE Webhook_Handler SHALL extract `payload.payment.entity.order_id`.
2. WHEN a `payment.failed` event is received, THE Webhook_Handler SHALL look up the `Payment` record by `razorpay_order_id`.
3. IF the matched `Payment` record has `status = pending`, THEN THE Webhook_Handler SHALL set `status = failed` and persist the change.
4. IF the matched `Payment` record already has `status = failed` or `status = captured`, THEN THE Webhook_Handler SHALL return HTTP 200 with body `{"status": "already_processed"}`.
5. THE Webhook_Handler SHALL return HTTP 200 upon successful processing of a `payment.failed` event.

---

### Requirement 5: Refund Processed Event Handling

**User Story:** As a platform operator, I want refund events recorded, so that the payment audit trail reflects Razorpay-initiated refunds.

#### Acceptance Criteria

1. WHEN a verified webhook payload contains `event: "refund.processed"`, THE Webhook_Handler SHALL extract `payload.refund.entity.payment_id` and `payload.refund.entity.amount`.
2. WHEN a `refund.processed` event is received, THE Webhook_Handler SHALL look up the `Payment` record by `razorpay_payment_id`.
3. IF the matched `Payment` record is found, THEN THE Webhook_Handler SHALL set `status = refunded` and persist the change.
4. THE Webhook_Handler SHALL return HTTP 200 upon successful processing of a `refund.processed` event.

---

### Requirement 6: Unknown Event Handling

**User Story:** As a platform operator, I want unrecognised webhook events acknowledged without error, so that Razorpay does not retry events PaySure does not handle.

#### Acceptance Criteria

1. WHEN a verified webhook payload contains an `event` value not in `["payment.captured", "payment.failed", "refund.processed"]`, THE Webhook_Handler SHALL return HTTP 200 with body `{"status": "ignored"}`.
2. THE Webhook_Handler SHALL log the unrecognised event type at INFO level.

---

### Requirement 7: Webhook Idempotency

**User Story:** As a platform operator, I want repeated delivery of the same webhook event to be safe, so that Razorpay retries do not cause double-funding or duplicate state changes.

#### Acceptance Criteria

1. THE Webhook_Handler SHALL produce the same final `Payment` and `Escrow` state regardless of how many times the same event payload is delivered.
2. WHEN a `payment.captured` event is processed for a `Payment` already in `captured` state, THE Webhook_Handler SHALL NOT call `fund_escrow()` again.
3. WHEN a `payment.failed` event is processed for a `Payment` already in `failed` state, THE Webhook_Handler SHALL NOT modify the record.

---

### Requirement 8: WebSocket Connection Management

**User Story:** As a project participant, I want a persistent WebSocket connection for the invoice chat, so that messages appear instantly without polling delays.

#### Acceptance Criteria

1. THE WebSocket_Manager SHALL expose a `WS /ws/chat/{invoice_id}` endpoint that accepts WebSocket upgrade requests.
2. WHEN a WebSocket connection is established, THE WebSocket_Manager SHALL verify the connecting user is a participant (client or freelancer) of the specified invoice.
3. IF the connecting user is not a participant of the invoice, THEN THE WebSocket_Manager SHALL close the connection with code 4003 and reason "Not authorized".
4. THE WebSocket_Manager SHALL maintain a registry of active connections grouped by `invoice_id` (Chat_Room).
5. WHEN a WebSocket connection is closed, THE WebSocket_Manager SHALL remove it from the Chat_Room registry.
6. THE WebSocket_Manager SHALL support multiple simultaneous connections per Chat_Room (e.g., both client and freelancer connected at once).

---

### Requirement 9: Real-Time Message Broadcasting

**User Story:** As a project participant, I want messages I send to appear immediately for all connected participants, so that the chat feels like a live conversation.

#### Acceptance Criteria

1. WHEN a participant sends a message over WebSocket, THE WebSocket_Manager SHALL persist the message via the existing `Message_Service.send_message()` function.
2. WHEN a message is persisted, THE WebSocket_Manager SHALL broadcast the enriched `MessageResponse` JSON to all connections in the same Chat_Room.
3. THE WebSocket_Manager SHALL broadcast to all connections in the room, including the sender.
4. IF a connection in the room has become stale during broadcast, THE WebSocket_Manager SHALL remove it from the registry without raising an exception.
5. THE WebSocket_Manager SHALL accept message payloads as JSON with at minimum a `content` field.

---

### Requirement 10: WebSocket Frontend Migration

**User Story:** As a developer, I want the frontend chat to use WebSocket instead of polling, so that the 5-second polling interval is eliminated and server load is reduced.

#### Acceptance Criteria

1. THE InvoiceDetailPage SHALL establish a WebSocket connection to `WS /ws/chat/{invoice_id}` when the chat tab becomes active.
2. WHEN the chat tab is deactivated or the component unmounts, THE InvoiceDetailPage SHALL close the WebSocket connection.
3. THE InvoiceDetailPage SHALL append incoming WebSocket messages to the local message list without a full re-fetch.
4. THE InvoiceDetailPage SHALL remove the existing 5-second `setInterval` polling loop for messages.
5. WHILE the WebSocket connection is open, THE InvoiceDetailPage SHALL display a visual indicator (e.g., a green dot) showing the live connection status.
6. IF the WebSocket connection closes unexpectedly, THE InvoiceDetailPage SHALL attempt to reconnect with exponential backoff, up to a maximum of 5 retries.

---

### Requirement 11: Email Notification Delivery

**User Story:** As a platform user, I want to receive email notifications for key project events, so that I stay informed even when I am not actively using the platform.

#### Acceptance Criteria

1. THE Email_Service SHALL send transactional emails using a configurable provider (SendGrid or Resend) selected via the `EMAIL_PROVIDER` environment variable.
2. THE Email_Service SHALL read sender address from the `EMAIL_FROM` environment variable.
3. IF the `EMAIL_PROVIDER` environment variable is unset, THEN THE Email_Service SHALL log the email content at DEBUG level and skip delivery (no-op mode for development).
4. WHEN an email delivery attempt fails, THE Email_Service SHALL log the error and NOT raise an exception that would interrupt the primary request flow.

---

### Requirement 12: Milestone Submission Notification

**User Story:** As a client, I want an email when a freelancer submits a milestone, so that I can review and approve it promptly.

#### Acceptance Criteria

1. WHEN a milestone transitions to `submitted` status, THE Email_Service SHALL send a notification email to the invoice's client.
2. THE notification email SHALL include the milestone title, invoice title, and a direct link to the invoice detail page.

---

### Requirement 13: Milestone Approval Notification

**User Story:** As a freelancer, I want an email when a client approves my milestone, so that I know payment has been released.

#### Acceptance Criteria

1. WHEN a milestone transitions to `released` status, THE Email_Service SHALL send a notification email to the invoice's freelancer.
2. THE notification email SHALL include the milestone title, released amount, invoice title, and a direct link to the invoice detail page.

---

### Requirement 14: Dispute Raised Notification

**User Story:** As both parties, I want an email when a dispute is raised, so that both the client and freelancer are aware and can respond.

#### Acceptance Criteria

1. WHEN a dispute is created for an invoice, THE Email_Service SHALL send notification emails to both the client and the freelancer.
2. THE notification email SHALL include the dispute reason, invoice title, and a direct link to the invoice detail page.

---

### Requirement 15: Payment Confirmation Notification

**User Story:** As a client, I want an email confirming my escrow payment, so that I have a record of the transaction.

#### Acceptance Criteria

1. WHEN `fund_escrow()` is called successfully (whether via webhook or manual verify), THE Email_Service SHALL send a payment confirmation email to the invoice's client.
2. THE notification email SHALL include the total amount funded, currency, invoice title, and a direct link to the invoice detail page.

---

### Requirement 16: Chat Message Notification

**User Story:** As a project participant, I want an email when I receive a chat message and I am not currently connected, so that I do not miss important communications.

#### Acceptance Criteria

1. WHEN a message is sent in an invoice chat, THE Email_Service SHALL send a notification email to the other participant (not the sender).
2. WHERE the recipient has an active WebSocket connection in the Chat_Room, THE Email_Service SHALL skip sending the email notification for that message.
3. THE notification email SHALL include the sender's name, a preview of the message content (up to 200 characters), and a direct link to the invoice detail page.
