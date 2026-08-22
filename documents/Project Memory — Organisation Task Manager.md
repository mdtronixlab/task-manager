# Organisation Task Manager (OTM)
## Project Memory

**Document:** `memory.md`  
**Version:** 1.0  
**Status:** Initial Project State

---

# 1. Project Identity

**Project Name:** Organisation Task Manager

**Short Name:** OTM

**Project Type:** Internal Organisation Task Management Web Application

**Current Status:** Planning / Pre-development

**Initial Technology Stack:**

```text id="3n6k4v"
Frontend:
React
Vite
Tailwind CSS

Authentication:
Google Login (Firebase Authentication)

Backend:
Node.js (Express)

Database:
SQLite (via Prisma)

Hosting:
To be decided
```

**Repository structure:** npm-workspaces monorepo — `apps/web` (frontend),
`apps/api` (backend). See §4 and the Change Log (2026-08-21) for how this
superseded the original Google Sheets/Apps Script plan.

---

# 2. Product Purpose

The application is intended to provide a central system where organisation staff can record and manage their daily work.

Staff will:

- Log in using Google.
- Add daily tasks.
- Update task status.
- Complete tasks.
- Review their task history.

Super Admin will:

- Monitor all staff.
- Monitor all tasks.
- Review daily activity.
- Filter tasks.
- Review historical work.
- View staff performance.
- Review organisation-level statistics.

---

# 3. Current Product Concept

The core daily workflow is:

```text id="1y5f3z"
Morning

Staff logs in
      ↓
Views today's workspace
      ↓
Adds today's tasks
      ↓
Works on tasks
      ↓
Updates status
      ↓
Marks completed

Night

Super Admin
      ↓
Reviews dashboard
      ↓
Checks staff
      ↓
Checks pending/blocked tasks
      ↓
Reviews daily performance
```

---

# 4. Confirmed Technology Decisions

## Frontend

Confirmed:

```text id="m7h4x2"
React
```

Development/build tool:

```text id="c4n6q8"
Vite
```

Styling:

```text id="y3v8p1"
Tailwind CSS
```

---

## Authentication

Confirmed direction:

```text id="0r7w4k"
Firebase Authentication (Google Sign-In provider)
```

Firebase project: `task-manager-app-2d85c`

Firebase is used **for authentication only**. Firestore, Cloud Functions, and Firebase Hosting are explicitly not part of the architecture — Google Apps Script and Google Sheets remain the backend and database.

Users will authenticate using their Google accounts via Firebase. Apps Script verifies the resulting Firebase ID token and checks the verified email against the Users sheet.

Access will be controlled using the Users sheet.

---

## Backend

Confirmed (superseded 2026-08-21 — was Google Apps Script):

```text id="p2x5n7"
Node.js
Express
```

`apps/api` acts as the API and business-logic layer. Real REST routes
(`/api/users`, `/api/tasks`, ...) replace Apps Script's single-endpoint
action-dispatch pattern — no longer a constraint once the backend isn't a
Web App bound to Apps Script's execution model.

---

## Database

Confirmed (superseded 2026-08-21 — was Google Sheets):

```text id="z6k1m4"
SQLite, accessed via Prisma
```

Chosen over PostgreSQL for this stage: zero external services to
provision — a single file, nothing to pay for or operate, appropriate for
a solo/internal-tool project at this scale. Prisma's schema is
datasource-agnostic, so switching the `provider` to `postgresql` later
(§21) is a config change, not a rewrite.

---

# 5. Architecture Decision

Current architecture:

```text id="j5q2s9"
React (apps/web)
   ↓
Express API (apps/api)
   ↓
SQLite (via Prisma)
```

React must NOT access the database directly — all data operations go
through the API, same principle as the original Sheets-era rule.

---

# 6. Database Tables

The Prisma schema (`apps/api/prisma/schema.prisma`) defines:

```text id="w2m8q7"
User
Task
Category
Department
ActivityLog
Setting
Counter
```

Same field names as the original Sheets design (rules.md §16 still
applies — column/field names are part of the application contract).
`Counter` is new: a dedicated table backing ID generation (§23-equivalent),
replacing the old trick of storing counters as extra rows in Settings.

---

# 7. User Roles

Initial roles:

```text id="n5v9x2"
SUPER_ADMIN
STAFF
```

Future roles may include:

```text id="p8q1r6"
ADMIN
MANAGER
```

but they are not part of the MVP.

---

# 8. Task Status Model

