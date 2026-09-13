"""MedMatch branding + Care Need panel + demo credential tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://rural-health-connect-23.preview.emergentagent.com"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# --- Service name ---
def test_root_service_name(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert data.get("service") == "MedMatch", f"Expected MedMatch, got {data}"


# --- Demo credential logins ---
@pytest.mark.parametrize("email,pwd,role,landing_check", [
    ("asha@medmatch.in", "Asha@2026", "asha", None),
    ("patient@medmatch.in", "Patient@2026", "patient", None),
    ("hospital@medmatch.in", "Hosp@2026", "hospital", None),
])
def test_demo_login(email, pwd, role, landing_check):
    sess = requests.Session()
    r = sess.post(f"{API}/auth/login", json={"email": email, "password": pwd})
    assert r.status_code == 200, f"{email} login failed: {r.status_code} {r.text}"
    me = sess.get(f"{API}/auth/me")
    assert me.status_code == 200
    assert me.json()["role"] == role


# --- SOS triage: urgency + facilities ---
def _triage(problem, severity="critical"):
    r = requests.post(f"{API}/sos/triage", json={"problem": problem, "latitude": 26.9, "longitude": 75.8, "severity": severity, "max_results": 3})
    assert r.status_code == 200, r.text
    return r.json()


def test_sos_chest_pain_urgent_cardiology():
    d = _triage("chest pain since morning")
    assert d["required_specialty"] == "cardiology"
    assert d["urgency"] == "urgent"
    facs = d.get("facilities", [])
    assert "emergency_care" in facs
    assert "ecg" in facs
    assert "cath_lab" in facs
    assert isinstance(d["matches"], list) and len(d["matches"]) >= 1


def test_sos_hindi_chest_pain():
    d = _triage("सीने में दर्द")
    assert d["required_specialty"] == "cardiology"
    assert d["urgency"] == "urgent"


def test_sos_skin_dermatology_lower_urgency():
    d = _triage("skin problem itching rash", severity="mild")
    assert d["required_specialty"] == "dermatology"
    assert d["urgency"] in ("routine", "soon")  # not urgent


# --- Hospitals endpoint (for hospital search page) ---
def test_hospitals_list():
    r = requests.get(f"{API}/hospitals")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 3
    # Ensure required fields
    for h in data:
        for f in ("id", "name", "city", "specialties", "latitude", "longitude"):
            assert f in h


def test_hospital_cardio_search_backend_filter_check():
    """Verify that when the frontend filters by 'cardio' locally, at least 2 hospitals in the seed have cardiology."""
    r = requests.get(f"{API}/hospitals")
    data = r.json()
    cardio = [h for h in data if any("cardio" in s.lower() for s in h.get("specialties", []))]
    assert len(cardio) >= 2, f"Expected >=2 cardiology hospitals, got {len(cardio)}"


def test_jaipur_hospital_present():
    r = requests.get(f"{API}/hospitals")
    data = r.json()
    jaipur = [h for h in data if "jaipur" in h.get("city", "").lower()]
    assert len(jaipur) >= 1


# --- Regression: /api/match still works (auth required) ---
def test_match_requires_auth():
    r = requests.post(f"{API}/match", json={"patient_id": "x", "max_results": 3})
    assert r.status_code in (401, 403, 422)
