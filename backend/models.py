"""SQLAlchemy ORM models for Sanjeevani Care."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Text, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import enum

from database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    patient = "patient"
    asha = "asha"
    hospital = "hospital"
    admin = "admin"


class ReferralStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    in_transit = "in_transit"
    arrived = "arrived"
    completed = "completed"


class AmbulanceStatus(str, enum.Enum):
    available = "available"
    dispatched = "dispatched"
    en_route_pickup = "en_route_pickup"
    picked_up = "picked_up"
    delivered = "delivered"


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    phone: Mapped[str] = mapped_column(String, default="")
    role: Mapped[str] = mapped_column(String, index=True)  # patient|asha|hospital|admin
    hospital_id: Mapped[str | None] = mapped_column(String, ForeignKey("hospitals.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Hospital(Base):
    __tablename__ = "hospitals"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, index=True)
    address: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String)
    latitude: Mapped[float] = mapped_column(Float, default=0.0)
    longitude: Mapped[float] = mapped_column(Float, default=0.0)
    phone: Mapped[str] = mapped_column(String, default="")
    specialties: Mapped[list] = mapped_column(JSON, default=list)
    total_beds: Mapped[int] = mapped_column(Integer, default=0)
    available_beds: Mapped[int] = mapped_column(Integer, default=0)
    total_icu: Mapped[int] = mapped_column(Integer, default=0)
    available_icu: Mapped[int] = mapped_column(Integer, default=0)
    emergency_available: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Doctor(Base):
    __tablename__ = "doctors"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    hospital_id: Mapped[str] = mapped_column(String, ForeignKey("hospitals.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    specialty: Mapped[str] = mapped_column(String, index=True)
    qualification: Mapped[str] = mapped_column(String, default="")
    phone: Mapped[str] = mapped_column(String, default="")
    on_duty: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Patient(Base):
    __tablename__ = "patients"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, index=True)
    age: Mapped[int] = mapped_column(Integer)
    gender: Mapped[str] = mapped_column(String)
    phone: Mapped[str] = mapped_column(String, default="")
    village: Mapped[str] = mapped_column(String, default="")
    district: Mapped[str] = mapped_column(String, default="")
    state: Mapped[str] = mapped_column(String, default="")
    latitude: Mapped[float] = mapped_column(Float, default=0.0)
    longitude: Mapped[float] = mapped_column(Float, default=0.0)
    symptoms: Mapped[str] = mapped_column(Text, default="")
    injury_details: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String, default="moderate")  # mild|moderate|critical
    relationship: Mapped[str] = mapped_column(String, default="")  # self|mother|father|... (SELF accounts)
    medical_history: Mapped[str] = mapped_column(Text, default="")
    allergies: Mapped[str] = mapped_column(Text, default="")
    created_by_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class MedicalReport(Base):
    __tablename__ = "medical_reports"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(String, ForeignKey("patients.id"), index=True)
    storage_path: Mapped[str] = mapped_column(String)
    original_filename: Mapped[str] = mapped_column(String)
    content_type: Mapped[str] = mapped_column(String)
    size: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_by_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Referral(Base):
    __tablename__ = "referrals"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(String, ForeignKey("patients.id"), index=True)
    hospital_id: Mapped[str] = mapped_column(String, ForeignKey("hospitals.id"), index=True)
    asha_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    required_specialty: Mapped[str] = mapped_column(String, default="general")
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default=ReferralStatus.pending.value, index=True)
    rejection_reason: Mapped[str] = mapped_column(Text, default="")
    match_score: Mapped[float] = mapped_column(Float, default=0.0)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Ambulance(Base):
    __tablename__ = "ambulances"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    vehicle_number: Mapped[str] = mapped_column(String, unique=True)
    driver_name: Mapped[str] = mapped_column(String)
    driver_phone: Mapped[str] = mapped_column(String)
    hospital_id: Mapped[str | None] = mapped_column(String, ForeignKey("hospitals.id"), nullable=True)
    status: Mapped[str] = mapped_column(String, default=AmbulanceStatus.available.value, index=True)
    current_lat: Mapped[float] = mapped_column(Float, default=0.0)
    current_lon: Mapped[float] = mapped_column(Float, default=0.0)


class AmbulanceRequest(Base):
    __tablename__ = "ambulance_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    referral_id: Mapped[str] = mapped_column(String, ForeignKey("referrals.id"), index=True)
    ambulance_id: Mapped[str | None] = mapped_column(String, ForeignKey("ambulances.id"), nullable=True)
    pickup_address: Mapped[str] = mapped_column(String, default="")
    pickup_lat: Mapped[float] = mapped_column(Float, default=0.0)
    pickup_lon: Mapped[float] = mapped_column(Float, default=0.0)
    drop_address: Mapped[str] = mapped_column(String, default="")
    drop_lat: Mapped[float] = mapped_column(Float, default=0.0)
    drop_lon: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String, default=AmbulanceStatus.dispatched.value)
    requested_by_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
