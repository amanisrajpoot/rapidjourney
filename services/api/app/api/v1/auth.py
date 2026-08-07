from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.core.security import generate_otp, create_access_token, create_refresh_token
from app.core.redis import RedisClient
from app.core.config import settings
import uuid
import httpx
router = APIRouter()

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    code: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class GoogleLoginRequest(BaseModel):
    id_token: str

@router.post("/otp/send", status_code=200)
async def send_otp(request: OTPRequest, redis_client: RedisClient = Depends(RedisClient.get_client)):
    # Rate limiting simple check
    # Generate OTP
    code = generate_otp()
    # Store in Redis with TTL
    await redis_client.setex(f"otp:{request.phone}", settings.OTP_EXPIRE_SECONDS, code)
    
    # Send SMS via Fast2SMS if API key is configured
    if settings.FAST2SMS_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://www.fast2sms.com/dev/bulkV2",
                    params={
                        "authorization": settings.FAST2SMS_API_KEY,
                        "variables_values": code,
                        "route": "otp",
                        "numbers": request.phone
                    }
                )
                response.raise_for_status()
                print(f"[OTP] Fast2SMS sent successfully to {request.phone}")
        except Exception as e:
            print(f"[OTP Error] Fast2SMS failed: {e}")
            # Do not fail the request in dev if SMS fails, just log it
    else:
        print(f"[OTP Console Fallback] Phone {request.phone} -> Code {code}")
        
    return {"detail": "OTP sent"}

@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(payload: OTPVerify, redis_client: RedisClient = Depends(RedisClient.get_client)):
    stored = await redis_client.get(f"otp:{payload.phone}")
    if stored is None or stored != payload.code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")
    # OTP valid, delete it
    await redis_client.delete(f"otp:{payload.phone}")
    # Create user identifier (for demo generate UUID)
    user_id = str(uuid.uuid4())
    access = create_access_token(subject=user_id)
    refresh = create_refresh_token(subject=user_id)
    return TokenResponse(access_token=access, refresh_token=refresh)

@router.post("/google", response_model=TokenResponse)
async def google_login(payload: GoogleLoginRequest):
    # Placeholder: In real implementation verify with Google
    # For now accept any string and issue tokens
    user_id = str(uuid.uuid4())
    access = create_access_token(subject=user_id)
    refresh = create_refresh_token(subject=user_id)
    return TokenResponse(access_token=access, refresh_token=refresh)

@router.post("/guest", response_model=TokenResponse)
async def guest_login():
    user_id = str(uuid.uuid4())
    access = create_access_token(subject=user_id)
    refresh = create_refresh_token(subject=user_id)
    return TokenResponse(access_token=access, refresh_token=refresh)