Current approved statuses:

```text id="u6z3p9"
PENDING
IN_PROGRESS
COMPLETED
BLOCKED
```

Normal workflow:

```text id="r4k7x1"
PENDING
 ↓
IN_PROGRESS
 ↓
COMPLETED
```

Blocked workflow:

```text id="q9m2v5"
IN_PROGRESS
 ↓
BLOCKED
 ↓
IN_PROGRESS
 ↓
COMPLETED
```

---

# 9. Task Priority Model

Current approved priorities:

```text id="b5w8n3"
LOW
MEDIUM
HIGH
URGENT
```

Default:

```text id="c1x6z9"
MEDIUM
```

---

# 10. Core Task Fields

Current task model:

```text id="e4v7m2"
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

---

# 11. Important Product Decisions

## Decision 1 — Daily Date

Staff should not normally select today's date manually.

The backend should determine the task date.

---

## Decision 2 — Backend Authority

React is not trusted.

Apps Script must validate:

- Identity.
- Role.
- Permissions.
- Task ownership.
- Input values.
- Status transitions.

---

## Decision 3 — Historical Data

Completed tasks should remain in the system.

Historical work should not disappear when the date changes.

---

## Decision 4 — Activity Logging

Important operations should be logged.

This includes task status changes and administrative operations.

---

## Decision 5 — Database Abstraction

React should not depend directly on Google Sheets structure.

This keeps future migration to PostgreSQL/Supabase possible.

---

# 12. Current MVP Scope

The MVP currently includes:

```text id="k5r9x2"
✓ Google authentication
✓ Staff access
✓ Super Admin access
✓ User management
✓ Daily tasks
✓ Task descriptions
✓ Task priority
✓ Task status
✓ Categories
✓ Staff dashboard
✓ Super Admin dashboard
✓ Staff overview
✓ Task filtering
✓ Historical tasks
✓ Daily statistics
✓ Activity logging
✓ Responsive interface
✓ Basic security
```

---

# 13. Explicitly Deferred Features

The following are NOT currently part of MVP:

```text id="v4y8p1"
✗ Attendance
✗ Leave management
✗ Payroll
✗ HR
✗ Chat
✗ AI
✗ Advanced project management
✗ WhatsApp notifications
✗ Email notification system
✗ Recurring tasks
✗ Mobile application
✗ Multi-organisation support
```

These may be revisited after MVP.

---

# 14. Current UI Direction

The application should be:

```text id="x7m3q9"
Modern
Minimal
Professional
Clean
Information-focused
Responsive
```

Visual direction:

```text id="k1v6r8"
Modern SaaS
+
Internal Business Dashboard
```

The UI should prioritise clarity over decoration.

**Theme (decided 2026-08-20/21):** dark theme is the current default
("Lumina Finance" — navy/slate surfaces, `#0052ff` primary blue, Hanken
Grotesk headings, Inter body, JetBrains Mono labels), superseding
`design.md` §4's original "light theme first" plan. The light palette is
fully implemented alongside it (not deferred), toggleable via
`data-theme="light"`, so switching the default later needs no rework. See
§23 Change Log and `design.md` §4/§38 addenda.

---

# 15. Staff UX

The ideal staff flow:

```text id="n3c8y5"
Login
 ↓
Dashboard
 ↓
See today's tasks
 ↓
Add task
 ↓
Start task
 ↓
Complete task
```

The process should be quick enough that staff do not feel they are maintaining another complicated system.

---

# 16. Admin UX

The ideal Super Admin flow:

```text id="f9r2k6"
Login
 ↓
Organisation Dashboard
 ↓
See today's KPIs
 ↓
Review staff
 ↓
Filter tasks
 ↓
Inspect individual staff
 ↓
Review history
```

---

# 17. Current Project Phase

Current phase:

```text id="h2q7w4"
PHASE 2
AUTHENTICATION & AUTHORIZATION (frontend code-complete, running locally;
not yet verified against real Firebase credentials)
```

Phase 0 (scaffold) is complete — `apps/web/` (React/Vite/Tailwind) in the
monorepo.

Phase 1 backend is implemented at `apps/api/` (Express): config, Prisma
schema (`prisma/schema.prisma`), ID generation, timestamp/date helpers,
validation, the `{success,data,message}`/`{success,error}` response
envelope, activity logging, Firebase Admin-based auth middleware, and the
`getUsers`/`getCurrentUser`/`getTasks`/`createTask`/`updateTask`
services exposed as REST routes. This satisfies the Phase 1 completion
criteria in `phases.md`.

