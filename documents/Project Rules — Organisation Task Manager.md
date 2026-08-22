# Organisation Task Manager (OTM)
## Project Rules

**Document:** `rules.md`  
**Version:** 1.0  
**Status:** Initial Specification

---

# 1. Purpose

This document defines the rules that must be followed while designing, developing, testing, deploying, and maintaining the Organisation Task Manager.

These rules exist to maintain:

- Consistency
- Security
- Maintainability
- Simplicity
- Performance
- Data integrity
- Scalability

When implementation decisions are unclear, these rules should be consulted before introducing new patterns.

---

# 2. Core Principles

The project follows these principles:

1. **Simple over complicated.**
2. **Security over convenience.**
3. **Backend validation over frontend assumptions.**
4. **Reusable components over duplicated code.**
5. **Explicit data structures over implicit behaviour.**
6. **Small incremental changes over large rewrites.**
7. **Do not introduce dependencies without a reason.**
8. **Do not build future features before they are required.**
9. **Preserve historical data.**
10. **Every important operation should be traceable.**

---

# 3. Source of Truth

The project documentation consists of:

```text id="j9v5mq"
prd.md
architecture.md
rules.md
phases.md
design.md
memory.md
```

Responsibilities:

### prd.md

Defines:

- What the product does.
- Who uses it.
- Product requirements.
- MVP scope.
- Future scope.

### architecture.md

Defines:

- System architecture.
- Technology choices.
- Data flow.
- API structure.
- Database structure.

### rules.md

Defines:

- Development rules.
- Security rules.
- Coding rules.
- Data rules.

### phases.md

Defines:

- Development sequence.
- Milestones.
- Deliverables.
- Completion criteria.

### design.md

Defines:

- UI/UX.
- Visual language.
- Layout.
- Components.
- Interaction patterns.

### memory.md

Defines:

- Current implementation state.
- Decisions already made.
- Important project facts.
- Current blockers.
- Next steps.

---

# 4. Requirement Rule

A feature should not be implemented merely because it sounds useful.

Before implementing a new feature, determine:

1. Is it required by the PRD?
2. Is it required for the current development phase?
3. Does it conflict with existing architecture?
4. Does it introduce unnecessary complexity?

If the answer is unclear, document the decision before implementation.

---

# 5. MVP Rule

The MVP must remain focused.

Do not add:

- Chat
- Payroll
- Attendance
- Leave
- HR
- AI
- Complex project management
- Unnecessary animations
- Advanced permissions

unless the current phase explicitly requires them.

---

# 6. Frontend Rules

## 6.1 React

Use functional components.

Do not introduce class components.

Prefer:

```jsx
function TaskCard() {
  return (...);
}
```

over unnecessary abstractions.

---

## 6.2 Component Size

Components should remain focused.

If a component becomes difficult to understand, split it.

For example:

```text id="4s7j3x"
TaskPage
 ├── TaskHeader
 ├── TaskFilters
 ├── TaskList
 ├── TaskCard
 └── TaskModal
```

Avoid giant components containing the entire page.

---

# 7. Component Reuse

Reusable UI elements should live in:

```text id="qj4r2d"
src/components/
```

Examples:

```text id="6c8drw"
Button
Modal
Input
Select
Badge
Card
Table
EmptyState
LoadingState
ErrorState
```

Do not duplicate the same UI logic across multiple pages.

---

# 8. Styling Rules

Tailwind CSS will be the primary styling system.

Do not create large global CSS files unless necessary.

Avoid inline styles except for dynamic values that genuinely require them.

Use consistent spacing and typography.

Do not randomly introduce colors.

All major visual decisions should follow `design.md`.

---

# 9. Responsive Design Rule

Every page must be considered for:

- Desktop
- Tablet
- Mobile

Do not design desktop-only interfaces.

The Admin dashboard may prioritise desktop while remaining usable on smaller screens.

---

# 10. Accessibility Rules

Interactive controls must be accessible.

Examples:

