import requests, io, uuid, json, sys

BASE = "https://rural-health-connect-23.preview.emergentagent.com/api"
results = {"passed": [], "failed": []}

def rec(name, ok, ev=""):
    (results["passed"] if ok else results["failed"]).append({"name": name, "evidence": ev[:400]})
    print(("PASS " if ok else "FAIL "), name, "|", ev[:300])

# 1. Health
r = requests.get(f"{BASE}/")
rec("GET /api/", r.status_code == 200, f"{r.status_code} {r.text[:100]}")

# 2. Register new ASHA
email = f"asha_{uuid.uuid4().hex[:8]}@test.in"
r = requests.post(f"{BASE}/auth/register", json={
    "email": email, "password": "Test@1234", "full_name": "Test ASHA",
    "role": "asha", "phone": "9999999999"
})
rec("Register ASHA", r.status_code in (200, 201), f"{r.status_code} {r.text[:200]}")
token_new = r.json().get("access_token") if r.status_code < 300 else None

# 3. Login as ASHA new
r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": "Test@1234"})
rec("Login new ASHA", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
token_new = r.json().get("access_token", token_new)

# 4. /auth/me
h = {"Authorization": f"Bearer {token_new}"}
r = requests.get(f"{BASE}/auth/me", headers=h)
rec("GET /auth/me", r.status_code == 200 and r.json().get("email") == email, f"{r.status_code} {r.text[:150]}")

# 5. Logout
r = requests.post(f"{BASE}/auth/logout", headers=h)
rec("Logout", r.status_code == 200, f"{r.status_code} {r.text[:100]}")

# 6. Seeded demo logins
def login(email, pw):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pw})
    return r

