# Organisation Task Manager (OTM)
## Product Requirements Document

**Document:** `prd.md`  
**Version:** 1.0  
**Status:** Initial Specification  
**Project:** Organisation Task Manager  
**Primary Stack:** React + Node.js (Express) + SQLite (via Prisma) + Google Authentication (Firebase)

*(Superseded 2026-08-21 — originally React + Google Apps Script + Google Sheets; see memory.md Change Log.)*

---

## 1. Product Overview

Organisation Task Manager (OTM) is an internal web application designed to help an organisation manage, monitor, and review the daily work performed by its staff.

The system allows staff members to:

- Sign in using their Google account.
- View their personal daily workspace.
- Add tasks for the current working day.
- Set task priority.
- Update task status.
- Add notes and descriptions.
- Mark tasks as completed.
- Review their previous work.

The Super Admin can:

- Monitor all staff.
- View every staff member's tasks.
- Filter tasks by date, employee, status, priority, department, and category.
- Monitor daily completion.
- Review historical work.
- Identify pending, overdue, or blocked work.
- View individual staff performance.
- Review organisation-wide productivity.

The application is intended to become a central internal system for daily work planning and management.

---

# 2. Product Goals

## Primary Goals

1. Create a simple daily task-management workflow for staff.
2. Give management visibility into daily organisational work.
3. Maintain a historical record of completed and incomplete work.
4. Reduce dependency on manual reporting.
5. Provide useful daily and historical productivity information.
6. Ensure only authorised organisation members can access the application.
7. Keep the first version inexpensive and easy to maintain.

## Secondary Goals

- Establish a foundation for future employee-management features.
- Support departments and categories.
- Maintain an auditable activity history.
- Eventually support notifications, reports, exports, and advanced analytics.

---

# 3. Non-Goals for MVP

The first version will NOT attempt to become a complete project-management platform.

The following are outside the initial MVP:

- Payroll
- Attendance management
- Leave management
- Salary management
- HR management
- Customer management
- Full project-management workflows
- Complex team collaboration
- Real-time chat
- File storage
- Video meetings
- Employee appraisal system
- AI-generated task planning

These may be considered in future versions.

---

# 4. User Roles

## 4.1 Super Admin

The Super Admin has complete access to the organisation's task-management data.

Capabilities:

- View all staff.
- Add staff.
- Disable staff.
- Assign roles.
- View all tasks.
- Edit tasks where appropriate.
- Delete tasks where appropriate.
- Filter tasks.
- View reports.
- View historical data.
- View staff performance.
- Manage categories.
- Manage departments.
- Review activity logs.

There should normally be one primary Super Admin initially, although the architecture should allow multiple administrators later.

---

## 4.2 Staff

Staff members have access to their own workspace.

Capabilities:

- Sign in with Google.
- View today's tasks.
- Add today's tasks.
- Edit their own tasks.
- Update task status.
- Set task priority.
- Add task notes.
- Mark tasks completed.
- View their own task history.

Staff must NOT be able to:

- View another employee's private task data unless explicitly permitted.
- Modify organisation settings.
- Modify user roles.
- View administrative reports.
- Access system configuration.

---

# 5. Authentication

Authentication will use Google account authentication.

The expected login flow is:

```text
User
  ↓
Google Login
  ↓
Google Identity
  ↓
Application receives authenticated identity
  ↓
Check user email against Users database
  ↓
User exists and active?
  ├── YES → Allow access
  └── NO  → Deny access
```

The Google email address will be the primary human-readable identity.

The application must not automatically grant access to every Gmail account.

Only users registered and activated by the Super Admin should be able to access the application.

---

# 6. Core Staff Workflow

## Morning

Staff opens the application.

They see:

- Greeting
- Current date
- Today's task summary
- Add Task button
- Today's task list

Example:

```text
20 August 2026

Today's Work
────────────────────

Total       6
Completed   0
Pending     6

[ + Add Task ]

Today's Tasks
```

Staff adds tasks for the day.

---

# 7. Task Structure

Each task should contain, at minimum:

