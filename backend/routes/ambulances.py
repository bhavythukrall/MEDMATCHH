"""Ambulance routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, Ambulance, AmbulanceRequest, Referral
from schemas import AmbulanceOut, AmbulanceIn, AmbulanceRequestIn, AmbulanceRequestOut, AmbulanceStatusUpdate
from auth import get_current_user, require_roles

router = APIRouter(prefix="/ambulances", tags=["ambulances"])

VALID_AMB_STATUSES = {"available", "dispatched", "en_route_pickup", "picked_up", "delivered"}


@router.get("", response_model=list[AmbulanceOut])
async def list_ambulances(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    res = await db.execute(select(Ambulance).order_by(Ambulance.vehicle_number))
    return list(res.scalars().all())


@router.post("", response_model=AmbulanceOut)
async def create_ambulance(body: AmbulanceIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("admin", "hospital"))):
    a = Ambulance(**body.model_dump())
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return a


@router.post("/request", response_model=AmbulanceRequestOut)
async def request_ambulance(body: AmbulanceRequestIn, db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("asha", "admin", "hospital"))):
    res = await db.execute(select(Referral).where(Referral.id == body.referral_id))
    referral = res.scalar_one_or_none()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    if referral.status not in ("accepted", "in_transit"):
        raise HTTPException(status_code=400, detail="Referral must be accepted before requesting ambulance")

    # Assign nearest available ambulance from the same hospital, else any available
    res = await db.execute(select(Ambulance).where(Ambulance.status == "available", Ambulance.hospital_id == referral.hospital_id))
    amb = res.scalars().first()
    if not amb:
        res = await db.execute(select(Ambulance).where(Ambulance.status == "available"))
        amb = res.scalars().first()
    if not amb:
        raise HTTPException(status_code=409, detail="No ambulances available")

    amb.status = "dispatched"
    req = AmbulanceRequest(
        referral_id=body.referral_id,
        ambulance_id=amb.id,
        pickup_address=body.pickup_address,
        pickup_lat=body.pickup_lat,
        pickup_lon=body.pickup_lon,
        drop_address=body.drop_address,
        drop_lat=body.drop_lat,
        drop_lon=body.drop_lon,
        status="dispatched",
        requested_by_user_id=user.id,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


@router.get("/requests/by-referral/{referral_id}", response_model=list[AmbulanceRequestOut])
async def requests_by_referral(referral_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    res = await db.execute(select(AmbulanceRequest).where(AmbulanceRequest.referral_id == referral_id).order_by(AmbulanceRequest.created_at.desc()))
    return list(res.scalars().all())


@router.patch("/requests/{request_id}/status", response_model=AmbulanceRequestOut)
async def update_request_status(request_id: str, body: AmbulanceStatusUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("hospital", "asha", "admin"))):
    if body.status not in VALID_AMB_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid ambulance status")
    res = await db.execute(select(AmbulanceRequest).where(AmbulanceRequest.id == request_id))
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Ambulance request not found")
    req.status = body.status
    if req.ambulance_id:
        amb = (await db.execute(select(Ambulance).where(Ambulance.id == req.ambulance_id))).scalar_one()
        amb.status = body.status if body.status != "delivered" else "available"
    await db.commit()
    await db.refresh(req)
    return req
