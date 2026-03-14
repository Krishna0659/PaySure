import pytest
from datetime import datetime, timedelta


def make_invoice_payload(client_id: str) -> dict:
    """Helper to generate a valid invoice payload."""
    return {
        "title": "Test Project Invoice",
        "description": "A test project for pytest",
        "total_amount": 30000,
        "currency": "INR",
        "client_id": client_id,
        "due_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
    }


class TestCreateInvoice:
    """Tests for POST /api/v1/invoices/"""

    def test_create_invoice_success(self, client, freelancer_headers, client_user_id):
        """Freelancer can create an invoice successfully."""
        response = client.post("/api/v1/invoices/",
            headers=freelancer_headers,
            json=make_invoice_payload(client_user_id)
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["status"] == "draft"
        assert data["total_amount"] == 30000
        assert "invoice_number" in data
        assert data["invoice_number"].startswith("INV-")

    def test_create_invoice_without_auth_fails(self, client, client_user_id):
        """Unauthenticated request returns 401."""
        response = client.post("/api/v1/invoices/",
            json=make_invoice_payload(client_user_id)
        )
        assert response.status_code == 401

    def test_create_invoice_zero_amount_fails(self, client, freelancer_headers, client_user_id):
        """Invoice with zero amount returns 422."""
        payload = make_invoice_payload(client_user_id)
        payload["total_amount"] = 0
        response = client.post("/api/v1/invoices/",
            headers=freelancer_headers,
            json=payload
        )
        assert response.status_code == 422

    def test_create_invoice_negative_amount_fails(self, client, freelancer_headers, client_user_id):
        """Invoice with negative amount returns 422."""
        payload = make_invoice_payload(client_user_id)
        payload["total_amount"] = -5000
        response = client.post("/api/v1/invoices/",
            headers=freelancer_headers,
            json=payload
        )
        assert response.status_code == 422

    def test_invoice_number_auto_generated(self, client, freelancer_headers, client_user_id):
        """Invoice number is auto-generated in INV-YYYY-NNNN format."""
        response = client.post("/api/v1/invoices/",
            headers=freelancer_headers,
            json=make_invoice_payload(client_user_id)
        )
        invoice_number = response.json()["data"]["invoice_number"]
        parts = invoice_number.split("-")
        assert len(parts) == 3
        assert parts[0] == "INV"
        assert len(parts[1]) == 4   # Year
        assert len(parts[2]) == 4   # Sequence


class TestGetInvoice:
    """Tests for GET /api/v1/invoices/{id}"""

    def test_get_invoice_by_id(self, client, freelancer_headers, client_user_id):
        """Can retrieve a specific invoice by ID."""
        create_resp = client.post("/api/v1/invoices/",
            headers=freelancer_headers,
            json=make_invoice_payload(client_user_id)
        )
        invoice_id = create_resp.json()["data"]["id"]
        response = client.get(f"/api/v1/invoices/{invoice_id}",
            headers=freelancer_headers
        )
        assert response.status_code == 200
        assert response.json()["data"]["id"] == invoice_id

    def test_get_nonexistent_invoice_returns_404(self, client, freelancer_headers):
        """Fetching a non-existent invoice ID returns 404."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/v1/invoices/{fake_id}",
            headers=freelancer_headers
        )
        assert response.status_code == 404


class TestInvoiceStateTransitions:
    """Tests for invoice state machine transitions."""

    def test_send_invoice_transitions_to_sent(self, client, freelancer_headers, client_user_id):
        """Invoice moves from DRAFT to SENT when /send is called."""
        create_resp = client.post("/api/v1/invoices/",
            headers=freelancer_headers,
            json=make_invoice_payload(client_user_id)
        )
        invoice_id = create_resp.json()["data"]["id"]
        send_resp = client.post(f"/api/v1/invoices/{invoice_id}/send",
            headers=freelancer_headers
        )
        assert send_resp.status_code == 200
        assert send_resp.json()["data"]["status"] == "sent"

    def test_cannot_send_already_sent_invoice(self, client, freelancer_headers, client_user_id):
        """Calling /send on already SENT invoice returns 400."""
        create_resp = client.post("/api/v1/invoices/",
            headers=freelancer_headers,
            json=make_invoice_payload(client_user_id)
        )
        invoice_id = create_resp.json()["data"]["id"]
        client.post(f"/api/v1/invoices/{invoice_id}/send", headers=freelancer_headers)
        # Send again — should fail
        response = client.post(f"/api/v1/invoices/{invoice_id}/send",
            headers=freelancer_headers
        )
        assert response.status_code == 400

    def test_cancel_draft_invoice(self, client, freelancer_headers, client_user_id):
        """Freelancer can cancel a DRAFT invoice."""
        create_resp = client.post("/api/v1/invoices/",
            headers=freelancer_headers,
            json=make_invoice_payload(client_user_id)
        )
        invoice_id = create_resp.json()["data"]["id"]
        cancel_resp = client.post(f"/api/v1/invoices/{invoice_id}/cancel",
            headers=freelancer_headers
        )
        assert cancel_resp.status_code == 200
        assert cancel_resp.json()["data"]["status"] == "cancelled"

    def test_client_cannot_send_invoice(self, client, client_headers, client_user_id, freelancer_headers):
        """Client cannot call /send on a freelancer's invoice — returns 403."""
        create_resp = client.post("/api/v1/invoices/",
            headers=freelancer_headers,
            json=make_invoice_payload(client_user_id)
        )
        invoice_id = create_resp.json()["data"]["id"]
        response = client.post(f"/api/v1/invoices/{invoice_id}/send",
            headers=client_headers
        )
        assert response.status_code == 403