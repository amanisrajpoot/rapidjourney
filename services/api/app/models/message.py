import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel

class Message(BaseModel):
    __tablename__ = "messages"
    
    journey_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("journeys.id"), nullable=False)
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(String(1000), nullable=False)
    
    journey: Mapped["Journey"] = relationship("Journey")
    sender: Mapped["User"] = relationship("User")
