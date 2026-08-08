from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.auth import router as auth_router

app = FastAPI(title="Journey API", version="0.1.0")

# CORS - allow the frontend (localhost:3000) and any future origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])

from app.api.v1.journeys import router as journeys_router
from app.api.v1.requests import router as requests_router
from app.api.v1.ws import router as ws_router
from app.api.v1.notifications import router as notifications_router

app.include_router(journeys_router, prefix="/api/v1/journeys", tags=["journeys"])
app.include_router(requests_router, prefix="/api/v1/journeys", tags=["requests"])
app.include_router(ws_router, prefix="/api/v1/ws", tags=["websocket"])
app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["notifications"])

@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
