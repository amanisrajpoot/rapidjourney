from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
import uuid

class UserPublic(BaseModel):
    id: uuid.UUID
    name: Optional[str] = None
    photo_url: Optional[str] = None
    bio: Optional[str] = None
    rating_avg: float = 0.0
    total_journeys: int = 0

    model_config = ConfigDict(from_attributes=True)

class UserPrivate(UserPublic):
    phone: str
    email: Optional[str] = None
    is_verified: bool
    wallet_balance: float = 0.0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    photo_url: Optional[str] = Field(None, max_length=500)
