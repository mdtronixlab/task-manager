# Organisation Task Manager (OTM)
## System Architecture

**Document:** `architecture.md`  
**Version:** 1.0  
**Status:** Initial Specification

---

# 1. Architecture Overview

> **Superseded (2026-08-21):** the diagram and §3/§4 below originally
> described Google Apps Script + Google Sheets. Per explicit product
> decision (memory.md Change Log, 2026-08-21), the backend is now a real
> Node.js service and the database is SQLite via Prisma. The repository is
> an npm-workspaces monorepo: `apps/web` (frontend), `apps/api` (backend).
> Sections below are updated to match; historical detail about the Apps
> Script approach that's no longer relevant has been removed rather than
> kept as dead documentation.

The Organisation Task Manager uses a lightweight web architecture:

```text
┌───────────────────────────────┐
│           USERS               │
│                               │
│ Staff / Super Admin           │
└───────────────┬───────────────┘
                │
                │ HTTPS
                ▼
┌───────────────────────────────┐
│  React Web Application        │
│  (apps/web)                   │
│                               │
│ Vite                          │
│ React                         │
│ Tailwind CSS                  │
│ React Router                  │
└───────────────┬───────────────┘
                │
                │ HTTPS API (REST, JSON)
                ▼
┌───────────────────────────────┐
│  Express API                  │
│  (apps/api)                   │
│                               │
│ Authentication validation     │
│ Authorization                 │
│ Business logic                │
│ Validation                    │
│ Route handling                │
└───────────────┬───────────────┘
                │
                │ Prisma
                ▼
┌───────────────────────────────┐
│        SQLite                 │
│                               │
│ User                          │
│ Task                          │
│ Category                      │
│ Department                    │
│ ActivityLog                   │
│ Setting                       │
│ Counter                       │
└───────────────────────────────┘
```

---

# 2. Technology Stack

## Frontend

### React

Primary application framework.

Responsibilities:

- UI rendering
- Routing
- State management
- User interactions
- Form handling
- API communication
- Dashboard rendering

### Vite

Used as the React development/build environment.

### Tailwind CSS

Used for styling and responsive layouts.

### React Router

Used for application routing.

Expected routes:

```text
/login
/dashboard
/tasks
/tasks/today
/tasks/history
/staff
/staff/:id
/reports
/profile
/settings
```

---

# 3. Backend

**Node.js (Express)**, at `apps/api`, is the backend/API.

It is responsible for:

- API endpoints (REST routes under `/api`)
- Authentication verification (Firebase Admin SDK)
- Authorization
- Data validation
- Business rules
- Database access (via Prisma)
- Activity logging
- Reporting calculations

The frontend must treat the Express API as the authoritative API.

---

# 4. Database

**SQLite**, accessed through **Prisma**, is the data store — `apps/api/prisma/schema.prisma` is the source of truth for the schema, applied via Prisma migrations (`apps/api/prisma/migrations/`).

```text
apps/api/prisma/dev.db
│
├── User
├── Task
├── Category
├── Department
├── ActivityLog
├── Setting
└── Counter
```

`Counter` backs application-generated IDs (§23) — a dedicated table now
that a real transactional database makes this straightforward, instead of
overloading `Setting` rows as the Sheets version had to.

---

# 5. User Table

Schema (Prisma model `User`, table `users`):

```text
userId
name
email
role
departmentId
designation
avatar
active
createdAt
updatedAt
```

Example:

```text
USR_000001
Rahul Kumar
rahul@gmail.com
STAFF
DEP_000001
Developer
...
true
2026-08-20T09:00:00.000Z
2026-08-20T09:00:00.000Z
```

The email should be normalised before comparison.

Recommended normalisation:

```text
trim()
toLowerCase()
```

---

# 6. Task Table

Schema (Prisma model `Task`, table `tasks`):

```text
taskId
userId
taskDate
title
description
categoryId
priority
status
createdAt
updatedAt
startedAt
completedAt
```

Example:

```text
TSK_000001
USR_000001
2026-08-20
Prepare quotation
Prepare quotation for client ABC
CAT_000002
HIGH
IN_PROGRESS
2026-08-20T09:10:00.000Z
2026-08-20T10:15:00.000Z
2026-08-20T10:00:00.000Z
(null)
```

`taskDate` stays a plain `YYYY-MM-DD` string (§25) — it's a calendar
concept, not an instant, and is computed server-side in the organisation's
configured timezone. The other four are real `DateTime` columns.

---

# 7. Category Table

Schema (Prisma model `Category`, table `categories`):

```text
categoryId
name
description
active
createdAt
```

Example:

```text
CAT_000001
Technical
Technical work
true
2026-08-20T09:00:00.000Z
```

---

# 8. Department Table

Schema (Prisma model `Department`, table `departments`):

```text
departmentId
name
description
active
createdAt
```

