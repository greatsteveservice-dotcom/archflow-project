# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Operating Mode

- Act autonomously. No confirmations needed for file edits, dependency installs, refactoring under 300 lines.
- But match the scope of the request: a one-screen bug fix is NOT a 44-file mass sed. Large refactors (>10 files) — build locally first, never push a broken build.
- Make technical decisions yourself. Only ask if it's a product-level choice (one question max).
- If the user said "да"/"погнали"/"действуй" in reply to a proposal — execute immediately, don't re-ask.
- Don't announce "готово" until independently verified: `curl -I` the URL, check HTTP code, check new BUILD_ID / SW_VERSION served.
- After completing a task, write a brief summary (2-3 lines). No tables, no multi-section reports.
- Update MEMORY.md (`~/.claude/projects/-Users-evgeny-Desktop-archflow-project/memory/MEMORY.md`) after significant changes. There is no PROJECT_CONTEXT.md.

## Commands

All commands run from `nextjs-src/`:

```bash
cd nextjs-src
npm run dev      # Dev server on port 3000
npm run build    # Production build (run before every deploy)
npm run lint     # ESLint via Next.js (may hang interactively — prefer build)
npm start        # Production server
```

No test framework is configured.

## Deploy

Production is **VPS**, not Netlify. Two paths:

1. **CI (primary):** `git push origin main` — GitHub Actions `.github/workflows/deploy.yml` builds, rsyncs to `archflow@212.67.10.6:/home/archflow/releases/<TS>/`, runs `bash /home/archflow/deploy.sh <TS>` (swap symlink → `sudo -n systemctl restart archflow`), smoke-tests `https://archflow.ru/login`.
2. **Manual:** `cd nextjs-src && bash scripts/deploy.sh` (same pipeline from local).

### VPS facts
- App VPS: `212.67.10.6` (SSH: `archflow@212.67.10.6 -i ~/.ssh/archflow_ed25519`).
- Releases: `/home/archflow/releases/`, active via symlink `/home/archflow/app`.
- Persistent env: `/home/archflow/.env.production` — NOT copied by rsync, edited once on server.
- systemd: `sudo -n systemctl restart archflow` (passwordless), `Restart=always`. Never `nohup node`.
- nginx: static (`/_next/static/`, `sw.js`, `manifest.json`, icons, favicon) served directly, bypassing Node. Proxy to `:3000` for everything else.
- Monitoring: `/home/archflow/scripts/healthcheck.sh` every 3 min (Telegram alerts + auto-restart). DB backup: `/home/archflow/scripts/backup-rest.sh` daily at 03:00.
- Domain CDN: archflow.ru via Cloudflare (RU-friendly).

### CI gotchas
- Build step only gets `NEXT_PUBLIC_*` secrets. **Never instantiate clients at module top-level** (`new Resend(...)`, `createClient(...)`) — if the required env is missing, the constructor throws during Next.js "Collecting page data" and the build fails. Pattern:
  ```ts
  let _r: Resend | null = null;
  function getResend(): Resend { if (!_r) _r = new Resend(process.env.RESEND_API_KEY); return _r; }
  ```
- GitHub secrets can get truncated when pasted. After updating `NEXT_PUBLIC_SUPABASE_ANON_KEY` verify the baked bundle: `curl -sL https://archflow.ru/_next/static/chunks/<file>.js | grep -oE 'eyJ[A-Za-z0-9_.-]{20,}' | awk '{print length}'` — should be ~169 chars.

## Architecture

Next.js 14 App Router. Point of entry: `src/app/page.tsx` does `redirect("/projects")`. All client routes live under `src/app/[...path]/page.tsx` (catch-all). Navigation via `useRouter().push()` from `next/navigation`. **Not a state-driven SPA** — the old `useState + window.history` approach was migrated out.

### Key directories (all under `nextjs-src/src/app/`)

