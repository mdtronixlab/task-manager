# Organisation Task Manager (OTM)
## Development Phases

**Document:** `phases.md`  
**Version:** 1.0  
**Status:** Initial Specification

---

# 1. Development Strategy

The Organisation Task Manager will be developed incrementally.

Each phase must produce a usable and verifiable result before the next phase begins.

The development sequence is:

```text id="z2b5n8"
Phase 0
Project Foundation
      ↓
Phase 1
Database & Backend Foundation
      ↓
Phase 2
Authentication & Authorization
      ↓
Phase 3
Staff Task Management
      ↓
Phase 4
Super Admin Dashboard
      ↓
Phase 5
Reports & History
      ↓
Phase 6
Security & Reliability
      ↓
Phase 7
UI/UX Polish
      ↓
Phase 8
Testing
      ↓
Phase 9
Deployment
      ↓
Phase 10
Production Improvements
```

---

# 2. Phase 0 — Project Foundation

## Objective

Create the development environment and establish the initial React project.

### Tasks

- Create React/Vite project.
- Configure package manager.
- Configure Tailwind CSS.
- Configure ESLint.
- Configure formatting.
- Create Git repository.
- Create initial folder structure.
- Create environment configuration.
- Create basic application shell.

Expected structure:

```text id="c1j4qh"
task-manager-sdc/
│
├── src/
├── public/
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

### Deliverable

A React application that runs locally.

### Completion Criteria

```text id="l7h4p2"
npm run dev
```

successfully starts the application.

---

# 3. Phase 1 — Database & Backend Foundation

## Objective

Create the SQLite database and Express backend foundation.

*(Superseded 2026-08-21 — this phase originally targeted Google Sheets +
Apps Script; see memory.md Change Log. Objective/scope below updated to
match, structure otherwise unchanged.)*

### Database (`apps/api/prisma/schema.prisma`)

Create Prisma models for:

```text id="b7d9u0"
User
Task
Category
Department
ActivityLog
Setting
```

Define fields exactly according to `architecture.md`, applied via a Prisma migration.

### Backend (`apps/api`)

Create:

- Project structure.
- Configuration.
- Database connection (Prisma client).
- Request handling (Express routes).
- Response standard.
- Error handling.
- Logging utilities.
- ID generation.
- Timestamp utilities.

### Initial API

Implement:

```text id="8qlb4r"
getUsers
getTasks
createTask
updateTask
```

Authentication may initially be mocked only for backend development.

### Completion Criteria

The backend can:

- Read Users.
- Read Tasks.
- Create a task.
- Update a task.
- Return consistent API responses.
- Generate unique IDs.

---

# 4. Phase 2 — Authentication & Authorization

## Objective

Implement secure Google authentication and user access control.

### Tasks

- Configure Google authentication.
- Implement login page.
- Retrieve authenticated identity.
- Validate user against Users sheet.
- Implement active/inactive state.
- Implement role detection.
- Create AuthContext.
- Create protected routes.
- Create staff/admin route protection.

### Login Flow

```text id="s6e5b9"
Google Login
     ↓
Identity
     ↓
Backend validation
     ↓
Users Sheet
     ↓
Active?
     ↓
Role
     ↓
Dashboard
```

### Test Cases

- Registered staff.
- Registered admin.
- Unknown Gmail.
- Disabled user.
- Invalid session.

### Completion Criteria

A registered user can securely log in and reach the correct dashboard.

---

# 5. Phase 3 — Staff Task Management

## Objective

Build the complete staff daily workflow.

### Features

#### Dashboard

- Greeting.
- Current date.
- Task summary.
- Today's tasks.

#### Add Task

Fields:

- Title.
- Description.
- Priority.
- Category.

Task date is automatically determined by the backend.

#### Task Management

- View task.
- Edit task.
- Start task.
- Complete task.
- Block task.
- Reopen task where allowed.

### Completion Criteria

A staff member can:

```text id="b9s9by"
Login
 ↓
View today's tasks
 ↓
