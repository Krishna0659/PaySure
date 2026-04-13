from fastapi import APIRouter

from app.api.v1.users import router as users_router
from app.api.v1.invoices import router as invoices_router
from app.api.v1.milestones import router as milestones_router
from app.api.v1.escrow import router as escrow_router
from app.api.v1.payments import router as payments_router
from app.api.v1.disputes import router as disputes_router
from app.api.v1.messages import router as messages_router
from app.api.v1.ratings import router as ratings_router
from app.api.v1.admin import router as admin_router
from app.api.v1.chat_ws import router as chat_ws_router
from app.api.v1.wallet import router as wallet_router
from app.api.v1.applications import router as applications_router

# Master v1 router — all routes prefixed with /api/v1
api_router = APIRouter(prefix="/api/v1")

api_router.include_router(users_router)
api_router.include_router(invoices_router)
api_router.include_router(milestones_router)
api_router.include_router(escrow_router)
api_router.include_router(payments_router)
api_router.include_router(disputes_router)
api_router.include_router(messages_router)
api_router.include_router(ratings_router)
api_router.include_router(admin_router)
api_router.include_router(chat_ws_router)
api_router.include_router(wallet_router)
api_router.include_router(applications_router)