import pytest
from datetime import datetime, timedelta


def create_disputed_milestone(client, freelancer_headers, client_headers, admin_headers, client_user_id):
    """
    Helper: Creates full workflow up to a disputed milestone.
    Returns (invoice_id, milestone_id, dispute_id).
    """
    invoice_resp = client.post("/api/v1/invoices/", headers=freelancer_headers, json={
        "title": "Dispute Test Project",
        "description": "For dispute testing",
        "total_amount": 10000,
        "currency": "INR",
        "client_id": client_user_id,
        "due_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
    })
    invoice_id = invoice_resp.json()["data"]["id"]

    ms_resp = client.post("/api/v1/milestones/", headers=freelancer_headers, json={
        "invoice_id": invoice_id, "title": "Disputed Phase",
        "description": "Work to be disputed", "amount": 10000, "order": 1,
        "due_date": (datetime.utcnow() + timedelta(days=10)).isoformat(),
    })
    milestone_id = ms_resp.json()["data"]["id"]

    client.post(f"/api/v1/invoices/{invoice_id}/send", headers=freelancer_headers)
    order_resp = client.post("/api/v1/payments/create-order", headers=client_headers, json={
        "invoice_id": invoice_id, "amount": 10000, "currency": "INR"
    })
    order_data = order_resp.json()["data"]
    client.post("/api/v1/payments/verify", headers=client_headers, json={
        "razorpay_order_id": order_data["razorpay_order_id"],
        "razorpay_payment_id": "pay_mock_dispute",
        "razorpay_signature": "mock_sig",
        "payment_id": str(order_data["payment_id"])
    })
    client.post(f"/api/v1/milestones/{milestone_id}/submit", headers=freelancer_headers)

    dispute_resp = client.post("/api/v1/disputes/", headers=client_headers, json={
        "milestone_id": milestone_id,
        "reason": "Work quality does not meet agreed standards"
    })
    dispute_id = dispute_resp.json()["data"]["id"]
    return invoice_id, milestone_id, dispute_id


class TestRaiseDispute:
    """Tests for POST /api/v1/disputes/"""

    def test_raise_dispute_success(self, client, freelancer_headers, client_headers, admin_headers, client_user_id):
        """Client can raise a dispute on a submitted milestone."""
        _, milestone_id, dispute_id = create_disputed_milestone(
            client, freelancer_headers, client_headers, admin_headers, client_user_id
        )
        assert dispute_id is not None

    def test_dispute_response_has_correct_fields(self, client, freelancer_headers, client_headers, admin_headers, client_user_id):
        """Dispute response contains all required fields."""
        _, milestone_id, dispute_id = create_disputed_milestone(
            client, freelancer_headers, client_headers, admin_headers, client_user_id
        )
        resp = client.get(f"/api/v1/disputes/{dispute_id}", headers=client_headers)
        data = resp.json()["data"]
        assert "id" in data
        assert "milestone_id" in data
        assert "reason" in data
        assert "status" in data
        assert data["status"] == "open"

    def test_freelancer_cannot_raise_dispute(self, client, freelancer_headers, client_headers, client_user_id):
        """Freelancer cannot raise a dispute — only client can."""
        invoice_resp = client.post("/api/v1/invoices/", headers=freelancer_headers, json={
            "title": "No Dispute Project",
            "description": "Test",
            "total_amount": 5000,
            "currency": "INR",
            "client_id": client_user_id,
            "due_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        })
        invoice_id = invoice_resp.json()["data"]["id"]
        ms_resp = client.post("/api/v1/milestones/", headers=freelancer_headers, json={
            "invoice_id": invoice_id, "title": "Phase", "description": "D",
            "amount": 5000, "order": 1,
            "due_date": (datetime.utcnow() + timedelta(days=10)).isoformat(),
        })
        milestone_id = ms_resp.json()["data"]["id"]

        client.post(f"/api/v1/invoices/{invoice_id}/send", headers=freelancer_headers)
        order_resp = client.post("/api/v1/payments/create-order", headers=client_headers, json={
            "invoice_id": invoice_id, "amount": 5000, "currency": "INR"
        })
        order_data = order_resp.json()["data"]
        client.post("/api/v1/payments/verify", headers=client_headers, json={
            "razorpay_order_id": order_data["razorpay_order_id"],
            "razorpay_payment_id": "pay_mock_x",
            "razorpay_signature": "mock_sig",
            "payment_id": str(order_data["payment_id"])
        })
        client.post(f"/api/v1/milestones/{milestone_id}/submit", headers=freelancer_headers)

        response = client.post("/api/v1/disputes/", headers=freelancer_headers, json={
            "milestone_id": milestone_id,
            "reason": "I dispute my own work"
        })
        assert response.status_code == 403


class TestListDisputes:
    """Tests for GET /api/v1/disputes/"""

    def test_client_can_list_own_disputes(self, client, freelancer_headers, client_headers, admin_headers, client_user_id):
        """Client can see their own disputes via /my endpoint."""
        create_disputed_milestone(
            client, freelancer_headers, client_headers, admin_headers, client_user_id
        )
        response = client.get("/api/v1/disputes/my", headers=client_headers)
        assert response.status_code == 200
        assert isinstance(response.json()["data"], list)

    def test_admin_can_list_all_disputes(self, client, freelancer_headers, client_headers, admin_headers, client_user_id):
        """Admin can see all disputes in the system."""
        create_disputed_milestone(
            client, freelancer_headers, client_headers, admin_headers, client_user_id
        )
        response = client.get("/api/v1/disputes/", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json()["data"], list)

    def test_non_admin_cannot_list_all_disputes(self, client, client_headers):
        """Non-admin cannot access all disputes list — returns 403."""
        response = client.get("/api/v1/disputes/", headers=client_headers)
        assert response.status_code == 403


class TestResolveDispute:
    """Tests for POST /api/v1/disputes/{id}/resolve"""

    def test_admin_resolves_in_freelancer_favor(self, client, freelancer_headers, client_headers, admin_headers, client_user_id):
        """Admin resolving in freelancer's favor releases payment."""
        _, milestone_id, dispute_id = create_disputed_milestone(
            client, freelancer_headers, client_headers, admin_headers, client_user_id
        )
        client.post(f"/api/v1/disputes/{dispute_id}/review", headers=admin_headers)

        response = client.post(f"/api/v1/disputes/{dispute_id}/resolve",
            headers=admin_headers,
            json={"status": "resolved_release", "admin_notes": "Work meets standards"}
        )
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "resolved"

    def test_admin_resolves_in_client_favor(self, client, freelancer_headers, client_headers, admin_headers, client_user_id):
        """Admin resolving in client's favor refunds payment."""
        _, milestone_id, dispute_id = create_disputed_milestone(
            client, freelancer_headers, client_headers, admin_headers, client_user_id
        )
        client.post(f"/api/v1/disputes/{dispute_id}/review", headers=admin_headers)

        response = client.post(f"/api/v1/disputes/{dispute_id}/resolve",
            headers=admin_headers,
            json={"status": "resolved_refund", "admin_notes": "Work not delivered as agreed"}
        )
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "resolved"

    def test_non_admin_cannot_resolve_dispute(self, client, freelancer_headers, client_headers, admin_headers, client_user_id):
        """Only admin can resolve disputes — client gets 403."""
        _, _, dispute_id = create_disputed_milestone(
            client, freelancer_headers, client_headers, admin_headers, client_user_id
        )
        response = client.post(f"/api/v1/disputes/{dispute_id}/resolve",
            headers=client_headers,
            json={"status": "resolved_release", "admin_notes": "Self resolve"}
        )
        assert response.status_code == 403