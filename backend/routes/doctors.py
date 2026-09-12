"""Doctor roster routes. Hospital staff manage their own hospital's doctors."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, Doctor, Hospital
from schemas import DoctorIn, DoctorUpdate, DoctorOut
from auth import require_roles

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.get("", response_model=list[DoctorOut])
async def list_doctors(
    hospital_id: str | None = Query(None),
    specialty: str | None = Query(None),
    on_duty: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Doctor).order_by(Doctor.specialty, Doctor.name)
    if hospital_id:
        q = q.where(Doctor.hospital_id == hospital_id)
    if specialty:
        q = q.where(Doctor.specialty == specialty)
    if on_duty is not None:
        q = q.where(Doctor.on_duty == on_duty)
    res = await db.execute(q)
    return list(res.scalars().all())


def _target_hospital(user: User, requested: str | None) -> str:
    if user.role == "hospital":
        if not user.hospital_id:
            raise HTTPException(status_code=400, detail="Your account is not linked to a hospital")
        return user.hospital_id
    if not requested:
        raise HTTPException(status_code=400, detail="hospital_id is required")
    return requested


@router.post("", response_model=DoctorOut)
async def create_doctor(body: DoctorIn, db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("hospital", "admin"))):
    hospital_id = _target_hospital(user, body.hospital_id)
    res = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Hospital not found")
    d = Doctor(
        hospital_id=hospital_id, name=body.name, specialty=body.specialty.lower().strip(),
        qualification=body.qualification, phone=body.phone, on_duty=body.on_duty,
    )
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return d


@router.patch("/{doctor_id}", response_model=DoctorOut)
async def update_doctor(doctor_id: str, body: DoctorUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("hospital", "admin"))):
    res = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    d = res.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if user.role == "hospital" and user.hospital_id != d.hospital_id:
        raise HTTPException(status_code=403, detail="Cannot edit doctors of other hospitals")
    updates = body.model_dump(exclude_none=True)
    if "specialty" in updates:
        updates["specialty"] = updates["specialty"].lower().strip()
    for field, val in updates.items():
        setattr(d, field, val)
    await db.commit()
    await db.refresh(d)
    return d


@router.delete("/{doctor_id}")
async def delete_doctor(doctor_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("hospital", "admin"))):
    res = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    d = res.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if user.role == "hospital" and user.hospital_id != d.hospital_id:
        raise HTTPException(status_code=403, detail="Cannot delete doctors of other hospitals")
    await db.delete(d)
    await db.commit()
    return {"success": True}