r = login("asha@sanjeevani.in", "Asha@2026")
rec("Login demo ASHA", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
asha_token = r.json().get("access_token")

r = login("hospital@sanjeevani.in", "Hosp@2026")
rec("Login demo Hospital", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
hosp_token = r.json().get("access_token")

r = login("bhavythukrall@gmail.com", "Sanjeevani@2026")
rec("Login admin", r.status_code == 200, f"{r.status_code} {r.text[:120]}")

# 7. Hospitals list
r = requests.get(f"{BASE}/hospitals")
hospitals = r.json() if r.status_code == 200 else []
rec("GET /hospitals >=5", r.status_code == 200 and len(hospitals) >= 5,
    f"{r.status_code} count={len(hospitals)}")

# Find hospital linked to hospital user & one with cardiology
cardio_h = next((h for h in hospitals if "cardiology" in [s.lower() for s in h.get("specialties", [])]), None)
first_h = hospitals[0] if hospitals else None

# 8. Hospital availability PATCH by hospital user
hh = {"Authorization": f"Bearer {hosp_token}"}
me_r = requests.get(f"{BASE}/auth/me", headers=hh).json()
my_hosp_id = me_r.get("hospital_id") or (first_h["id"] if first_h else None)
r = requests.patch(f"{BASE}/hospitals/{my_hosp_id}/availability",
                   headers=hh, json={"available_beds": 30, "available_icu": 5, "emergency_available": True})
rec("Hospital PATCH availability (hospital role)", r.status_code == 200, f"{r.status_code} {r.text[:200]}")

# ASHA cannot PATCH
ah = {"Authorization": f"Bearer {asha_token}"}
r = requests.patch(f"{BASE}/hospitals/{my_hosp_id}/availability",
                   headers=ah, json={"available_beds": 1})
rec("ASHA PATCH availability -> 403", r.status_code == 403, f"{r.status_code} {r.text[:150]}")

# 9. Create patient (ASHA)
patient_payload = {
    "name": "Ram Singh", "age": 55, "gender": "male",
    "location": "Village Sanganer", "lat": 26.8, "lon": 75.8,
    "symptoms": "chest pain and breathless", "injury_details": "none",
    "severity": "high", "phone": "8888888888"
}
r = requests.post(f"{BASE}/patients", headers=ah, json=patient_payload)
rec("POST /patients (ASHA)", r.status_code in (200, 201), f"{r.status_code} {r.text[:200]}")
patient = r.json() if r.status_code < 300 else {}
patient_id = patient.get("id")

r = requests.get(f"{BASE}/patients", headers=ah)
rec("GET /patients (ASHA sees own)", r.status_code == 200 and any(p.get("id") == patient_id for p in r.json()),
    f"{r.status_code} count={len(r.json()) if r.status_code==200 else 0}")

r = requests.get(f"{BASE}/patients/{patient_id}", headers=ah)
rec("GET /patients/{id}", r.status_code == 200 and r.json().get("id") == patient_id, f"{r.status_code}")

# 10. Match - cardiology
r = requests.post(f"{BASE}/match", headers=ah, json={"patient_id": patient_id})
if r.status_code == 200:
    m = r.json()
    spec = m.get("required_specialty", "").lower()
    ranked = m.get("ranked_hospitals") or m.get("hospitals") or []
    top = ranked[0] if ranked else {}
    top_specs = [s.lower() for s in top.get("specialties", top.get("hospital", {}).get("specialties", []))]
    scores_ok = True
    if len(ranked) >= 2:
        s0 = ranked[0].get("match_score", 0); s1 = ranked[1].get("match_score", 0)
        scores_ok = s0 >= s1
    rec("Match cardiology + ranked desc",
        "cardio" in spec and "cardiology" in top_specs and scores_ok,
        f"spec={spec} top_specs={top_specs} scores_ok={scores_ok} resp_keys={list(m.keys())}")
else:
    rec("Match cardiology", False, f"{r.status_code} {r.text[:200]}")

# Obscure symptoms -> LLM
p2 = dict(patient_payload); p2["symptoms"] = "strange dizziness confusion"; p2["name"] = "Test2"
r = requests.post(f"{BASE}/patients", headers=ah, json=p2)
pid2 = r.json().get("id") if r.status_code < 300 else None
if pid2:
    r = requests.post(f"{BASE}/match", headers=ah, json={"patient_id": pid2})
    rec("Match LLM used for obscure",
        r.status_code == 200 and r.json().get("llm_used") is True,
        f"{r.status_code} llm_used={r.json().get('llm_used') if r.status_code==200 else 'n/a'}")

# 11. Referrals - create
r = requests.post(f"{BASE}/referrals", headers=ah, json={
    "patient_id": patient_id, "hospital_id": my_hosp_id, "notes": "urgent"
})
rec("Create referral", r.status_code in (200, 201), f"{r.status_code} {r.text[:200]}")
ref = r.json() if r.status_code < 300 else {}
ref_id = ref.get("id")
rec("Initial status pending", ref.get("status") == "pending", f"status={ref.get('status')}")

r = requests.get(f"{BASE}/referrals", headers=ah)
rec("GET referrals lists it", r.status_code == 200 and any(x.get("id") == ref_id for x in r.json()), f"{r.status_code}")

# State machine
def patch_status(tok, status, extra=None):
    body = {"status": status}
    if extra: body.update(extra)
    return requests.patch(f"{BASE}/referrals/{ref_id}/status",
                          headers={"Authorization": f"Bearer {tok}"}, json=body)

# Invalid transition pending->completed
r = patch_status(asha_token, "completed")
rec("Invalid pending->completed 400", r.status_code == 400, f"{r.status_code} {r.text[:150]}")

# Wrong role: ASHA pending->accepted
r = patch_status(asha_token, "accepted")
rec("ASHA cannot accept -> 403", r.status_code == 403, f"{r.status_code} {r.text[:150]}")

# Hospital accepts
before_hosp = requests.get(f"{BASE}/hospitals").json()
before_beds = next((h["available_beds"] for h in before_hosp if h["id"] == my_hosp_id), None)
r = patch_status(hosp_token, "accepted")
rec("Hospital accept pending->accepted", r.status_code == 200, f"{r.status_code} {r.text[:150]}")
after_hosp = requests.get(f"{BASE}/hospitals").json()
after_beds = next((h["available_beds"] for h in after_hosp if h["id"] == my_hosp_id), None)
rec("Bed decrement on accept", after_beds is not None and before_beds is not None and after_beds == before_beds - 1,
    f"before={before_beds} after={after_beds}")

# ASHA in_transit
r = patch_status(asha_token, "in_transit")
rec("ASHA accepted->in_transit", r.status_code == 200, f"{r.status_code} {r.text[:120]}")

# 12. Ambulance BEFORE accepted: create separate referral to test
r2 = requests.post(f"{BASE}/referrals", headers=ah, json={"patient_id": patient_id, "hospital_id": my_hosp_id, "notes": "t"})
ref2 = r2.json().get("id") if r2.status_code < 300 else None
if ref2:
    r = requests.post(f"{BASE}/ambulances/request", headers=ah, json={"referral_id": ref2})
    rec("Ambulance before accepted -> 400", r.status_code == 400, f"{r.status_code} {r.text[:150]}")

# Ambulance after accepted (use original ref which is now in_transit but accepted was true earlier)
r = requests.post(f"{BASE}/ambulances/request", headers=ah, json={"referral_id": ref_id})
rec("Ambulance request after accept", r.status_code in (200, 201), f"{r.status_code} {r.text[:200]}")
amb_req = r.json() if r.status_code < 300 else {}
amb_req_id = amb_req.get("id")

r = requests.get(f"{BASE}/ambulances/requests/by-referral/{ref_id}", headers=ah)
rec("GET ambulance by referral", r.status_code == 200, f"{r.status_code} {r.text[:120]}")

# Continue state machine: in_transit->arrived (ASHA), arrived->completed (hospital)
r = patch_status(asha_token, "arrived")
rec("ASHA in_transit->arrived", r.status_code == 200, f"{r.status_code} {r.text[:120]}")
r = patch_status(hosp_token, "completed")
rec("Hospital arrived->completed", r.status_code == 200, f"{r.status_code} {r.text[:120]}")

# Rejection test on new referral
r3 = requests.post(f"{BASE}/referrals", headers=ah, json={"patient_id": patient_id, "hospital_id": my_hosp_id, "notes": "r"})
ref3 = r3.json().get("id") if r3.status_code < 300 else None
if ref3:
    r = requests.patch(f"{BASE}/referrals/{ref3}/status",
                       headers={"Authorization": f"Bearer {hosp_token}"},
                       json={"status": "rejected", "rejection_reason": "no beds"})
    rec("Hospital pending->rejected", r.status_code == 200, f"{r.status_code} {r.text[:150]}")

# 13. File upload
files = {"file": ("test.png", io.BytesIO(b"\x89PNG\r\n\x1a\nfakepng"), "image/png")}
r = requests.post(f"{BASE}/uploads/patients/{patient_id}/reports",
                  headers=ah, files=files, data={"report_type": "xray"})
rec("Upload medical report", r.status_code in (200, 201), f"{r.status_code} {r.text[:200]}")

r = requests.get(f"{BASE}/uploads/patients/{patient_id}/reports", headers=ah)
rec("List medical reports", r.status_code == 200 and len(r.json()) >= 1, f"{r.status_code} count={len(r.json()) if r.status_code==200 else 0}")

print("\n=== SUMMARY ===")
print(f"Passed: {len(results['passed'])}, Failed: {len(results['failed'])}")
for f in results["failed"]:
    print("FAIL:", f["name"], "-", f["evidence"])

with open("/tmp/results.json", "w") as f:
    json.dump(results, f, indent=2)
