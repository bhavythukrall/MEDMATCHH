"""Patient routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, Patient
from schemas import PatientIn, PatientOut
from auth import get_current_user, require_roles

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("", response_model=PatientOut)
async def create_patient(body: PatientIn, db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("asha", "patient", "hospital", "admin"))):
    p = Patient(**body.model_dump(), created_by_user_id=user.id)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@router.get("", response_model=list[PatientOut])
async def list_patients(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    q = select(Patient).order_by(Patient.created_at.desc())
    if user.role == "asha":
        q = q.where(Patient.created_by_user_id == user.id)
    res = await db.execute(q)
    return list(res.scalars().all())


@router.get("/{patient_id}", response_model=PatientOut)
async def get_patient(patient_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(Patient).where(Patient.id == patient_id))
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return p
