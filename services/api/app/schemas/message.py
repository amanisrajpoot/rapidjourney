from pydantic import BaseModel, ConfigDict
from datetime import datetime
import uuid
from typing import Optional
from .user import UserPublic

class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: uuid.UUID
    journey_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    created_at: datetime
    sender: Optional[UserPublic] = None

    model_config = ConfigDict(from_attributes=True)
