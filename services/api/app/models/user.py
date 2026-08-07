import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Boolean, Float, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from app.models.base import BaseModel

class User(BaseModel):
    __tablename__ = "users"
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    auth_provider: Mapped[str] = mapped_column(String(20), nullable=False, default="phone")  # phone|google|apple|guest
    google_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0)
    total_journeys: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user")  # user|host|admin

    # Relationships
    devices: Mapped[List["Device"]] = relationship("Device", back_populates="user", cascade="all, delete-orphan")
    saved_places: Mapped[List["SavedPlace"]] = relationship("SavedPlace", back_populates="user", cascade="all, delete-orphan")
    emergency_contacts: Mapped[List["EmergencyContact"]] = relationship("EmergencyContact", back_populates="user", cascade="all, delete-orphan")

class Device(BaseModel):
    __tablename__ = "devices"
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    device_token: Mapped[str] = mapped_column(String(255), nullable=False)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)  # ios|android|web
    last_active: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship("User", back_populates="devices")

class SavedPlace(BaseModel):
    __tablename__ = "saved_places"
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    # Geometry point (longitude, latitude)
    geom: Mapped["Geometry"] = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)

    user: Mapped[User] = relationship("User", back_populates="saved_places")

class EmergencyContact(BaseModel):
    __tablename__ = "emergency_contacts"
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    relation: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="emergency_contacts")