- `lib/` — data layer: queries, hooks, types, auth, permissions, theme, supabase client, mailer, health
- `components/` — ~97 React components (grown significantly past "~50")
- `components/project/` — project tabs (DesignSection, SupervisionTab, SettingsTab, ChatView, AccessScreen, AssistantView, NotificationSettings)
- `components/supervision/` — CalendarView, PhotoGallery, ReportsListView, ReportDetailView, ContractorTasksView, SupervisionSettings
- `components/supply/` — SupplyModule, SupplyDashboard, SupplyTimeline, SupplyStages, SupplyImport, SupplyPlan, SupplyDocuments, SupplyOnboarding
- `api/` — server routes: auth/signup, feedback, push/send, telegram/bot, design/rename, reports/[id]/send, cron/analytics
- `[...path]/page.tsx` — catch-all client router

Orphaned (do not edit, slated for deletion): `DesignTab.tsx`, `DocCategoryList.tsx`.

### Data layer pattern

1. **`queries.ts`** (~108KB, 3413 lines) — all Supabase query functions, single source of truth.
2. **`hooks.ts`** (~28KB, 892 lines) — 25+ custom hooks wrapping queries via generic `useQuery<T>()`.
3. **`types.ts`** — TS interfaces matching Supabase schema.
4. **`auth.tsx`** — `AuthProvider` context (session, profile, signIn/signUp/signOut).
5. **`permissions.ts`** — `resolvePermissions(role, accessLevel)` → 21 boolean flags.
6. **`theme.tsx`** — `ThemeProvider`. **Dark mode is forcibly disabled** (forced light in theme.tsx). Do not re-enable without explicit instruction.

Real-time: Supabase `postgres_changes` subscriptions auto-refetch hooks.

### Database

Supabase on Beget Cloud (`oyklaglogmaniet.beget.app`). 43+ migrations in `nextjs-src/supabase/migrations/`.

Core tables (non-exhaustive): `profiles`, `projects`, `project_members`, `stages`, `visits`, `photo_records`, `invoices`, `documents`, `supply_items`, `contract_payments`, `tasks`, `rbac_members`, `visit_reports` (+ `attachments jsonb`), `visit_remarks`, `remark_comments`, `contractor_tasks`, `supervision_settings`, `project_access_settings`, `chat_messages` (+ `channel_id`, `image_url`, `is_pinned`), `chat_channels`, `chat_reads`, `design_files`, `design_subfolders`, `project_rooms`, `kind_stage_mapping`, `notification_preferences`, `support_threads`, `support_messages`, `assistant_events`, `reminders`, `bot_drafts`.

### Migrations — how to apply

No direct psql/SSH access to the Supabase DB.
1. Open Supabase Studio SQL Editor: `https://oyklaglogmaniet.beget.app/project/default/sql/new` (HTTP Basic Auth: `user` / `miu3wW!1`).
2. Paste SQL, Run.

**Critical:** in RLS policies always use `project_members.role` (text: `designer/assistant/client/contractor/supplier`), NEVER `member_role` (separate enum with different values). Mixing them → `ERROR: 22P02: invalid input value for enum member_role`.

Edge Functions live on a **different** Supabase instance (`fcbllfvlpzlczinlydcm.supabase.co`) with its own JWT — use `--no-verify-jwt` and custom `DB_URL` / `DB_SERVICE_KEY` env vars (the `SUPABASE_*` prefix is reserved).

### PWA

Service Worker `public/sw.js`: cache-first for static, network-first for API. Manifest at `public/manifest.json`. SW registers on load and **stays active across tabs** until the last origin tab is closed — after a breaking bundle change, tell users to close all archflow.ru tabs (or use `self.skipWaiting()` + `clients.claim()`).

## Design System — STRICT

### Fonts
- **Single font: Vollkorn SC** (small-caps serif, weights 400/600/700/900).
- CSS variables: `--af-font` (canonical); `--af-font-display` and `--af-font-mono` are aliases — kept so existing TSX refs keep working without per-file edits.
- Tailwind: `font-display`, `font-body`, `font-mono` → all Vollkorn SC.
- In TSX inline styles: `var(--af-font)` or legacy aliases. Never hardcode font names.
- Weights: 400 (body/labels/buttons), 600 (active/emphasis), 700 (section/card titles), 900 (page titles). **Weight 300 does NOT exist in Vollkorn SC — use 400**.
- `text-transform: uppercase` ONLY on tiny microcopy (≤11px) in this whitelist: `.af-label, .af-topbar-context, .af-crumb, .af-block-index, .af-tab-index, .af-project-meta, .af-status, .af-input-label, .af-settings-heading, .af-btn, .ti, .stb, .filter-tab, .supply-tab`, plus legacy `.btn`. Never on headings — Vollkorn SC renders lowercase as small caps already; extra uppercase looks crude.
- `letter-spacing` for Vollkorn: compact. Mapping 0.2em→0.08em, 0.18em→0.06em, 0.15em→0.05em, 0.12em→0.04em. Elements at 8–9px keep wider spacing.
- Google Fonts `<link>` in `layout.tsx` is a fallback in case Next font chunk misses through the SW.