- Buttons must have meaningful labels.
- Inputs must have labels.
- Icons must not be the only indication of an action.
- Keyboard navigation should work.
- Focus states must remain visible.
- Contrast should be sufficient.

Do not rely only on color to communicate status.

Example:

Bad:

```text
RED = BLOCKED
```

Better:

```text
[Blocked]
```

with colour used as an additional visual cue.

---

# 11. Authentication Rules

Google authentication is the required authentication mechanism for the initial version.

The application must not:

- Store Google passwords.
- Request Gmail passwords.
- Implement custom password authentication unnecessarily.
- Trust arbitrary email addresses supplied by the browser.

---

# 12. Authorization Rules

Authorization must be enforced on the backend.

Frontend checks are for UX only.

Never rely on:

```javascript id="7ks6j1"
if (user.role === "SUPER_ADMIN") {
  showAdminButton();
}
```

as the security mechanism.

The Express API backend must independently verify:

```text id="prx9df"
User identity
      ↓
User exists
      ↓
User active
      ↓
Required role
      ↓
Permission granted
```

---

# 13. Staff Data Isolation

Staff users may access only their own task data unless an explicit requirement grants additional access.

For example:

```text id="7cl9m4"
Rahul
  ↓
Can read Rahul's tasks
  ↓
Cannot read Priya's tasks
```

A request such as:

```text id="1i8p1x"
getTasks(userId="U002")
```

must NOT be trusted merely because the frontend requested it.

The backend must determine which data the authenticated user is allowed to access.

---

# 14. Super Admin Rules

Super Admin access must be verified server-side.

Admin operations include:

- User management.
- Staff activation/deactivation.
- Viewing organisation-wide tasks.
- Reports.
- Categories.
- Departments.
- Activity logs.

Administrative actions should be logged.

---

# 15. Database Rules

*(Superseded 2026-08-21 — was "Google Sheets Rules"; the principle is
unchanged, only the storage technology. See memory.md Change Log.)*

The database must never be treated like a frontend concern.

React must not directly query or manipulate the database.

All data operations must go through the Express API (`apps/api`), via
Prisma.

---

# 16. Schema Rules

*(Superseded 2026-08-21 — was "Spreadsheet Schema Rules"; same principle,
now enforced by `apps/api/prisma/schema.prisma` instead of sheet headers.)*

Field names are part of the application contract.

Do not rename fields casually.

For example:

```text id="g2i1o4"
taskId
userId
taskDate
title
description
priority
status
createdAt
updatedAt
startedAt
completedAt
```

Changing these requires updating:

- `apps/api/prisma/schema.prisma` and a migration
- `apps/api` services/routes
- React API models
- Documentation
- Tests

---

# 17. ID Rules