Example:

```text
DEP_000001
Technical
Technical Department
true
2026-08-20T09:00:00.000Z
```

---

# 9. ActivityLog Table

Schema (Prisma model `ActivityLog`, table `activity_log`):

```text
logId
userId
taskId
action
field
oldValue
newValue
timestamp
metadata
```

Example:

```text
LOG_000001
USR_000001
TSK_000001
STATUS_CHANGED
status
PENDING
IN_PROGRESS
2026-08-20T10:00:00.000Z
{}
```

---

# 10. Setting Table

Used for application-level configuration.

Schema (Prisma model `Setting`, table `settings`):

```text
key
value
description
updatedAt
```

Example:

```text
APPLICATION_NAME
Organisation Task Manager
Application display name
2026-08-20T09:00:00.000Z
```

---

# 11. Authentication Architecture

**Firebase Authentication** (Google Sign-In provider) provides the user's identity. Firebase is used for authentication only — it does not host data. Firestore, Cloud Functions, and Firebase Hosting are explicitly out of scope; the Express API and SQLite remain the backend and database as defined elsewhere in this document.

**Firebase project:** `task-manager-app-2d85c`

The application should obtain the user's authenticated Firebase identity (a Firebase ID token) and use the email address it carries to identify the organisation user.

Conceptually:

```text
Google Account
  │
  │ Google Sign-In
  ▼
Firebase Authentication
  │
  │ Firebase ID token (JWT)
  ▼
React (apps/web)
  │
  │ send ID token with each API request
  │ (Authorization: Bearer <idToken>)
  ▼
Express API (apps/api)
  │
  │ verify token signature/issuer/audience
  │ extract verified email
  ▼
User table
```

The system then determines:

```text
Does this email exist?
        │
        ├── NO → Unauthorized
        │
        └── YES
             │
             ▼
        Is active?
             │
        ┌────┴────┐
        NO        YES
        │          │
      Deny       Continue
                   │
                   ▼
                 Role
              ┌────┴─────┐
            STAFF     SUPER_ADMIN
```

## 11.1 Token Verification — Decision

The Express API (a real Node runtime) verifies each Firebase ID token server-side before trusting its email claim, using the **Firebase Admin SDK**'s `verifyIdToken` (`apps/api/src/middleware/auth.js`) — local JWT/JWKS verification against Google's public certs, initialized with a service-account credential (`GOOGLE_APPLICATION_CREDENTIALS`).

```text
Express API
  │
  │ admin.auth().verifyIdToken(idToken)
  ▼
Verifies signature, issuer, audience, expiry against
Google's public certs (fetched/cached by the Admin SDK)
  │
  ├── Invalid/expired → Unauthorized
  └── Valid → decoded claims (verified email, uid)
                   │
                   ▼
              User table lookup (by normalised email)
```

**Historical note (superseded 2026-08-21):** the original Express API
version used the Identity Toolkit REST API (`accounts:lookup`) instead,
because Express API has no Firebase Admin SDK and no native RSA/JWT
verification library — hand-rolling signature verification there was
judged too high-risk. That constraint doesn't apply on a real Node
runtime, so the Admin SDK is used directly now (standard practice, one
fewer network round-trip per request, no need to treat the Firebase Web
API key as a config value to manage).

Never trust an unverified email/identity claim sent from the browser, even if it appears to originate from Firebase.

---

# 12. Authorization

Authentication answers:

> Who is the user?

Authorization answers:

> What is the user allowed to do?

Authorization must be enforced by the Express API.

The React UI may hide controls, but hiding a button is NOT security.

Example:

```text
STAFF
 ├── Read own tasks
 ├── Create own tasks
 ├── Update own tasks
 └── Complete own tasks

SUPER_ADMIN
 ├── Read all tasks
 ├── Read all users
 ├── Manage users
 ├── Manage categories
 ├── Manage departments
 └── View reports
```

---

# 13. API Architecture

React communicates with the Express API using standard HTTPS/REST requests
under an `/api` prefix (`apps/api/src/routes/`). Implemented so far
(Phase 1):

```text
GET   /api/health          — unauthenticated

GET   /api/users/me        — getCurrentUser (any authenticated user)
GET   /api/users           — getUsers (SUPER_ADMIN only)

GET   /api/tasks           — getTasks (own tasks for STAFF; ?userId= etc. for SUPER_ADMIN)
POST  /api/tasks           — createTask
PATCH /api/tasks/:taskId   — updateTask
```

Planned, not yet implemented (later phases per phases.md):

```text
POST   /api/users
PATCH  /api/users/:userId

DELETE /api/tasks/:taskId

GET    /api/reports/daily
GET    /api/reports/staff

GET    /api/categories
POST   /api/categories

GET    /api/departments
POST   /api/departments
```

