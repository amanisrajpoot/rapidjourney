from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime

class RatingCreate(BaseModel):
    stars: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=500)
    to_user_id: Optional[uuid.UUID] = None  # If not provided, assume rating the host

class RatingResponse(BaseModel):
    id: uuid.UUID
    journey_id: uuid.UUID
    from_user_id: uuid.UUID
    to_user_id: uuid.UUID
    stars: int
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
