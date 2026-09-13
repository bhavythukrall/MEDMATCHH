# MedMatch — Product Requirements Doc

## Problem
Rural patients often reach the wrong hospital first, wasting golden-hour minutes. ASHA workers, patients and hospital doctors need a fast way to capture the problem (in Hindi or English), find the right specialist, check who is actually on duty with free beds, and coordinate an ambulance/transfer.

## Users
- **Patients / family** — SOS triage (no login needed), register, view referral status.
- **ASHA workers** — register patients, upload reports, run AI match, create referrals, mark in-transit / arrived, request ambulance.
- **Hospital staff / doctors** — maintain their own hospital's beds/ICU/specialties/phone, manage their doctor roster & duty status, accept/reject referrals, mark completed, and refer/transfer a patient to another hospital in an emergency.
- **Admin** — full oversight.

## Architecture
- **Backend:** FastAPI + SQLAlchemy async + **PostgreSQL 15** (supervised locally).
- **Frontend:** React (React Router, Tailwind, shadcn/ui, sonner), rural-friendly large type/icons, mobile-first.
- **i18n:** In-app dictionary `/app/frontend/src/lib/i18n.jsx` (en + hi), navbar toggle, persisted in `localStorage`.
- **Auth:** JWT in httpOnly cookies (+ Bearer fallback), bcrypt, role-based dependencies.
- **AI Matching:** bilingual rule-based keyword map (EN + Hindi) → Claude Sonnet 4.6 fallback via `emergentintegrations`. Ranking = specialty 30 + on-duty specialist 15 + beds 25 + ICU 15 + distance 20 + emergency 5.
- **Object Storage:** Emergent proxy for medical reports.

## Implemented
### 2026-02 (MVP)
- Auth (register/login/logout/me) + admin & demo seeding
- Hospitals list/get/create/availability PATCH (RBAC)
- Patients create/list/get; AI match endpoint; referral state machine (Pending → Accepted → In Transit → Arrived → Completed / Rejected) with bed auto-decrement
- Ambulance request + status transitions; medical report upload/list/download
- 5 seeded Rajasthan hospitals, 4 ambulances, ASHA + hospital demo accounts
- Multi-role frontend: Landing, Login, Register, Patient CRUD, AI match panel, Referral stepper, Hospital dashboard

### 2026-06 (this iteration)
- **Hindi / English toggle** across every page (navbar `language-toggle-button`), persisted per browser; specialties, statuses and severities localized
- **Public SOS page `/sos`** — free-text problem in Hindi or English + 8 tap-and-go chips; `POST /api/sos/triage` returns needed specialist and ranked hospitals with the doctors actually on duty, beds, ICU, distance and a call button. Verified: चेस्ट पेन/सीने में दर्द → cardiologist, गर्भपात → gynaecologist, त्वचा/skin → dermatologist, माइग्रेन → neurologist
- **Doctors table + roster management** — `/api/doctors` CRUD scoped to the staff member's own hospital (403 otherwise); `/hospital/doctors` page to add, flip on-duty, delete; seeded ~21 doctors
- **Hospital staff data editing** — total beds, total ICU, available beds/ICU, specialties, phone, emergency switch (with available ≤ total clamping)
- **Doctor-initiated transfer referrals** — hospital-role users can register patients, run the match and send a referral to another hospital; referral creator (ASHA or doctor) drives in_transit/arrived
- **Patient history** — every patient page lists all past referrals with status
- **Rural-friendly UI** — 17px base, larger icons/buttons/inputs, high-contrast SOS action, mobile verified at 390px

### 2026-06 (landing rework)
- Hero action buttons replaced by three tappable role cards — **ASHA Worker → `/login?role=asha`**, **Patient / Family → `/login?role=patient`**, **Hospital → `/login?role=hospital`** (ambulance card removed); login page shows "Logging in as <role>". SOS / Login / Get started live only in the top bar now.
- Added `/app/scripts/init_postgres.sh` + `postgres-bootstrap` supervisor program so the `sanjeevani` role/database is recreated automatically if the PG data dir resets (fixed a 502 caused by this).

### 2026-06 (branding + plain-language UI)
- Renamed the product to **MedMatch** across logo, nav, all screens, page title and API (`GET /api/` → `{"service":"MedMatch"}`); tagline "Right Patient. Right Hospital. Right Information. Right Time." on the landing page. Demo accounts migrated to `@medmatch.in`.
- **Removed every mention of "AI" from the UI.** Loading now reads "Understanding your problem…", results show a **Your Care Need** card (Urgency · Care needed · Facilities needed, e.g. Urgent + Cardiologist + Emergency Care/ECG/Cath Lab) followed by **Best Matching Hospitals**. Backend gained `care_requirement()` returning urgency + facilities per specialty.
- Voice input everywhere a problem is described: patient SOS, family intake and the ASHA symptom field (shared `VoiceInputButton`, hi-IN / en-IN).
- New **hospital search** page `/hospitals` for planned visits (name / speciality / location) available to patients and ASHA workers.
- Hospital recommendations only render after a problem is submitted.

## Testing
`/app/test_reports/iteration_1.json` — 18/18 backend cases pass (SOS triage, doctors, hospital editing, transfers).
`/app/test_reports/iteration_2.json` — SELF/family flow: 6/6 new backend cases + 20/22 frontend checks pass; confirmed no referral is ever created from the SELF flow.

### 2026-06 (SELF / family-member flow — bug fix)
- "Add Patient" on the patient side no longer behaves like referral creation. New SELF flow: **LOGIN → `/me` "Who needs help today?" → saved person cards → person profile → problem intake (text **and** voice) → AI analysis → best hospitals with doctors on duty, distance, ETA and Maps link**.
- `+ Add Family Member` (`/me/add`) saves a person to the account: name, relationship, age, gender, optional phone — nothing clinical, no referral.
- Family profile `/me/:id`: relationship/age/gender + optional medical history & allergies, with **Use MedMatch**, **Edit Profile**, **Remove**.
- Problem intake `/me/:id/help`: text box + Web Speech API mic (hi-IN / en-IN), **Find Hospital** and **Emergency Help** — Emergency uses the currently selected person and offers Call 108; neither creates a referral.
- Saved people persist across logins. `patients` table gained `relationship`, `medical_history`, `allergies` (idempotent ALTER on startup); `/api/patients` is owner-scoped for patient role with PATCH/DELETE ownership checks.
- Referral creation remains exclusively in the ASHA and hospital workflows; `/asha/*` is now blocked for the patient role.


## Backlog (P1)
- SMS/WhatsApp alerts to ASHA + patient family (Twilio)
- Live ambulance map (village → hospital transit)
- Real-time referral/ambulance push updates (SSE/WebSocket)
- Voice input on the SOS page (speak the problem in Hindi)

## Backlog (P2)
- Analytics dashboard (golden-hour time, rejection reasons, bed pressure)
- Password reset flow; patient-account linkage to their own referrals
- Hospital self-registration; ambulance driver GPS view
