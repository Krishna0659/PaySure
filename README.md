<div align="center">

# 💳 PaySure

### Milestone-Based Escrow Payment Protection Platform

*Get paid. Every milestone. No disputes.*

[![Python](https://img.shields.io/badge/Python-3.13+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-latest-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [How It Works](#-how-it-works)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Database Design](#-database-design)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Running Tests](#-running-tests)
- [User Roles](#-user-roles)
- [Authors](#-authors)

---

## 🌟 Overview

**PaySure** is a full-stack milestone-based escrow payment platform designed for the freelance economy. It solves the core trust problem in client-freelancer relationships:

> *Clients fear paying for work that isn't delivered. Freelancers fear delivering work without payment.*

PaySure acts as a **neutral escrow agent** — client funds are locked securely before work begins, and released automatically per milestone only after the client approves. Both parties are protected at every step.

**Domain:** FinTech / Freelance / Gig Economy  
**Target Market:** India (INR currency, Razorpay payment gateway)  
**Version:** 1.0.0

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Secure Authentication** | Clerk-powered OAuth/SSO with JWT verification (RS256) |
| 🧾 **Invoice Management** | Create, send, cancel, and track invoices with milestone breakdowns |
| 🏁 **Milestone Lifecycle** | Full state machine: `pending → in_progress → submitted → approved → released` |
| 🔒 **Escrow Engine** | Client funds locked per invoice; released milestone-by-milestone |
| 💰 **Wallet System** | Per-user wallet with spendable balance and escrow balance tracking |
| 💳 **Razorpay Integration** | Payment orders, HMAC-SHA256 signature verification, webhook support |
| ⚖️ **Dispute Resolution** | Client raises dispute → Admin reviews → Admin resolves (pay/refund) |
| 📝 **Application System** | Freelancers apply to funded projects with proposals; clients accept/reject |
| 💬 **Real-Time Chat** | Per-invoice WebSocket chat rooms with message persistence |
| ⏱️ **Auto-Approval** | Submitted milestones auto-approved after 24 hours if client is inactive |
| 📧 **Email Notifications** | Pluggable provider (SendGrid / Resend) for key lifecycle events |
| 🛡️ **Admin Dashboard** | Platform-wide oversight: users, invoices, transactions, activity logs |
| 📊 **Role-Aware Dashboard** | Distinct stats views for freelancers vs clients |
| ⭐ **Ratings System** | Post-project reviews for both parties |

---

## ⚙️ How It Works

```
Step 1: Freelancer creates an invoice with milestone breakdown
         └─→ Sends it to the client

Step 2: Client funds the invoice from their wallet
         └─→ Funds are locked in escrow (safe — neither party can touch)

Step 3: Freelancers apply to the funded project
         └─→ Client selects and accepts one freelancer

Step 4: Work begins milestone by milestone
         Freelancer works → Submits → Client Reviews:
           ✅ Approve  → Payment released to freelancer wallet
           ❌ Reject   → Freelancer reworks and resubmits
           ⚠️ Dispute  → Admin intervenes and decides
         (Auto-approved after 24h if client doesn't respond)

Step 5: All milestones completed → Escrow fully released → Invoice marked complete
```

---

## 🛠 Tech Stack

### Backend
| Technology | Role |
|-----------|------|
| **Python 3.13+** | Runtime |
| **FastAPI** | REST API framework (async ASGI) |
| **SQLAlchemy 2.x** | ORM (modern `Mapped` style) |
| **PostgreSQL** | Primary database |
| **Alembic** | Database migrations (7 versions) |
| **Clerk** | Authentication (JWT/JWKS, RS256) |
| **Razorpay** | Payment gateway |
| **python-jose** | JWT decoding |
| **passlib[bcrypt]** | Password hashing |
| **pydantic-settings** | Environment config |
| **Uvicorn** | ASGI server |
| **SendGrid / Resend** | Email (pluggable adapters) |

### Frontend
| Technology | Role |
|-----------|------|
| **React 19** | UI framework |
| **Vite 8** | Build tool / dev server |
| **React Router DOM v7** | Client-side routing |
| **Tailwind CSS v4** | Utility-first styling |
| **shadcn/ui + Radix UI** | Accessible component primitives |
| **Framer Motion v12** | Animations and transitions |
| **Clerk React** | Auth UI + session management |
| **Axios** | HTTP client |
| **Three.js** | 3D visual effects |
| **Lucide React** | Icon library |
| **Geist + Cabinet Grotesk** | Typography |

### Testing & Dev Tools
| Tool | Purpose |
|------|---------|
| pytest + httpx | Backend integration tests |
| pytest-asyncio | Async test support |
| black | Code formatter |
| isort | Import sorter |
| mypy | Static type checking |
| ESLint | Frontend linting |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────┐
│           React SPA (Vite)              │
│   Clerk Auth · Axios · Framer Motion   │
└────────────────┬────────────────────────┘
                 │ REST (JWT Bearer) + WebSocket
                 ▼
┌─────────────────────────────────────────┐
│         FastAPI Backend (Python)        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  CORS · Auth · Exception Handler │   │
│  └──────────────┬──────────────────┘   │
│                 │                       │
│  ┌──────────────▼──────────────────┐   │
│  │        API Router /api/v1        │   │
│  │  users · invoices · milestones   │   │
│  │  escrow · payments · disputes    │   │
│  │  wallet · applications · admin   │   │
│  │  chat (WebSocket) · webhook      │   │
│  └──────────────┬──────────────────┘   │
│                 │                       │
│  ┌──────────────▼──────────────────┐   │
│  │     Service Layer (Business)     │   │
│  └──────────────┬──────────────────┘   │
│                 │                       │
│  ┌──────────────▼──────────────────┐   │
│  │   SQLAlchemy ORM + PostgreSQL    │   │
│  └─────────────────────────────────┘   │
└────────┬─────────────┬──────────────────┘
         │             │
    ┌────▼────┐   ┌────▼──────┐   ┌─────────┐
    │  Clerk  │   │ Razorpay  │   │ Email   │
    │  Auth   │   │ Payments  │   │ Service │
    └─────────┘   └───────────┘   └─────────┘
```

---

## 🗄 Database Design

### Entity Overview (9 Tables)

```
users ──────────────────────────────────────────┐
  │  (freelancer_id)                             │
  │  (client_id)                                 │
  ├─────────────< invoices >──────────────────── │
  │                   │                          │
  │              (1:1)│                          │
  │               escrow ──────< payments        │
  │                   │                          │
  │           (cascade)│                         │
  │              milestones ──────1 dispute       │
  │                                              │
  │           (cascade)│                         │
  │              applications                    │
  │                                              │
  └──────────────────1 wallet                    │
                          │                      │
                     wallet_transactions ─────── ┘
```

### Key Enumerations

| Model | States |
|-------|--------|
| **Invoice** | `draft` → `sent` → `funded` → `in_progress` → `completed` / `cancelled` / `disputed` |
| **Milestone** | `pending` → `in_progress` → `submitted` → `approved` → `released` / `refunded` / `disputed` |
| **Escrow** | `created` → `funded` → `partially_released` → `fully_released` / `refunded` / `disputed` |
| **Dispute** | `open` → `under_review` → `resolved_release` / `resolved_refund` → `resolved` / `closed` |
| **Payment** | `pending` → `captured` / `failed` / `refunded` |
| **User Role** | `freelancer` / `client` / `admin` |

---

## 📡 API Reference

**Base URL:** `http://localhost:8000/api/v1`  
**Auth:** `Authorization: Bearer <clerk_jwt>` on all protected routes  
**Docs:** Swagger UI → `/docs` · ReDoc → `/redoc`

### Core Endpoints

<details>
<summary><strong>👤 Users</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/me` | Any | Get current user profile |
| PUT | `/users/me` | Any | Update profile (role locked after onboarding) |
| GET | `/users/me/dashboard` | Any | Role-aware dashboard stats |
| GET | `/users/{id}` | Admin | Fetch any user by ID |
| GET | `/users/` | Admin | List all users (paginated) |

</details>

<details>
<summary><strong>🧾 Invoices</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/invoices/` | Any | Create invoice (DRAFT status) |
| GET | `/invoices/` | Any | List invoices for current user |
| GET | `/invoices/{id}` | Any | Get invoice detail + milestones + escrow |
| PUT | `/invoices/{id}` | Freelancer | Update invoice (draft/sent only) |
| POST | `/invoices/{id}/send` | Freelancer | Send to client (DRAFT → SENT) |
| POST | `/invoices/{id}/fund` | Client | Fund from wallet → creates escrow |
| POST | `/invoices/{id}/cancel` | Any | Cancel invoice (pre-funding) |
| POST | `/invoices/{id}/terminate` | Client | Terminate project; refund remaining escrow |

</details>

<details>
<summary><strong>🏁 Milestones</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/milestones/` | Any | Create milestone |
| GET | `/milestones/invoice/{id}` | Any | List milestones for invoice |
| PUT | `/milestones/{id}` | Any | Update milestone (pending/in_progress) |
| POST | `/milestones/{id}/submit` | Freelancer | Submit work (IN_PROGRESS → SUBMITTED) |
| POST | `/milestones/{id}/approve` | Client | Approve work (SUBMITTED → APPROVED) |
| POST | `/milestones/{id}/reject` | Client | Send back for rework |
| POST | `/milestones/{id}/dispute` | Client | Raise dispute |
| POST | `/milestones/{id}/release` | Client | Approve + release payment in one step |

</details>

<details>
<summary><strong>💰 Wallet & Payments</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/wallet` | Any | Get wallet balance + escrow balance |
| POST | `/wallet/deposit` | Any | Deposit funds to wallet |
| GET | `/wallet/transactions` | Any | Transaction history |
| POST | `/payments/create-order` | Client | Create Razorpay order |
| POST | `/payments/verify` | Any | Verify payment signature; fund escrow |
| GET | `/payments/summary` | Any | Role-aware payment summary |
| GET | `/payments/escrow/{id}` | Any | Payment audit trail for escrow |

</details>

<details>
<summary><strong>⚖️ Disputes</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/disputes/` | Any | Raise dispute on milestone |
| GET | `/disputes/my` | Any | List own disputes |
| GET | `/disputes/` | Admin | All platform disputes |
| POST | `/disputes/{id}/review` | Admin | Mark as under review |
| POST | `/disputes/{id}/resolve` | Admin | Resolve (release or refund) |

</details>

<details>
<summary><strong>📝 Applications</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/applications/` | Freelancer | Apply to funded project |
| GET | `/applications/mine` | Freelancer | View own applications |
| GET | `/applications/invoice/{id}` | Client | View applicants for invoice |
| POST | `/applications/{id}/approve` | Client | Accept application → assign freelancer |
| POST | `/applications/{id}/reject` | Client | Reject application |

</details>

<details>
<summary><strong>🛡️ Admin</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/stats` | Admin | Platform-wide statistics |
| GET | `/admin/invoices` | Admin | All invoices |
| GET | `/admin/users` | Admin | All registered users |
| GET | `/admin/transactions` | Admin | All payment transactions |
| GET | `/admin/logs` | Admin | Recent activity log |

</details>

<details>
<summary><strong>💬 WebSocket Chat</strong></summary>

```
ws://localhost:8000/ws/chat/{invoice_id}?token=<clerk_jwt>
```
- Bidirectional real-time chat per invoice
- Only accessible by the invoice's client and freelancer
- Messages persisted to database
- Offline recipients notified by email

</details>

<details>
<summary><strong>🔔 Razorpay Webhook</strong></summary>

```
POST /payments/webhook
Header: X-Razorpay-Signature: <hmac_sha256>
```
Handles: `payment.captured`, `payment.failed`, `refund.processed`

</details>

---

## 📁 Project Structure

```
PaySure/
├── backend/
│   ├── app/
│   │   ├── main.py              # App factory + CORS + routers
│   │   ├── api/v1/              # Route handlers (14 modules)
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic settings (env vars)
│   │   │   ├── security.py      # Clerk JWT + RBAC
│   │   │   └── logging.py
│   │   ├── db/                  # SQLAlchemy base + session
│   │   ├── models/              # 10 SQLAlchemy models
│   │   ├── schemas/             # Pydantic request/response DTOs
│   │   ├── services/            # Business logic (15 service files)
│   │   └── utils/               # Exception handlers + response helpers
│   ├── alembic/                 # 7 migration versions
│   ├── tests/                   # 8 test modules
│   ├── pyproject.toml           # Build + tooling config
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx              # Routes + auth guards
        ├── pages/               # 11 page components
        ├── components/          # Shared UI components (shadcn/ui)
        ├── context/             # UserContext (global user state)
        ├── lib/                 # Auth guard HOCs
        ├── hooks/               # Custom React hooks
        └── config/              # Axios base config
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.13+
- Node.js 20+
- PostgreSQL (local or cloud)
- Clerk account at [clerk.com](https://clerk.com)
- Razorpay account (test mode) at [razorpay.com](https://razorpay.com) *(optional for local dev)*

---

### Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy and configure environment variables
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section)

# 5. Run database migrations
alembic upgrade head

# 6. Start the development server
uvicorn app.main:app --reload --port 8000
```

API is now running at:
- **API:** `http://localhost:8000`
- **Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **Health Check:** `http://localhost:8000/health`

---

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create environment file
# Create .env.local and add your Clerk publishable key:
# VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
# VITE_API_BASE_URL=http://localhost:8000

# 4. Start the development server
npm run dev
```

Frontend is now running at `http://localhost:5173`

---

## 🔧 Environment Variables

Create a `.env` file in the `backend/` directory using `.env.example` as a template:

```env
# ─── Database ────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# ─── App Settings ────────────────────────────────────────────
APP_NAME=PaySure
APP_ENV=development
DEBUG=True
SECRET_KEY=your_secret_key_here

# ─── JWT Settings ────────────────────────────────────────────
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# ─── Clerk (Authentication) ──────────────────────────────────
CLERK_SECRET_KEY=your_clerk_secret_key_here
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here

# ─── Razorpay (Payments) ─────────────────────────────────────
RAZORPAY_KEY_ID=your_razorpay_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# ─── Email (optional — defaults to no-op) ────────────────────
EMAIL_PROVIDER=           # "sendgrid" | "resend" | "" (disabled)
EMAIL_FROM=noreply@paysure.app
SENDGRID_API_KEY=
RESEND_API_KEY=

# ─── CORS ────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

> **Note:** If `RAZORPAY_KEY_ID` is not set, the backend falls back to mock order creation for local development — no real payments needed.

---

## 🧪 Running Tests

```bash
cd backend

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run a specific test file
pytest tests/test_invoices.py -v

# Run with coverage (requires pytest-cov)
pytest --cov=app tests/
```

**Test Coverage:**

| Test File | What It Tests |
|-----------|--------------|
| `test_auth.py` | Registration, login, JWT validation |
| `test_invoices.py` | Invoice CRUD + state transitions |
| `test_milestones.py` | Milestone lifecycle + state machine |
| `test_escrow.py` | Escrow creation, funding, release |
| `test_payments.py` | Payment order, verification |
| `test_disputes.py` | Dispute raise, review, resolve |
| `test_users.py` | Profile updates, role management |
| `test_health.py` | Server health check endpoint |

---

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **Freelancer** | Create invoices · Define milestones · Apply to funded projects · Submit work · Receive payments to wallet |
| **Client** | Fund invoices from wallet · Accept/reject freelancer applications · Approve/reject/dispute milestones · Terminate projects |
| **Admin** | Full platform visibility · Resolve disputes · View all users, invoices, transactions · Access activity logs |

> **Role Assignment:** On first login via Clerk, users are prompted to choose their role during onboarding. **Roles are permanently locked after onboarding** and cannot be changed.

---

## 📊 Platform Statistics (Demo)

| Metric | Value |
|--------|-------|
| Active Freelancers | 12,000+ |
| Escrow Volume | ₹42 Cr+ |
| Payment Success Rate | 99% |
| Dispute Resolution Time | < 24 hr |

---

## 🔮 Future Roadmap

- [ ] Background task queue (Celery + Redis) for scheduled auto-approval
- [ ] PDF invoice export
- [ ] File attachments in chat (S3 / Cloudflare R2)
- [ ] Freelancer discovery marketplace
- [ ] Stripe integration for international payments
- [ ] Mobile application (React Native)
- [ ] KYC/KYB verification (Aadhaar/PAN) for Indian compliance
- [ ] Advanced analytics dashboard with revenue charts

---

## 👨‍💻 Authors

| Name | Email | Institution |
|------|-------|-------------|
| **Saurabh Singh** | s24cseu0487@bennett.edu.in | Bennett University |
| **Krishna Gaur** | s24cseu0659@bennett.edu.in | Bennett University |

---

## 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">

**PaySure** — *Secure payments, every milestone.*

Built with ❤️ at Bennett University

</div>
