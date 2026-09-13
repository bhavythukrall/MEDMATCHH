"""SOS emergency triage: free-text problem (English/Hindi) -> specialty -> hospitals with on-duty specialists."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import Hospital, Doctor
from schemas import SosIn, SosResponse, SosMatch, HospitalOut, DoctorOut
from ai_matching import rule_based_specialty, llm_specialty_match, rank_hospitals, care_requirement

router = APIRouter(prefix="/sos", tags=["sos"])


@router.post("/triage", response_model=SosResponse)
async def sos_triage(body: SosIn, db: AsyncSession = Depends(get_db)):
    specialty, matched_kw = rule_based_specialty(body.problem)
    llm_used = False
    reasoning = f"Matched keyword '{matched_kw}'" if matched_kw else ""

    if not matched_kw and body.problem.strip():
        specialty, reasoning = await llm_specialty_match(body.problem, "", body.severity)
        llm_used = True

    hospitals = list((await db.execute(select(Hospital))).scalars().all())
    doctors = list((await db.execute(select(Doctor))).scalars().all())

    by_hospital: dict[str, list[Doctor]] = {}
    for d in doctors:
        by_hospital.setdefault(d.hospital_id, []).append(d)

    def _relevant(d):
        return specialty == "general" or d.specialty == specialty

    doctor_info = {
        h.id: {
            "on_duty_specialists": len([d for d in by_hospital.get(h.id, []) if _relevant(d) and d.on_duty]),
            "total_specialists": len([d for d in by_hospital.get(h.id, []) if _relevant(d)]),
        }
        for h in hospitals
    }

    ranked = rank_hospitals(hospitals, specialty, body.latitude, body.longitude, body.severity, doctor_info)

    matches = []
    for r in ranked[: body.max_results]:
        h = r["hospital"]
        on_duty = [d for d in by_hospital.get(h.id, []) if d.on_duty and (d.specialty == specialty or specialty == "general")]
        matches.append(SosMatch(
            hospital=HospitalOut.model_validate(h),
            match_score=r["match_score"],
            distance_km=r["distance_km"],
            specialty_match=r["specialty_match"],
            reason=r["reason"],
            on_duty_doctors=[DoctorOut.model_validate(d) for d in on_duty],
            on_duty_count=len(on_duty),
        ))

    urgency, facilities = care_requirement(specialty, body.severity)
    return SosResponse(
        required_specialty=specialty, urgency=urgency, facilities=facilities,
        llm_used=llm_used, reasoning=reasoning,
        matched_keyword=matched_kw, matches=matches,
    )
