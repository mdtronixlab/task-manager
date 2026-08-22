# Organisation Task Manager (OTM)
## UI/UX Design System

**Document:** `design.md`  
**Version:** 1.0  
**Status:** Initial Specification

---

# 1. Design Philosophy

The Organisation Task Manager should feel like a **professional internal business application**.

The design should be:

- Clean
- Modern
- Minimal
- Fast
- Professional
- Information-focused
- Easy to understand
- Comfortable for long working sessions

The interface should not feel like a consumer social-media application.

The primary goal is:

> **Make daily work management effortless and organisational information immediately understandable.**

---

# 2. Design Principles

## 2.1 Clarity First

Every screen should have an obvious primary purpose.

For example:

Staff dashboard:

> "What do I need to do today?"

Admin dashboard:

> "What is happening in the organisation today?"

---

## 2.2 Information Hierarchy

Important information should receive stronger visual emphasis.

Priority:

```text id="a0n8ck"
Page purpose
    ↓
Key metrics
    ↓
Primary actions
    ↓
Important information
    ↓
Secondary information
```

---

## 2.3 Minimal Interaction

Common operations should require as few clicks as possible.

Example:

```text id="x8w5q0"
Complete Task
```

should preferably be one action.

Adding a task should be quick.

---

# 3. Visual Direction

The default visual direction:

**Modern SaaS / Internal Business Dashboard**

Characteristics:

- Generous whitespace.
- Clear typography.
- Rounded cards.
- Subtle borders.
- Limited shadows.
- Neutral background.
- Strong primary accent.
- Compact but readable tables.
- Clear status badges.

Avoid:

- Excessive gradients.
- Excessive glassmorphism.
- Large decorative illustrations.
- Heavy animations.
- Overly colourful dashboards.
- Excessive shadows.

---

# 4. Theme

The first version should support a **light theme**.

Dark mode can be added later.

Light theme structure:

```text id="x7w3c1"
Application background
→ Soft neutral

Cards
→ White

Borders
→ Light neutral

Primary text
→ Dark neutral

Secondary text
→ Medium neutral

Primary action
→ Brand/accent colour
```

Exact colours should be centralised in the design system rather than scattered throughout components.

---

# 5. Colour System

Use semantic colours.

## Primary

Used for:

- Primary buttons.
- Selected navigation.
- Important interactive controls.
- Links where appropriate.

## Success

Used for:

- Completed.
- Successful operations.
- Positive confirmation.

## Warning

Used for:

- Pending attention.
- Medium-priority warnings.

## Danger

Used for:

- Errors.
- Destructive actions.
- Urgent issues.

## Neutral

Used for:

- Secondary information.
- Disabled controls.
- Borders.
- Backgrounds.

---

# 6. Task Status Colours

Status should have both colour and text.

Recommended semantic mapping:

```text id="b5tq48"
PENDING
→ Warning

IN_PROGRESS
→ Primary/Information

COMPLETED
→ Success

BLOCKED
→ Danger
```

Never communicate task status using colour alone.

---

# 7. Priority Visual Language

Priority should remain visually subtle.

```text id="x7b6r3"
LOW
→ Neutral

MEDIUM
→ Standard

HIGH
→ Warning

URGENT
→ Danger
```

Urgent tasks should be noticeable without making the entire interface visually aggressive.

---

# 8. Typography

Use a modern, highly readable sans-serif font.

Preferred choices:

- Inter
- Geist
- System UI

The final font should be selected during implementation.

Typography hierarchy:

```text id="w5l7b4"
Page Title
    ↓
Section Heading
    ↓
Card Heading
    ↓
Body
    ↓
Secondary Text
    ↓
Metadata
```

Avoid excessive font sizes.

---

# 9. Suggested Type Scale

Example:

```text id="y4r1kc"
Page Title       28–32px
Section Title    20–24px
Card Title       16–18px
Body             14–16px
Small Text       12–14px
Metadata         12px
```

Exact sizes may be adjusted during implementation.

---

# 10. Spacing

Use a consistent spacing system.

Base unit:

```text id="k2m4pw"
4px
```

Common spacing:

```text id="u9z6kc"
4
8
12
16
20
24
32
40
48
64
```

Avoid arbitrary values unless necessary.

---

# 11. Border Radius

Use a consistent radius system.

Suggested:

```text id="c6l4f9"
Small controls      6px
Inputs              8px
Cards               12px
Large containers    16px
Modal               16px
```

Avoid excessive pill-shaped containers except for badges and tags.

---

# 12. Shadows

Use shadows sparingly.

Cards should primarily be separated using:

- Background contrast.
- Borders.
- Whitespace.

Shadows should communicate elevation only when necessary.

---

# 13. Layout

The main application should use a desktop dashboard structure.

