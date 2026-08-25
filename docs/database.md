# CareConnect Database Schema Documentation

## Overview
CareConnect uses PostgreSQL (with SQLite fallback) for robust relational data persistence.

## ER Model Summary

```
+-------------------+        +----------------------+        +-------------------+
|       User        | 1    * | GuardianRelationship | *    1 |       User        |
|  (Resident/Admin) |<-------|                      |------->|    (Guardian)     |
+-------------------+        +----------------------+        +-------------------+
          │ 1
          │
          │ *
+-------------------+        +----------------------+        +-------------------+
| ResidentFlatMap   | *    1 |         Flat         | *    1 |       Block       |
|                   |------->|                      |------->|                   |
+-------------------+        +----------------------+        +-------------------+
                                                                       │ *
                                                                       │ 1
                                                             +-------------------+
                                                             |      Society      |
                                                             +-------------------+

+-------------------+ 1    1 +----------------------+
| EmergencyIncident |<-------|     IncidentChat     |
+-------------------+        +----------------------+
          │ 1                          │ 1
          │                            │
          │ *                          │ *
+-------------------+        +----------------------+
|EmergencyEscalation|        |     ChatMessage      |
+-------------------+        +----------------------+
```

## Primary Models

### 1. `careconnect_users`
- `id` (PK)
- `username` (Unique, CharField)
- `email` (EmailField)
- `role` (`ADMIN`, `RESIDENT`, `GUARDIAN`, `SOCIETY_MEMBER`, `SECURITY`, `VOLUNTEER`)
- `phone_number`, `address`, `avatar_url`, `is_active`

### 2. `careconnect_emergency_incidents`
- `id` (UUID PK)
- `incident_number` (CharField, Indexed, e.g. "CC-20260821-0001")
- `resident_id` (FK User)
- `category` (`MEDICAL`, `FIRE`, `SECURITY`, `GENERAL`)
- `message`, `latitude`, `longitude`, `location_address`
- `status` (`PENDING`, `ESCALATING`, `ACCEPTED`, `ACTIVE_RESPONSE`, `RESOLVED`, `CANCELLED`, `UNRESPONDED`)
- `current_stage` (`PRIMARY_GUARDIAN`, `SECONDARY_GUARDIAN`, `SOCIETY_MEMBER`, `SECURITY`, `VOLUNTEER`, `ADMIN`, `COMPLETED`)
- `response_deadline` (Timestamp)
- `accepted_by_id`, `accepted_at`, `resolved_by_id`, `resolved_at`

### 3. `careconnect_guardian_relationships`
- `resident_id` (FK User)
- `guardian_id` (FK User)
- `is_primary` (Boolean, max 1 per resident)
- `is_secondary` (Boolean, max 1 per resident)
- `relationship_type` (CharField)
