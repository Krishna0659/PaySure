from typing import List, Optional
from pydantic import BaseModel
from .invoice import InvoiceResponse
from .milestone import MilestoneResponse
from .payment import PaymentResponse

class DashboardStat(BaseModel):
    label: str
    value: str
    sub: Optional[str] = None

class DashboardResponse(BaseModel):
    stats: List[DashboardStat]
    invoices: List[InvoiceResponse]
    milestones: List[MilestoneResponse]
    payments: List[PaymentResponse]