Never use database row numbers (Prisma's internal autoincrement `id`) as application-facing IDs.

Bad:

```text id="6j1s9e"
row 42 = task
```

Good:

```text id="7x8k5j"
TSK_000042
```

IDs must remain stable even if rows are reordered.

---

# 18. Timestamp Rules

Server-generated timestamps are authoritative.

Do not trust timestamps supplied by the frontend.

The backend should generate:

- createdAt
- updatedAt
- startedAt
- completedAt

where appropriate.

---

# 19. Date Rules

Dates must use a consistent format:

```text id="m1w5l9"
YYYY-MM-DD
```

Example:

```text id="0d5c6y"
2026-08-20
```

Do not store dates in inconsistent human-readable formats such as:

```text
20/08/26
Aug 20
20-Aug
```

inside the primary data layer.

---

# 20. Task Status Rules

Allowed statuses:

```text id="wq7x2h"
PENDING
IN_PROGRESS
COMPLETED
BLOCKED
```

Do not create random status values.

For example:

```text
DONE
FINISHED
WORKING
WAITING
```

should not be introduced unless the status model is intentionally changed.

---

# 21. Task Priority Rules

Allowed priorities:

```text id="l8u0d5"
LOW
MEDIUM
HIGH
URGENT
```

Default:

```text
MEDIUM
```

---

# 22. Status Transition Rules

Normal lifecycle:

```text id="2dfwtu"
PENDING
   ↓
IN_PROGRESS
   ↓
COMPLETED
```

Blocked workflow:

```text id="n6f8vs"
PENDING
   ↓
IN_PROGRESS
   ↓
BLOCKED
   ↓
IN_PROGRESS
   ↓
COMPLETED
```

The backend should validate status transitions.

---

# 23. Completed Task Rules

When a task becomes:

```text
COMPLETED
```

the backend must set:

```text
completedAt
```

If a completed task is reopened, the implementation must define how `completedAt` is handled.

The preferred initial behaviour is:

```text
COMPLETED → IN_PROGRESS
```

and:

```text
completedAt = cleared
```

with the change preserved in the ActivityLog.

---

# 24. Historical Data Rule

Historical data should not be silently deleted.

A task should normally remain available after completion.

The system should preserve:

- Creation time.
- Status changes.
- Completion time.
- Important edits.

---

# 25. Delete Rules

Deletion should be used carefully.

For tasks with historical significance, prefer soft deletion.

Possible field:

```text id="6v5i3r"
deleted
```

or:

```text
deletedAt
```

A deleted task should not normally appear in standard task lists but should remain available for administrative auditing.

---

# 26. Activity Logging Rule

Important changes should generate activity logs.

At minimum:

```text id="7i9d3q"
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

Logs should contain enough information to understand what happened.

---

# 27. API Rules

All API requests must be validated.

Never assume the frontend sends valid data.

Validate:

- Required fields.
- IDs.
- Status values.
- Priority values.
- User permissions.
- Task ownership.
- String lengths.
- Date formats.

---

# 28. API Response Rules

All API responses should follow the common response structure.

Success:

```json id="af8i1p"
{
  "success": true,
  "data": {},
  "message": "Success"
}
```

Failure:

```json id="s2l9o0"
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request."
  }
}
```

Do not return inconsistent structures between endpoints.

---

# 29. Error Handling Rules

Never silently swallow errors.

Bad:

```javascript id="x4v2a7"
try {
  await saveTask();
} catch {}
```

Good:

```javascript id="y0r5be"
try {
  await saveTask();
} catch (error) {
  showError();
  logError(error);
}
```

User-facing errors must be understandable.

Technical errors should be logged separately.

---

# 30. Loading State Rules

Every network-dependent interface must account for loading.

Examples:

```text id="1w4q3h"
Loading...
Skeleton...
```

Avoid displaying stale or misleading data while a request is in progress.

---

# 31. Empty State Rules

Every list should have an intentional empty state.

Example:

```text id="h0d3z9"
No tasks for today.

Plan your work by adding your first task.