### Colors — ONLY these 4
| Token | Hex | Usage |
|-------|-----|-------|
| `--af-black` | `#111111` | Primary text, inverted backgrounds |
| `--af-offwhite` | `#F6F6F4` | Page backgrounds |
| `--af-border` | `#EBEBEB` | Borders, dividers |
| `--af-white` | `#FFFFFF` | Card backgrounds |

No reds (#E24B4A, #DC2626), no blues (#2563EB), no intermediate greys (#999). If something needs visual emphasis — use `#111` inverted block, not color.

### Rules
- `border-radius: 0` everywhere — no exceptions (including modals, tooltips, unread dots, badges).
- Block gaps: `2px`.
- Hover: color inversion (white bg → `#111`, dark text → white).
- Buttons: ghost style (border + transparent bg), invert on hover. No filled `bg-[#111827]` primaries.
- No color accents, no shadows.
- CSS classes prefixed with `.af-` (see `globals.css`).
- Mobile-responsive font variables: `--af-fs-7` … `--af-fs-13`. Use `fontSize: 'var(--af-fs-12)'` instead of hardcoding. On mobile `input/textarea/select` → `16px !important` (anti-iOS-zoom).
- Icons components accept `className` only, NOT `style` — inline style survives dev HMR but breaks production build.
- Avoid inline styles on elements with hover/active — inline wins over CSS `:hover`; use `.af-*` classes instead.

## Do NOT change without explicit instruction

- Font (Vollkorn SC single-font system)
- Color palette (monochrome only)
- `border-radius` (always 0)
- Navigation structure
- Role/permission logic
- Dark mode kill-switch in `theme.tsx`

## Navigation Structure

```
/login
/projects                        — project list
/projects/:id                    — section picker
/projects/:id/design             — Design (tabs inside)
/projects/:id/supply             — Supply
/projects/:id/journal            — Supervision (visits, invoices, planning)
/projects/:id/settings           — Project settings
```

Implemented via catch-all `[...path]/page.tsx` + `useRouter` from `next/navigation`.

## Roles

5 roles: `designer` (full access), `client` (view only), `contractor` (view + photos + comments), `supplier` (supply only), `assistant` (delegated). Invite via invite-links with base64 tokens. Permission gates via `resolvePermissions()` flags — never check role directly in UI.

## Feedback Bar

Fixed bottom bar on all screens except login. Height 40px, bg `#111111`, text white, IBM Plex Mono.

## Telegram Bots

Both bots (voice bot, support bot) route through a Cloudflare Worker relay (`cf-telegram-relay/`), not straight to VPS. Webhook URL pattern: `https://archvoice-relay.archflow-office.workers.dev/<secret>`. When adding a bot — register webhook via the relay.

## Environment Variables

Local `.env.local` and VPS `/home/archflow/.env.production`:

```
NEXT_PUBLIC_SUPABASE_URL       — Supabase instance URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  — Supabase public anon key (~169 chars)
NEXT_PUBLIC_YM_ID              — Yandex Metrika counter (primary)
NEXT_PUBLIC_METRIKA_ID         — alt name, same value
RESEND_API_KEY                 — Email (Resend)
TELEGRAM_BOT_TOKEN             — Feedback bot token
TELEGRAM_CHAT_ID               — Feedback chat ID
TELEGRAM_VOICE_BOT_TOKEN       — Voice bot token
SUPABASE_SERVICE_ROLE_KEY      — service role (server routes only)
```

GitHub Actions secrets: only `NEXT_PUBLIC_*` + `VPS_SSH_KEY` at build time.

## Demo Credentials

```
designer: demo@archflow.ru / oDEgaa9rsAJD&ocw
```
