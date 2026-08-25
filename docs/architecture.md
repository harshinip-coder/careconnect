# CareConnect Architecture Documentation

## System Architecture

**CareConnect — Community Emergency Response & Assistance Network** is designed as a distributed, real-time emergency escalation application for residential gated communities and apartment complexes.

```
                  ┌─────────────────────────────────────────┐
                  │          Expo Mobile Frontend           │
                  │ (Resident / Guardians / Security / etc) │
                  └────────────────────┬────────────────────┘
                                       │ HTTPS / WebSockets
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │              Django Backend             │
                  │  ┌──────────────┐    ┌──────────────┐   │
                  │  │ REST (DRF)   │    │ WS Channels  │   │
                  │  └──────┬───────┘    └──────┬───────┘   │
                  │         │                   │           │
                  │         ▼                   ▼           │
                  │  ┌─────────────────────────────────┐   │
                  │  │ 30-Sec Escalation Engine (Locks)│   │
                  │  └──────────────────┬──────────────┘   │
                  └─────────────────────┼───────────────────┘
                                        │
                                        ▼
                  ┌─────────────────────────────────────────┐
                  │      PostgreSQL / SQLite Database       │
                  └─────────────────────────────────────────┘
```

## Core Escalation Engine State Machine

The escalation engine operates on a strict server-enforced state machine:

```
CREATED
   ↓
PRIMARY_GUARDIAN (30s) ───[ACCEPT]───> ACCEPTED ───> ACTIVE_RESPONSE ───> RESOLVED
   │ (Decline/Timeout)
   ▼
SECONDARY_GUARDIAN (30s) ─[ACCEPT]───> ACCEPTED
   │ (Decline/Timeout)
   ▼
SOCIETY_MEMBER (30s) ────[ACCEPT]───> ACCEPTED
   │ (Decline/Timeout)
   ▼
SECURITY (30s) ──────────[ACCEPT]───> ACCEPTED
   │ (Decline/Timeout)
   ▼
VOLUNTEER (30s) ─────────[ACCEPT]───> ACCEPTED
   │ (Decline/Timeout)
   ▼
ADMIN (30s) ─────────────[ACCEPT]───> ACCEPTED
   │ (Decline/Timeout)
   ▼
UNRESPONDED
```

## Security & Concurrency Design
- **Atomic Locking**: Uses `select_for_update()` on incident row to ensure only one responder wins the acceptance race condition.
- **Targeted Notification Scoping**: Alerts are dispatched strictly to relevant linked guardians, society members of the resident's specific society, and assigned security/volunteers. Global broadcasts are prohibited.
- **JWT Authorization**: Backend validates permissions on every REST and WebSocket request based on verified user roles stored in the database.
