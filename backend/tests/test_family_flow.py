"""Backend tests for SELF/patient family flow: patient-scoped list, PATCH/DELETE with ownership, referral count unchanged after SOS."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://rural-health-connect-23.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

PATIENT = {"email": "patient@sanjeevani.in", "password": "Patient@2026"}
ASHA = {"email": "asha@sanjeevani.in", "password": "Asha@2026"}
HOSP = {"email": "hospital@sanjeevani.in", "password": "Hosp@2026"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"Login failed for {creds['email']}: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def patient_session():
    return _login(PATIENT)


@pytest.fixture(scope="module")
def asha_session():
    return _login(ASHA)


@pytest.fixture(scope="module")
def hosp_session():
    return _login(HOSP)


class TestFamilyMembers:
    def test_patient_can_list_own_patients_only(self, patient_session, asha_session):
        me = patient_session.get(f"{API}/auth/me").json()
        patient_uid = me["id"]
        r = patient_session.get(f"{API}/patients", timeout=30)
        assert r.status_code == 200
        recs = r.json()
        assert isinstance(recs, list)
        # every returned record must be owned by this user (or not present in DB — flag if wrong)
        # We rely on ownership scoping in the route.
        # Confirm ASHA sees a different (own) list -- they shouldn't share
        ar = asha_session.get(f"{API}/patients", timeout=30)
        assert ar.status_code == 200
        # No leakage: no id from asha list should appear in patient list unless created by patient user
        patient_ids = {p["id"] for p in recs}
        asha_ids = {p["id"] for p in ar.json()}
        # Some possible overlap only if same creator - patient user is not the asha user, so overlap must be empty
        assert patient_ids.isdisjoint(asha_ids), "Patient list leaked ASHA-owned records"

    def test_create_family_member_persistence_and_edit(self, patient_session):
        payload = {
            "name": f"TEST_Kamla_{uuid.uuid4().hex[:5]}",
            "age": 62,
            "gender": "female",
            "phone": "9999911111",
            "relationship": "mother",
        }
        c = patient_session.post(f"{API}/patients", json=payload, timeout=30)
        assert c.status_code == 200, c.text
        created = c.json()
        assert created["name"] == payload["name"]
        assert created["relationship"] == "mother"
        assert created["age"] == 62
        pid = created["id"]

        # GET to confirm persistence
        g = patient_session.get(f"{API}/patients/{pid}", timeout=30)
        assert g.status_code == 200
        assert g.json()["relationship"] == "mother"

        # PATCH update medical_history + allergies
        up = patient_session.patch(f"{API}/patients/{pid}", json={
            "medical_history": "Hypertension",
            "allergies": "Penicillin",
        }, timeout=30)
        assert up.status_code == 200, up.text
        assert up.json()["medical_history"] == "Hypertension"
        assert up.json()["allergies"] == "Penicillin"

        # confirm persisted
        g2 = patient_session.get(f"{API}/patients/{pid}", timeout=30)
        assert g2.json()["medical_history"] == "Hypertension"
        assert g2.json()["allergies"] == "Penicillin"

        # cleanup
        d = patient_session.delete(f"{API}/patients/{pid}", timeout=30)
        assert d.status_code == 200

        # gone
        g3 = patient_session.get(f"{API}/patients/{pid}", timeout=30)
        assert g3.status_code == 404

    def test_patch_and_delete_other_users_record_forbidden(self, patient_session, asha_session):
        # ASHA creates a record
        ar = asha_session.post(f"{API}/patients", json={
            "name": f"TEST_Asha_{uuid.uuid4().hex[:5]}", "age": 30, "gender": "male",
        }, timeout=30)
        assert ar.status_code == 200
        pid = ar.json()["id"]
        try:
            # patient tries PATCH -> 403
            p = patient_session.patch(f"{API}/patients/{pid}", json={"name": "hack"}, timeout=30)
            assert p.status_code == 403, f"Expected 403, got {p.status_code} {p.text}"
            # patient tries DELETE -> 403
            d = patient_session.delete(f"{API}/patients/{pid}", timeout=30)
            assert d.status_code == 403
        finally:
            asha_session.delete(f"{API}/patients/{pid}", timeout=30)


class TestNoReferralInSelfFlow:
    def test_referrals_unchanged_after_sos_triage_by_patient(self, patient_session):
        before = patient_session.get(f"{API}/referrals", timeout=30)
        assert before.status_code == 200
        before_count = len(before.json())

        # Simulate what the /me/:id/help screen does — POST /api/sos/triage (read-only)
        r = patient_session.post(f"{API}/sos/triage", json={"problem": "chest pain", "severity": "critical"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["required_specialty"] == "cardiology"

        # And emergency version
        r2 = patient_session.post(f"{API}/sos/triage", json={"problem": "skin problem", "severity": "critical"}, timeout=30)
        assert r2.status_code == 200
        assert r2.json()["required_specialty"] == "dermatology"

        after = patient_session.get(f"{API}/referrals", timeout=30)
        assert after.status_code == 200
        assert len(after.json()) == before_count, "SOS triage must NOT create referrals for SELF flow"


class TestSpecialtyMappingHindiEnglish:
    @pytest.mark.parametrize("problem,expected", [
        ("सीने में दर्द", "cardiology"),
        ("skin problem", "dermatology"),
    ])
    def test_triage(self, problem, expected):
        r = requests.post(f"{API}/sos/triage", json={"problem": problem}, timeout=30)
        assert r.status_code == 200
        assert r.json()["required_specialty"] == expected
