import uuid
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel

class RideRequest(BaseModel):
    __tablename__ = "ride_requests"
    
    journey_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("journeys.id"), nullable=False)
    passenger_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending, accepted, rejected, cancelled
    seats_requested: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    
    journey: Mapped["Journey"] = relationship("Journey", back_populates="requests")
    passenger: Mapped["User"] = relationship("User")