Every authenticated request carries `Authorization: Bearer <Firebase ID
token>` — no action-dispatch envelope is needed now that this isn't
constrained to Express API's single-endpoint Web App model.

Example request:

```http
POST /api/tasks
Authorization: Bearer <idToken>
Content-Type: application/json

{ "title": "Prepare report", "priority": "HIGH" }
```

Response:

```json
{
  "success": true,
  "data": {
    "taskId": "TSK_000001"
  },
  "message": "Success"
}
```

---

# 14. API Response Standard

Every API response should follow a predictable structure.

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Task created successfully"
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You are not authorised to perform this action."
  }
}
```

This keeps frontend error handling consistent.

---

# 15. API Actions

Initial actions may include:

```text
getCurrentUser
getUsers
createUser
updateUser
disableUser

getTasks
getTask
createTask
updateTask
deleteTask
updateTaskStatus

getCategories
createCategory
updateCategory

getDepartments
createDepartment
updateDepartment

getDailyReport
getStaffReport
getActivityLogs
```

---

# 16. Frontend Architecture

Recommended project structure:

```text
src/
│
├── assets/
│
├── components/
│   ├── common/
│   ├── layout/
│   ├── tasks/
│   ├── dashboard/
│   ├── staff/
│   └── reports/
│
├── pages/
│   ├── Login/
│   ├── Dashboard/
│   ├── Tasks/
│   ├── Staff/
│   ├── Reports/
│   ├── Profile/
│   └── Settings/
│
├── layouts/
│   ├── StaffLayout.jsx
│   └── AdminLayout.jsx
│
├── hooks/
│
├── services/
│   ├── api.js
│   ├── auth.js
│   └── storage.js
│
├── context/
│   └── AuthContext.jsx
│
├── utils/
│
├── constants/
│
├── routes/
│
└── App.jsx
```

---

# 17. State Management

The MVP should avoid unnecessary complexity.

Start with:

- React Context for authentication/session state.
- Local component state for forms.
- Server/API state for tasks and dashboard data.

A dedicated state-management library should only be introduced if the application becomes sufficiently complex.

If required later:

```text
Redux Toolkit
```

can be added.

---

# 18. Data Flow — Creating a Task

```text
Staff
  │
  │ Fill form
  ▼
React
  │
  │ Validate basic fields
  ▼
API Request
  │
  ▼
Express API
  │
  ├── Validate user
  ├── Validate permissions
  ├── Validate task
  ├── Generate task ID
  ├── Add task (SQLite)
  └── Add activity log
  │
  ▼
Response
  │
  ▼
React
  │
  ▼
Update UI
```

---

# 19. Data Flow — Updating Status

Example:

```text
Staff clicks "Completed"
          │
          ▼
React
          │
          ▼
Express API
          │
          ├── Validate user
          ├── Validate task ownership
          ├── Read current status
          ├── Update status
          ├── Set completedAt
          └── Write activity log
          │
          ▼
SQLite
          │
          ▼
React
          │
          ▼
Dashboard updated
```

---

# 20. Admin Dashboard Data Flow

```text
Admin Dashboard
       │
       ▼
Request daily report
       │
       ▼
Express API
       │
       ├── Read Users
       ├── Read Tasks
       ├── Apply filters
       ├── Calculate statistics
       └── Build response
       │
       ▼
React
       │
       ├── KPI cards
       ├── Staff table
       ├── Charts
       └── Task table
```

---

# 21. Database Access Strategy

SQLite should only be accessed by the Express API, through Prisma.

```text
              ┌─────────────┐
              │    React    │
              └──────┬──────┘
                     │
                     X
               NO DIRECT ACCESS
                     │
                     ▼
              ┌─────────────┐
              │ Express API │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │   SQLite    │
              └─────────────┘
```

This prevents exposing database access logic to the frontend, and keeps
the path open to swap SQLite for PostgreSQL (§31) without touching React.

---

# 22. Performance Strategy

SQLite is a real relational database — indexed lookups by `taskId`/
`userId`/`email` are fast — but it's still a good habit to keep requests
lean now, since the same patterns carry over cleanly to Postgres later:

- Filter in the query (Prisma `where`), not by reading everything and
  filtering in JavaScript.
- Batch related writes inside a Prisma transaction where atomicity matters
  (e.g. ID generation, §23).
- Keep reporting calculations in the API, not the frontend.
- Cache configuration data (e.g. the org timezone) in memory where useful
  — see `apps/api/src/lib/time.js`.
- Consider pagination for large task histories once volume justifies it.

---

# 23. ID Generation

Every important entity should have an application-generated ID.

Examples:

```text
User:
USR_000001

Task:
TSK_000001

Category:
CAT_000001

Department:
DEP_000001

