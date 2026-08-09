from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid
from .user import UserPublic

class LocationPoint(BaseModel):
    lon: float
    lat: float

class JourneyCreate(BaseModel):
    origin: LocationPoint
    origin_address: str
    destination: LocationPoint
    destination_address: str
    vehicle_type: Optional[str] = None
    journey_type: Optional[str] = None
    price: Optional[float] = None
    max_participants: Optional[int] = 1
    scheduled_at: Optional[datetime] = None
    available_seats: Optional[int] = 1

class JourneyUpdate(BaseModel):
    status: Optional[str] = None
    price: Optional[float] = None
    available_seats: Optional[int] = None

class JourneyResponse(BaseModel):
    id: uuid.UUID
    host_id: uuid.UUID
    origin_address: str
    dest_address: str
    vehicle_type: Optional[str]
    journey_type: Optional[str]
    status: str
    price: Optional[float]
    max_participants: Optional[int]
    available_seats: Optional[int]
    scheduled_at: Optional[datetime]
    distance_meters: Optional[int]
    duration_seconds: Optional[int]
    host: Optional[UserPublic] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