- Task ID
- Staff/User ID
- Task date
- Title
- Description
- Priority
- Status
- Category
- Created timestamp
- Updated timestamp
- Started timestamp
- Completed timestamp

Optional future fields:

- Due time
- Estimated duration
- Actual duration
- Project
- Client
- Attachments
- Comments

---

# 8. Task Status

MVP statuses:

### Pending

Task has been created but work has not started.

### In Progress

Staff has started working on the task.

### Completed

Staff has completed the task.

### Blocked

Staff cannot continue because of a dependency or problem.

The status lifecycle should generally be:

```text
Pending
   ↓
In Progress
   ↓
Completed
```

Alternative:

```text
Pending
   ↓
In Progress
   ↓
Blocked
   ↓
In Progress
   ↓
Completed
```

A completed task should retain its completion timestamp.

---

# 9. Task Priority

MVP priority levels:

- Low
- Medium
- High
- Urgent

Default priority:

**Medium**

Priority should be visually distinguishable but should not dominate the interface.

---

# 10. Daily Task Rules

The system should automatically associate newly created tasks with the current date.

Staff should not normally need to manually select today's date.

Example:

```text
Current date:
20 August 2026

New task:
Prepare quotation

Stored date:
2026-08-20
```

This reduces incorrect dates and simplifies the staff workflow.

Historical tasks may be viewed but should not be casually modified.

---

# 11. Staff Dashboard

The staff dashboard should provide:

### Summary

- Total tasks
- Pending
- In Progress
- Completed
- Blocked
- Completion percentage

### Task list

Each task should display:

- Title
- Priority
- Status
- Category
- Created time
- Updated time
- Completion time where applicable

### Actions

Depending on status:

- Start
- Mark Completed
- Mark Blocked
- Edit
- View details

---

# 12. Super Admin Dashboard

The Super Admin dashboard is the primary management interface.

It should answer:

> "What is happening in the organisation today?"

The dashboard should display:

### Organisation Summary

- Total staff
- Active staff
- Total tasks
- Completed tasks
- Pending tasks
- In-progress tasks
- Blocked tasks
- Completion rate

### Staff Overview

Example:

| Staff | Tasks | Completed | Pending | Blocked | Completion |
|---|---:|---:|---:|---:|---:|
| Rahul | 8 | 7 | 1 | 0 | 87.5% |
| Priya | 6 | 6 | 0 | 0 | 100% |
| Amit | 9 | 4 | 3 | 2 | 44.4% |

---

# 13. Filtering

The Super Admin should be able to filter data by:

- Date
- Date range
- Staff
- Department
- Category
- Status
- Priority

Filters should be combinable.

Example:

```text
Date:
[20 Aug 2026]

Staff:
[All Staff]

Department:
[Technical]

Status:
[Pending]

Priority:
[High]
```

---

# 14. Historical Data

The system must preserve historical task data.

The Admin should be able to select:

- Today
- Yesterday
- This week
- Last week
- This month
- Last month
- Custom date range

Historical information should not disappear when a new day begins.

---

# 15. Staff Performance

The application should provide individual performance summaries.

Example:

```text
Rahul

August 2026

Tasks Created       84
Completed           72
Pending              7
Blocked              5

Completion Rate    85.7%

Daily Average       5.6 tasks
```

Future metrics may include:

- Average completion time
- Overdue tasks
- Blocked task frequency
- Daily consistency
- Task completion trend

These metrics should be treated as operational indicators, not automatically as employee-performance judgments.

---

# 16. Daily Review

The Super Admin should be able to review an end-of-day summary.

Example:

```text
Daily Review
20 August 2026

Organisation
────────────────────

Staff:              12
Tasks:              67
Completed:          48
In Progress:         9
Pending:             7
Blocked:             3

Completion Rate: 71.6%
```

Then drill down into individual employees.

---

# 17. Activity Logging

Important task actions should be logged.

Examples:

```text
TASK_CREATED
TASK_UPDATED
STATUS_CHANGED
TASK_COMPLETED
TASK_BLOCKED
TASK_DELETED
```

Each log should record:

