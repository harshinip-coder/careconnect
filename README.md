# CareConnect — Community Emergency Response & Assistance Network

**CareConnect** is a production-ready, full-stack emergency response platform designed for residential societies, apartments, and gated communities. 

When a resident triggers a single-tap **SOS emergency**, CareConnect captures real-time GPS location coordinates and automatically escalates the incident through a server-enforced **30-second response chain** (`Primary Guardian → Secondary Guardian → Society Members → Security → Volunteer → Admin → Unresponded`).

---

## Key Features

- **Multi-Role Access Control**: 6 distinct user roles (`Admin`, `Resident`, `Guardian`, `Society Member`, `Security`, `Volunteer`).
- **Server-Side 30-Second Escalation Engine**: Atomic state machine with row-level database locking to eliminate race conditions between acceptance, decline, and timeout.
- **Targeted Notification Scoping**: Privacy-focused routing; notifications & locations are sent strictly to linked guardians, society security, and volunteers.
- **Emergency Chat**: Real-time text messaging between Resident and Accepted Responder with system audit events.
- **Live Admin Command Center**: Operations monitor with active SOS map markers, escalation history tracking, user management CRUD, society/block/flat management, and audit logs.
- **Cross-Platform Mobile App**: React Native Expo app with high-contrast emergency UI, countdown timers, and role-based routing.

---

## System Architecture

```
careconnect/
├── backend/
│   ├── config/          # Django settings, ASGI/WSGI, root URLs
│   ├── users/           # User model, 6 Roles, Profiles, JWT Auth, Permissions
│   ├── society/         # Society, Block, Flat, ResidentFlatMapping models & CRUD
│   ├── emergency/       # EmergencyIncident model, Escalation Engine, 30s Timers
│   ├── notifications/   # Notification model & delivery service
│   ├── chat/            # IncidentChat, ChatMessage models, WebSockets
│   ├── audit/           # AuditLog model & logging helper
│   ├── seed_data.py     # Management script to seed 6 role demo accounts
│   ├── tests/           # Automated test suite (8 escalation scenarios + race tests)
│   └── requirements.txt
├── mobile/              # Expo React Native App
│   ├── src/
│   │   ├── components/  # SOSButton, EscalationTracker, EmergencyAlertModal
│   │   ├── context/     # AuthContext with persistent tokens
│   │   ├── navigation/  # Role-based RootNavigator
│   │   ├── screens/     # Role Dashboards, Emergency Chat, Guardian Manager, Admin
│   │   ├── services/    # REST API client & GPS location capture
│   │   └── types/       # TypeScript interfaces
│   ├── app.json
│   └── package.json
└── docs/                # Architecture, DB Schema, API Spec, Deployment Guides
```

---

## Demo Accounts & Test Credentials

All demo accounts are pre-seeded with the password: **`admin123`**

| Role | Username | Email | Key Capabilities |
|------|----------|-------|------------------|
| **Admin** | `admin_user` | `admin@test.com` | Live SOS ops monitor, User CRUD, Society CRUD, Audit logs |
| **Resident** | `resident_user` | `resident@test.com` | Trigger SOS, GPS location capture, Guardian manager, Chat |
| **Primary Guardian** | `primary_guardian` | `guardian@test.com` | Receive 1st stage SOS alert, Accept/Decline within 30s |
| **Secondary Guardian** | `secondary_guardian` | `secondary_guardian@test.com` | Receive 2nd stage SOS alert if primary declines/times out |
| **Society Member** | `society_member` | `society@test.com` | Receive society-level emergency alerts |
| **Security** | `security_officer` | `security@test.com` | Gate security dashboard, Accept SOS, Resolve incident |
| **Volunteer** | `volunteer_hero` | `volunteer@test.com` | Toggle availability status (AVAILABLE/UNAVAILABLE), Respond |

---

## Quick Start Guide

### 1. Backend Setup & Run

```bash
cd backend

# Create Virtual Environment & Install Dependencies
python -m venv venv
.\venv\Scripts\activate      # On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt

# Run Migrations & Seed Demo Accounts
python manage.py migrate
python seed_data.py

# Run Automated Test Suite (Verifies 8 Escalation Scenarios & Concurrency Locks)
python manage.py test tests

# Start Development Backend API Server
python manage.py runserver 0.0.0.0:8000
```

### 2. Mobile App Setup & Run

```bash
cd mobile

# Install npm dependencies
npm install

# Start Expo Development Server
npx expo start
```

---

## 30-Second Escalation Flow Verification

1. **Login as Resident** (`resident_user` / `admin123`).
2. **Press SOS**: Select category (e.g. `MEDICAL`) and press **SEND SOS NOW**.
3. **Primary Guardian Stage**: Login as `primary_guardian` on a separate session/tab. An emergency alert popup appears with a 30s countdown bar. Press **DECLINE**.
4. **Secondary Guardian Stage**: The incident immediately advances stage to `SECONDARY_GUARDIAN`.
5. **Timeout Test**: Wait 30 seconds without acting. The backend automatically advances the stage to `SOCIETY_MEMBER` -> `SECURITY` -> `VOLUNTEER`.
6. **Accept Test**: Login as `security_officer` (`security@test.com`), press **ACCEPT**. Escalation stops instantly.
7. **Emergency Chat**: Both Resident and Security Officer can chat back and forth with real-time updates.
8. **Resolution**: Security Officer presses **RESOLVE**, marking the incident completed.