Activity:
LOG_000001
```

IDs should remain stable regardless of database row order. Each model has
a Prisma-internal autoincrement `id` (never exposed) plus this stable
string ID — the internal `id` must NOT be used as the application's
public ID (rules.md §17).

---

# 24. Timestamps

All important records should contain timestamps.

Examples:

```text
createdAt
updatedAt
startedAt
completedAt
```

The backend should generate authoritative timestamps.

The frontend should not be trusted to provide system timestamps.

---

# 25. Date Handling

Task dates should be stored in a consistent machine-readable format.

Recommended:

```text
YYYY-MM-DD
```

Example:

```text
2026-08-20
```

Timestamps should use a consistent timezone strategy.

The organisation's default timezone should initially be configurable in the Setting table.

---

# 26. Security Boundary

The security boundary is:

```text
Browser
   │
   │ Untrusted
   ▼
Express API
   │
   │ Trusted business logic
   ▼
SQLite
```

Never assume data coming from React is trustworthy.

Express API must validate:

- User identity
- User role
- Task ownership
- Input fields
- Allowed status transitions
- Allowed priorities
- IDs
- Permissions

---

# 27. Deployment Architecture

Initial deployment:

```text
                         Internet
                            │
                            ▼
                    ┌───────────────┐
                    │ React Hosting │
                    │ (apps/web)    │
                    │               │
                    │ AWS Amplify   │
                    │ or equivalent │
                    │ static host   │
                    └───────┬───────┘
                            │
                            │ HTTPS
                            ▼
                    ┌───────────────┐
                    │ Node hosting  │
                    │ (apps/api)    │
                    │               │
                    │ Render/Fly.io │
                    │ /Railway/etc. │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ SQLite file   │
                    │ (persistent   │
                    │  volume)      │
                    └───────────────┘
```

The frontend should be deployable independently from the Express API. Unlike Apps Script, the API now needs an actual Node-capable host with a persistent disk for the SQLite file (or a swap to PostgreSQL — §31 — if the chosen host doesn't offer persistent volumes). Not yet decided — see memory.md §19.

---

# 28. Environment Configuration

React should use environment variables for configurable values.

Example:

```text
VITE_API_URL
VITE_GOOGLE_CLIENT_ID
VITE_APP_NAME
VITE_APP_ENV
```

No secrets should be placed in the React environment.

Important distinction:

> Anything shipped to a browser should be considered public.

---

# 29. Logging

Frontend logging should be minimal in production.

Backend logging should record important errors and administrative operations.

Examples:

```text
AUTH_FAILURE
UNAUTHORIZED_ACCESS
TASK_CREATE_FAILURE
TASK_UPDATE_FAILURE
DB_WRITE_FAILURE
DB_READ_FAILURE
```

Sensitive authentication credentials or tokens must never be logged.

---

# 30. Backup Strategy

Because SQLite is a single file (`apps/api/prisma/dev.db` in development;
the production path is whatever `DATABASE_URL` points to), backup
procedures should be established.

Recommended:

- Periodic file-level backup of the SQLite database (e.g. scheduled copy
  to object storage).
- Prisma migration history (`apps/api/prisma/migrations/`) is already
  version-controlled, so schema itself is always recoverable — only data
  needs a separate backup path.
- Test restores occasionally, not just backups.

Future migration should be possible without redesigning the entire frontend.

---

# 31. Migration Strategy

The application should not tightly couple React components to the database.

Bad:

```text
React component
    ↓
Raw SQL column
```

Good:

```text
React
 ↓
API
 ↓
Domain object
 ↓
Database implementation
```

For example:

```javascript
{
  id: "TSK_00001",
  title: "Prepare report",
  status: "COMPLETED",
  priority: "HIGH"
}
```

This makes future migration to PostgreSQL/Supabase much easier — in this
architecture, that migration is a Prisma `datasource` change plus a
migration, since the API and frontend already only ever talk to Prisma's
generated client, never to SQLite directly.

---

# 32. Scalability Boundary

SQLite is suitable for the initial organisation size and MVP — it handles
concurrent reads well and Node/Express have no Apps-Script-style execution
time limits. However, the system should be considered for migration to
PostgreSQL when:

- Many users perform *concurrent writes* simultaneously (SQLite serializes
  writes at the file level).
- Task volume becomes large enough that a single file becomes unwieldy to
  back up/replicate.
- The API needs to run as multiple horizontally-scaled instances sharing
  one database (SQLite is a single local file, not a network service).
- Multiple organisations need to use the system.
- Strong multi-writer transactional guarantees become necessary.

The frontend and API's service layer should remain database-agnostic
enough to permit migration without touching route handlers.

---

# 33. Architectural Principle

The architecture follows:

> **Thin frontend, controlled backend, simple initial database.**

React provides the user experience.

Express API provides business logic and security enforcement.

SQLite (via Prisma) provides the initial persistence layer.

This keeps the first version inexpensive while preserving a path toward a more scalable architecture.