Add task
 ↓
Start task
 ↓
Complete task
```

and all changes are stored in the database.

---

# 6. Phase 4 — Super Admin Dashboard

## Objective

Build the management overview.

### Features

#### KPI Cards

- Staff count.
- Total tasks.
- Completed.
- In Progress.
- Pending.
- Blocked.
- Completion rate.

#### Staff Summary

Show:

- Staff name.
- Task count.
- Completed.
- Pending.
- Blocked.
- Completion percentage.

#### Task Overview

Admin can view all tasks.

### Completion Criteria

Admin can understand the organisation's current daily workload from one dashboard.

---

# 7. Phase 5 — Filtering & History

## Objective

Allow management to investigate historical work.

### Filters

- Date.
- Date range.
- Staff.
- Department.
- Category.
- Status.
- Priority.

### History

Implement:

- Today.
- Yesterday.
- This week.
- Last week.
- This month.
- Last month.
- Custom range.

### Staff History

Admin can select a staff member and inspect historical tasks.

### Completion Criteria

Admin can answer:

> "What did Rahul work on last week?"

without manually searching the spreadsheet.

---

# 8. Phase 6 — Reports & Analytics

## Objective

Turn task data into useful operational information.

### Daily Report

Show:

```text id="xg8f0b"
Total Tasks
Completed
Pending
In Progress
Blocked
Completion Rate
```

### Staff Report

Show:

```text id="0byb4w"
Tasks Created
Tasks Completed
Tasks Pending
Tasks Blocked
Completion Rate
```

### Trends

Potential charts:

- Daily completion.
- Tasks per employee.
- Status distribution.
- Completion trend.

### Important Rule

Reports must represent data accurately.

Do not create misleading productivity scores.

---

# 9. Phase 7 — Activity Logging

## Objective

Implement an auditable history of important actions.

### Events

```text id="x0v7zn"
TASK_CREATED
TASK_UPDATED
STATUS_CHANGED
TASK_COMPLETED
TASK_BLOCKED
TASK_DELETED
USER_CREATED
USER_UPDATED
USER_DISABLED
```

### Admin Interface

Admin should eventually be able to inspect activity history.

### Completion Criteria

Important changes can be traced back to a user and timestamp.

---

# 10. Phase 8 — Security Hardening

## Objective

Verify that users cannot bypass permissions.

### Tests

#### Staff

Attempt:

- Read another user's task.
- Modify another user's task.
- Delete another user's task.
- Access admin endpoints.
- Modify users.
- Modify categories.

All unauthorized operations must fail.

#### Admin

Verify:

- User management.
- Organisation-wide task access.
- Reports.
- Activity logs.

### Security Review

Check:

- Secrets.
- Environment variables.
- Authentication.
- Authorization.
- API validation.
- Database file permissions/access.
- API deployment settings.

---

# 11. Phase 9 — UI/UX Polish

## Objective

Improve the application after functionality is stable.

### Work

- Responsive layouts.
- Loading states.
- Empty states.
- Error states.
- Toast notifications.
- Modal behaviour.
- Form validation.
- Keyboard accessibility.
- Mobile layouts.
- Table responsiveness.
- Dashboard visual hierarchy.

This phase should follow `design.md`.

---

# 12. Phase 10 — Testing

## Objective

Perform complete functional testing.

### Authentication

- Login.
- Logout.
- Invalid user.
- Disabled user.
- Session expiry.

### Staff

- Create task.
- Edit task.
- Start task.
- Complete task.
- Block task.
- Reopen task.
- History.

### Admin

- Dashboard.
- Staff list.
- Staff details.
- Task filters.
- Reports.
- Activity logs.

### Security

- Permission bypass attempts.
- Invalid IDs.
- Invalid input.
- Unauthorized API calls.

### Responsive

Test:

- Desktop.
- Laptop.
- Tablet.
- Mobile.

---

# 13. Phase 11 — Production Deployment

## Objective

Deploy the application for real organisational use.

### Frontend

Deploy React application to the selected hosting platform.

Possible initial choice:

```text id="3v9j3f"
AWS Amplify
```

### Backend

Deploy `apps/api` (Express) to a Node-capable host with persistent storage
for the SQLite file — see architecture.md §27. Not yet decided.

### Database

Use a production SQLite file on persistent storage (or migrate to
PostgreSQL first — architecture.md §31/§32 — if the chosen host doesn't
support persistent volumes).

### Configuration

Set:

- Production API URL.
- Google authentication configuration.
- Application name.
- Organisation timezone.

---

# 14. Phase 12 — Production Validation

Before giving access to all staff:

### Admin Verification

- Admin login.
- Dashboard.
- User management.
- Reports.

### Staff Verification

Create a test staff account and verify:

```text id="r7f1bn"
Login
 ↓