**Verified locally** (2026-08-21): `prisma migrate dev` created
`apps/api/prisma/dev.db`, `npm run db:seed` seeded default Settings, and
the server started and answered `/api/health` and `/api/users/me`
(correctly 401 without a token) — see the Change Log entry below.

Phase 2 frontend is now implemented at `apps/web/src/`: `services/auth.js`
(Firebase client — Google popup sign-in), `services/api.js` (central fetch
wrapper, attaches the Firebase ID token, unwraps the response envelope),
`context/AuthContext.jsx` (Firebase identity → backend `/api/users/me` →
role/active resolution, exposed as a `status` state machine), `routes/
ProtectedRoute.jsx` (redirect-to-`/login` guard with an optional `role`
requirement), `pages/Login/LoginPage.jsx`, and role-branched `layouts/
StaffLayout.jsx` / `AdminLayout.jsx` + `pages/Dashboard/*` placeholders.
`App.jsx`/`main.jsx` wire it all together. Lint and build both pass clean.

**Verified locally** (2026-08-21, headless Chromium via Playwright — see
Change Log): the app boots without crashing even with `apps/web/.env`'s
Firebase values still blank (a real bug caught and fixed in this pass —
see Change Log), `/login` renders the Google sign-in card in the dark
theme, and unauthenticated requests to `/` and `/dashboard` correctly
redirect to `/login`.

**Not yet done — the remaining Phase 2 completion criterion** ("a
registered user can securely log in and reach the correct dashboard")
needs three setup values only the project owner can supply, none of which
are code:

1. Real Firebase Web SDK config (`VITE_FIREBASE_API_KEY`,
   `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_APP_ID`) in `apps/web/.env`
   — from the Firebase console, project `task-manager-app-2d85c` → Project
   Settings → General → Your apps → SDK setup and configuration. These are
   public client values, safe to paste directly into the file.
2. A real service-account key at `apps/api/service-account.json` (path
   `GOOGLE_APPLICATION_CREDENTIALS` already points here in
   `apps/api/.env`) — Firebase console → Project Settings → Service
   accounts → Generate new private key. Already git-ignored.
3. `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_NAME` in `apps/api/.env`, then
   re-run `npm run db:seed` — otherwise the first real login correctly
   resolves to "not registered" (by design) and there is no Super Admin to
   sign in as yet.

---

# 18. Phase Sequence

Current planned sequence:

```text id="z8v3n1"
Phase 0  → Foundation
Phase 1  → Database & Backend
Phase 2  → Authentication
Phase 3  → Staff Tasks
Phase 4  → Admin Dashboard
Phase 5  → History & Filters
Phase 6  → Reports
Phase 7  → Activity Logging
Phase 8  → Security
Phase 9  → UI Polish
Phase 10 → Testing
Phase 11 → Deployment
Phase 12 → Production Validation
Phase 13 → Pilot
Phase 14 → Organisation Rollout
```

---

# 19. Current Decisions Pending

The following decisions remain open:

### Hosting

Potential:

```text id="u7m4x2"
AWS Amplify
```

Final hosting choice has not been locked.

### Google Authentication Implementation

Resolved: authentication uses **Firebase Authentication** (Google Sign-In provider), project `task-manager-app-2d85c`, for identity only.

Resolved (updated 2026-08-21): the Express API verifies each Firebase ID token using the **Firebase Admin SDK**'s `verifyIdToken` (local JWT/JWKS verification against Google's public certs, via a service-account credential). This replaces the Apps Script-era Identity Toolkit REST workaround (§11.1's rejected alternative was hand-rolled JWT verification because Apps Script had no Admin SDK — that constraint no longer applies on a real Node runtime). See `architecture.md` §11.1.

### UI Component Library

Resolved (2026-08-21): no third-party component library. A small in-house
library was built directly on Tailwind v4 + the design tokens, living at
`src/components/` (Button, Badge, StatusBadge, PriorityBadge, Card, Input,
Select, Modal, Table, EmptyState, LoadingState, ErrorState) per rules.md
§7's exact list. Icons use `lucide-react` (already a dependency, and the
choice suggested in design.md §32).

### Branding

Final product name and visual branding have not yet been locked.

---

# 20. Important Constraints

The initial system intentionally uses Google Sheets as the database.

Therefore:

