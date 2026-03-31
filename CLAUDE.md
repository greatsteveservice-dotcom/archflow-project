# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Operating Mode

- Act autonomously. No confirmations needed for file edits, dependency installs, refactoring under 300 lines.
- Make technical decisions yourself. Only ask if it's a product-level choice (one question max).
- After completing a task, write a brief summary (2-3 lines).
- Update PROJECT_CONTEXT.md after significant changes.

## Commands

All commands run from `nextjs-src/`:

```bash
cd nextjs-src
npm run dev      # Dev server on port 3000
npm run build    # Production build
npm run lint     # ESLint via Next.js
npm start        # Production server
```

No test framework is configured. No CI pipeline exists.

Deploy: Netlify auto-deploy from GitHub (configured in `netlify.toml`). Domain: archflow.ru.

## Architecture

**SPA with client-side routing** — single entry point at `nextjs-src/src/app/page.tsx`. All navigation is state-driven (`useState` + `window.history`), not Next.js file-based routing. The App Router is used only for API routes and the root layout.

### Key directories (all under `nextjs-src/src/app/`)

- `lib/` — data layer: queries, hooks, types, auth, permissions, theme, supabase client
- `components/` — ~50 React components
- `components/project/` — project-level tabs (DesignTab, SupervisionTab, SettingsTab, ChatView, AccessScreen)
- `components/supervision/` — supervision module (CalendarView, PhotoGallery, ReportsListView, ContractorTasksView, etc.)
- `components/supply/` — supply chain module (SupplyModule, SupplyDashboard, SupplyTimeline, SupplyStages, SupplyImport)
- `api/` — server routes: auth/signup, feedback (→ Telegram), push/send

### Data layer pattern

1. **`queries.ts`** (~70KB) — all Supabase query functions, organized by domain. Single source of truth for data access.
2. **`hooks.ts`** (~19KB) — 22 custom hooks wrapping queries via generic `useQuery<T>()`. Each returns `{ data, loading, error, refetch }`.
3. **`types.ts`** — TypeScript interfaces matching the Supabase schema exactly. Includes row types, input types, and enriched view types (e.g., `ProjectWithStats`, `SupplyItemWithCalc`).
4. **`auth.tsx`** — `AuthProvider` context: session, profile, signIn/signUp/signOut. Uses Supabase Auth (email/password).
5. **`permissions.ts`** — `resolvePermissions(role, accessLevel)` → 19 boolean flags. Checked at render time to show/hide UI.
6. **`theme.tsx`** — `ThemeProvider` for light/dark mode via `.dark` class on `<html>`.

Real-time: Supabase `postgres_changes` subscriptions auto-refetch hooks.

### Database

Supabase on Beget Cloud. 15 migrations in `nextjs-src/supabase/migrations/`. Core tables: `profiles`, `projects`, `project_members`, `stages`, `visits`, `photo_records`, `invoices`, `documents`, `supply_items`, `contract_payments`, `tasks`, `rbac_members`, `visit_reports`, `visit_remarks`, `chat_messages`.

### Component hierarchy

```
page.tsx (SPA shell, routing state)
  ├── AuthProvider → ThemeProvider
  ├── Topbar / Sidebar
  ├── ProjectsPage | ProjectPage | VisitPage | ProfilePage
  ├── SearchModal (⌘K)
  ├── FeedbackBar (fixed bottom)
  └── Toast / OfflineBanner
```

### PWA

Service Worker (`public/sw.js`): cache-first for static assets, network-first for API. Manifest at `public/manifest.json`.

## Design System — STRICT

### Fonts (Google Fonts)
- **Playfair Display 700** — all headings (`font-display` in Tailwind)
- **IBM Plex Mono 400** — all labels, UI text, body (`font-body` / `font-mono`)

### Colors — ONLY these
| Token | Hex | Usage |
|-------|-----|-------|
| `--af-black` | `#111111` | Primary text, inverted backgrounds |
| `--af-offwhite` | `#F6F6F4` | Page backgrounds |
| `--af-border` | `#EBEBEB` | Borders, dividers |
| `--af-white` | `#FFFFFF` | Card backgrounds |

Dark mode uses CSS variables (`--ink`, `--srf`, `--line` in RGB format) that swap in `.dark` class.

### Rules
- `border-radius: 0` everywhere — no exceptions
- Block gaps: `2px`
- Hover: color inversion (white bg → `#111`, dark text → white)
- Buttons: ghost style (border + transparent bg), invert on hover
- No color accents, no shadows
- CSS classes prefixed with `.af-` (see `globals.css`, 778 lines)

## Do NOT change without explicit instruction

- Font pair (Playfair Display + IBM Plex Mono)
- Color palette (monochrome only)
- `border-radius` (always 0)
- Navigation structure
- Role/permission logic

## Navigation Structure

```
/login
/projects                        — project list
/projects/:id                    — section picker (4 blocks)
/projects/:id/design             — Design (tabs inside)
/projects/:id/supply             — Supply (items, timeline, stages, import)
/projects/:id/journal            — Supervision (visits, invoices, planning)
/projects/:id/settings           — Project settings
```

## Roles

5 roles: `designer` (full access), `client` (view only), `contractor` (view + photos + comments), `supplier` (supply only), `assistant` (delegated). Invite via invite-links with base64 tokens.

## Feedback Bar

Fixed bottom bar on all screens except login: "Что-то не так?" → feedback form. Height 40px, bg `#111111`, text white, IBM Plex Mono.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL     — Supabase instance URL
NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase public anon key
NEXT_PUBLIC_YM_ID            — Yandex Metrika ID
RESEND_API_KEY               — Email service (Resend)
TELEGRAM_BOT_TOKEN           — Feedback bot token
TELEGRAM_CHAT_ID             — Feedback chat ID
```

## Demo Credentials

```
designer: demo@archflow.ru / oDEgaa9rsAJD&ocw
```
