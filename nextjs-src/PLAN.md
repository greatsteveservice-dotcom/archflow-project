# Plan: Role-Based Access System

## Current State Analysis

The codebase ALREADY has:
- `project_members` table with `user_id`, `role` (user_role enum), `access_level` (access_level enum)
- `project_invitations` table with tokens, `accept_project_invitation` RPC function
- `usePermissions` hook in `permissions.ts` that resolves 20 permission flags based on role + access_level
- `SettingsTab.tsx` with full invite UI (email + link), member list, role templates
- Invite token handling in `page.tsx` via `?invite=` query param
- RLS policies on all tables (owner + project member access)
- Existing roles: designer, client, contractor, supplier, assistant

## What Needs to Change (Frontend-Only Approach)

Since we can't run SQL migrations (no psql/CLI access), we use the EXISTING DB schema + tables.
We map the spec's 4 roles to existing DB roles:
- **Дизайнер** = `designer` (project owner via `projects.owner_id`)
- **Команда** = `assistant` (existing role, full access minus delete/manage)
- **Заказчик** = `client` (existing role)
- **Подрядчик** = `contractor` (existing role)

No new tables needed — `project_access_settings` can be stored in localStorage alongside supervision config (same pattern), pending DB column.

## Implementation Steps

### Step 1: Update `permissions.ts`
- Refine `resolvePermissions()` to match the spec exactly:
  - `assistant` (Команда): full UI minus canDeleteProject, canInviteMembers, canViewSettings supervisorSettings
  - `client` (Заказчик): canViewSupervision=true, canViewDesign/canViewSupply=conditional (from access settings), read-only everything
  - `contractor` (Подрядчик): only canManageTasks (mark own as done), nothing else
- Add new permission flags: `canViewSupervisionSettings`, `canViewFinancials`, `isContractorView`
- Add `useProjectRole()` utility hook that returns the mapped role for current user in a project

### Step 2: Update `ProjectPage.tsx` — role-aware section visibility
- For Заказчик: show/hide Дизайн and Комплектация based on access settings
- For Заказчик: hide Settings block
- For Команда: hide Settings block (they can't manage access or settings)
- For Подрядчик: this user never reaches ProjectPage (separate view)
- Hide "Ред." title edit button for non-designers

### Step 3: Update `SupervisionTab.tsx` — hide settings row for non-designers
- Hide "Настройки надзора" row for Команда and Заказчик
- Заказчик: pass `canCreateVisit=false`, `canManageTasks=false` etc.
- All permissions already flow through props from ProjectPage

### Step 4: Create `AccessScreen.tsx` — new "Доступ" screen
- Add as a row in SettingsTab OR as a standalone route in SupervisionTab's parent
- Actually: Add "Доступ" as a new sub-tab row in SettingsTab with editorial styling
- Three sections: Команда, Заказчик, Подрядчик
- Each section: member list + "+ Добавить" inline form
- Заказчик section: two toggle rows for client_can_see_design / client_can_see_furnishing
- Uses existing `inviteProjectMember`, `removeProjectMember` queries

### Step 5: Create `ContractorView.tsx` — flat task list for contractors
- New top-level component rendered in `page.tsx` when user's profile.role === 'contractor'
- Fetches tasks across all projects where user is a member
- Task list with: project name, task title, deadline, status chip
- Tap → task detail with "Отметить выполненной →" button
- No project navigation, no sections, no sidebar

### Step 6: Update `page.tsx` — role-based routing
- After auth, check `profile.role`:
  - `contractor` → render ContractorView (flat task list)
  - `client` → render projects list (filtered to their projects via RLS)
  - everyone else → existing flow
- For client: hide "Проекты" breadcrumb link if they have only 1 project
- Navigation guard: if user tries to access a project they don't have access to → "Нет доступа" screen

### Step 7: Create `NoAccess.tsx` — access denied screen
- Playfair Display 900 48px "—"
- IBM Plex Mono 9px uppercase #CCC "Нет доступа"
- IBM Plex Mono 9px uppercase #111 "← На главную"

### Step 8: Access settings storage
- localStorage key `archflow:access_settings:{projectId}` stores `{ clientCanSeeDesign, clientCanSeeFurnishing }`
- Same pattern as supervision config
- Load in permissions hook to adjust client visibility

## Files to Create/Modify

**Create:**
- `src/app/components/ContractorView.tsx` — contractor task list
- `src/app/components/NoAccess.tsx` — access denied screen
- `src/app/components/project/AccessScreen.tsx` — "Доступ" management screen

**Modify:**
- `src/app/lib/permissions.ts` — refined role resolution + new flags
- `src/app/lib/types.ts` — add new permission flags
- `src/app/lib/queries.ts` — add access settings load/save, fetchAllUserTasks
- `src/app/lib/hooks.ts` — add useAllUserTasks hook
- `src/app/page.tsx` — contractor routing, nav guard
- `src/app/components/ProjectPage.tsx` — role-aware section visibility
- `src/app/components/project/SupervisionTab.tsx` — hide settings for non-designers
- `src/app/components/project/SettingsTab.tsx` — add "Доступ" row or integrate AccessScreen

## Build Order
1. Types + permissions (foundation)
2. AccessScreen + access settings storage
3. ContractorView + queries
4. NoAccess screen
5. page.tsx routing updates
6. ProjectPage + SupervisionTab permission wiring
7. Build + deploy