```text id="m7j8r4"
┌─────────────────────────────────────────────────────┐
│ Header                                              │
├───────────────┬─────────────────────────────────────┤
│               │                                     │
│ Sidebar       │ Main Content                        │
│               │                                     │
│ Dashboard     │                                     │
│ Tasks         │                                     │
│ Staff         │                                     │
│ Reports       │                                     │
│ Settings      │                                     │
│               │                                     │
└───────────────┴─────────────────────────────────────┘
```

---

# 14. Sidebar

Desktop sidebar should contain:

```text id="l8k2w7"
Organisation Logo

Dashboard
Tasks
Staff
Reports

────────────

Categories
Departments

────────────

Settings
Profile
```

The Staff role should see a reduced navigation:

```text id="6n2x1a"
Dashboard
My Tasks
History
Profile
```

---

# 15. Header

Header should contain:

- Page title or breadcrumb.
- Date/context where useful.
- Notifications if implemented.
- User avatar.
- User name.
- Account menu.

Avoid filling the header with unnecessary controls.

---

# 16. Staff Dashboard

The Staff dashboard should be task-centric.

Suggested layout:

```text id="p7y4k8"
Thursday, 20 August

┌──────────┬──────────┬──────────┬──────────┐
│ Total    │ Pending  │ Progress │ Complete │
│    6     │    2     │    1     │    3     │
└──────────┴──────────┴──────────┴──────────┘

Today's Tasks                         [+ Add Task]

┌────────────────────────────────────────────┐
│ Prepare quotation                         │
│ High • In Progress                        │
│                                            │
│ [Mark Completed]                           │
└────────────────────────────────────────────┘
```

---

# 17. Admin Dashboard

Admin dashboard should be information-dense but not cluttered.

Suggested structure:

```text id="n5t1z8"
Organisation Overview

┌────────┬────────┬────────┬────────┬────────┐
│ Staff  │ Tasks  │ Done   │Pending │Blocked │
└────────┴────────┴────────┴────────┴────────┘

Completion Rate
██████████████████░░  82%

Staff Performance

┌─────────────────────────────────────────────┐
│ Staff │ Tasks │ Done │ Pending │ Completion│
├─────────────────────────────────────────────┤
│ Rahul │  8    │  7   │    1    │   87%     │
│ Priya │  6    │  6   │    0    │  100%    │
└─────────────────────────────────────────────┘
```

---

# 18. KPI Cards

KPI cards should contain:

```text id="6gh0bm"
Label
Value
Optional trend/context
```

Example:

```text id="x3v1k8"
Completed Tasks

48

71.6% of today's tasks
```

Do not put too much information into KPI cards.

---

# 19. Task Card

A task card should contain:

```text id="h5x2v0"
Task title

Description preview

Priority     Status
Category     Created time

Optional action
```

Example:

```text id="0m8t5n"
Prepare client quotation

Prepare quotation for ABC client.

HIGH        IN PROGRESS
Technical   10:20 AM

                     [Complete]
```

---

# 20. Task Table

The Admin task table should prioritise scanning.

Columns:

```text id="z9x1ka"
Task
Staff
Date
Category
Priority
Status
Updated
Actions
```

On mobile, the table should transform into cards or a horizontally scrollable layout.

---

# 21. Filters

Filters should be visually grouped.

Example:

```text id="9j6r3d"
Filters

[ Date Range ▼ ]
[ Staff ▼ ]
[ Department ▼ ]
[ Status ▼ ]
[ Priority ▼ ]

[Clear Filters]
```

Do not create a separate modal for simple filters unless screen space requires it.

---

# 22. Add Task Modal

The Add Task interaction should be quick.

Suggested:

```text id="g4k6p1"
Add Task

Task Title
[________________________]

Description
[________________________]

Category
[ Select category ▼ ]

Priority
[ Medium ▼ ]

             [Cancel] [Add Task]
```

The current date should be displayed as context but not require manual entry.

---

# 23. Task Details

Task detail view should display:

```text id="2j8y4c"
Task Title

Description

Status
Priority
Category

Created
Started
Completed

Activity

10:05 Created
10:30 Started
12:15 Completed
```

This becomes particularly useful for administrative review.

---

# 24. Staff Profile

Admin staff profile:

```text id="8c3q9p"
Rahul Kumar

rahul@gmail.com
Technical Department
Developer

────────────────────

Today
Tasks: 8
Completed: 7
Completion: 87%

────────────────────

Recent Tasks
```

---

# 25. Reports

Reports should be visually simple.

Possible sections:

```text id="x9n3u5"
Daily Summary

Task Status Distribution

[Chart]

Completion Trend

[Chart]

Staff Performance

[Table]
```

Avoid dashboards where every section is a chart.

Tables are often better for operational information.

---

# 26. Empty States

Empty states should tell users what to do next.