[ + Add Task ]
```

Do not leave users with an empty blank screen.

---

# 32. Confirmation Rules

Destructive operations should require confirmation where appropriate.

Examples:

- Delete task.
- Disable user.
- Delete category.
- Delete department.

Normal actions should NOT require unnecessary confirmation.

For example:

```text
Mark task completed
```

should normally be one click.

---

# 33. Dependency Rules

Do not add a package simply because it is popular.

Before adding a dependency, consider:

1. Can the requirement be implemented with existing tools?
2. Is the package maintained?
3. Does it solve a real problem?
4. Does it increase bundle size?
5. Does it create long-term maintenance cost?

---

# 34. API Layer Rule

React components should not contain raw API request logic everywhere.

Use a central service layer.

Example:

```text id="s9k0qf"
services/
└── api.js
```

or feature-specific service modules.

Bad:

```jsx id="w5s3k2"
fetch(API_URL + "...") 
```

duplicated across many components.

---

# 35. Environment Rules

Never commit secrets.

Do not put:

- Private keys
- Service account credentials
- Passwords
- Sensitive tokens

into Git.

Environment files containing secrets must be excluded from version control.

---

# 36. Git Rules

Use meaningful commits.

Preferred:

```text id="t4h2k8"
feat: add staff task creation
feat: add admin dashboard
fix: prevent staff from accessing other tasks
refactor: simplify task service
docs: update architecture
```

Avoid:

```text
update
changes
final
final2
working
test
```

---

# 37. Branch Rules

Recommended:

```text id="1n0c5m"
main
develop
feature/*
fix/*
```

The exact branching strategy may be simplified for a solo project.

---

# 38. Documentation Rule

Whenever architecture changes significantly, update the relevant documentation.

For example:

If SQLite is replaced with PostgreSQL (as Google Sheets was replaced with SQLite on 2026-08-21 — see memory.md Change Log for that precedent):

Update:

```text
architecture.md
memory.md
phases.md
```

If a major product requirement changes:

Update:

```text
prd.md
memory.md
```

---

# 39. Design Rules

The interface must follow `design.md`.

Do not introduce random:

- Colours
- Fonts
- Shadows
- Border radii
- Spacing
- Button styles

without considering the established design system.

---

# 40. Dashboard Rules

The Admin dashboard should prioritise information over decoration.

The first viewport should communicate:

1. How many staff are active.
2. How many tasks exist today.
3. How many are completed.
4. What remains.
5. Which staff need attention.

Avoid unnecessary visual clutter.

---

# 41. Staff UX Rule

Staff should be able to:

```text id="7z3b4v"
Login
 ↓
See today's work
 ↓
Add task
 ↓
Update status
 ↓
Finish work
```

with minimal navigation.

The daily workflow should be faster than maintaining a spreadsheet manually.

---

# 42. Admin UX Rule

Admin should be able to:

```text id="8u7f3c"
Login
 ↓
See organisation overview
 ↓
Filter
 ↓
Inspect staff
 ↓
Inspect tasks
 ↓
Review history
```

without navigating through multiple unnecessary screens.

---

# 43. Performance Rules

Avoid:

- Repeated API requests.
- Full-table reads where a filtered query (Prisma `where`) is possible.
- Unnecessary React re-renders.
- Huge client-side datasets.
- Large dependencies for simple functionality.

---

# 44. Testing Rules

Before considering a feature complete, test:

### Authentication

- Valid staff.
- Valid admin.
- Unknown Google account.
- Disabled account.

### Tasks

- Create.
- Edit.
- Start.
- Complete.
- Block.
- Reopen.

### Permissions

- Staff accessing own task.
- Staff attempting another user's task.
- Admin accessing all tasks.
- Staff attempting admin operations.

### Data

- Missing fields.
- Invalid IDs.
- Invalid status.
- Invalid priority.

---

# 45. Browser Support

The application should support current versions of:

- Chrome
- Edge
- Firefox
- Safari

Chrome/Edge should receive the highest priority during initial development.

---

# 46. Mobile Rule

Mobile support is required, but the application should not become a mobile-first consumer application.

The priority is:

```text
Desktop Admin
       +
Desktop/Mobile Staff
```

---

# 47. Future Migration Rule

*(Partially superseded 2026-08-21 — the originally-planned Sheets →
real-database migration already happened, landing on SQLite. This rule
now governs the next step: SQLite → PostgreSQL, if/when needed.)*

Do not write code that makes the database engine impossible to replace.

The application should interact with Prisma's generated client (a logical
data model) rather than raw SQL scattered through route handlers.

Future:

```text
SQLite
     ↓
PostgreSQL
```

should require only a `datasource` change in `schema.prisma` plus a
migration.

The React UI should require minimal or no changes.

---

# 48. Decision Rule

When multiple technical solutions are possible, prefer the solution that is:

1. Secure.
2. Simple.
3. Maintainable.
4. Easy to debug.
5. Compatible with the current architecture.
6. Easy to migrate later.

Do not optimise prematurely.

---

# 49. Change Management

If a proposed change conflicts with these rules:

1. Identify the conflict.
2. Determine whether the rule is still valid.
3. Update the documentation if the rule is intentionally changed.
4. Record the decision in `memory.md`.

Do not silently violate established project rules.

---

# 50. Golden Rule

> **Build only what is needed, protect the data, keep the code understandable, and leave a clean path for the next version.**