- Avoid unnecessary high-frequency requests.
- Avoid treating rows as IDs.
- Avoid excessive spreadsheet reads.
- Keep the data model clean.
- Keep the API abstraction strong.
- Monitor scale as user/task volume grows.

---

# 21. Future Migration Strategy

The originally-planned migration (Sheets → a real backend + database)
happened on 2026-08-21, earlier than expected, per explicit product
decision rather than scale pressure. If SQLite becomes insufficient:

```text id="j7x2p5"
Current

React (apps/web)
 ↓
Express API (apps/api)
 ↓
SQLite (via Prisma)


Future

React (apps/web)
 ↓
Express API (apps/api)
 ↓
PostgreSQL / Supabase (via Prisma)
```

Because Prisma already sits between the API and the database, this future
step is a `schema.prisma` datasource change plus a migration, not an
application rewrite — neither the API's route/service code nor the
frontend need to change.

---

# 22. Development Rules Reference

Before making architectural or implementation decisions, consult:

```text id="w4n8c2"
prd.md
architecture.md
rules.md
phases.md
design.md
memory.md
```

These six documents collectively represent the project's current specification.

---

# 23. Change Log

## 2026-08-21 (Phase 2 — Authentication UI)

Implemented the Phase 2 frontend (see §17 for the file list) — Google
sign-in via Firebase, an `AuthContext` status state machine (`loading` →
`not-configured` | `signed-out` | `authenticating` → `authenticated` |
`error`), a central `services/api.js` that attaches the Firebase ID token
and unwraps the `{success,data,message}`/`{success,error}` envelope, route
protection (`ProtectedRoute`, redirect-to-`/login`, optional `role`
check), and a `LoginPage` + role-branched `StaffLayout`/`AdminLayout` with
minimal dashboard placeholders (Phase 3/4 own their real content —
building it now would be ahead of the data model, rules.md §18). Added
the `firebase` package to `apps/web`. Removed the now-stale `.gitkeep`
files from `pages/`, `layouts/`, `services/`, `context/`, `routes/`
(`hooks/` and `utils/` still empty, left as-is).

**Bug found and fixed during verification:** `firebase/auth`'s `getAuth()`
throws synchronously (`auth/invalid-api-key`) when the Web SDK config is
blank — confirmed with a minimal `node --input-type=module` repro against
the installed package before touching any app code. Since `apps/web/.env`
still has empty `VITE_FIREBASE_*` values (real ones are pending, see §17),
calling `getAuth()` unconditionally at module scope would have crashed
the entire app at import time — no login page, no error boundary, just a
blank screen. Fixed by making `services/auth.js` skip Firebase
initialization when the config looks unset (`isFirebaseConfigured`,
checked by `AuthContext` as a distinct `not-configured` status) so
`LoginPage` shows an explanatory notice instead. This degrades cleanly
now and needs no further change once real config is added — the normal
code path was already correct.

**Verified locally:** `npm run lint` and `npm run build` both pass clean
(one harmless `react-refresh/only-export-components` warning — the
`AuthProvider`+`useAuth` co-located-hook pattern — accepted rather than
split across files, since it doesn't fail the lint script and the split
would add a file for no functional benefit). Ran the app for real (`npm
run dev`) and drove it with headless Chromium (`playwright`, installed
ad hoc into the scratch dir — `chromium-cli` wasn't available in this
environment): `/login` renders the dark-theme sign-in card with no
console errors, including with Firebase unconfigured; `/` and
`/dashboard` correctly redirect to `/login` while signed out. Signing in
for real is blocked on the three setup values in §17 — not yet exercised
against an actual Firebase-signed token.

## 2026-08-21 (later)

**Major architecture decision:** replaced Google Sheets + Google Apps
Script with a real backend — **Node.js/Express + SQLite (via Prisma)** —
per explicit product decision, not scale pressure (rules.md §49 Change
Management). Database engine choice (SQLite over PostgreSQL/MongoDB) and
disposal of the Sheets-era work were both explicit decisions at the time.

Repository restructured into an **npm-workspaces monorepo**:

```text
apps/web/    the existing React/Vite/Tailwind frontend, moved as-is
apps/api/    new Express backend
```

Deleted: the local `apps-script/` folder (12 files), the live "Organisation
Task Manager" Google Sheet, and the live "OTM Backend" Apps Script project
that had been created in this session (10 of 12 files had already been
pasted in when the pivot was decided) — all fully superseded.