Example:

```text id="e1z7m2"
No tasks today

You haven't added any tasks yet.

[ + Add Task ]
```

Admin:

```text id="u4h8v2"
No matching tasks

Try changing your filters.
```

---

# 27. Loading States

Use skeletons for large dashboard sections.

For actions:

```text id="v8p2k6"
Saving...
```

Buttons should prevent duplicate submissions while an operation is in progress.

---

# 28. Error States

Error messages should be clear and actionable.

Example:

```text id="r6q1t0"
Unable to load today's tasks.

Please check your connection and try again.

[Retry]
```

---

# 29. Notifications / Toasts

Use toast notifications for completed actions.

Examples:

```text id="m2c8x4"
Task added successfully.
```

```text id="j8q3s7"
Task marked as completed.
```

```text id="f4v7p1"
Unable to save task.
```

Do not use toasts for information that users need to study or act upon for a long time.

---

# 30. Forms

Forms should:

- Use clear labels.
- Show validation near the field.
- Preserve entered information when possible.
- Prevent invalid submission.
- Show loading state during submission.

Example:

```text id="k5m0w2"
Task title *
[____________________]

Task title is required.
```

---

# 31. Buttons

Use three primary button levels.

### Primary

Main action.

Example:

```text id="a5r8k3"
+ Add Task
```

### Secondary

Alternative action.

Example:

```text id="f8s1v4"
Cancel
```

### Destructive

Dangerous action.

Example:

```text id="p7j2x6"
Delete
```

Do not make every button visually prominent.

---

# 32. Icons

Icons should support meaning rather than decorate the interface.

Recommended icon library can be selected during implementation.

Possible choice:

```text id="5x2n7m"
Lucide
```

Icons should remain consistent throughout the application.

---

# 33. Tables

Tables should support:

- Sorting where useful.
- Filtering.
- Pagination where required.
- Responsive behaviour.
- Clear headers.
- Row hover state.
- Status badges.

Do not make tables unnecessarily dense.

---

# 34. Mobile Staff Experience

On mobile, staff should primarily see:

```text id="7h3n9q"
Today's Tasks

[ + Add Task ]

Task 1
Task 2
Task 3
```

The most important actions should remain easy to reach with one hand.

---

# 35. Admin Mobile Experience

Admin mobile support should focus on:

- Viewing KPIs.
- Checking staff status.
- Reviewing urgent/pending tasks.
- Applying basic filters.

Complex data tables may be scrollable or converted to cards.

Desktop remains the primary Admin experience.

---

# 36. Animation

Animations should be subtle.

Use animation for:

- Modal opening.
- Toast appearance.
- Loading.
- State transitions.
- Navigation.

Avoid:

- Constant movement.
- Large animated backgrounds.
- Excessive page transitions.

The application should feel fast.

---

# 37. Accessibility

Target:

**WCAG 2.1 AA principles where practical.**

Ensure:

- Keyboard navigation.
- Visible focus.
- Sufficient contrast.
- Semantic HTML.
- Accessible labels.
- Meaningful error messages.
- Screen-reader-friendly controls.

---

# 38. Design Tokens

Design values should eventually be centralised.

Conceptual structure:

```text id="e8m1y6"
tokens/
 ├── colors
 ├── typography
 ├── spacing
 ├── radius
 └── shadows
```

The exact implementation may use Tailwind configuration and CSS variables.

---

# 39. Branding

The initial interface should support organisation branding without tightly coupling the UI to a specific logo.

Configurable items may include:

- Organisation name.
- Logo.
- Primary colour.
- Favicon.

The application should be able to evolve into a branded internal platform.

---

# 40. Visual Density

The Admin dashboard should have **medium information density**.

The Staff dashboard should have **low-to-medium information density**.

```text id="7w3q2x"
Staff
→ Simple
→ Focused
→ Task-oriented

Admin
→ Dense
→ Analytical
→ Information-oriented
```

---

# 41. Design Anti-Patterns

Avoid:

- Excessive cards.
- Every metric becoming a coloured box.
- Too many charts.
- Tiny text.
- Huge headings.
- Excessive rounded corners.
- Excessive shadows.
- Too many modal dialogs.
- Hidden navigation.
- Unclear buttons.
- Colour-only status indicators.

---

# 42. Design Priority

When there is a conflict between visual decoration and usability:

> **Usability wins.**

When there is a conflict between aesthetics and information clarity:

> **Information clarity wins.**

When there is a conflict between animation and perceived performance:

> **Performance wins.**

---

# 43. Design Goal

The finished product should feel like:

> **A calm, professional control centre for daily organisational work.**

It should not feel like:

- A spreadsheet.
- A complicated project-management tool.
- A social network.
- A flashy analytics dashboard.

The user should understand what to do within seconds of opening the application.