# Sanjeevani Care — Product Requirements Doc

## Problem
Rural patients often reach the wrong hospital first, wasting golden-hour minutes. ASHA workers need a fast way to (a) capture patient details, (b) match them to a hospital that actually has the right specialty and free beds, and (c) coordinate an ambulance.

## Users
- **Patients / family** — register, view referral status.
- **ASHA workers** — register patients, upload reports, run AI match, create referrals, mark in-transit / arrived, request ambulance.
- **Hospital admins** — manage bed & ICU counts, accept / reject referrals, mark completed.
- **Admin** — full oversight.

## Architecture
- **Backend:** FastAPI + SQLAlchemy async + **PostgreSQL 15** (installed locally via apt, supervised).
- **Frontend:** React (React Router v7, Tailwind, shadcn/ui, sonner toasts).
- **Auth:** JWT in httpOnly cookies (+ Authorization Bearer fallback), bcrypt hashing, role-based dependencies.
- **AI Matching:** rule-based keyword map (~20 specialties) → Claude Sonnet 4.6 fallback via `emergentintegrations`. Ranking = specialty(40) + beds(25) + ICU(15) + distance(20) + emergency(5).
- **Object Storage:** Emergent proxy for medical reports.

## Implemented (2026-02)
- Auth: register / login / logout / me + admin+demo seeding
- Hospitals: list, get, create, availability PATCH (RBAC)
- Patients: create, list-mine, get
- AI matching endpoint with rule → LLM fallback
- Referrals: create + full state machine (Pending → Accepted → In Transit → Arrived → Completed, plus Rejected branch), bed auto-decrement on accept, transition guards per role
- Ambulance: request assigns available vehicle, status transitions, bulk list
- Medical report upload / list / download (JWT-gated)
- 5 seeded Rajasthan hospitals, 4 ambulances, ASHA + Hospital demo accounts
- Full multi-role frontend: Landing, Login, Register, Patient CRUD, AI Match panel, Referral stepper, Hospital dashboard

## Backlog (P1)
- Real-time updates via SSE / WebSocket (referral & ambulance status pushes)
- SMS/Whatsapp notifications to ASHA + patient family (Twilio)
- Multilingual UI (Hindi / regional)
- Real geolocation from device + interactive map view
- Analytics dashboard (avg golden-hour time, rejection reasons, bed pressure)

## Backlog (P2)
- Password reset flow
- Patient auth linkage (patient sees their own referrals)
- Hospital self-registration (currently seeded)
- Ambulance driver mobile view with GPS ping
