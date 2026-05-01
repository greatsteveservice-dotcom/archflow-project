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
- Build step only gets `NEXT_PUBLIC_*` secrets. **Never instantiate clients at module top-level** (`new Resend(...)`, `createClient(...)`, `new Anthropic(...)`) — if env missing, constructor throws during Next.js "Collecting page data" and build fails. Pattern:
  ```ts
  let _r: Resend | null = null;
  function getResend(): Resend { if (!_r) _r = new Resend(process.env.RESEND_API_KEY); return _r; }
  ```
- GitHub secrets can get truncated when pasted. After updating `NEXT_PUBLIC_SUPABASE_ANON_KEY` verify the baked bundle: `curl -sL https://archflow.ru/_next/static/chunks/<file>.js | grep -oE 'eyJ[A-Za-z0-9_.-]{20,}' | awk '{print length}'` — should be ~169 chars. HTTP 200 alone is NOT proof the deploy works.
- **New env var on VPS always goes to `/home/archflow/.env.production`** (the master file). `/home/archflow/app/.env.production` lives inside a release and is overwritten on next deploy. Serverный `/home/archflow/deploy.sh` сам копирует master в новый релиз.
- **`npm run build` before every commit touching TSX.** HMR в dev сервере пропускает ошибки вроде `Icons <X style={...}>`, которые ломают production build. Дев-сервер поднимается — не значит собирается.
- **`rm -rf nextjs-src/.next` после массовых правок или падения MODULE_NOT_FOUND** в dev — вебпак-кэш ломается, лечится полной очисткой.
- **Konva: держать `react-konva@18`**, версия 19 несовместима с `react@18` и ломает CI.
- **Edge Functions: добавлять `"supabase/functions"` в `tsconfig.json` exclude** — иначе Deno-импорты ломают Next-билд.

## Architecture

Next.js 14 App Router. Point of entry: `src/app/page.tsx` does `redirect("/projects")`. All client routes live under `src/app/[...path]/page.tsx` (catch-all). Navigation via `useRouter().push()` from `next/navigation`. **Not a state-driven SPA** — the old `useState + window.history` approach was migrated out.

### Key directories (all under `nextjs-src/src/app/`)

