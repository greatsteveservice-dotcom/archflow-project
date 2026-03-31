# ArchFlow — Technical Specification

> Generated: 2026-03-31 | Based on: CLAUDE.md, PROJECT_CONTEXT.md, source code (sprint 10)
> This document is the single source of truth for all modules, DB schema, API, user stories, and edge cases.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture](#2-architecture)
3. [Module 1 — Authentication & Onboarding](#3-module-1--authentication--onboarding)
4. [Module 2 — Projects](#4-module-2--projects)
5. [Module 3 — Design (Дизайн)](#5-module-3--design)
6. [Module 4 — Supervision (Авторский надзор)](#6-module-4--supervision)
7. [Module 5 — Supply (Комплектация)](#7-module-5--supply)
8. [Module 6 — Chat](#8-module-6--chat)
9. [Module 7 — Settings & Access Control](#9-module-7--settings--access-control)
10. [Module 8 — Feedback & Notifications](#10-module-8--feedback--notifications)
11. [Module 9 — Search](#11-module-9--search)
12. [Module 10 — PWA & Offline](#12-module-10--pwa--offline)
13. [RBAC Matrix](#13-rbac-matrix)
14. [Database Schema (complete)](#14-database-schema)
15. [API Routes](#15-api-routes)
16. [RLS Policies](#16-rls-policies)
17. [Storage Buckets](#17-storage-buckets)
18. [Environment Variables](#18-environment-variables)
19. [Design System Reference](#19-design-system-reference)
20. [Known Limitations & Future Work](#20-known-limitations--future-work)

---

## 1. Product Overview

**ArchFlow** — SaaS-platform for interior designers and construction companies.

| Attribute | Value |
|-----------|-------|
| Domain | archflow.ru |
| Market | CIS (Russia priority) |
| Status | Early MVP, first users onboarding |
| Stack | Next.js 14 (App Router), TypeScript, Tailwind, Supabase (Beget Cloud) |
| Deploy | Netlify auto-deploy from GitHub |
| Auth | Supabase Auth (email/password) |
| Email | Resend API |
| Analytics | Yandex Metrika |
| Feedback | Telegram Bot API |

**Core idea**: 4-section project management — Design, Supply, Supervision, Settings — with RBAC invite links and monochrome editorial UI.

---

## 2. Architecture

### 2.1 SPA with Client-Side Routing

Single entry point: `page.tsx`. All navigation via `useState` + `window.history.pushState`. Next.js App Router used only for API routes and root layout.

```
page.tsx (SPA shell, routing state machine)
  AuthProvider → ThemeProvider
    ├── LoginPage (if !session)
    ├── OnboardingFlow (if !onboarding_completed)
    ├── Topbar / Sidebar
    ├── ProjectsPage | ProjectPage | VisitPage | ProfilePage
    ├── SearchModal (Cmd+K)
    ├── FeedbackBar (fixed bottom, 40px)
    └── Toast / OfflineBanner
```

### 2.2 Navigation Structure

```
/login
/projects                        — project list
/projects/:id                    — section picker (4 blocks)
/projects/:id/design             — Design tab (6 folders)
/projects/:id/supply             — Supply (items, timeline, stages, import)
/projects/:id/journal            — Supervision (calendar, reports, photos, tasks)
/projects/:id/settings           — Project settings + access control
/profile                         — User profile
/invite/:token                   — RBAC invite acceptance
```

### 2.3 Data Layer Pattern

1. **`queries.ts`** (~70KB) — all Supabase query functions. Single source of truth for data access.
2. **`hooks.ts`** (~19KB) — 22 custom hooks via generic `useQuery<T>()`. Each returns `{ data, loading, error, refetch }`.
3. **`types.ts`** — TypeScript interfaces mirroring Supabase schema exactly.
4. **`auth.tsx`** — AuthProvider context: session, profile, signIn/signUp/signOut.
5. **`permissions.ts`** — `resolvePermissions(role, accessLevel)` → 19 boolean flags.
6. **`theme.tsx`** — ThemeProvider for light/dark mode via `.dark` class on `<html>`.

### 2.4 Real-Time

Supabase `postgres_changes` subscriptions on `chat_messages`. Hooks auto-refetch on external changes.

---

## 3. Module 1 — Authentication & Onboarding

### 3.1 Tables

#### `profiles`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, FK → auth.users.id |
| full_name | TEXT | NOT NULL |
| email | TEXT | |
| phone | TEXT | |
| telegram_id | TEXT | |
| company | TEXT | |
| avatar_url | TEXT | |
| role | user_role | 'designer'\|'client'\|'contractor'\|'supplier'\|'assistant' |
| onboarding_completed | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | auto-updated by trigger |

**Triggers**: `handle_new_user` — auto-creates profile row on Supabase Auth signup.

### 3.2 Auth Flow

| Step | Action | Implementation |
|------|--------|----------------|
| 1 | Signup | POST `/api/auth/signup` — creates user via `admin.createUser()` with `email_confirm: true` |
| 2 | Auto-login | `signInWithPassword` after signup (fire-and-forget) |
| 3 | Welcome email | `sendWelcomeEmail(to, fullName)` — no password in email |
| 4 | Login | `supabase.auth.signInWithPassword({ email, password })` |
| 5 | Session init | Decode JWT, check `exp`, refresh if expired, signOut if refresh fails |
| 6 | Profile fetch | Query `profiles` table, auto-signout on PGRST301 errors |
| 7 | Password reset | `supabase.auth.resetPasswordForEmail(email)` |
| 8 | Password update | `supabase.auth.updateUser({ password })` |

### 3.3 Onboarding

Two flows based on `profile.role`:

**Designer onboarding** (7 slides):
1. Welcome + Early Access badge
2. Projects overview (preview)
3. Section picker (preview)
4. Calendar / Supervision (preview)
5. Access control (preview)
6. Chat (preview)
7. CTA: "Create first project" + PWA install hint (iOS/Android detection)

**Client onboarding** (3 slides):
1. Welcome — "Designer opened access to your project"
2. Supervision calendar (preview)
3. Chat with designer (preview)

Completion: `profiles.onboarding_completed = true`.

### 3.4 User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| AUTH-1 | Designer signs up with email/password | Account created, auto-logged in, onboarding shown |
| AUTH-2 | Client receives invite link, registers | Account created, role set to 'client', client onboarding shown |
| AUTH-3 | User returns with expired session | JWT validated, refresh attempted, clean login screen on failure |
| AUTH-4 | User resets forgotten password | Email sent, recovery link opens reset form, new password saved |
| AUTH-5 | User completes onboarding | `onboarding_completed` set, not shown again |

### 3.5 Edge Cases

| Case | Handling |
|------|----------|
| Stale JWT in localStorage | Decode `exp`, try `refreshSession()`, signOut on failure |
| PostgREST 401 during profile fetch | Auto-signout, redirect to login |
| Duplicate email signup | Returns "Пользователь с таким email уже зарегистрирован" |
| Password < 6 characters | Client-side + server-side validation |
| Welcome email fails | Caught, logged, signup still succeeds |
| Rate-limited auth requests | Translated to "Слишком много попыток" |
| Invite link + no account | Login page with hint, signup creates account, invite auto-accepted after login |
| Malformed JWT in storage | Caught in try/catch, signOut, clean login screen |

---

## 4. Module 2 — Projects

### 4.1 Tables

#### `projects`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| title | TEXT | NOT NULL |
| address | TEXT | |
| status | project_status | 'active'\|'completed'\|'archived', DEFAULT 'active' |
| owner_id | UUID | FK → profiles.id, NOT NULL |
| scenario_type | scenario_type | 'block'\|'gkl', DEFAULT 'block' |
| start_date | DATE | |
| supply_discount | NUMERIC(5,2) | DEFAULT 0 |
| progress | INTEGER | DEFAULT 0, CHECK (0-100) |
| webcam_url | TEXT | |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | auto-updated |

### 4.2 Query Functions

| Function | Signature | Table |
|----------|-----------|-------|
| `fetchProjects` | `() → ProjectWithStats[]` | projects + visits + photo_records |
| `fetchProject` | `(id) → ProjectWithStats \| null` | projects |
| `createProject` | `(input: CreateProjectInput) → Project` | projects |
| `updateProject` | `(id, updates) → Project` | projects |
| `deleteProject` | `(id) → void` | projects |

### 4.3 View Types

```typescript
interface ProjectWithStats extends Project {
  owner?: Profile;
  visit_count: number;
  photo_count: number;
  open_issues: number;
  last_activity: string;
}
```

### 4.4 UI Components

- **ProjectsPage** — grid of project cards with name, address, meta, letter thumbnail
- **CreateProjectModal** — fullscreen form (title*, address, start_date)
- **ProjectPage** — section picker: 4 blocks (Design, Supervision, Chat, Supply)

### 4.5 User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| PROJ-1 | Designer creates a project | Title required, address/date optional, redirects to project |
| PROJ-2 | Designer sees all projects | Grid with stats (visit count, photo count, issues) |
| PROJ-3 | Designer opens a project | Sees 4 section blocks: Design, Supervision, Chat, Supply |
| PROJ-4 | Designer archives project | Status changes, card dimmed in list |
| PROJ-5 | Client sees only their projects | Via project_members membership |

### 4.6 Edge Cases

| Case | Handling |
|------|----------|
| Empty project list | Welcome screen with "Create first project" CTA |
| Project with no visits/photos | Stats show 0, no errors |
| Delete project with members | Cascade delete via FK constraints |
| Long project title | CSS truncation with ellipsis |
| Client tries to create project | `canCreateProject: false` hides button |

---

## 5. Module 3 — Design

### 5.1 Tables

#### `design_files`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id |
| folder | TEXT | CHECK IN ('design_project','visuals','drawings','furniture','engineering','documents') |
| name | TEXT | NOT NULL |
| file_path | TEXT | NOT NULL |
| file_url | TEXT | NOT NULL |
| file_size | INTEGER | |
| file_type | TEXT | |
| uploaded_by | UUID | FK → auth.users.id |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | |

**Indexes**: `idx_design_files_project`, `idx_design_files_folder`

#### `design_file_comments`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| file_id | UUID | FK → design_files.id ON DELETE CASCADE |
| project_id | UUID | FK → projects.id |
| user_id | UUID | FK → auth.users.id |
| text | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### 5.2 Folder Structure

| Index | ID | Label (RU) |
|-------|----|-----------|
| 01 | design_project | Дизайн-проект |
| 02 | visuals | Визуализации |
| 03 | drawings | Чертежи |
| 04 | furniture | Проект мебели |
| 05 | engineering | Инженерные проекты |
| 06 | documents | Документы |

### 5.3 Query Functions

| Function | Signature | Table |
|----------|-----------|-------|
| `fetchDesignFiles` | `(projectId, folder?) → DesignFileWithProfile[]` | design_files + profiles |
| `fetchDesignFileCounts` | `(projectId) → Record<folder, count>` | design_files |
| `fetchDesignFile` | `(fileId) → DesignFileWithProfile \| null` | design_files + profiles |
| `createDesignFile` | `(input: CreateDesignFileInput) → DesignFile` | design_files |
| `deleteDesignFile` | `(fileId, filePath) → void` | design_files + storage |
| `fetchDesignFileComments` | `(fileId) → DesignFileCommentWithProfile[]` | design_file_comments + profiles |
| `createDesignFileComment` | `(fileId, projectId, text) → DesignFileComment` | design_file_comments |

### 5.4 User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| DES-1 | Designer uploads file to folder | File in storage, row in design_files, visible in folder |
| DES-2 | Designer views folder contents | Files listed with name, size, date, uploader |
| DES-3 | Team member comments on file | Comment visible to all project members |
| DES-4 | Client views design files | Only if `client_can_see_design: true` in access settings |
| DES-5 | Designer deletes file | File removed from storage + DB |

### 5.5 Edge Cases

| Case | Handling |
|------|----------|
| Upload large file (>50MB) | Supabase storage limit applies; no client-side limit enforced |
| Duplicate file name in folder | Allowed (UUID in path ensures uniqueness) |
| Client access toggled off mid-session | UI hides tab; RLS blocks queries |
| File comment on deleted file | FK CASCADE deletes comments |
| Empty folder | Shows empty state with upload prompt |

---

## 6. Module 4 — Supervision (Авторский надзор)

### 6.1 Tables

#### `visits`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id |
| created_by | UUID | FK → profiles.id |
| date | DATE | NOT NULL |
| title | TEXT | NOT NULL |
| note | TEXT | |
| status | visit_status | 'planned'\|'approved'\|'issues_found' |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### `photo_records`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| visit_id | UUID | FK → visits.id ON DELETE CASCADE |
| comment | TEXT | |
| status | photo_status | 'new'\|'approved'\|'issue'\|'in_progress'\|'resolved' |
| zone | TEXT | |
| photo_url | TEXT | |
| deadline | DATE | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes**: `idx_photo_records_visit`, `idx_photo_records_status`

#### `invoices`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id |
| title | TEXT | NOT NULL |
| amount | NUMERIC(12,2) | NOT NULL |
| due_date | DATE | |
| payment_url | TEXT | |
| status | invoice_status | 'pending'\|'paid'\|'overdue' |
| issued_at | TIMESTAMPTZ | DEFAULT now() |
| paid_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

#### `visit_reports`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id |
| visit_date | DATE | NOT NULL |
| status | report_status | 'draft'\|'filled'\|'published' |
| general_comment | TEXT | |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | |

**Unique**: `(project_id, visit_date)`

#### `visit_remarks`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| report_id | UUID | FK → visit_reports.id ON DELETE CASCADE |
| project_id | UUID | FK → projects.id |
| number | INTEGER | NOT NULL, DEFAULT 1 |
| text | TEXT | NOT NULL |
| status | remark_status | 'open'\|'in_progress'\|'resolved' |
| deadline | DATE | |
| assigned_to | UUID | FK → profiles.id |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `remark_comments`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| remark_id | UUID | FK → visit_remarks.id ON DELETE CASCADE |
| project_id | UUID | FK → projects.id |
| user_id | UUID | FK → profiles.id |
| text | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### `contractor_tasks`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id |
| remark_id | UUID | FK → visit_remarks.id (nullable) |
| title | TEXT | NOT NULL |
| description | TEXT | |
| photos | TEXT[] | Array of URLs |
| assigned_to | UUID | FK → profiles.id, NOT NULL |
| deadline | DATE | |
| status | task_status | 'open'\|'in_progress'\|'done' |
| completed_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 6.2 Supervision Config (Client-Side)

```typescript
interface SupervisionConfig {
  visitSchedule: {
    type: 'weekly' | 'biweekly' | 'monthly' | 'custom';
    weekday: number | null;       // 0=Mon..5=Sat
    customDay: number | null;     // 1-28
  };
  billingDay: number;             // 1-28
  reminderDays: number;           // working days before billing
  extraVisitCost: number | null;  // rubles
}
```

Currently stored in `localStorage`. Future: migrate to `project_settings` table.

### 6.3 Query Functions

| Function | Signature | Table |
|----------|-----------|-------|
| `fetchProjectVisits` | `(projectId) → VisitWithStats[]` | visits + photo_records |
| `fetchVisit` | `(visitId) → VisitWithStats \| null` | visits |
| `createVisit` | `(input) → Visit` | visits |
| `updateVisit` | `(visitId, updates) → Visit` | visits |
| `deleteVisit` | `(visitId) → void` | visits (cascade → photos) |
| `fetchVisitPhotos` | `(visitId) → PhotoRecord[]` | photo_records |
| `fetchProjectPhotos` | `(projectId) → PhotoRecordWithVisit[]` | photo_records + visits |
| `uploadPhoto` | `(file, projectId, visitId) → string` | storage.photos |
| `createPhotoRecord` | `(input) → PhotoRecord` | photo_records |
| `updatePhotoStatus` | `(id, status) → PhotoRecord` | photo_records |
| `deletePhotoRecord` | `(id) → void` | photo_records |
| `fetchProjectInvoices` | `(projectId) → Invoice[]` | invoices |
| `createInvoice` | `(input) → Invoice` | invoices |
| `updateInvoiceStatus` | `(id, status) → Invoice` | invoices |
| `deleteInvoice` | `(id) → void` | invoices |
| `fetchVisitReports` | `(projectId) → VisitReportWithStats[]` | visit_reports + remarks |
| `fetchVisitReport` | `(reportId) → VisitReport \| null` | visit_reports |
| `createVisitReport` | `(input) → VisitReport` | visit_reports |
| `updateVisitReport` | `(reportId, updates) → VisitReport` | visit_reports |
| `deleteVisitReport` | `(reportId) → void` | visit_reports (cascade → remarks) |
| `ensureTodayDraft` | `(projectId, isScheduledToday) → VisitReport \| null` | visit_reports |
| `fetchVisitRemarks` | `(reportId) → VisitRemarkWithDetails[]` | visit_remarks + comments + profiles |
| `createVisitRemark` | `(input) → VisitRemark` | visit_remarks |
| `updateVisitRemark` | `(remarkId, updates) → VisitRemark` | visit_remarks |
| `deleteVisitRemark` | `(remarkId) → void` | visit_remarks |
| `createRemarkComment` | `(input) → RemarkComment` | remark_comments |
| `fetchContractorTasks` | `(projectId) → ContractorTaskWithDetails[]` | contractor_tasks + profiles + remarks |
| `fetchMyContractorTasks` | `() → ContractorTaskWithDetails[]` | contractor_tasks (assigned_to = me) |
| `createContractorTask` | `(input) → ContractorTask` | contractor_tasks |
| `updateContractorTask` | `(taskId, updates) → ContractorTask` | contractor_tasks |
| `deleteContractorTask` | `(taskId) → void` | contractor_tasks |
| `checkProjectAlerts` | `(projectId) → boolean` | contractor_tasks + visit_remarks |

### 6.4 UI Sub-Components

| Component | Purpose |
|-----------|---------|
| CalendarView | Monthly grid with visit/invoice icons |
| PhotoGallery | Photo grid with status filters |
| ReportsListView | List of visit reports with remark counts |
| ReportDetailView | Single report with remarks, comments, assignees |
| ContractorTasksView | Contractor-facing task list |
| CameraView | Embedded webcam (if `webcam_url` set) |
| SupervisionSettings | Schedule config (weekday, billing day, reminders) |

### 6.5 User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| SUP-1 | Designer creates a visit | Date + title, appears in calendar |
| SUP-2 | Designer uploads photos to visit | Photos linked to visit, visible in gallery |
| SUP-3 | Designer marks photo as issue | Status changes, task can be created |
| SUP-4 | Designer creates visit report | Draft auto-created for scheduled days, manual for others |
| SUP-5 | Designer adds remark to report | Numbered, with optional deadline + assignee |
| SUP-6 | Contractor sees assigned tasks | Filtered view of tasks assigned to them |
| SUP-7 | Contractor marks task done | Status → done, completed_at set |
| SUP-8 | Client views published reports | Only reports with status 'published' visible |
| SUP-9 | Client comments on remark | Comment added, visible to all |
| SUP-10 | Designer creates invoice | Amount + due date, visible in calendar |
| SUP-11 | Designer configures visit schedule | Weekly/biweekly/monthly, icons appear in calendar |
| SUP-12 | Designer assigns remark to contractor | Creates contractor_task linked to remark |

### 6.6 Edge Cases

| Case | Handling |
|------|----------|
| Two reports for same date | UNIQUE constraint `(project_id, visit_date)` prevents duplicates |
| `ensureTodayDraft` called twice | Checks existing draft first, returns it if found |
| Delete visit with photos | FK CASCADE deletes photo_records |
| Delete report with remarks | FK CASCADE deletes remarks → cascade deletes comments |
| Photo without visit (orphan) | Not possible — visit_id is required FK |
| Invoice overdue detection | Computed at query time: `due_date < now() AND status != 'paid'` |
| Webcam URL invalid | CameraView shows error state |
| Contractor task without remark | Allowed — `remark_id` is nullable |
| Client tries to create visit | `canCreateVisit: false` hides UI |
| Remark assigned to non-member | UI only shows project members in dropdown |

---

## 7. Module 5 — Supply (Комплектация)

### 7.1 Tables

#### `stages`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id |
| name | TEXT | NOT NULL |
| start_date | DATE | |
| end_date | DATE | |
| sort_order | INTEGER | DEFAULT 0 |
| status | stage_status | 'pending'\|'in_progress'\|'done' |
| created_at | TIMESTAMPTZ | |

#### `supply_items`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id |
| target_stage_id | UUID | FK → stages.id (nullable) |
| name | TEXT | NOT NULL |
| category | TEXT | |
| status | supply_status | 'pending'\|'approved'\|'in_review'\|'ordered'\|'in_production'\|'delivered' |
| lead_time_days | INTEGER | DEFAULT 0 |
| quantity | NUMERIC(10,2) | DEFAULT 1 |
| supplier | TEXT | |
| budget | NUMERIC(12,2) | DEFAULT 0 |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `contract_payments`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id |
| type | payment_type | 'supervision'\|'design'\|'supply_commission' |
| amount | NUMERIC(12,2) | NOT NULL |
| period | payment_period | 'one_time'\|'monthly' (nullable) |
| status | payment_status | 'pending'\|'paid'\|'partial' |
| next_due | DATE | |
| created_at | TIMESTAMPTZ | |

### 7.2 Computed Fields (Pure Function)

```typescript
calcSupplyItem(item: SupplyItem, stages: Stage[]): SupplyItemWithCalc

// Computed:
orderDeadline   = stage.start_date - lead_time_days   // when to order
deliveryForecast = today + lead_time_days              // when it arrives if ordered now
daysUntilDeadline = orderDeadline - today              // negative = overdue
riskCalc:
  daysUntilDeadline <= 0         → 'critical'
  daysUntilDeadline <= 7         → 'high'
  daysUntilDeadline <= 21        → 'medium'
  else                           → 'low'
```

### 7.3 Query Functions

| Function | Signature | Table |
|----------|-----------|-------|
| `fetchProjectStages` | `(projectId) → Stage[]` | stages (ordered by sort_order) |
| `fetchProjectSupplyItems` | `(projectId) → SupplyItem[]` | supply_items |
| `createSupplyItem` | `(input) → SupplyItem` | supply_items |
| `createSupplyItems` | `(items[]) → SupplyItem[]` | supply_items (batch) |
| `updateSupplyItemStatus` | `(id, status) → SupplyItem` | supply_items |
| `calcSupplyItem` | `(item, stages) → SupplyItemWithCalc` | pure function (no DB) |

### 7.4 UI Sub-Components

| Component | Purpose |
|-----------|---------|
| SupplyDashboard | Overview cards: total items, risk summary, budget |
| SupplyTimeline | Gantt-style timeline (stages + item deadlines) |
| SupplyStages | Stage CRUD (name, dates, sort order) |
| SupplySpec | Item detail/editor |
| SupplyImport | Excel upload → parse → batch create |
| SupplySettings | Project discount, budget config |

### 7.5 Risk Levels (Visual)

| Level | Condition | UI |
|-------|-----------|-----|
| critical | `daysUntilDeadline <= 0` | Dark bg (#111827), white text |
| high | `daysUntilDeadline <= 7` | Dark gray bg (#374151), white text |
| medium | `daysUntilDeadline <= 21` | Light gray bg, dark text |
| low | `daysUntilDeadline > 21` | Light gray bg, muted text |

### 7.6 User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| SUP-1 | Designer creates construction stages | Name + dates + sort order |
| SUP-2 | Designer adds supply item linked to stage | orderDeadline auto-calculated |
| SUP-3 | Designer imports items from Excel | File parsed, items batch-created |
| SUP-4 | Designer views risk dashboard | Items grouped by risk level |
| SUP-5 | Designer updates item status | 6-step pipeline: pending → delivered |
| SUP-6 | Supplier views supply items | Read-only access to supply tab |
| SUP-7 | Supplier imports items | Only if `access_level === 'view_supply'` |

### 7.7 Edge Cases

| Case | Handling |
|------|----------|
| Item without stage link | `target_stage_id` nullable; no deadline calculated → risk = 'low' |
| Stage date changed | Client re-computes `orderDeadline` on next render |
| Stage deleted with linked items | Items retain `target_stage_id` (now dangling); UI shows "Этап не найден" |
| Excel import with invalid rows | Skipped with warning; valid rows imported |
| Budget = 0 | Displayed as "—"; does not affect risk calc |
| supply_discount on project | Applied in UI display only; not stored per-item |

---

## 8. Module 6 — Chat

### 8.1 Tables

#### `chat_messages`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id |
| user_id | UUID | FK → auth.users.id |
| text | TEXT | NOT NULL |
| chat_type | TEXT | 'team'\|'client' (DEFAULT 'team') |
| ref_type | TEXT | 'remark'\|'report'\|'task' (nullable) |
| ref_id | UUID | (nullable) |
| ref_preview | TEXT | (nullable) |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | |

#### `chat_reads`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id |
| user_id | UUID | FK → auth.users.id |
| chat_type | TEXT | 'team'\|'client' |
| last_read_at | TIMESTAMPTZ | DEFAULT now() |

**Unique**: `(project_id, user_id, chat_type)`

### 8.2 Chat Architecture

Two separate chat rooms per project:

| Room | Participants | RLS |
|------|-------------|-----|
| **team** | Owner + team members | `chat_owner_select`, `chat_team_select` |
| **client** | Owner + team + client | All three SELECT policies (owner sees everything) |

**Client sees only `chat_type = 'client'`** messages. Owner and team see both.

### 8.3 Real-Time

Supabase `postgres_changes` subscription on `chat_messages` table. RLS ensures users only receive events for rows they can SELECT.

### 8.4 Query Functions

| Function | Signature | Table |
|----------|-----------|-------|
| `fetchChatMessages` | `(projectId, limit, before?, chatType?) → ChatMessageWithAuthor[]` | chat_messages + profiles |
| `sendChatMessage` | `(input, userId) → ChatMessage` | chat_messages |
| `deleteChatMessage` | `(messageId) → void` | chat_messages |
| `updateChatMessage` | `(messageId, text) → void` | chat_messages |
| `fetchChatRead` | `(projectId, userId, chatType) → string \| null` | chat_reads |
| `markChatRead` | `(projectId, userId, chatType) → void` | chat_reads (upsert) |
| `fetchUnreadCounts` | `(projectIds[], userId) → Map<id, count>` | chat_messages + chat_reads |
| `fetchUnreadCountByType` | `(projectId, userId, chatType) → number` | chat_messages + chat_reads |

### 8.5 Message References

Messages can link to other entities:

```typescript
ref_type: 'remark' | 'report' | 'task'
ref_id: UUID                    // linked entity ID
ref_preview: string             // displayed text preview
```

### 8.6 User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| CHAT-1 | Designer sends team message | Visible to owner + team members |
| CHAT-2 | Designer switches to client chat | Messages sent with `chat_type = 'client'` |
| CHAT-3 | Client sees only client chat tab | No "Команда" tab; only "С заказчиком" |
| CHAT-4 | Client sends message | `chat_type = 'client'`, visible to owner + team |
| CHAT-5 | Designer shares remark in chat | Message with `ref_type = 'remark'`, preview shown |
| CHAT-6 | Unread count shown on project card | Badge with count per chat type |
| CHAT-7 | Messages arrive in real-time | Supabase subscription, auto-scroll to new |

### 8.7 Edge Cases

| Case | Handling |
|------|----------|
| Client tries to send to team chat | RLS `chat_client_insert` blocks (chat_type must be 'client') |
| User removed from project | Loses RLS access; existing messages remain |
| Referenced entity deleted | Message still shows `ref_preview` text |
| Empty chat | Shows empty state: "Начните обсуждение" |
| Rapid message sending | No client-side debounce; Supabase handles |
| Role detection for tab visibility | Uses `member_role` from project_members, fallback to `profile.role` |
| Offline message sending | Fails silently; no offline queue |

---

## 9. Module 7 — Settings & Access Control

### 9.1 Tables

#### `project_members`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id |
| user_id | UUID | FK → profiles.id (nullable for pending) |
| role | user_role | Profile-level role |
| member_role | member_role | 'team'\|'client'\|'contractor' (nullable) |
| access_level | access_level | 'view'\|'view_comment'\|'view_comment_photo'\|'view_supply'\|'full' |
| status | member_status | 'pending'\|'active' |
| invite_token | TEXT | UNIQUE (nullable) |
| invite_email | TEXT | For pending invites |
| invited_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `project_access_settings`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id, UNIQUE |
| client_can_see_design | BOOLEAN | DEFAULT false |
| client_can_see_furnishing | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 9.2 Invite Flow (RBAC)

1. Designer opens Settings → Access → "Пригласить"
2. Enters email, selects `member_role` (team/client/contractor)
3. `createRbacInvite()`:
   - Generates `invite_token` (base64-encoded)
   - Creates `project_members` row with `status: 'pending'`
   - Constructs invite URL: `https://archflow.ru/invite/{token}`
4. Invite email sent via `/api/invite/send` (fire-and-forget)
5. Recipient clicks link → `/invite/:token` route
6. If logged in: `acceptRbacInvite(token)` → sets `status: 'active'`, links `user_id`
7. If not logged in: Login page with invite hint → accept after login

### 9.3 Query Functions

| Function | Signature | Table |
|----------|-----------|-------|
| `fetchRbacMembers` | `(projectId) → RbacMemberWithProfile[]` | project_members + profiles |
| `createRbacInvite` | `(projectId, memberRole, email) → RbacMember` | project_members |
| `acceptRbacInvite` | `(token) → { project_id, role }` | project_members (RPC) |
| `removeRbacMember` | `(memberId) → void` | project_members |
| `fetchAccessSettings` | `(projectId) → ProjectAccessSettings \| null` | project_access_settings |
| `upsertAccessSettings` | `(projectId, settings) → ProjectAccessSettings` | project_access_settings |

### 9.4 User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| ACC-1 | Designer invites client by email | Invite created, email sent, link works |
| ACC-2 | Client accepts invite link | Added to project with 'client' role |
| ACC-3 | Designer removes member | Member deleted, loses access |
| ACC-4 | Designer toggles client design access | `client_can_see_design` updated |
| ACC-5 | Designer edits project settings | Title, address, scenario, webcam URL |

### 9.5 Edge Cases

| Case | Handling |
|------|----------|
| Invite link used twice | `acceptRbacInvite` checks `status = 'pending'`; rejects if already active |
| Invite email already has account | Links existing user_id |
| Invite email is new user | Creates pending; links after registration |
| Remove yourself from project | UI should prevent; not enforced in DB |
| Project owner removed | Not possible — owner is in `projects.owner_id`, not in members |
| Duplicate invite for same email | Creates new row; old pending invite becomes stale |

---

## 10. Module 8 — Feedback & Notifications

### 10.1 Feedback System

**UI**: Fixed bottom bar (40px, bg `#111`, text white, IBM Plex Mono) on all screens except login.

**Flow**:
1. User clicks "Что-то не так?"
2. Modal opens with text input + optional screenshot
3. Screenshot uploaded to `feedback-screenshots` bucket (public)
4. POST `/api/feedback` → Telegram bot message

**API**: POST `/api/feedback`
```typescript
Body: { text: string, userEmail?: string, userName?: string, imageUrl?: string }
Response: { ok: true, delivery: 'telegram' | 'logged' | 'telegram_error' }
```

### 10.2 Notifications (Computed)

No separate DB table. Generated at query time from:

| Source | Notification Type |
|--------|------------------|
| `photo_records` with `status = 'issue'` | issue |
| `photo_records` with `status = 'resolved'` | resolved |
| `invoices` with `due_date < now() AND status != 'paid'` | invoice_overdue |
| `invoices` (recent) | invoice_new |
| `visits` (recent) | visit |
| `supply_items` with critical risk | supply_risk |

Limit: 30 notifications, sorted by recency.

### 10.3 Push Subscriptions (Stub)

#### `push_subscriptions`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users.id |
| endpoint | TEXT | NOT NULL |
| p256dh | TEXT | NOT NULL |
| auth_key | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | |

**Unique**: `(user_id, endpoint)`

Not fully implemented. API route `/api/push/send` exists as stub.

---

## 11. Module 9 — Search

### 11.1 Global Search (Cmd+K)

`globalSearch(query: string) → SearchResult[]`

Searches across tables:

| Table | Searched Fields | Result Type |
|-------|----------------|-------------|
| projects | title, address | project |
| visits | title | visit |
| documents | title | document |
| supply_items | name, supplier | supply |
| tasks | title | task |

All searches use `ilike` with `%query%`.

### 11.2 Activity Feed

`fetchActivityFeed(limit: number) → ActivityItem[]`

Recent activity across all user's projects with color-coded items.

---

## 12. Module 10 — PWA & Offline

### 12.1 Service Worker (`public/sw.js`)

| Strategy | Scope |
|----------|-------|
| Cache-first | Static assets (JS, CSS, fonts, images) |
| Network-first | API calls (with cache fallback) |

### 12.2 Manifest (`public/manifest.json`)

- Name: ArchFlow
- Start URL: /
- Display: standalone
- Theme color: #111111
- Background color: #FFFFFF

### 12.3 Install Hints

Onboarding slide 7 detects platform:
- iOS: "Safari → Share → Add to Home Screen"
- Android: "Chrome → Menu → Add to Home Screen"

---

## 13. RBAC Matrix

### Permission Flags by Role

| Permission | designer | assistant | client | contractor | supplier |
|------------|----------|-----------|--------|------------|----------|
| canViewDesign | true | true* | true | true | false |
| canViewSupervision | true | true* | true | true | false |
| canViewOverview | true | true* | true | true | false |
| canViewJournal | true | true* | true | false | false |
| canViewVisits | true | true* | true | true | false |
| canViewSupply | true | true* | false | false | true |
| canViewDocs | true | true* | true | true | false |
| canViewSettings | true | true* | false | false | false |
| canCreateProject | true | true* | false | false | false |
| canCreateVisit | true | true* | false | false | false |
| canCreateInvoice | true | true* | false | false | false |
| canUploadPhoto | true | true* | false | **if view_comment_photo** | false |
| canChangePhotoStatus | true | true* | false | false | false |
| canUploadDocument | true | true* | false | false | false |
| canInviteMembers | true | true* | false | false | false |
| canEditProjectSettings | true | true* | false | false | false |
| canDeleteProject | true | **false** | false | false | false |
| canImportSupply | true | true* | false | false | **if view_supply** |
| canManageTasks | true | true* | false | false | false |

`*` = with `access_level: 'full'` (default for assistant). If limited, follows access_level rules.

### Access Levels

| Level | Description |
|-------|-------------|
| `view` | Read-only |
| `view_comment` | Read + comment on photos |
| `view_comment_photo` | Read + comment + upload photos |
| `view_supply` | Supply section read + import |
| `full` | Full access (except delete for non-designer) |

---

## 14. Database Schema

### All Enums (PostgreSQL)

```sql
CREATE TYPE user_role AS ENUM ('designer','client','contractor','supplier','assistant');
CREATE TYPE project_status AS ENUM ('active','completed','archived');
CREATE TYPE scenario_type AS ENUM ('block','gkl');
CREATE TYPE visit_status AS ENUM ('planned','approved','issues_found');
CREATE TYPE photo_status AS ENUM ('new','approved','issue','in_progress','resolved');
CREATE TYPE invoice_status AS ENUM ('pending','paid','overdue');
CREATE TYPE document_status AS ENUM ('draft','in_review','approved');
CREATE TYPE document_format AS ENUM ('PDF','DWG','XLSX','PNG');
CREATE TYPE supply_status AS ENUM ('pending','approved','in_review','ordered','in_production','delivered');
CREATE TYPE stage_status AS ENUM ('pending','in_progress','done');
CREATE TYPE access_level AS ENUM ('view','view_comment','view_comment_photo','view_supply','full');
CREATE TYPE payment_type AS ENUM ('supervision','design','supply_commission');
CREATE TYPE payment_period AS ENUM ('one_time','monthly');
CREATE TYPE payment_status AS ENUM ('pending','paid','partial');
CREATE TYPE task_status AS ENUM ('open','in_progress','done');
CREATE TYPE member_role AS ENUM ('team','client','contractor');
CREATE TYPE member_status AS ENUM ('pending','active');
CREATE TYPE report_status AS ENUM ('draft','filled','published');
CREATE TYPE remark_status AS ENUM ('open','in_progress','resolved');
```

### Key Indexes

```sql
idx_stages_project          ON stages(project_id)
idx_stages_sort             ON stages(project_id, sort_order)
idx_photo_records_visit     ON photo_records(visit_id)
idx_photo_records_status    ON photo_records(status)
idx_supply_items_project    ON supply_items(project_id)
idx_supply_items_stage      ON supply_items(target_stage_id)
idx_documents_project       ON documents(project_id)
idx_design_files_project    ON design_files(project_id)
idx_design_files_folder     ON design_files(project_id, folder)
idx_design_file_comments_file ON design_file_comments(file_id)
idx_chat_messages_project   ON chat_messages(project_id)
idx_chat_messages_user      ON chat_messages(user_id)
idx_visit_remarks_report    ON visit_remarks(report_id)
idx_visit_remarks_assigned  ON visit_remarks(assigned_to)
idx_contractor_tasks_assigned ON contractor_tasks(assigned_to)
idx_contractor_tasks_status ON contractor_tasks(status)
idx_pm_invite_token         ON project_members(invite_token) UNIQUE
idx_pm_invite_email         ON project_members(invite_email)
```

### Key Functions

```sql
get_user_project_ids() RETURNS SETOF UUID
  -- Returns union of: projects.id WHERE owner_id = auth.uid()
  -- UNION project_members.project_id WHERE user_id = auth.uid()

accept_rbac_invite(p_token TEXT) RETURNS JSON
  -- Validates token, sets user_id = auth.uid(), status = 'active'
  -- Returns { project_id, role, member_role }
```

### Migration History

| # | File | Purpose |
|---|------|---------|
| 001 | initial_schema.sql | Core tables: profiles, projects, visits, photos, stages, supply |
| 002 | indexes_and_rls.sql | Performance indexes + RLS policies |
| 003 | members_invites.sql | project_members, invitations, get_user_project_ids() |
| 004 | contract_payments.sql | contract_payments table |
| 005 | documents_category.sql | document_category enum + column |
| 006 | tasks.sql | tasks table |
| 007 | supply_enhancements.sql | supply_status enum expansion |
| 008 | photo_deadline.sql | deadline column on photo_records |
| 009 | design_files.sql | design_files + design_file_comments |
| 010 | project_settings.sql | project_access_settings table |
| 011 | storage_policies.sql | Storage bucket RLS |
| 012 | rbac_schema.sql | member_role, member_status, invite_token, invite_email |
| 013 | visit_reports.sql | visit_reports, visit_remarks, remark_comments |
| 014 | contractor_tasks.sql | contractor_tasks table |
| 015 | chat_messages.sql | chat_messages, chat_reads |
| 016 | chat_dual_rooms.sql | chat_type column, separate room policies |
| 017 | push_subscriptions.sql | push_subscriptions table |
| 018 | accept_rbac_invite.sql | accept_rbac_invite() RPC function |
| 019 | feedback_bucket_public.sql | feedback-screenshots bucket public |
| 020 | design_folders_update.sql | 6 folders + migrate concept → design_project |
| 021 | chat_rls_fix.sql | Clean owner/team/client chat policies |

---

## 15. API Routes

| Method | Path | Auth | Body | Purpose |
|--------|------|------|------|---------|
| POST | `/api/auth/signup` | Public | `{ email, password, full_name, role }` | Server-side user creation (service_role) |
| POST | `/api/feedback` | Public | `{ text, userEmail?, userName?, imageUrl? }` | Send feedback to Telegram |
| POST | `/api/invite/send` | Authenticated | `{ email, projectName, inviteUrl }` | Send invite email via Resend |
| POST | `/api/push/send` | Authenticated | `{ userId, title, body }` | Push notification (stub) |

---

## 16. RLS Policies

### chat_messages (21_chat_rls_fix.sql)

| Policy | Operation | Rule |
|--------|-----------|------|
| chat_owner_select | SELECT | `project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())` |
| chat_team_select | SELECT | `project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid() AND pm.status = 'active' AND pm.member_role = 'team')` |
| chat_client_select | SELECT | `chat_type = 'client' AND project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid() AND pm.status = 'active' AND pm.member_role = 'client')` |
| chat_owner_insert | INSERT | `user_id = auth.uid() AND project_id IN (owner's projects)` |
| chat_team_insert | INSERT | `user_id = auth.uid() AND project_id IN (team member projects)` |
| chat_client_insert | INSERT | `user_id = auth.uid() AND chat_type = 'client' AND project_id IN (client member projects)` |

### General Pattern (most tables)

| Policy | Rule |
|--------|------|
| Owner SELECT | `project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())` |
| Member SELECT | `project_id IN (SELECT get_user_project_ids())` |
| Owner INSERT/UPDATE/DELETE | `project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())` |

---

## 17. Storage Buckets

| Bucket | Public | Path Pattern | Policies |
|--------|--------|-------------|----------|
| `photos` | No | `{projectId}/{visitId}/{uuid}.ext` | Members read; owner/uploader write |
| `documents` | No | `{projectId}/{uuid}.ext` | Members read; owner write |
| `avatars` | Yes | `{userId}/avatar.ext` | Owner write; anyone read |
| `design-files` | No | `{projectId}/{folder}/{uuid}.ext` | Team read/write; members read |
| `feedback-screenshots` | Yes | `feedback/{uuid}.ext` | Anyone read; authenticated write |

---

## 18. Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase instance URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin operations (signup, migrations) |
| `RESEND_API_KEY` | Server only | Transactional email |
| `TELEGRAM_BOT_TOKEN` | Server only | Feedback bot |
| `TELEGRAM_CHAT_ID` | Server only | Feedback destination chat |
| `NEXT_PUBLIC_YM_ID` | Client | Yandex Metrika counter |

---

## 19. Design System Reference

### Typography

| Use | Font | Weight | Example Classes |
|-----|------|--------|-----------------|
| Headings | Playfair Display | 700 | `font-display` |
| UI / Labels / Body | IBM Plex Mono | 400 | `font-body`, `font-mono` |

### Colors

| Token | Hex | CSS Variable | Usage |
|-------|-----|-------------|-------|
| af-black | #111111 | `--ink` (RGB) | Text, inverted backgrounds |
| af-offwhite | #F6F6F4 | `--srf` (RGB) | Page backgrounds |
| af-border | #EBEBEB | `--line` (RGB) | Borders, dividers |
| af-white | #FFFFFF | | Card backgrounds |

### Immutable Rules

- `border-radius: 0` — no exceptions
- Block gaps: `2px`
- Hover: color inversion (white ↔ #111)
- Buttons: ghost (border + transparent bg), invert on hover
- No color accents, no shadows
- CSS classes prefixed with `.af-`
- Dark mode: `.dark` class on `<html>`, CSS variables swap

### Minimum Font Sizes (Mobile)

| Element | Min Size |
|---------|----------|
| Main titles (h1/h2) | 28px |
| Body text | 13px |
| Labels (uppercase) | 9px |
| Project card names | 22px |

---

## 20. Known Limitations & Future Work

| Area | Current State | Future |
|------|--------------|--------|
| Tests | No test framework | Add Vitest + Playwright |
| CI/CD | No pipeline | GitHub Actions |
| Push notifications | Stub only | Web Push API implementation |
| Supervision config | localStorage | Migrate to DB table |
| Admin panel | Not implemented | User management, analytics |
| Bulk operations | Supply import only | Batch delete/update UI |
| File versioning | Single version per upload | Version history |
| Audit log | Not implemented | Track all mutations |
| i18n | Russian only | Add English |
| Offline mutations | Not supported | IndexedDB queue |
| Search | Client-side `ilike` | Full-text search (PostgreSQL `tsvector`) |

---

*End of specification. Update after each significant feature addition or schema change.*
