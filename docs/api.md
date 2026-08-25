# CareConnect REST API Specification

## Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login/` | Authenticate user & return JWT tokens + role | No |
| POST | `/api/auth/register/` | Register new user account with role | No |
| POST | `/api/auth/refresh/` | Refresh access token | No |
| GET | `/api/auth/me/` | Fetch current user profile details | Yes |
| PUT | `/api/auth/me/` | Update profile information | Yes |
| POST | `/api/auth/change-password/` | Change account password | Yes |
| POST | `/api/auth/forgot-password/` | Request password reset token | No |
| POST | `/api/auth/reset-password/` | Reset password using reset token | No |

## Emergency & Escalation Endpoints

| Method | Endpoint | Description | Permitted Roles |
|--------|----------|-------------|-----------------|
| POST | `/api/emergency/sos/` | Trigger new emergency SOS incident | Resident |
| GET | `/api/emergency/incidents/` | List emergency incidents allowed by role | All Roles |
| GET | `/api/emergency/incidents/{id}/` | Incident detail & escalation history | All Roles |
| POST | `/api/emergency/incidents/{id}/accept/` | Accept emergency (stops escalation) | Responders |
| POST | `/api/emergency/incidents/{id}/decline/` | Decline emergency (advances stage) | Responders |
| POST | `/api/emergency/incidents/{id}/resolve/` | Mark incident as RESOLVED | Responders / Admin |
| POST | `/api/emergency/incidents/{id}/cancel/` | Cancel SOS incident | Resident |

## Emergency Chat & WebSockets

- **REST Chat Fetch**: `GET /api/chat/{incident_id}/`
- **REST Post Message**: `POST /api/chat/{incident_id}/`
- **WebSocket Endpoint**: `ws://<host>/ws/chat/{incident_id}/`

## Admin Management Endpoints

- User CRUD & Activation: `/api/admin/users/`
- Societies CRUD: `/api/societies/`
- Blocks CRUD: `/api/blocks/`
- Flats CRUD: `/api/flats/`
- Audit Logs: `/api/audit-logs/`
