"""Seed initial data: admin, sample hospitals, ambulances."""
import os
import logging
from sqlalchemy import select
from database import AsyncSessionLocal
from models import User, Hospital, Ambulance
from auth import hash_password, verify_password

logger = logging.getLogger(__name__)

SAMPLE_HOSPITALS = [
    {
        "name": "District Hospital Jaipur",
        "address": "Sawai Man Singh Rd", "city": "Jaipur", "state": "Rajasthan",
        "latitude": 26.9124, "longitude": 75.7873, "phone": "+91-141-2560291",
        "specialties": ["cardiology", "trauma", "general_surgery", "orthopedics", "general", "internal_medicine"],
        "total_beds": 400, "available_beds": 78, "total_icu": 40, "available_icu": 6,
    },
    {
        "name": "Rural Primary Health Centre Amber",
        "address": "Amber Rd", "city": "Amber", "state": "Rajasthan",
        "latitude": 26.9855, "longitude": 75.8513, "phone": "+91-141-2530456",
        "specialties": ["general", "pediatrics", "obstetrics"],
        "total_beds": 40, "available_beds": 15, "total_icu": 4, "available_icu": 2,
    },
    {
        "name": "Community Health Centre Chomu",
        "address": "Sikar Rd", "city": "Chomu", "state": "Rajasthan",
        "latitude": 27.1667, "longitude": 75.7167, "phone": "+91-142-2223344",
        "specialties": ["general", "obstetrics", "trauma", "pediatrics", "burns"],
        "total_beds": 100, "available_beds": 22, "total_icu": 8, "available_icu": 3,
    },
    {
        "name": "Neuro & Cardiac Centre Ajmer",
        "address": "Kutchery Rd", "city": "Ajmer", "state": "Rajasthan",
        "latitude": 26.4499, "longitude": 74.6399, "phone": "+91-145-2431122",
        "specialties": ["cardiology", "neurology", "general_surgery", "pulmonology"],
        "total_beds": 250, "available_beds": 41, "total_icu": 30, "available_icu": 9,
    },
    {
        "name": "Mother & Child Hospital Alwar",
        "address": "Old Bus Stand Rd", "city": "Alwar", "state": "Rajasthan",
        "latitude": 27.5530, "longitude": 76.6346, "phone": "+91-144-2345678",
        "specialties": ["obstetrics", "pediatrics", "general"],
        "total_beds": 80, "available_beds": 30, "total_icu": 6, "available_icu": 4,
    },
]

SAMPLE_AMBULANCES = [
    {"vehicle_number": "RJ-14-AMB-1001", "driver_name": "Rakesh Meena", "driver_phone": "+91-9876500001"},
    {"vehicle_number": "RJ-14-AMB-1002", "driver_name": "Suresh Yadav", "driver_phone": "+91-9876500002"},
    {"vehicle_number": "RJ-04-AMB-2001", "driver_name": "Mahesh Sharma", "driver_phone": "+91-9876500003"},
    {"vehicle_number": "RJ-02-AMB-3001", "driver_name": "Ramesh Gurjar", "driver_phone": "+91-9876500004"},
]


async def _write_creds_file(admin_email: str, admin_password: str, asha_email: str, asha_password: str, hosp_email: str, hosp_password: str):
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"""# Sanjeevani Care - Test Credentials

## Admin
- Email: `{admin_email}`
- Password: `{admin_password}`
- Role: admin

## ASHA Worker (demo)
- Email: `{asha_email}`
- Password: `{asha_password}`
- Role: asha

## Hospital Admin (demo, linked to District Hospital Jaipur)
- Email: `{hosp_email}`
- Password: `{hosp_password}`
- Role: hospital

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET  /api/auth/me
- POST /api/auth/logout
- GET  /api/hospitals
- POST /api/patients
- POST /api/match
- POST /api/referrals
- PATCH /api/referrals/{{id}}/status
- POST /api/ambulances/request
""")


async def seed_data():
    async with AsyncSessionLocal() as db:
        admin_email = os.environ["ADMIN_EMAIL"]
        admin_password = os.environ["ADMIN_PASSWORD"]

        # ---- Admin ----
        res = await db.execute(select(User).where(User.email == admin_email))
        admin = res.scalar_one_or_none()
        if not admin:
            admin = User(email=admin_email, password_hash=hash_password(admin_password), name="Sanjeevani Admin", role="admin")
            db.add(admin)
        elif not verify_password(admin_password, admin.password_hash):
            admin.password_hash = hash_password(admin_password)

        # ---- Hospitals ----
        res = await db.execute(select(Hospital))
        existing_hospitals = res.scalars().all()
        first_hospital_id = None
        if not existing_hospitals:
            for h_data in SAMPLE_HOSPITALS:
                h = Hospital(**h_data)
                db.add(h)
                await db.flush()
                if first_hospital_id is None:
                    first_hospital_id = h.id
        else:
            first_hospital_id = existing_hospitals[0].id

        # ---- Demo ASHA worker ----
        asha_email = "asha@sanjeevani.in"
        asha_password = "Asha@2026"
        res = await db.execute(select(User).where(User.email == asha_email))
        if not res.scalar_one_or_none():
            db.add(User(email=asha_email, password_hash=hash_password(asha_password), name="Sunita Devi (ASHA)", phone="+91-9876543210", role="asha"))

        # ---- Demo Hospital admin ----
        hosp_email = "hospital@sanjeevani.in"
        hosp_password = "Hosp@2026"
        res = await db.execute(select(User).where(User.email == hosp_email))
        if not res.scalar_one_or_none():
            db.add(User(email=hosp_email, password_hash=hash_password(hosp_password), name="Dr. R. Sharma", phone="+91-141-2560291", role="hospital", hospital_id=first_hospital_id))

        # ---- Ambulances ----
        res = await db.execute(select(Ambulance))
        if not res.scalars().first():
            for a in SAMPLE_AMBULANCES:
                db.add(Ambulance(**a, hospital_id=first_hospital_id))

        await db.commit()
        await _write_creds_file(admin_email, admin_password, asha_email, asha_password, hosp_email, hosp_password)
