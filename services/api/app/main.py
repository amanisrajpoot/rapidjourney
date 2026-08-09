from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.auth import router as auth_router

app = FastAPI(title="Journey API", version="0.1.0")

# CORS - allow all origins in development; restrict to specific domains in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])

from app.api.v1.journeys import router as journeys_router
from app.api.v1.requests import router as requests_router
from app.api.v1.ws import router as ws_router
from app.api.v1.users import router as users_router
from app.api.v1.messages import router as messages_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.payments import router as payments_router

app.include_router(journeys_router, prefix="/api/v1/journeys", tags=["journeys"])
app.include_router(requests_router, prefix="/api/v1/journeys", tags=["requests"])
app.include_router(messages_router, prefix="/api/v1/journeys", tags=["messages"])
app.include_router(ws_router, prefix="/api/v1/ws", tags=["websocket"])
app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(payments_router, prefix="/api/v1/payments", tags=["payments"])

@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
