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
        print(f"[OTP Console Fallback] Phone {request.phone} -> Code {code}", flush=True)
        
    return {"detail": "OTP sent", "otp": code}

from app.core.database import AsyncSessionLocal
from app.models.user import User

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(
    payload: OTPVerify, 
    redis_client: RedisClient = Depends(RedisClient.get_client),
    db = Depends(get_db)
):
    stored = await redis_client.get(f"otp:{payload.phone}")
    if stored is None or stored != payload.code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")
    
    await redis_client.delete(f"otp:{payload.phone}")
    
    from sqlalchemy import select
    
    # Check if user exists by phone
    result = await db.execute(select(User).where(User.phone == payload.phone))
    user = result.scalars().first()
    
    if not user:
        user = User(phone=payload.phone)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    user_id = str(user.id)
    access = create_access_token(subject=user_id)
    refresh = create_refresh_token(subject=user_id)
    return TokenResponse(access_token=access, refresh_token=refresh)

@router.post("/google", response_model=TokenResponse)
async def google_login(payload: GoogleLoginRequest, db = Depends(get_db)):
    new_user = User(email="google@example.com") # Fake for now
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    user_id = str(new_user.id)
    access = create_access_token(subject=user_id)
    refresh = create_refresh_token(subject=user_id)
    return TokenResponse(access_token=access, refresh_token=refresh)

@router.post("/guest", response_model=TokenResponse)
async def guest_login(db = Depends(get_db)):
    new_user = User(phone=f"guest_{uuid.uuid4().hex[:8]}")
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    user_id = str(new_user.id)
    access = create_access_token(subject=user_id)
    refresh = create_refresh_token(subject=user_id)
    return TokenResponse(access_token=access, refresh_token=refresh)


class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest):
    """Exchange a valid refresh token for a new access token."""
    from app.core.security import verify_token
    from jose import JWTError
    try:
        data = verify_token(payload.refresh_token)
        if data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        user_id = data.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token expired or invalid")
    
    new_access = create_access_token(subject=user_id)
    new_refresh = create_refresh_token(subject=user_id)
    return TokenResponse(access_token=new_access, refresh_token=new_refresh)
