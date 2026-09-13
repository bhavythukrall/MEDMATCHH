"""Pydantic schemas for API requests / responses."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    phone: str = ""
    role: str  # patient | asha | hospital
    hospital_id: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(OrmModel):
    id: str
    email: str
    name: str
    phone: str
    role: str
    hospital_id: Optional[str] = None


# ---------- Hospital ----------
class HospitalIn(BaseModel):
    name: str
    address: str
    city: str
    state: str
    latitude: float = 0.0
    longitude: float = 0.0
    phone: str = ""
    specialties: list[str] = []
    total_beds: int = 0
    available_beds: int = 0
    total_icu: int = 0
    available_icu: int = 0
    emergency_available: bool = True


class HospitalAvailabilityUpdate(BaseModel):
    available_beds: Optional[int] = None
    available_icu: Optional[int] = None
    total_beds: Optional[int] = None
    total_icu: Optional[int] = None
    emergency_available: Optional[bool] = None
    specialties: Optional[list[str]] = None
    phone: Optional[str] = None


class HospitalOut(OrmModel):
    id: str
    name: str
    address: str
    city: str
    state: str
    latitude: float
    longitude: float
    phone: str
    specialties: list
    total_beds: int
    available_beds: int
    total_icu: int
    available_icu: int
    emergency_available: bool


# ---------- Patient ----------
class PatientIn(BaseModel):
    name: str
    age: int
    gender: str
    phone: str = ""
    village: str = ""
    district: str = ""
    state: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    symptoms: str = ""
    injury_details: str = ""
    severity: str = "moderate"
    relationship: str = ""
    medical_history: str = ""
    allergies: str = ""


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    symptoms: Optional[str] = None
    injury_details: Optional[str] = None
    severity: Optional[str] = None
    relationship: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None


class PatientOut(OrmModel):
    id: str
    name: str
    age: int
    gender: str
    phone: str
    village: str
    district: str
    state: str
    latitude: float
    longitude: float
    symptoms: str
    injury_details: str
    severity: str
    relationship: str = ""
    medical_history: str = ""
    allergies: str = ""
    created_at: datetime


# ---------- Doctors ----------
class DoctorIn(BaseModel):
    name: str
    specialty: str
    qualification: str = ""
    phone: str = ""
    on_duty: bool = True
    hospital_id: Optional[str] = None


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    qualification: Optional[str] = None
    phone: Optional[str] = None
    on_duty: Optional[bool] = None


class DoctorOut(OrmModel):
    id: str
    hospital_id: str
    name: str
    specialty: str
    qualification: str
    phone: str
    on_duty: bool


# ---------- SOS ----------
class SosIn(BaseModel):
    problem: str
    latitude: float = 0.0
    longitude: float = 0.0
    severity: str = "critical"
    max_results: int = 5


class SosMatch(BaseModel):
    hospital: HospitalOut
    match_score: float
    distance_km: float
    specialty_match: bool
    reason: str
    on_duty_doctors: list[DoctorOut] = []
    on_duty_count: int = 0


class SosResponse(BaseModel):
    required_specialty: str
    urgency: str = "routine"
    facilities: list[str] = []
    llm_used: bool
    reasoning: str
    matched_keyword: str = ""
    matches: list[SosMatch]


# ---------- Matching ----------
class MatchRequest(BaseModel):
    patient_id: str
    max_results: int = 5


class HospitalMatch(BaseModel):
    hospital: HospitalOut
    match_score: float
    distance_km: float
    specialty_match: bool
    required_specialty: str
    reason: str


class MatchResponse(BaseModel):
    required_specialty: str
    llm_used: bool
    reasoning: str
    matches: list[HospitalMatch]


# ---------- Referral ----------
class ReferralIn(BaseModel):
    patient_id: str
    hospital_id: str
    required_specialty: str = "general"
    notes: str = ""
    match_score: float = 0.0
    distance_km: float = 0.0


class ReferralStatusUpdate(BaseModel):
    status: str
    rejection_reason: str = ""


class ReferralOut(OrmModel):
    id: str
    patient_id: str
    hospital_id: str
    asha_user_id: str
    required_specialty: str
    notes: str
    status: str
    rejection_reason: str
    match_score: float
    distance_km: float
    created_at: datetime
    updated_at: datetime


class ReferralDetailOut(BaseModel):
    referral: ReferralOut
    patient: PatientOut
    hospital: HospitalOut


# ---------- Ambulance ----------
class AmbulanceIn(BaseModel):
    vehicle_number: str
    driver_name: str
    driver_phone: str
    hospital_id: Optional[str] = None


class AmbulanceOut(OrmModel):
    id: str
    vehicle_number: str
    driver_name: str
    driver_phone: str
    hospital_id: Optional[str] = None
    status: str
    current_lat: float
    current_lon: float


class AmbulanceRequestIn(BaseModel):
    referral_id: str
    pickup_address: str
    pickup_lat: float = 0.0
    pickup_lon: float = 0.0
    drop_address: str = ""
    drop_lat: float = 0.0
    drop_lon: float = 0.0


class AmbulanceStatusUpdate(BaseModel):
    status: str


class AmbulanceRequestOut(OrmModel):
    id: str
    referral_id: str
    ambulance_id: Optional[str] = None
    pickup_address: str
    pickup_lat: float
    pickup_lon: float
    drop_address: str
    drop_lat: float
    drop_lon: float
    status: str
    created_at: datetime


# ---------- Uploads ----------
class MedicalReportOut(OrmModel):
    id: str
    patient_id: str
    storage_path: str
    original_filename: str
    content_type: str
    size: int
    created_at: datetime
