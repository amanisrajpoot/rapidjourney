from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.auth import router as auth_router

app = FastAPI(title="Journey API", version="0.1.0")

# CORS - allow the frontend (localhost:3000) and any future origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])

@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
