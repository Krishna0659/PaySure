from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.invoices import router as invoices_router
from app.api.v1.milestones import router as milestones_router
from app.api.v1.escrow import router as escrow_router
from app.api.v1.payments import router as payments_router
from app.api.v1.disputes import router as disputes_router

# Master v1 router — all routes prefixed with /api/v1
api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(invoices_router)
api_router.include_router(milestones_router)
api_router.include_router(escrow_router)
api_router.include_router(payments_router)
api_router.include_router(disputes_router)