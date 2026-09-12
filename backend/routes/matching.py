"""AI + rule-based hospital matching route."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, Patient, Hospital, Doctor
from schemas import MatchRequest, MatchResponse, HospitalMatch, HospitalOut
from auth import get_current_user
from ai_matching import rule_based_specialty, llm_specialty_match, rank_hospitals

router = APIRouter(prefix="/match", tags=["matching"])


@router.post("", response_model=MatchResponse)
async def match_patient_to_hospitals(body: MatchRequest, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    res = await db.execute(select(Patient).where(Patient.id == body.patient_id))
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Step 1: rule-based
    specialty, matched_kw = rule_based_specialty(p.symptoms, p.injury_details)
    llm_used = False
    reasoning = f"Matched keyword '{matched_kw}'" if matched_kw else ""

    # Step 2: LLM fallback if rules didn't hit
    if specialty == "general" and not matched_kw and (p.symptoms or p.injury_details):
        specialty, reasoning = await llm_specialty_match(p.symptoms, p.injury_details, p.severity)
        llm_used = True

    # Step 3: rank hospitals
    res = await db.execute(select(Hospital))
    hospitals = list(res.scalars().all())
    doctors = list((await db.execute(select(Doctor))).scalars().all())
    doctor_info = {
        h.id: {
            "on_duty_specialists": len([d for d in doctors if d.hospital_id == h.id and d.specialty == specialty and d.on_duty]),
            "total_specialists": len([d for d in doctors if d.hospital_id == h.id and d.specialty == specialty]),
        }
        for h in hospitals
    }
    ranked = rank_hospitals(hospitals, specialty, p.latitude, p.longitude, p.severity, doctor_info)

    matches = [
        HospitalMatch(
            hospital=HospitalOut.model_validate(r["hospital"]),
            match_score=r["match_score"],
            distance_km=r["distance_km"],
            specialty_match=r["specialty_match"],
            required_specialty=specialty,
            reason=r["reason"],
        )
        for r in ranked[: body.max_results]
    ]
    return MatchResponse(required_specialty=specialty, llm_used=llm_used, reasoning=reasoning, matches=matches)
