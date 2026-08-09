from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
import uuid
from .user import UserPublic
from .journey import JourneyResponse

class RideRequestCreate(BaseModel):
    seats_requested: int = 1
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str

class RideRequestUpdate(BaseModel):
    status: str # 'accepted' or 'rejected'

class RideRequestResponse(BaseModel):
    id: uuid.UUID
    journey_id: uuid.UUID
    passenger_id: uuid.UUID
    status: str
    seats_requested: int
    passenger: Optional[UserPublic] = None
    journey: Optional[JourneyResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
