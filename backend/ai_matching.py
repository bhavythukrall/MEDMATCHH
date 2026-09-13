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
    "cardiology": [
        "chest pain", "heart attack", "cardiac", "palpitation", "hypertension", "bp high", "heart",
        "सीने में दर्द", "छाती में दर्द", "सीना", "दिल का दौरा", "दिल", "हार्ट अटैक", "धड़कन",
    ],
    "obstetrics": [
        "pregnancy", "labor", "labour", "delivery", "prenatal", "postpartum", "miscarriage", "obstetric",
        "eclampsia", "bleeding pregnancy",
        "गर्भपात", "गर्भावस्था", "गर्भ", "प्रसव", "डिलीवरी", "पेट में बच्चा", "गर्भवती",
    ],
    "neurology": [
        "stroke", "seizure", "epilepsy", "paralysis", "unconscious", "headache severe", "convulsion",
        "migraine", "migrane", "headache", "fits", "numbness",
        "माइग्रेन", "सिरदर्द", "सिर दर्द", "लकवा", "मिर्गी", "दौरा", "बेहोश", "झटके",
    ],
    "dermatology": [
        "skin problem", "skin problems", "skin infection", "skin", "rash", "itching", "eczema", "acne", "boils",
        "त्वचा", "चर्म", "खुजली", "दाने", "फोड़े", "चकत्ते",
    ],
    "orthopedics": [
        "fracture", "broken bone", "sprain", "dislocation", "back pain", "joint", "bone",
        "हड्डी टूट", "हड्डी", "फ्रैक्चर", "मोच", "जोड़ों में दर्द", "कमर दर्द",
    ],
    "pediatrics": ["child", "infant", "newborn", "baby", "toddler", "बच्चा", "बच्चे", "शिशु", "नवजात"],
    "trauma": [
        "accident", "road accident", "trauma", "bleeding heavy", "head injury", "fall",
        "दुर्घटना", "एक्सीडेंट", "चोट", "खून बह", "सिर में चोट", "गिर गया",
    ],
    "burns": ["burn", "scald", "fire injury", "जल गया", "जल गई", "आग से", "झुलस"],
    "poisoning": [
        "poison", "snakebite", "snake bite", "pesticide", "overdose", "insect bite",
        "जहर", "विष", "सांप ने काटा", "सांप", "कीटनाशक", "जहरीला",
    ],
    "pulmonology": [
        "asthma", "breathless", "shortness of breath", "cough persistent", "tuberculosis", "tb", "pneumonia",
        "सांस", "दम", "दमा", "खांसी", "टीबी", "निमोनिया",
    ],
    "gastroenterology": [
        "stomach pain", "vomiting", "diarrhea", "diarrhoea", "abdomen", "jaundice", "loose motion",
        "पेट दर्द", "पेट में दर्द", "उल्टी", "दस्त", "पीलिया",
    ],
    "general_surgery": ["appendicitis", "hernia", "wound", "cut deep", "अपेंडिक्स", "हर्निया", "घाव"],
    "ent": ["ear pain", "throat", "nose bleed", "कान", "गला", "नाक से खून"],
    "ophthalmology": ["eye injury", "vision loss", "eye", "आंख", "आँख", "दिखाई नहीं"],
    "psychiatry": ["suicide", "self harm", "depression severe", "आत्महत्या", "अवसाद", "डिप्रेशन"],
    "nephrology": ["kidney", "dialysis", "गुर्दा", "किडनी"],
    "urology": ["urine", "urinary", "पेशाब"],
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


def rank_hospitals(hospitals: list, required_specialty: str, patient_lat: float, patient_lon: float, severity: str, doctor_info: dict | None = None) -> list[dict]:
    """Return list of {hospital, match_score, distance_km, specialty_match, reason}."""
    results = []
    needs_icu = severity == "critical"
    for h in hospitals:
        specs = [s.lower() for s in (h.specialties or [])]
        specialty_match = required_specialty in specs or required_specialty == "general"

        distance = haversine_km(patient_lat, patient_lon, h.latitude, h.longitude)

        # Scoring: specialty 30, on-duty doctor 15, beds 25, ICU 15, distance 20, emergency 5
        specialty_score = 30 if specialty_match else 5
        info = (doctor_info or {}).get(h.id, {})
        on_duty_specialists = info.get("on_duty_specialists", 0)
        total_specialists = info.get("total_specialists", 0)
        if on_duty_specialists:
            doctor_score = 15
        elif total_specialists:
            doctor_score = 6
        else:
            doctor_score = 0 if doctor_info else 10  # neutral when doctor roster not supplied
        bed_score = min(25, (h.available_beds / max(h.total_beds, 1)) * 25) if h.total_beds else 5
        icu_score = 0
        if needs_icu:
            icu_score = min(15, (h.available_icu / max(h.total_icu, 1)) * 15) if h.total_icu else 0
        else:
            icu_score = 8  # neutral bonus if not critical
        # distance: closer is better; cap at 100km
        dist_score = max(0, 20 - min(distance, 100) * 0.2)
        emergency_bonus = 5 if h.emergency_available else 0

        total = specialty_score + doctor_score + bed_score + icu_score + dist_score + emergency_bonus
        reason_parts = []
        if specialty_match:
            reason_parts.append(f"Matches {required_specialty}")
        else:
            reason_parts.append("General care only")
        if doctor_info:
            reason_parts.append(f"{on_duty_specialists} specialist(s) on duty")
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


# ---- Care requirement (facilities + urgency) shown to users, no AI wording ----
FACILITY_MAP: dict[str, list[str]] = {
    "cardiology": ["emergency_care", "ecg", "cath_lab"],
    "obstetrics": ["labour_room", "ultrasound", "blood_bank"],
    "neurology": ["ct_scan", "emergency_care", "icu"],
    "trauma": ["emergency_care", "ct_scan", "blood_bank", "operation_theatre"],
    "burns": ["burns_unit", "emergency_care"],
    "poisoning": ["emergency_care", "icu"],
    "pulmonology": ["oxygen", "xray", "nebulisation"],
    "orthopedics": ["xray", "operation_theatre", "plaster_room"],
    "pediatrics": ["pediatric_ward", "nicu"],
    "dermatology": ["skin_clinic", "opd"],
    "gastroenterology": ["ultrasound", "endoscopy"],
    "general_surgery": ["operation_theatre", "anaesthesia"],
    "ent": ["opd", "endoscopy"],
    "ophthalmology": ["eye_opd", "operation_theatre"],
    "psychiatry": ["counselling", "opd"],
    "nephrology": ["dialysis", "lab"],
    "urology": ["ultrasound", "operation_theatre"],
    "internal_medicine": ["opd", "lab"],
}

URGENT_SPECIALTIES = {"cardiology", "trauma", "poisoning", "burns", "neurology", "obstetrics"}


def care_requirement(specialty: str, severity: str) -> tuple[str, list[str]]:
    """Returns (urgency, facilities) for the care-need panel."""
    if severity == "critical" or specialty in URGENT_SPECIALTIES:
        urgency = "urgent"
    elif severity == "moderate":
        urgency = "soon"
    else:
        urgency = "routine"
    return urgency, FACILITY_MAP.get(specialty, ["opd", "lab"])
