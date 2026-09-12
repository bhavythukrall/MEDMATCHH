"""Backend tests for Sanjeevani Care iteration: SOS triage, Doctors CRUD,
hospital availability updates, doctor-initiated referrals & state machine, /api/match."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://rural-health-connect-23.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ASHA = {"email": "asha@sanjeevani.in", "password": "Asha@2026"}
HOSP = {"email": "hospital@sanjeevani.in", "password": "Hosp@2026"}
ADMIN = {"email": "bhavythukrall@gmail.com", "password": "Sanjeevani@2026"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"Login failed for {creds['email']}: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def asha_session():
    return _login(ASHA)


@pytest.fixture(scope="module")
def hosp_session():
    return _login(HOSP)


@pytest.fixture(scope="module")
def admin_session():
    try:
        return _login(ADMIN)
    except AssertionError:
        pytest.skip("Admin login unavailable")


@pytest.fixture(scope="module")
def hospitals():
    r = requests.get(f"{API}/hospitals", timeout=30)
    assert r.status_code == 200
    return r.json()


# ---------------- SOS TRIAGE (public) ----------------
class TestSosTriage:
    @pytest.mark.parametrize("problem,expected_specialty", [
        ("chest pain", "cardiology"),
        ("सीने में दर्द", "cardiology"),
        ("miscarriage", "obstetrics"),
        ("गर्भपात", "obstetrics"),
        ("skin problems", "dermatology"),
        ("त्वचा में खुजली", "dermatology"),
        ("migraine", "neurology"),
        ("माइग्रेन", "neurology"),
    ])
    def test_triage_specialty_mapping(self, problem, expected_specialty):
        r = requests.post(f"{API}/sos/triage", json={"problem": problem, "severity": "critical"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["required_specialty"] == expected_specialty, f"{problem} -> {data}"
        assert data["llm_used"] is False
        assert data["matched_keyword"], "matched_keyword should be non-empty"
        assert "matches" in data and isinstance(data["matches"], list)
        if data["matches"]:
            m = data["matches"][0]
            assert "hospital" in m and "match_score" in m and "distance_km" in m
            assert "on_duty_doctors" in m and "on_duty_count" in m
            assert m["on_duty_count"] == len(m["on_duty_doctors"])

    def test_triage_public_no_auth(self):
        r = requests.post(f"{API}/sos/triage", json={"problem": "chest pain"}, timeout=30)
        assert r.status_code == 200


# ---------------- DOCTORS ----------------
class TestDoctors:
    def test_list_doctors_public(self):
        r = requests.get(f"{API}/doctors", timeout=30)
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list)
        assert len(docs) >= 21, f"Expected >=21 seeded doctors, got {len(docs)}"

    def test_list_doctors_filters(self):
        r = requests.get(f"{API}/doctors", params={"on_duty": "true"}, timeout=30)
        assert r.status_code == 200
        assert all(d["on_duty"] is True for d in r.json())

    def test_hospital_can_crud_own_doctor(self, hosp_session):
        me = hosp_session.get(f"{API}/auth/me", timeout=30).json()
        my_hosp = me["hospital_id"]
        payload = {"name": f"TEST_Dr_{uuid.uuid4().hex[:6]}", "specialty": "Cardiology", "on_duty": True}
        c = hosp_session.post(f"{API}/doctors", json=payload, timeout=30)
        assert c.status_code == 200, c.text
        doc = c.json()
        assert doc["hospital_id"] == my_hosp
        assert doc["specialty"] == "cardiology"  # normalized lower
        did = doc["id"]

        # verify GET
        g = requests.get(f"{API}/doctors", params={"hospital_id": my_hosp}, timeout=30)
        assert any(d["id"] == did for d in g.json())

        # toggle
        p = hosp_session.patch(f"{API}/doctors/{did}", json={"on_duty": False}, timeout=30)
        assert p.status_code == 200 and p.json()["on_duty"] is False

        # delete
        d = hosp_session.delete(f"{API}/doctors/{did}", timeout=30)
        assert d.status_code == 200
        # verify gone
        g2 = requests.get(f"{API}/doctors", params={"hospital_id": my_hosp}, timeout=30)
        assert not any(x["id"] == did for x in g2.json())

    def test_hospital_cannot_edit_other_hospital_doctor(self, hosp_session, hospitals):
        me = hosp_session.get(f"{API}/auth/me", timeout=30).json()
        my_hosp = me["hospital_id"]
        other = next((h for h in hospitals if h["id"] != my_hosp), None)
        assert other, "Need another hospital"
        # find a doctor of other hospital
        others_docs = requests.get(f"{API}/doctors", params={"hospital_id": other["id"]}, timeout=30).json()
        assert others_docs, "Need doctor in other hospital"
        target = others_docs[0]["id"]
        r = hosp_session.patch(f"{API}/doctors/{target}", json={"on_duty": False}, timeout=30)
        assert r.status_code == 403, f"expected 403, got {r.status_code} {r.text}"
        r2 = hosp_session.delete(f"{API}/doctors/{target}", timeout=30)
        assert r2.status_code == 403

    def test_asha_forbidden_on_doctor_writes(self, asha_session, hospitals):
        r = asha_session.post(f"{API}/doctors", json={"name": "X", "specialty": "cardiology", "hospital_id": hospitals[0]["id"]}, timeout=30)
        assert r.status_code == 403


# ---------------- HOSPITAL AVAILABILITY ----------------
class TestHospitalAvailability:
    def test_hospital_updates_own(self, hosp_session):
        me = hosp_session.get(f"{API}/auth/me", timeout=30).json()
        hid = me["hospital_id"]
        original = requests.get(f"{API}/hospitals/{hid}", timeout=30).json()
        payload = {
            "total_beds": 111,
            "total_icu": 22,
            "phone": "+91-9999900000",
            "specialties": ["cardiology", "trauma"],
            "available_beds": 55,
        }
        r = hosp_session.patch(f"{API}/hospitals/{hid}/availability", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        # verify persisted via GET
        g = requests.get(f"{API}/hospitals/{hid}", timeout=30).json()
        assert g["total_beds"] == 111
        assert g["total_icu"] == 22
        assert g["phone"] == "+91-9999900000"
        assert set(g["specialties"]) == {"cardiology", "trauma"}
        # restore
        hosp_session.patch(f"{API}/hospitals/{hid}/availability", json={
            "total_beds": original["total_beds"], "total_icu": original["total_icu"],
            "phone": original["phone"], "specialties": original["specialties"],
            "available_beds": original["available_beds"],
        }, timeout=30)

    def test_hospital_cannot_update_other(self, hosp_session, hospitals):
        me = hosp_session.get(f"{API}/auth/me", timeout=30).json()
        other = next(h for h in hospitals if h["id"] != me["hospital_id"])
        r = hosp_session.patch(f"{API}/hospitals/{other['id']}/availability", json={"total_beds": 5}, timeout=30)
        assert r.status_code == 403


# ---------------- DOCTOR-INITIATED REFERRAL + STATE MACHINE ----------------
class TestDoctorInitiatedReferral:
    def test_hospital_create_patient_and_referral_full_flow(self, hosp_session, hospitals, asha_session):
        me = hosp_session.get(f"{API}/auth/me", timeout=30).json()
        origin_hosp = me["hospital_id"]
        dest = next(h for h in hospitals if h["id"] != origin_hosp)

        # Hospital doctor creates a patient
        p_payload = {"name": f"TEST_Pt_{uuid.uuid4().hex[:6]}", "age": 40, "gender": "male", "severity": "critical", "symptoms": "chest pain"}
        pr = hosp_session.post(f"{API}/patients", json=p_payload, timeout=30)
        assert pr.status_code == 200, pr.text
        pid = pr.json()["id"]

        # Hospital doctor creates a referral to destination hospital
        r_payload = {"patient_id": pid, "hospital_id": dest["id"], "required_specialty": "cardiology", "notes": "transfer"}
        rr = hosp_session.post(f"{API}/referrals", json=r_payload, timeout=30)
        assert rr.status_code == 200, rr.text
        rid = rr.json()["id"]
        assert rr.json()["status"] == "pending"

        # Destination hospital must accept -> need a session for that hospital.
        # Since we only have one hospital login (linked to specific hospital), we need to test with admin OR
        # the hospital user's hospital IS destination. Instead, create referral where dest = own hospital? No, must be different.
        # Use admin to accept on behalf.
        try:
            admin = _login(ADMIN)
        except AssertionError:
            pytest.skip("Admin required for cross-hospital acceptance step")

        # admin can accept
        a = admin.patch(f"{API}/referrals/{rid}/status", json={"status": "accepted"}, timeout=30)
        assert a.status_code == 200, a.text

        # non-creator (asha) cannot mark in_transit
        na = asha_session.patch(f"{API}/referrals/{rid}/status", json={"status": "in_transit"}, timeout=30)
        assert na.status_code == 403

        # creator (hospital doctor) drives in_transit
        t = hosp_session.patch(f"{API}/referrals/{rid}/status", json={"status": "in_transit"}, timeout=30)
        assert t.status_code == 200, t.text

        # creator drives arrived
        arr = hosp_session.patch(f"{API}/referrals/{rid}/status", json={"status": "arrived"}, timeout=30)
        assert arr.status_code == 200, arr.text

        # destination hospital completes -> admin
        comp = admin.patch(f"{API}/referrals/{rid}/status", json={"status": "completed"}, timeout=30)
        assert comp.status_code == 200


# ---------------- /api/match ----------------
class TestMatch:
    def test_match_returns_ranked_hospitals(self, asha_session):
        p = asha_session.post(f"{API}/patients", json={
            "name": f"TEST_Match_{uuid.uuid4().hex[:6]}", "age": 30, "gender": "female",
            "severity": "critical", "symptoms": "chest pain", "latitude": 26.9, "longitude": 75.8,
        }, timeout=30).json()
        r = asha_session.post(f"{API}/match", json={"patient_id": p["id"], "max_results": 5}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["required_specialty"] == "cardiology"
        assert data["matches"]
        # sorted desc
        scores = [m["match_score"] for m in data["matches"]]
        assert scores == sorted(scores, reverse=True)
        # reason should mention on-duty specialists (doctor_info factored in)
        assert any("specialist(s) on duty" in m["reason"] for m in data["matches"])
