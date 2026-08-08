import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from app.models.base import BaseModel

class Journey(BaseModel):
    __tablename__ = "journeys"
    host_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    origin_geom: Mapped["Geometry"] = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    origin_address: Mapped[str] = mapped_column(String(255), nullable=False)
    dest_geom: Mapped["Geometry"] = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    dest_address: Mapped[str] = mapped_column(String(255), nullable=False)
    vehicle_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    journey_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # e.g., "car", "bike", "scooter"
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    price: Mapped[float] = mapped_column(Float, nullable=True)
    max_participants: Mapped[int] = mapped_column(Integer, nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Route details
    distance_meters: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Storing the route line as a GeoJSON LineString (or similar)
    route_geom: Mapped[Optional["Geometry"]] = mapped_column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=True)

