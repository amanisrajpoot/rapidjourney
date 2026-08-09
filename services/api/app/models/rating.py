import uuid
from sqlalchemy import String, Integer, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.journey import Journey

class Rating(BaseModel):
    __tablename__ = "ratings"
    __table_args__ = (
        UniqueConstraint("journey_id", "from_user_id", name="uq_rating_per_journey_user"),
    )

    journey_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("journeys.id"), nullable=False)
    from_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    to_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    stars: Mapped[int] = mapped_column(Integer, nullable=False)  # 1–5
    comment: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    journey: Mapped["Journey"] = relationship("Journey")
    from_user: Mapped["User"] = relationship("User", foreign_keys=[from_user_id])
    to_user: Mapped["User"] = relationship("User", foreign_keys=[to_user_id])
