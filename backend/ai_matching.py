"""AI + rule-based symptom → specialty matcher, hospital ranking."""
import os
import math
import logging
import re
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

SPECIALTIES = [
    "cardiology", "orthopedics", "neurology", "obstetrics", "pediatrics",
    "general_surgery", "trauma", "burns", "poisoning", "internal_medicine",
    "pulmonology", "gastroenterology", "nephrology", "oncology", "ent",
    "ophthalmology", "psychiatry", "dermatology", "urology", "general",
]

# Rule-based keyword → specialty map (covers ~80% of common rural cases)
KEYWORD_RULES: dict[str, list[str]] = {
    "cardiology": ["chest pain", "heart attack", "cardiac", "palpitation", "hypertension", "bp high"],
    "orthopedics": ["fracture", "broken bone", "sprain", "dislocation", "back pain", "joint"],
    "neurology": ["stroke", "seizure", "epilepsy", "paralysis", "unconscious", "headache severe", "convulsion"],
    "obstetrics": ["pregnancy", "labor", "delivery", "prenatal", "postpartum", "miscarriage", "obstetric"],
    "pediatrics": ["child", "infant", "newborn", "baby", "toddler"],
    "trauma": ["accident", "road accident", "trauma", "bleeding heavy", "head injury", "fall"],
    "burns": ["burn", "scald", "fire injury"],
    "poisoning": ["poison", "snakebite", "snake bite", "pesticide", "overdose", "insect bite"],
    "pulmonology": ["asthma", "breathless", "shortness of breath", "cough persistent", "tuberculosis", "tb", "pneumonia"],
    "gastroenterology": ["stomach pain", "vomiting", "diarrhea", "diarrhoea", "abdomen", "jaundice"],
    "obstetrics_high_risk": ["eclampsia", "bleeding pregnancy"],
    "general_surgery": ["appendicitis", "hernia", "wound", "cut deep"],
    "dermatology": ["rash", "skin infection"],
    "ent": ["ear pain", "throat", "nose bleed"],
    "ophthalmology": ["eye injury", "vision loss"],
    "psychiatry": ["suicide", "self harm", "depression severe"],
}


def rule_based_specialty(symptoms: str, injury: str = "") -> tuple[str, str]:
    """Return (specialty, matched_keyword) or ('general', '')."""
    text = f"{symptoms} {injury}".lower()
    for specialty, keywords in KEYWORD_RULES.items():
        for kw in keywords:
            if kw in text:
                return specialty.replace("_high_risk", ""), kw
    return "general", ""


async def llm_specialty_match(symptoms: str, injury: str, severity: str) -> tuple[str, str]:
    """Fallback to Claude Sonnet when rules fail. Returns (specialty, reasoning)."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return "general", "No LLM key configured"

    system = (
        "You are a rural medical triage assistant. Given a patient's symptoms, "
        "classify the single most appropriate medical specialty from this list: "
        + ", ".join(SPECIALTIES)
        + ". Reply with STRICT JSON: {\"specialty\": \"<one>\", \"reason\": \"<1 sentence>\"}. No markdown."
    )
    prompt = f"Symptoms: {symptoms}\nInjury: {injury}\nSeverity: {severity}"
    try:
        chat = LlmChat(api_key=api_key, session_id=f"triage-{hash(prompt)}", system_message=system).with_model(
            "anthropic", "claude-sonnet-4-6"
        )
        resp = await chat.send_message(UserMessage(text=prompt))
        text = resp if isinstance(resp, str) else str(resp)
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if not m:
            return "general", "LLM returned no JSON"
        import json
        data = json.loads(m.group(0))
        specialty = str(data.get("specialty", "general")).lower().strip()
        if specialty not in SPECIALTIES:
            specialty = "general"
        return specialty, str(data.get("reason", ""))
    except Exception as e:
        logger.warning(f"LLM triage failed: {e}")
        return "general", f"LLM error: {e}"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    if not all([lat1, lon1, lat2, lon2]):
        return 999.0
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def rank_hospitals(hospitals: list, required_specialty: str, patient_lat: float, patient_lon: float, severity: str) -> list[dict]:
    """Return list of {hospital, match_score, distance_km, specialty_match, reason}."""
    results = []
    needs_icu = severity == "critical"
    for h in hospitals:
        specs = [s.lower() for s in (h.specialties or [])]
        specialty_match = required_specialty in specs or required_specialty == "general"

        distance = haversine_km(patient_lat, patient_lon, h.latitude, h.longitude)

        # Scoring: specialty 40%, bed availability 25%, ICU (if critical) 15%, distance 20%
        specialty_score = 40 if specialty_match else 10
        bed_score = min(25, (h.available_beds / max(h.total_beds, 1)) * 25) if h.total_beds else 5
        icu_score = 0
        if needs_icu:
            icu_score = min(15, (h.available_icu / max(h.total_icu, 1)) * 15) if h.total_icu else 0
        else:
            icu_score = 8  # neutral bonus if not critical
        # distance: closer is better; cap at 100km
        dist_score = max(0, 20 - min(distance, 100) * 0.2)
        emergency_bonus = 5 if h.emergency_available else 0

        total = specialty_score + bed_score + icu_score + dist_score + emergency_bonus
        reason_parts = []
        if specialty_match:
            reason_parts.append(f"Matches {required_specialty}")
        else:
            reason_parts.append("General care only")
        reason_parts.append(f"{h.available_beds}/{h.total_beds} beds")
        if needs_icu:
            reason_parts.append(f"{h.available_icu}/{h.total_icu} ICU")
        reason_parts.append(f"{distance:.1f} km")

        results.append({
            "hospital": h,
            "match_score": round(total, 1),
            "distance_km": round(distance, 2),
            "specialty_match": specialty_match,
            "reason": " · ".join(reason_parts),
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results
