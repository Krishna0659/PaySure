import pytest
from datetime import datetime, timedelta


def create_fully_funded_invoice(client, freelancer_headers, client_headers, client_user_id, amount=25000):
    """
    Creates invoice + 2 milestones + funds escrow.
    Returns (invoice_id, milestone1_id, milestone2_id, escrow_id).
    """
    invoice_resp = client.post("/api/v1/invoices/", headers=freelancer_headers, json={
        "title": "Escrow Test Project",
        "description": "For escrow testing",
        "total_amount": amount,
        "currency": "INR",
        "client_id": client_user_id,
        "due_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
    })
    invoice_id = invoice_resp.json()["data"]["id"]

    ms1 = client.post("/api/v1/milestones/", headers=freelancer_headers, json={
        "invoice_id": invoice_id, "title": "Phase 1", "description": "First",
        "amount": 10000, "order": 1,
        "due_date": (datetime.utcnow() + timedelta(days=10)).isoformat(),
    }).json()["data"]["id"]

    ms2 = client.post("/api/v1/milestones/", headers=freelancer_headers, json={
        "invoice_id": invoice_id, "title": "Phase 2", "description": "Second",
        "amount": 15000, "order": 2,
        "due_date": (datetime.utcnow() + timedelta(days=20)).isoformat(),
    }).json()["data"]["id"]

    client.post(f"/api/v1/invoices/{invoice_id}/send", headers=freelancer_headers)

    order_resp = client.post("/api/v1/payments/create-order", headers=client_headers, json={
        "invoice_id": invoice_id, "amount": amount, "currency": "INR"
    })
    order_data = order_resp.json()["data"]

    verify_resp = client.post("/api/v1/payments/verify", headers=client_headers, json={
        "razorpay_order_id": order_data["razorpay_order_id"],
        "razorpay_payment_id": "pay_mock_escrow",
        "razorpay_signature": "mock_sig",
        "payment_id": str(order_data["payment_id"])
    })

    escrow_resp = client.get(f"/api/v1/escrow/invoice/{invoice_id}", headers=client_headers)
    escrow_id = escrow_resp.json()["data"]["id"]

    return invoice_id, ms1, ms2, escrow_id


class TestGetEscrow:
    """Tests for GET /api/v1/escrow/invoice/{invoice_id}"""

    def test_get_escrow_after_funding(self, client, freelancer_headers, client_headers, client_user_id):
        """Escrow record exists and shows funded status after payment."""
        invoice_id, ms1, ms2, escrow_id = create_fully_funded_invoice(
            client, freelancer_headers, client_headers, client_user_id
        )
        response = client.get(f"/api/v1/escrow/invoice/{invoice_id}", headers=client_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["status"] == "funded"
        assert data["total_amount"] == 25000
        assert data["released_amount"] == 0
        assert data["remaining_amount"] == 25000

    def test_get_escrow_without_auth_fails(self, client, freelancer_headers, client_headers, client_user_id):
        """Cannot fetch escrow without authentication."""
        invoice_id, _, _, _ = create_fully_funded_invoice(
            client, freelancer_headers, client_headers, client_user_id
        )
        response = client.get(f"/api/v1/escrow/invoice/{invoice_id}")
        assert response.status_code == 401


class TestReleasePayment:
    """Tests for POST /api/v1/escrow/release/{milestone_id}"""

    def test_release_approved_milestone(self, client, freelancer_headers, client_headers, client_user_id):
        """Releasing an approved milestone updates escrow amounts correctly."""
        invoice_id, ms1, ms2, escrow_id = create_fully_funded_invoice(
            client, freelancer_headers, client_headers, client_user_id
        )
        # Submit + approve milestone 1
        client.post(f"/api/v1/milestones/{ms1}/submit", headers=freelancer_headers)
        client.post(f"/api/v1/milestones/{ms1}/approve", headers=client_headers)

        # Release payment
        response = client.post(f"/api/v1/escrow/release/{ms1}", headers=client_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["released_amount"] == 10000
        assert data["remaining_amount"] == 15000
        assert data["status"] == "partially_released"

    def test_cannot_release_unapproved_milestone(self, client, freelancer_headers, client_headers, client_user_id):
        """Cannot release payment for a milestone that is not approved."""
        invoice_id, ms1, ms2, escrow_id = create_fully_funded_invoice(
            client, freelancer_headers, client_headers, client_user_id
        )
        # Try to release without approving
        response = client.post(f"/api/v1/escrow/release/{ms1}", headers=client_headers)
        assert response.status_code == 400

    def test_full_release_completes_invoice(self, client, freelancer_headers, client_headers, client_user_id):
        """When all milestones released, escrow becomes FULLY_RELEASED and invoice COMPLETED."""
        invoice_id, ms1, ms2, escrow_id = create_fully_funded_invoice(
            client, freelancer_headers, client_headers, client_user_id
        )
        # Complete milestone 1
        client.post(f"/api/v1/milestones/{ms1}/submit", headers=freelancer_headers)
        client.post(f"/api/v1/milestones/{ms1}/approve", headers=client_headers)
        client.post(f"/api/v1/escrow/release/{ms1}", headers=client_headers)

        # Complete milestone 2
        client.post(f"/api/v1/milestones/{ms2}/submit", headers=freelancer_headers)
        client.post(f"/api/v1/milestones/{ms2}/approve", headers=client_headers)
        release_resp = client.post(f"/api/v1/escrow/release/{ms2}", headers=client_headers)

        data = release_resp.json()["data"]
        assert data["released_amount"] == 25000
        assert data["remaining_amount"] == 0
        assert data["status"] == "fully_released"

    def test_next_milestone_activates_after_release(self, client, freelancer_headers, client_headers, client_user_id):
        """After releasing milestone 1, milestone 2 auto-activates to IN_PROGRESS."""
        invoice_id, ms1, ms2, escrow_id = create_fully_funded_invoice(
            client, freelancer_headers, client_headers, client_user_id
        )
        client.post(f"/api/v1/milestones/{ms1}/submit", headers=freelancer_headers)
        client.post(f"/api/v1/milestones/{ms1}/approve", headers=client_headers)
        client.post(f"/api/v1/escrow/release/{ms1}", headers=client_headers)

        # Check milestone 2 status
        ms2_resp = client.get(f"/api/v1/milestones/{ms2}", headers=freelancer_headers)
        assert ms2_resp.json()["data"]["status"] == "in_progress"