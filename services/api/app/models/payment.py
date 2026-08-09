import uuid
from datetime import datetime
from sqlalchemy import String, Float, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel

class Payment(BaseModel):
    __tablename__ = "payments"
    
    journey_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("journeys.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    razorpay_order_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    razorpay_signature: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="created")  # created, captured, refunded, transferred
    
    journey: Mapped["Journey"] = relationship("Journey")
    user: Mapped["User"] = relationship("User")