Create task
 ↓
Update task
 ↓
Complete task
 ↓
Verify Sheet
 ↓
Verify Admin Dashboard
```

### Data Verification

Verify that:

- No duplicate tasks occur.
- IDs remain unique.
- Timestamps are correct.
- Status changes are recorded.
- Activity logs are correct.

---

# 15. Phase 13 — Pilot Release

Do not immediately give the system to every employee.

Start with a small pilot group.

Recommended:

```text id="y0a3vr"
Super Admin
+
2–3 Staff Members
```

Observe:

- Login problems.
- Task-entry friction.
- Dashboard usefulness.
- Performance.
- Database limitations.
- User feedback.

Fix critical problems before wider rollout.

---

# 16. Phase 14 — Organisation Rollout

After pilot validation:

1. Add all staff.
2. Verify email addresses.
3. Assign departments.
4. Confirm roles.
5. Explain daily workflow.
6. Provide a short user guide.
7. Start production usage.

---

# 17. Definition of Done

A feature is considered complete only when:

- Frontend implementation exists.
- Backend implementation exists where required.
- Data persistence works.
- Authorization is verified.
- Error handling exists.
- Loading state exists.
- Empty state exists where relevant.
- Responsive behaviour has been considered.
- Documentation is updated.
- Manual testing has passed.

---

# 18. Phase Dependency Rules

Do not skip foundational phases without a clear reason.

For example:

Do NOT build the Admin dashboard against an unstable data model.

Correct sequence:

```text id="2x1y0c"
Data Model
   ↓
API
   ↓
Authentication
   ↓
Task System
   ↓
Admin Dashboard
```

---

# 19. Development Rule

Each phase should end in a working state.

Avoid:

```text id="q6s2w4"
Build everything
       ↓
Test at the end
```

Prefer:

```text id="e8o0jx"
Build
 ↓
Test
 ↓
Fix
 ↓
Document
 ↓
Continue
```

---

# 20. Initial MVP Boundary

The first production-capable version should contain:

```text id="2w5q5m"
✓ Google Login
✓ Staff management
✓ Staff dashboard
✓ Daily tasks
✓ Task status
✓ Task priority
✓ Categories
✓ Super Admin dashboard
✓ Staff overview
✓ Task filters
✓ Historical tasks
✓ Daily statistics
✓ Activity logs
✓ Basic responsive UI
✓ Security validation
```

Everything else should wait until this foundation is stable.

---

# 21. Future Phases

After MVP, possible phases include:

```text id="k9qz3f"
Notifications
Recurring Tasks
Task Comments
Due Times
Projects
Manager Role
Email Reports
WhatsApp Notifications
Advanced Analytics
Attendance
Leave Management
HR
Mobile App
Database Migration
Multi-Organisation Support
```

These are intentionally excluded from the MVP unless requirements change.

---

# 22. Final Development Principle

> **Complete one reliable layer before building the next layer.**

The project should grow from:

```text id="3q0g5w"
Foundation
    ↓
Data
    ↓
Authentication
    ↓
Tasks
    ↓
Management
    ↓
Analytics
    ↓
Security
    ↓
Polish
    ↓
Production
```

rather than attempting to build the entire system simultaneously.