`apps/api` implements the same Phase 1 API surface the Apps Script version
had (`getUsers`, `getCurrentUser`, `getTasks`, `createTask`, `updateTask`),
now as REST routes under `/api`, with the same
`{success,data,message}`/`{success,error}` response envelope (rules.md
§28) and the same business rules (ownership checks, status-transition
validation, activity logging). Two implementation details improved now
that this is a real backend rather than Apps Script:

- **Auth verification** uses the Firebase Admin SDK's `verifyIdToken`
  (local JWT/JWKS verification) instead of the Identity Toolkit REST
  workaround Apps Script needed — see architecture.md §11.1.
- **ID counters** live in a dedicated `Counter` table instead of being
  stuffed into extra Settings rows, using a real DB transaction instead of
  a script lock.

Verified end-to-end locally: `prisma migrate dev` (creates
`apps/api/prisma/dev.db`), `npm run db:seed` (seeds default Settings), and
the server started and correctly answered `GET /api/health` (200) and
`GET /api/users/me` (401 without a token — auth middleware working). Not
yet verified against a real Firebase-signed token (needs a service-account
key — see §25).

`apps/web` still builds and lints clean from its new location
(`npm run build -w web`, `npm run lint -w web`) — Tailwind's content scan
is now correctly scoped to `apps/web/` only.

## 2026-08-21