- Log ID
- User
- Task
- Action
- Previous value
- New value
- Timestamp

This provides accountability and troubleshooting capability.

---

# 18. Database

*(Superseded 2026-08-21 — was "Google Sheets Database"; see memory.md
Change Log.)*

SQLite, accessed through Prisma, acts as the application database.

The schema (`apps/api/prisma/schema.prisma`) defines separate models for:

```text
User
Task
Category
Department
ActivityLog
Setting
```

The application does not depend on arbitrary column positions.

Field names are explicitly defined in the Prisma schema and treated as part of the database contract.

---

# 19. Backend (Express API)

*(Superseded 2026-08-21 — was "Google Apps Script".)*

An Express API (`apps/api`) acts as the backend/API layer between React and SQLite.

Responsibilities:

- Validate requests.
- Read the database.
- Write the database.
- Validate users.
- Enforce permissions.
- Create tasks.
- Update tasks.
- Generate filtered data.
- Record activity logs.
- Return structured API responses.

React should not directly query or manipulate the database.

---

# 20. Error Handling

The application should gracefully handle:

- Google authentication failure.
- Unauthorized user.
- Disabled user.
- Network failure.
- API failure.
- Invalid task data.
- Missing required fields.
- Database errors.
- Duplicate operations.

User-facing errors should be understandable.

Example:

Instead of:

```text
HTTP 500
```

show:

```text
Something went wrong while saving your task.
Please try again.
```

Technical details should be logged separately.

---

# 21. Security Requirements

The application must:

- Authenticate users.
- Authorise users based on role.
- Never trust client-side role information.
- Validate API requests.
- Prevent staff from accessing other staff's data.
- Keep the database inaccessible directly to normal staff.
- Validate all task IDs.
- Validate user IDs.
- Record important administrative actions.

The React frontend must never contain database credentials or sensitive backend secrets.

---

# 22. Performance Requirements

For the initial version:

- Dashboard should load quickly for normal organisation sizes.
- API responses should return only necessary data.
- Database reads should be filtered at the query level, not in application code.
- Large datasets should use filtering and pagination where necessary.
- React should avoid unnecessary API requests.

SQLite is acceptable for the initial scale, but the architecture should allow migration to PostgreSQL later (a Prisma datasource change, not a rewrite — see architecture.md §31).

---

# 23. Responsive Design

The application must work on:

- Desktop
- Laptop
- Tablet
- Mobile

Primary usage is expected to be desktop/laptop for administration and mobile/desktop for staff.

---

# 24. MVP Success Criteria

The MVP is considered successful when:

1. A registered staff member can log in with Google.
2. An unauthorised Google account cannot access the system.
3. Staff can create today's tasks.
4. Staff can update task status.
5. Staff can mark tasks completed.
6. Tasks are persisted in the database.
7. Staff can see their own history.
8. Super Admin can see all staff.
9. Super Admin can see all tasks.
10. Admin can filter tasks.
11. Admin can see daily completion statistics.
12. Activity history is recorded.
13. The application works responsively.
14. No sensitive credentials are exposed in React.

---

# 25. Future Roadmap

Potential future features:

### V2

- Departments
- Projects
- Task comments
- Due times
- Recurring tasks
- Task dependencies
- Notifications
- Daily reminders

### V3

- Email notifications
- WhatsApp notifications
- Weekly reports
- PDF reports
- Excel/CSV export
- Advanced analytics
- Manager role

### V4

- Attendance
- Leave management
- Employee profiles
- Performance reviews
- HR features
- Mobile application

### V5

- Migration from SQLite to PostgreSQL/Supabase
- Advanced permissions
- Organisation hierarchy
- Multi-organisation support

---

# 26. Product Principle

The application should follow one central principle:

> **Simple for staff. Powerful for management.**

Staff should be able to add and update a task in seconds.

Management should be able to understand the organisation's work without asking every employee for a manual report.

---

# 27. Initial Product Name

Working name:

**Organisation Task Manager**

Short name:

**OTM**

The final product/brand name can be changed later without affecting the architecture.