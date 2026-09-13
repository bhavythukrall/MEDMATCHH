# Sanjeevani Care — Product Requirements Doc

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

## Testing
`/app/test_reports/iteration_1.json` — 18/18 backend pytest cases pass; all frontend flows above verified.

## Backlog (P1)
- SMS/WhatsApp alerts to ASHA + patient family (Twilio)
- Live ambulance map (village → hospital transit)
- Real-time referral/ambulance push updates (SSE/WebSocket)
- Voice input on the SOS page (speak the problem in Hindi)

## Backlog (P2)
- Analytics dashboard (golden-hour time, rejection reasons, bed pressure)
- Password reset flow; patient-account linkage to their own referrals
- Hospital self-registration; ambulance driver GPS view