Package manager confirmed: **npm** (`package-lock.json` is the committed
lockfile). A stray `pnpm run dev` created `pnpm-lock.yaml` and reinstalled
`node_modules` pnpm-style; removed both and reinstalled clean with npm.
Note for local dev: pnpm ≥10's default blocks dependency install/build
scripts (e.g. `esbuild`'s postinstall) until approved via
`pnpm approve-builds` — not applicable now that npm is standard, but
worth knowing if pnpm is tried again.

Generated concept screens (Staff Dashboard, Admin Dashboard, Add Task
Modal, Task Management Table, Design System) in Stitch — project "User
Interface Builder" (id `9139540781648511368`) — and exported their
HTML/screenshots plus the design-system markdown to
`stitch-export/` for reference. The Stitch output used a dark theme
("Lumina Finance"), which conflicted with `design.md` §4's "light theme
first" plan.

Decision: implement the design-system **foundation only** at this point
(design tokens + reusable component library), not the actual dashboard
pages — `rules.md` §18 (Phase Dependency Rules) explicitly warns against
building the Admin dashboard ahead of a stable data model, and the project
is still in Phase 1. Building page UIs against mock data was considered
and deferred; only `src/styles/index.css` (tokens) and `src/components/`
(Button, Badge, StatusBadge, PriorityBadge, Card, Input, Select, Modal,
Table, EmptyState, LoadingState, ErrorState) plus `src/constants/`
(`taskStatus.js`, `taskPriority.js`) were added.

Decision: adopt the Stitch dark theme as the current default, keep the
light theme fully wired (not deferred) via `[data-theme="light"]`. See
`design.md` §4/§38 addenda and memory.md §14.

Both palettes, the type scale, and the radius scale are implemented as CSS
custom properties mapped into Tailwind v4 through `@theme inline` in
`src/styles/index.css`. Fonts (Hanken Grotesk / Inter / JetBrains Mono)
load via Google Fonts `<link>`s in `index.html`.

Also fixed a pre-existing `eslint.config.js` gap: without
`eslint-plugin-react`, ESLint's `no-unused-vars` didn't recognise
components used only as JSX tag names, so `App.jsx`/`main.jsx` were already
failing `npm run lint` before this work (undetected). Added
`eslint-plugin-react`, wired its `recommended` + `jsx-runtime` flat
configs, disabled `react/prop-types` (plain JS codebase, no `prop-types`
dependency), and excluded `apps-script/` from the frontend lint run (it's
Google Apps Script code with its own global environment, not part of the
Vite/React app). `npm run lint` and `npm run build` both pass clean.

## 2026-08-20

Authentication decision resolved: **Firebase Authentication** (Google Sign-In provider) will be used for identity, project `task-manager-app-2d85c`. Scope is authentication only — Firestore, Cloud Functions, and Firebase Hosting are explicitly out of scope. Google Apps Script and Google Sheets remain the backend and database, unchanged from the original architecture. See `architecture.md` §11.

Token verification decision resolved: Apps Script verifies Firebase ID tokens via the Identity Toolkit `accounts:lookup` REST endpoint rather than manual JWT/JWKS signature verification. See `architecture.md` §11.1.

Google Sign-In domain restriction decided: none applied. No Google Workspace domain exists for this organisation (staff use personal Google accounts); the Users-sheet allowlist remains the sole authorization gate, as already documented in prd.md §5 and rules.md §13.

Phase 1 backend code written at `apps-script/` (see §17). Not yet deployed to a live Google account — see `apps-script/README.md` for the remaining manual setup steps.

## Version 1.0

Initial project memory created.

Established:

- Product purpose.
- Technology stack.
- Architecture.
- User roles.
- Task model.
- Status model.
- Priority model.
- MVP scope.
- Development phases.
- UI direction.
- Future migration strategy.

---

# 24. How This File Should Be Maintained

This document is a **living project memory**.

Update it whenever a significant decision is made.

Examples:

```text id="r5v8q1"
Technology changed
Architecture changed
Feature added
Feature removed
Database schema changed
Authentication changed
Hosting selected
Major bug discovered
Important limitation discovered
Phase completed
```

Do not use this file as a replacement for the other documentation.

Instead:

```text id="k2m6x9"
PRD
→ What the product should do

Architecture
→ How the system works

Rules
→ How we build it

Phases
→ What we build next

Design
→ How it should look and behave

Memory
→ What has happened and what is currently true
```

---

# 25. Current Next Step

The next implementation step is to finish Phase 2:

```text id="p6x3m8"
PHASE 2
AUTHENTICATION & AUTHORIZATION
```

1. ~~Create the React/Vite project.~~ Done.
2. ~~Configure Tailwind.~~ Done.
3. ~~Establish the source directory structure.~~ Done.
4. Initialise Git properly (a `.git` exists with all files untracked — no commits yet). Not done yet — deliberately: commits happen when explicitly requested, not as a side effect of other work.
5. ~~Create environment configuration.~~ Done — `apps/web/.env` and `apps/api/.env` both now exist locally (from their `.env.example` templates).
6. ~~Create the initial application shell.~~ Done, then superseded by the real Phase 2 routing/pages below.
7. ~~Create the database and run migrations/seed.~~ Done locally (`apps/api/prisma/dev.db`).
8. ~~Build and verify the API server.~~ Done — see Change Log.
9. ~~Wire `apps/web` to call `apps/api` (`services/api.js`, `AuthContext`).~~ Done — see §17/Change Log.
10. Obtain a real Firebase service-account key and set
    `GOOGLE_APPLICATION_CREDENTIALS` (`apps/api/service-account.json`) so
    token verification actually works against a real signed-in user.
11. ~~Fill in real `VITE_FIREBASE_*` values in `apps/web/.env`.~~ Done
    (2026-08-21) — values pasted in from the Firebase console. Verified
    with headless Chromium: the "not configured" notice is gone, the
    button is enabled, and clicking it opens a real
    `task-manager-app-2d85c.firebaseapp.com/__/auth/handler` popup with
    `providerId=google.com` — the frontend→Firebase leg is fully live.
    Completing an actual sign-in needs a human at a real browser (Claude
    can't drive Google's OAuth consent screen); it will currently 401 as
    "not registered" past that point until steps 10 and 12 are done too.
12. ~~Set `BOOTSTRAP_ADMIN_EMAIL` in `apps/api/.env` and re-run `npm run
    db:seed`.~~ Done (2026-08-21) — `mrunmay9776@gmail.com` is the
    bootstrap Super Admin (`USR_000001`, verified directly via Prisma:
    `role=SUPER_ADMIN`, `active=true`). This is the project's real first
    Super Admin account going forward, not a throwaway test value.

All three Phase 2 setup blockers (§17) are now resolved: Web SDK config,
`apps/api/service-account.json`, and the bootstrap admin. Firebase
sign-in and token verification were both independently confirmed working
during this session (see Change Log) — `mrunmay9776@gmail.com` signing in
for real should now reach the Super Admin dashboard placeholder. Still
worth exercising the other four Phase 2 test cases from `phases.md`
(registered staff, unknown Gmail, disabled user, invalid session) before
calling Phase 2 fully done and starting Phase 3 (Staff Task Management) —
none are blocked on anything, just not yet exercised.

---

# 26. Golden Project Memory

The fundamental product concept is:

> **Staff plan and record their daily work; management gets a clear view of what the organisation is actually doing.**

The fundamental architecture is:

> **React → Google Apps Script → Google Sheets**

The fundamental UX principle is:

> **Simple for staff. Powerful for management.**

The fundamental engineering principle is:

> **Build a clean MVP now while keeping the door open for a proper database later.**