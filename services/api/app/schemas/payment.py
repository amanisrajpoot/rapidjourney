from pydantic import BaseModel, ConfigDict
from datetime import datetime
import uuid
from typing import Optional
from .user import UserPublic

class PaymentCreate(BaseModel):
    journey_id: uuid.UUID
    amount: float
    razorpay_order_id: Optional[str] = None

class PaymentVerify(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str

class PaymentResponse(BaseModel):
    id: uuid.UUID
    journey_id: uuid.UUID
    user_id: uuid.UUID
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    amount: float
    status: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
