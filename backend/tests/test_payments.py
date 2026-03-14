import pytest
from datetime import datetime, timedelta


def create_sent_invoice(client, freelancer_headers, client_user_id):
    """Helper: creates invoice + milestone + sends it. Returns invoice_id."""
    invoice_resp = client.post("/api/v1/invoices/", headers=freelancer_headers, json={
        "title": "Payment Test Project",
        "description": "For payment testing",
        "total_amount": 15000,
        "currency": "INR",
        "client_id": client_user_id,
        "due_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
    })
    invoice_id = invoice_resp.json()["data"]["id"]

    client.post("/api/v1/milestones/", headers=freelancer_headers, json={
        "invoice_id": invoice_id,
        "title": "Delivery",
        "description": "Final delivery",
        "amount": 15000,
        "order": 1,
        "due_date": (datetime.utcnow() + timedelta(days=15)).isoformat(),
    })

    client.post(f"/api/v1/invoices/{invoice_id}/send", headers=freelancer_headers)
    return invoice_id


class TestCreatePaymentOrder:
    """Tests for POST /api/v1/payments/create-order"""

    def test_create_order_success(self, client, freelancer_headers, client_headers, client_user_id):
        """Client can create a payment order for a sent invoice."""
        invoice_id = create_sent_invoice(client, freelancer_headers, client_user_id)
        response = client.post("/api/v1/payments/create-order",
            headers=client_headers,
            json={
                "invoice_id": invoice_id,
                "amount": 15000,
                "currency": "INR"
            }
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert "razorpay_order_id" in data
        assert "payment_id" in data
        assert data["amount"] == 15000
        assert data["currency"] == "INR"

    def test_create_order_mock_id_format(self, client, freelancer_headers, client_headers, client_user_id):
        """In dev mode, mock order ID starts with 'order_mock_'."""
        invoice_id = create_sent_invoice(client, freelancer_headers, client_user_id)
        response = client.post("/api/v1/payments/create-order",
            headers=client_headers,
            json={"invoice_id": invoice_id, "amount": 15000, "currency": "INR"}
        )
        order_id = response.json()["data"]["razorpay_order_id"]
        assert order_id.startswith("order_mock_")

    def test_create_order_without_auth_fails(self, client, freelancer_headers, client_user_id):
        """Unauthenticated order creation returns 401."""
        invoice_id = create_sent_invoice(client, freelancer_headers, client_user_id)
        response = client.post("/api/v1/payments/create-order",
            json={"invoice_id": invoice_id, "amount": 15000, "currency": "INR"}
        )
        assert response.status_code == 401


class TestVerifyPayment:
    """Tests for POST /api/v1/payments/verify"""

    def test_verify_mock_payment_success(self, client, freelancer_headers, client_headers, client_user_id):
        """Mock payment verification succeeds and funds escrow."""
        invoice_id = create_sent_invoice(client, freelancer_headers, client_user_id)
        order_resp = client.post("/api/v1/payments/create-order",
            headers=client_headers,
            json={"invoice_id": invoice_id, "amount": 15000, "currency": "INR"}
        )
        order_data = order_resp.json()["data"]

        verify_resp = client.post("/api/v1/payments/verify",
            headers=client_headers,
            json={
                "razorpay_order_id": order_data["razorpay_order_id"],
                "razorpay_payment_id": "pay_mock_pytest123",
                "razorpay_signature": "mock_signature",
                "payment_id": str(order_data["payment_id"])
            }
        )
        assert verify_resp.status_code == 200
        data = verify_resp.json()["data"]
        assert data["status"] == "captured"

    def test_verify_with_invalid_payment_id_fails(self, client, client_headers):
        """Verify with non-UUID payment_id returns 422."""
        response = client.post("/api/v1/payments/verify",
            headers=client_headers,
            json={
                "razorpay_order_id": "order_mock_abc",
                "razorpay_payment_id": "pay_123",
                "razorpay_signature": "sig",
                "payment_id": "not-a-uuid"
            }
        )
        assert response.status_code == 422

    def test_verify_with_nonexistent_payment_id_fails(self, client, client_headers):
        """Verify with valid UUID but nonexistent payment returns 404."""
        response = client.post("/api/v1/payments/verify",
            headers=client_headers,
            json={
                "razorpay_order_id": "order_mock_abc",
                "razorpay_payment_id": "pay_123",
                "razorpay_signature": "sig",
                "payment_id": "00000000-0000-0000-0000-000000000000"
            }
        )
        assert response.status_code == 404