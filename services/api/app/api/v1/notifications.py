from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from app.core.database import AsyncSessionLocal
from app.models.user import Device
from app.api.v1.journeys import get_current_user_id

router = APIRouter()

class DeviceToken(BaseModel):
    token: str
    platform: str # 'ios', 'android', 'web'

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/register-device")
async def register_device(
    device_in: DeviceToken,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Check if token already exists for user
    result = await db.execute(
        select(Device).where(Device.user_id == user_id, Device.device_token == device_in.token)
    )
    device = result.scalar_one_or_none()
    
    if not device:
        device = Device(
            user_id=user_id,
            device_token=device_in.token,
            platform=device_in.platform
        )
        db.add(device)
        await db.commit()
        
    return {"message": "Device registered successfully"}
