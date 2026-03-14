import pytest
from datetime import datetime, timedelta


def create_funded_invoice(client, freelancer_headers, client_headers, client_user_id):
    """
    Helper that creates a complete funded invoice with one milestone.
    Returns (invoice_id, milestone_id, escrow_id).
    """
    # 1. Create invoice
    invoice_resp = client.post("/api/v1/invoices/", headers=freelancer_headers, json={
        "title": "Milestone Test Project",
        "description": "For milestone testing",
        "total_amount": 20000,
        "currency": "INR",
        "client_id": client_user_id,
        "due_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
    })
    invoice_id = invoice_resp.json()["data"]["id"]

    # 2. Add milestone
    ms_resp = client.post("/api/v1/milestones/", headers=freelancer_headers, json={
        "invoice_id": invoice_id,
        "title": "Design Phase",
        "description": "Complete UI design",
        "amount": 20000,
        "order": 1,
        "due_date": (datetime.utcnow() + timedelta(days=15)).isoformat(),
    })
    milestone_id = ms_resp.json()["data"]["id"]

    # 3. Send invoice
    client.post(f"/api/v1/invoices/{invoice_id}/send", headers=freelancer_headers)

    # 4. Create payment order (as client)
    order_resp = client.post("/api/v1/payments/create-order", headers=client_headers, json={
        "invoice_id": invoice_id,
        "amount": 20000,
        "currency": "INR"
    })
    order_data = order_resp.json()["data"]

    # 5. Verify payment — funds escrow
    client.post("/api/v1/payments/verify", headers=client_headers, json={
        "razorpay_order_id": order_data["razorpay_order_id"],
        "razorpay_payment_id": "pay_mock_pytest",
        "razorpay_signature": "mock_signature",
        "payment_id": str(order_data["payment_id"])
    })

    return invoice_id, milestone_id


class TestCreateMilestone:
    """Tests for POST /api/v1/milestones/"""

    def test_create_milestone_success(self, client, freelancer_headers, client_user_id):
        """Freelancer can add a milestone to their invoice."""
        invoice_resp = client.post("/api/v1/invoices/", headers=freelancer_headers, json={
            "title": "MS Create Test",
            "description": "Test",
            "total_amount": 10000,
            "currency": "INR",
            "client_id": client_user_id,
            "due_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        })
        invoice_id = invoice_resp.json()["data"]["id"]

        response = client.post("/api/v1/milestones/", headers=freelancer_headers, json={
            "invoice_id": invoice_id,
            "title": "Phase 1",
            "description": "First phase",
            "amount": 10000,
            "order": 1,
            "due_date": (datetime.utcnow() + timedelta(days=15)).isoformat(),
        })
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["status"] == "pending"
        assert data["amount"] == 10000

    def test_create_milestone_zero_amount_fails(self, client, freelancer_headers, client_user_id):
        """Milestone with zero amount returns 422."""
        invoice_resp = client.post("/api/v1/invoices/", headers=freelancer_headers, json={
            "title": "Zero MS Test",
            "description": "Test",
            "total_amount": 10000,
            "currency": "INR",
            "client_id": client_user_id,
            "due_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        })
        invoice_id = invoice_resp.json()["data"]["id"]

        response = client.post("/api/v1/milestones/", headers=freelancer_headers, json={
            "invoice_id": invoice_id,
            "title": "Zero Phase",
            "description": "Should fail",
            "amount": 0,
            "order": 1,
            "due_date": (datetime.utcnow() + timedelta(days=15)).isoformat(),
        })
        assert response.status_code == 422


class TestMilestoneStateTransitions:
    """Tests for milestone state machine: submit → approve → dispute"""

    def test_submit_milestone_success(self, client, freelancer_headers, client_headers, client_user_id):
        """Freelancer can submit a milestone that is IN_PROGRESS."""
        invoice_id, milestone_id = create_funded_invoice(
            client, freelancer_headers, client_headers, client_user_id
        )
        response = client.post(
            f"/api/v1/milestones/{milestone_id}/submit",
            headers=freelancer_headers
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["status"] == "submitted"
        assert data["submitted_at"] is not None

    def test_client_cannot_submit_milestone(self, client, freelancer_headers, client_headers, client_user_id):
        """Client cannot submit a milestone — only freelancer can."""
        invoice_id, milestone_id = create_funded_invoice(
            client, freelancer_headers, client_headers, client_user_id
        )
        response = client.post(
            f"/api/v1/milestones/{milestone_id}/submit",
            headers=client_headers
        )
        assert response.status_code == 403

    def test_approve_milestone_success(self, client, freelancer_headers, client_headers, client_user_id):
        """Client can approve a SUBMITTED milestone."""
        invoice_id, milestone_id = create_funded_invoice(
            client, freelancer_headers, client_headers, client_user_id
        )
        # Submit first
        client.post(f"/api/v1/milestones/{milestone_id}/submit", headers=freelancer_headers)
        # Then approve
        response = client.post(
            f"/api/v1/milestones/{milestone_id}/approve",
            headers=client_headers
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["status"] == "approved"
        assert data["approved_at"] is not None

    def test_freelancer_cannot_approve_own_milestone(self, client, freelancer_headers, client_headers, client_user_id):
        """Freelancer cannot approve their own milestone — returns 403."""
        invoice_id, milestone_id = create_funded_invoice(
            client, freelancer_headers, client_headers, client_user_id
        )
        client.post(f"/api/v1/milestones/{milestone_id}/submit", headers=freelancer_headers)
        response = client.post(
            f"/api/v1/milestones/{milestone_id}/approve",
            headers=freelancer_headers
        )
        assert response.status_code == 403

    def test_cannot_approve_pending_milestone(self, client, freelancer_headers, client_headers, client_user_id):
        """Cannot approve a milestone that hasn't been submitted yet."""
        invoice_id, milestone_id = create_funded_invoice(
            client, freelancer_headers, client_headers, client_user_id
        )
        # Don't submit — try to approve directly
        response = client.post(
            f"/api/v1/milestones/{milestone_id}/approve",
            headers=client_headers
        )
        assert response.status_code == 400

    def test_dispute_submitted_milestone(self, client, freelancer_headers, client_headers, client_user_id):
        """Client can dispute a SUBMITTED milestone."""
        invoice_id, milestone_id = create_funded_invoice(
            client, freelancer_headers, client_headers, client_user_id
        )
        client.post(f"/api/v1/milestones/{milestone_id}/submit", headers=freelancer_headers)
        response = client.post(
            f"/api/v1/milestones/{milestone_id}/dispute",
            headers=client_headers
        )
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "disputed"

    def test_cannot_dispute_pending_milestone(self, client, freelancer_headers, client_headers, client_user_id):
        """Cannot dispute a milestone that hasn't been submitted."""
        invoice_id, milestone_id = create_funded_invoice(
            client, freelancer_headers, client_headers, client_user_id
        )
        response = client.post(
            f"/api/v1/milestones/{milestone_id}/dispute",
            headers=client_headers
        )
        assert response.status_code == 400