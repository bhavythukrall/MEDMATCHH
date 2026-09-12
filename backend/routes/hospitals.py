"""Hospital routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, Hospital
from schemas import HospitalIn, HospitalOut, HospitalAvailabilityUpdate
from auth import get_current_user, require_roles

router = APIRouter(prefix="/hospitals", tags=["hospitals"])


@router.get("", response_model=list[HospitalOut])
async def list_hospitals(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Hospital).order_by(Hospital.name))
    return list(res.scalars().all())


@router.get("/{hospital_id}", response_model=HospitalOut)
async def get_hospital(hospital_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    h = res.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return h


@router.post("", response_model=HospitalOut)
async def create_hospital(body: HospitalIn, db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("admin", "hospital"))):
    h = Hospital(**body.model_dump())
    db.add(h)
    await db.commit()
    await db.refresh(h)
    return h


@router.patch("/{hospital_id}/availability", response_model=HospitalOut)
async def update_availability(hospital_id: str, body: HospitalAvailabilityUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("hospital", "admin"))):
    res = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    h = res.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Hospital not found")
    if user.role == "hospital" and user.hospital_id != hospital_id:
        raise HTTPException(status_code=403, detail="Cannot update other hospitals")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(h, field, val)
    await db.commit()
    await db.refresh(h)
    return h