- `lib/` — data layer: queries, hooks, types, auth, permissions, theme, supabase client, mailer, health, useSubscription, onboarding
- `components/` — React components (Vollkorn-SC editorial style)
- `components/project/` — project tabs (DesignSection, SupervisionTab, SettingsTab, ChatView, AccessScreen, NotificationSettings, ClientProjectHome). Assistant отображается в BottomTabBar, не в меню проекта.
- `components/supervision/` — CalendarView, PhotoGallery, ReportsListView, ReportDetailView, ContractorTasksView, SupervisionSettings
- `components/supply/` — SupplyModule, SupplyDashboard, SupplyTimeline, SupplyStages, SupplyImport, SupplyPlan, SupplyDocuments, SupplyOnboarding, SupplySearch
- `components/moodboard/` — MoodboardCanvas, CanvasSidebar, CanvasToolbar, CanvasMinimap (Konva.js)
- `Landing.tsx` — публичный лендинг `/welcome` (server component, scoped `.afl-*` стили). Не делать `"use client"` целиком — auth-redirect вынесен в `<AuthRedirect />` client-island.
- `api/` — server routes: auth/signup, feedback, push/send, telegram/bot, design/rename, reports/[id]/send, cron/analytics, sign/send, sign/status, activity/ping, billing/create-payment, billing/webhook, voice/transcribe, videos/*, onboarding/*
- `[...path]/page.tsx` — catch-all client router

Orphaned (do not edit, slated for deletion): `DesignTab.tsx`, `DocCategoryList.tsx`.

### Data layer pattern

1. **`queries.ts`** — Supabase query functions, single source of truth.
2. **`hooks.ts`** — custom hooks wrapping queries через generic `useQuery<T>()`. Кэш-ключ = `JSON.stringify(deps) + fetcher.toString()` — не использовать только deps (коллизии между разными запросами).
3. **`types.ts`** — TS interfaces matching Supabase schema.
4. **`auth.tsx`** — `AuthProvider` context. Содержит heartbeat — шлёт `/api/activity/ping` каждые 60с активной вкладки.
5. **`permissions.ts`** — `resolvePermissions(role, accessLevel)` → 21 boolean flags.
6. **`useSubscription.ts`** — статус подписки. Для `role !== 'designer'` возвращает `canEdit=true` всегда (клиенты/подрядчики не подписываются).
7. **`theme.tsx`** — `ThemeProvider`. **Dark mode forcibly disabled** (forced light). Не включать без явного запроса.

Real-time: Supabase `postgres_changes` subscriptions auto-refetch hooks.

### Database

**Supabase на Yandex Cloud VM** (мигрирован с Beget 18.04.2026, Beget полностью deprecated):
- URL: `https://db.archflow.ru` (nginx → Kong → Docker-контейнеры Supabase)
- VM: `archflow@111.88.244.78` (SSH key: `~/.ssh/archflow_ed25519`)
- Контейнеры: `docker compose` из `~/supabase/` на VM

Migrations в `nextjs-src/supabase/migrations/`. Untracked WIP миграции в working tree — нормально, проверять через `git status` перед деплоем.

Core tables (non-exhaustive): `profiles`, `projects`, `project_members`, `stages`, `visits`, `photo_records`, `invoices`, `documents`, `supply_items`, `contract_payments`, `tasks`, `rbac_members`, `visit_reports`, `visit_remarks`, `remark_comments`, `contractor_tasks`, `supervision_settings`, `project_access_settings`, `chat_messages`, `chat_channels`, `chat_reads`, `design_files`, `design_subfolders`, `project_rooms`, `kind_stage_mapping`, `notification_preferences`, `support_threads`, `support_messages`, `assistant_events`, `reminders`, `bot_drafts`, `moodboards`, `moodboard_items`, `moodboard_sections`, `moodboard_comments`, `document_signatures` (Podpislon), `user_sessions` (аналитика времени), `subscriptions`, `user_module_settings`.

### Migrations — how to apply

**Единственный рабочий путь** — psql через Docker на Yandex VM:
```bash
ssh -i ~/.ssh/archflow_ed25519 archflow@111.88.244.78 \
  "docker exec -i supabase-db psql -U supabase_admin -d postgres" \
  < nextjs-src/supabase/migrations/NNN_name.sql
```

Не работают (проверено): pg-meta REST, Supabase CLI `db push` (не настроен линк), `exec_sql` RPC.

Перед новой миграцией — проверить что все предыдущие уже применены: `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;`

**Critical RLS правило**: всегда использовать `project_members.role` (text: `designer/assistant/client/contractor/supplier`), НИКОГДА `member_role` (отдельный enum с другими значениями). Смешение → `ERROR: 22P02: invalid input value for enum member_role`.

Edge Functions живут на **другой** Supabase-инстанции (`fcbllfvlpzlczinlydcm.supabase.co`) с собственным JWT — деплой `--no-verify-jwt`, env `DB_URL` / `DB_SERVICE_KEY` (префикс `SUPABASE_*` зарезервирован Edge-рантаймом).

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

### Colors — 4 base + 1 accent
| Token | Hex | Usage |
|-------|-----|-------|
| `--af-black` | `#111111` | Primary text, inverted backgrounds |
| `--af-offwhite` | `#F6F6F4` | Page backgrounds |
| `--af-border` | `#EBEBEB` | Borders, dividers |
| `--af-white` | `#FFFFFF` | Card backgrounds |
| `--af-ochre` | `#B8862A` | Accent: hero CTA, action buttons (`+ Новый проект`, `Загрузить`, `Скачать`, `Записать`, `+ Пригласить`), pricing featured card, why-drawer trigger, changelog kicker, left rail-frames. Hover: `#9a6f1f`. **Не для текста заголовков, не для навигации, не для бордеров блоков.** |

No reds (#E24B4A, #DC2626), no blues (#2563EB), no greens, no intermediate greys (#999). Эмфаз — инверсия (`#111` блок) или охра, не другие цвета.

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
/pricing                          — публичная страница тарифов (YooKassa)
/privacy                          — публичная страница политики
/billing/success                  — landing после успешной оплаты
/welcome                          — публичный лендинг (Playfair/Inter, scoped в .afl-root)
/projects                         — project list
/projects/:id                     — section picker (designer) / ClientProjectHome (client)
/projects/:id/design              — Design (папки + мудборд 07)
/projects/:id/supply              — Supply / Комплектация
/projects/:id/supervision         — Авторский надзор
/projects/:id/chat                — Чат
/projects/:id/moodboard           — Canvas-мудборд (Konva)
/projects/:id/settings            — Project settings
/projects/:id/assistant           — AI ассистент (только designer)
/board/:token                     — публичный мудборд для клиента
/m/:token                         — публичный grid-мудборд (legacy)
```

Implemented via catch-all `[...path]/page.tsx` + `useRouter` from `next/navigation`. Публичные страницы (`/pricing`, `/privacy`, `/billing/success`) вне catch-all — рендерятся без auth.

## Roles

5 roles: `designer` (full access), `client` (view only), `contractor` (view + photos + comments), `supplier` (supply only), `assistant` (delegated). Invite via invite-links with base64 tokens. Permission gates via `resolvePermissions()` flags — never check role directly in UI.

## Bottom TabBar

`components/BottomTabBar.tsx` — фикс-бар внизу на всех авторизованных экранах. 4 иконки: **Чат / Поиск / Помощь / Ассистент** (последний только для designer). Иконки SVG stroke-width 2.4, размер 28px. Фон `#FFF`, бордер сверху `2px #111`. Шрифт Vollkorn SC (тот же что и везде — IBM Plex Mono в проекте нет).

## Profile Cabinet

`components/ProfileCabinet.tsx` — bottom-sheet (`height: 88dvh`) открывается по клику на аватар в топбаре. 4 экрана: main / billing / settings / profile. Настройки (`user_module_settings`) — тумблеры видимости модулей. Биллинг (`subscriptions`) — выбор тарифа + оплата через ЮКассу.

## Billing (YooKassa)

- Тарифы: 1 месяц 1500 ₽ / 6 мес 6000 ₽ / 1 год 10000 ₽.
- Триал 7 дней создаётся триггером `on_user_created_billing` для всех новых `auth.users`. Блокировка работает ТОЛЬКО для `role === 'designer'` — клиенты/подрядчики/ассистенты никогда не видят блокировки.
- `/api/billing/create-payment` — требует auth, кладёт `userId` в metadata.
- `/api/billing/webhook` — IP whitelist ЮКассы (`185.71.76.0/27`, `185.71.77.0/27`, `77.75.153.0/25`, `77.75.156.11`, `77.75.156.35`). Читает `cf-connecting-ip` первым (CF proxy), fallback на `x-forwarded-for`.
- Env: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` (runtime-only, не `NEXT_PUBLIC_*`).
- Webhook зарегистрирован в кабинете ЮКассы на `https://archflow.ru/api/billing/webhook`, событие `payment.succeeded`.

## Telegram Bots

Both bots (voice bot, support bot) route through a Cloudflare Worker relay (`cf-telegram-relay/`), not straight to VPS. Webhook URL pattern: `https://archvoice-relay.archflow-office.workers.dev/<secret>`. **Никогда не регистрировать Telegram webhook напрямую на VPS** — Telegram → VPS нестабилен.

Telegram Bot API 7.0+: проверять пересланные сообщения через `message.forward_origin`, не через устаревшие `forward_from` / `forward_sender_name`.

## E-signature (Podpislon)

`/api/sign/send`, `/api/sign/status/[fileId]`, таблица `document_signatures`. Отправка договора клиенту по SMS, подписание кодом (63-ФЗ). Env: `PODPISLON_API_KEY`.

## Environment Variables

Local `.env.local` и VPS `/home/archflow/.env.production` (**master-копия** — единственная правильная локация на сервере):

```
NEXT_PUBLIC_SUPABASE_URL         — https://db.archflow.ru
NEXT_PUBLIC_SUPABASE_ANON_KEY    — Supabase public anon key (~169 chars)
NEXT_PUBLIC_YM_ID                — Yandex Metrika counter
NEXT_PUBLIC_METRIKA_ID           — alias, same value as YM_ID
RESEND_API_KEY                   — Email (Resend)
TELEGRAM_BOT_TOKEN               — Feedback bot
TELEGRAM_CHAT_ID                 — Feedback chat
TELEGRAM_VOICE_BOT_TOKEN         — Voice bot
SUPABASE_SERVICE_ROLE_KEY        — service role (server routes only)
METRIKA_OAUTH_TOKEN              — for cron analytics API
CRON_SECRET                      — protects /api/cron/*
PODPISLON_API_KEY                — e-signature
YOOKASSA_SHOP_ID                 — billing
YOOKASSA_SECRET_KEY              — billing
OPENAI_API_KEY                   — supply search classification, voice transcribe (Whisper)
YC_S3_KEY_ID                     — Yandex Object Storage (видео-бакет)
YC_S3_SECRET_KEY                 — Yandex Object Storage
ANTHROPIC_API_KEY                — GitHub Action @claude (только в repo secrets)
```

GitHub Actions secrets: только `NEXT_PUBLIC_*` + `VPS_SSH_KEY` at build time. Остальные runtime-only (в VPS env). `ANTHROPIC_API_KEY` отдельный — только для `claude.yml` workflow, передаётся через `with: anthropic_api_key:` (не `env:`).

## Demo Credentials

```
designer: demo@archflow.ru
```
Пароль — в password manager пользователя или сменить через psql:
`UPDATE auth.users SET encrypted_password = crypt('newpw', gen_salt('bf')) WHERE email='demo@archflow.ru';`

## CSS ink variables

В дополнение к 4 основным цветам есть серые оттенки для неинтерактивных текстов (в `globals.css`):
- `--ink-muted` — вторичный текст
- `--ink-faint` — третичный
- `--ink-ghost` — placeholder-like

Использовать ТОЛЬКО для текстов, НЕ для границ/фонов. Для всего остального — 4 основных цвета.

## Untracked WIP Pattern

В рабочем дереве почти всегда лежат untracked файлы следующего спринта (онбординг, видео, новые миграции). Они тащат за собой типы из `lib/onboarding.ts`, новые блоки в `hooks.ts`/`queries.ts`. Если закоммитить эти примеси случайно — CI падает на типах.

**Алгоритм перед `git add` любых правок:**
1. `git status` — посмотреть untracked.
2. `git diff <changed-file> | head -40` — убедиться что в diff нет блоков из чужого спринта.
3. Если есть примеси: `git restore --staged FILE && git stash push -- FILE`, заново применить нужные правки через Edit, затем `git add`, потом `git stash pop`.
4. Никогда `git add -A` или `git add .` — только именованные файлы.

## Videos (design_file_videos)

Миграция 053. Бэкенд: `/api/videos/upload-url` (presigned PUT, TTL 15 мин), `/api/videos/[id]` (GET/PATCH), `/api/videos/[id]/finalize` (Whisper-1 транскрипция), `/api/videos/[id]/url` (presigned GET), `/api/videos/delete/[id]`. Компоненты: `VideoRecorder.tsx` (MediaRecorder, getDisplayMedia/getUserMedia), `VideoPlayer.tsx`, `FileVideoSection.tsx`. Хранилище — YC Object Storage `archflow-media-prod`. CORS bucket policy через `nextjs-src/scripts/apply-yc-cors.mjs` — без CORS PUT возвращает 403.

Safari ограничен в `getDisplayMedia` — давать понятный fallback. `previewRef` для камеры — callback ref, не `useRef`.

## Onboarding (AI document classification)

В разработке. Файлы: `OnboardingPanel.tsx`, `lib/onboarding.ts`, `api/onboarding/classify|confirm|reject`, миграция `055_onboarding_queue.sql`. nginx `client_max_body_size 2g` + Storage `FILE_SIZE_LIMIT 2147483648` подняты на VM. **Не коммитить без end-to-end теста.**

## Landing (`/welcome`)

- Server component (`Landing.tsx` без `"use client"`). Auth-redirect — отдельный `<AuthRedirect />` client-island. `#af-fallback-screen` рендерится последним в body.
- CSS-классы `.afl-*` (не `.af-*`). Шрифты — Playfair Display + Inter, **scoped в `.afl-root`** через `--af-landing-*` rebind. Никогда не трогать `--af-font*` глобально — продукт остаётся на Vollkorn SC.
- Mobile screenshot swap: `.afl-shot-desktop` / `.afl-shot-mobile` + `@media (max-width: 900px)` (не 768!). Файлы в `public/landing/`. 6 модулей: `01-projects`, `02-design`, `03-supervision`, `04-supply`, `06-chat`, `07-client-cabinet`.
- Скриншоты снимать через puppeteer-скрипт `scripts/take-screenshots.js` (логин как `demo@archflow.ru`, обрезка таббара через `clip:`). Для client cabinet — проект ЖК iLove (наиболее насыщен данными).
- WhyDrawer: bottom-sheet ≤900px, правая панель >900px. Открывается через CustomEvent `why:open`.

## ClientProjectHome

`components/project/ClientProjectHome.tsx` — главная проекта для роли `client` (hero-task, stage-progress, designer-карточка, activity feed, тайлы Дизайн+Авторский надзор, upcoming events). Дизайнер видит старую раскладку 4 тайлов (`ClientProjectView`).

**Supply-тайл намеренно скрыт для всех клиентов** независимо от `accessLevel`. Чат не выводится тайлом — он есть в designer-карточке («Написать в чат →») и в BottomTabBar.

## Hydration / DOM gotchas

- `HydrationGate.tsx`: НИКОГДА не делать `el.remove()` на узлах из server-rendered JSX — React держит VDOM-ссылку, удаление → `insertBefore NotFoundError` → каскад рендер-ошибок. Только `display:none`.
- `ChunkLoadError` recovery: handler `af-chunk-reload` в `layout.tsx` делает тихий hard-reload в Safari при bundle-mismatch. Не переписывать.

## Voice / Edge Functions migration

`process-voice` перенесён из Edge Function в `/api/voice/transcribe` (коммит 471231f). Все новые серверные функции — Next.js API routes на VPS. Edge Functions на старой Supabase Cloud (`fcbllfvlpzlczinlydcm.supabase.co`) — legacy, не использовать для новых фич.

## Build / dev cache gotcha

`npm run build` поверх запущенного `npm run dev` затаптывает `.next` кэш → `MODULE_NOT_FOUND: ./vendor-chunks/@supabase.js`. Лечение: остановить dev, `rm -rf nextjs-src/.next`, заново `npm run dev`. Если build нужен параллельно — отдельный terminal с другим `PORT=3001`.

## GitHub @claude integration

Workflow `.github/workflows/claude.yml`. Триггер: подстрока `@claude` в issue/PR/comment body. Требует:
1. Установленный GitHub App: https://github.com/apps/claude (на репозиторий).
2. Repo secret `ANTHROPIC_API_KEY`.
3. Передача через `with: anthropic_api_key:` (не `env:`) — иначе action валится с `ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN is required`.

История диалогов с Claude через GitHub видна на десктопе: issue/PR comments + Actions tab + (если был PR) Branches.
