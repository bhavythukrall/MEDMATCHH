"""Referral routes: create, list, status transitions."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models import User, Patient, Hospital, Referral
from schemas import ReferralIn, ReferralOut, ReferralStatusUpdate, ReferralDetailOut, PatientOut, HospitalOut
from auth import get_current_user, require_roles

router = APIRouter(prefix="/referrals", tags=["referrals"])

VALID_STATUSES = {"pending", "accepted", "rejected", "in_transit", "arrived", "completed"}

ALLOWED_TRANSITIONS = {
    "pending": {"accepted", "rejected"},
    "accepted": {"in_transit", "rejected"},
    "in_transit": {"arrived"},
    "arrived": {"completed"},
    "rejected": set(),
    "completed": set(),
}


@router.post("", response_model=ReferralOut)
async def create_referral(body: ReferralIn, db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("asha", "hospital", "admin"))):
    res = await db.execute(select(Patient).where(Patient.id == body.patient_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Patient not found")
    res = await db.execute(select(Hospital).where(Hospital.id == body.hospital_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Hospital not found")

    r = Referral(**body.model_dump(), asha_user_id=user.id)
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return r


@router.get("", response_model=list[ReferralOut])
async def list_referrals(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    q = select(Referral).order_by(Referral.created_at.desc())
    if user.role == "asha":
        q = q.where(Referral.asha_user_id == user.id)
    elif user.role == "hospital":
        if not user.hospital_id:
            return []
        # incoming referrals + outgoing transfers created by this staff member
        q = q.where(or_(Referral.hospital_id == user.hospital_id, Referral.asha_user_id == user.id))
    res = await db.execute(q)
    return list(res.scalars().all())


@router.get("/{referral_id}", response_model=ReferralDetailOut)
async def get_referral(referral_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(Referral).where(Referral.id == referral_id))
    r = res.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Referral not found")
    p = (await db.execute(select(Patient).where(Patient.id == r.patient_id))).scalar_one()
    h = (await db.execute(select(Hospital).where(Hospital.id == r.hospital_id))).scalar_one()
    return ReferralDetailOut(
        referral=ReferralOut.model_validate(r),
        patient=PatientOut.model_validate(p),
        hospital=HospitalOut.model_validate(h),
    )


@router.patch("/{referral_id}/status", response_model=ReferralOut)
async def update_status(referral_id: str, body: ReferralStatusUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")

    res = await db.execute(select(Referral).where(Referral.id == referral_id))
    r = res.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Referral not found")

    # Authorization by transition:
    #   Hospital: pending -> accepted/rejected
    #   ASHA: accepted -> in_transit, in_transit -> arrived
    #   Hospital: arrived -> completed
    if body.status not in ALLOWED_TRANSITIONS.get(r.status, set()):
        raise HTTPException(status_code=400, detail=f"Cannot transition {r.status} -> {body.status}")

    hospital_actions = {("pending", "accepted"), ("pending", "rejected"), ("accepted", "rejected"), ("arrived", "completed")}
    asha_actions = {("accepted", "in_transit"), ("in_transit", "arrived")}
    transition = (r.status, body.status)

    if transition in hospital_actions:
        if user.role != "hospital" or user.hospital_id != r.hospital_id:
            if user.role != "admin":
                raise HTTPException(status_code=403, detail="Only assigned hospital can perform this action")
    elif transition in asha_actions:
        # only the creator of the referral (ASHA worker or referring hospital doctor) or admin
        if user.role != "admin" and r.asha_user_id != user.id:
            raise HTTPException(status_code=403, detail="Only the referring ASHA worker or doctor can perform this action")

    r.status = body.status
    r.updated_at = datetime.now(timezone.utc)
    if body.status == "rejected":
        r.rejection_reason = body.rejection_reason

    # If accepted, decrement bed count
    if body.status == "accepted":
        h = (await db.execute(select(Hospital).where(Hospital.id == r.hospital_id))).scalar_one()
        if h.available_beds > 0:
            h.available_beds -= 1

    await db.commit()
    await db.refresh(r)
    return r
