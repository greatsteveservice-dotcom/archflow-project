# ArchFlow — Миграция инфраструктуры

> Стратегический план перехода с Netlify + Supabase-on-Beget на независимую инфраструктуру будущего.
> Принцип: **максимально бесшовно для текущих пользователей** (Катя и все остальные не должны заметить переезд).

---

## Контекст

### Как сейчас (после фикса 10 апреля 2026)

| Слой | Где | Риск |
|---|---|---|
| DNS | **Cloudflare** (`melody/paul.ns.cloudflare.com`) | ✅ стабильно |
| Frontend host | Netlify (`archflow-app.netlify.app`) | ⚠️ single-vendor, RU-hostile, закрытая экосистема |
| Edge / CDN | Cloudflare proxy (orange cloud) → Netlify origin | ✅ стабильно |
| App (Next.js 14) | Netlify Edge Functions + Next.js runtime | ⚠️ зависит от Netlify |
| Database | Supabase на Beget (`oyklaglogmaniet.beget.app`) | ⚠️ single-vendor, неясный SLA |
| Auth | Supabase Auth | ⚠️ связан с Supabase |
| Realtime | Supabase Realtime (postgres_changes) | ⚠️ связан с Supabase |
| Storage | Supabase Storage (design-files bucket) | ⚠️ связан с Supabase + Beget |
| Email | Resend | ⚠️ американский сервис, может блокироваться |
| Push | Web Push API (браузерный стандарт) | ✅ vendor-neutral |
| Analytics | Yandex Metrika | ✅ уже в РФ |
| CI/CD | Netlify auto-deploy from GitHub | ⚠️ связан с Netlify |

### Что произошло 10 апреля
Netlify NS1 GeoDNS маршрутизировал RU-резолверы на заблокированные AWS Frankfurt IPs → у Кати и всех RU-юзеров белый экран. Вылечено переносом DNS на Cloudflare с прокси. **Это не разовая проблема, а системный риск архитектуры.**

### Почему надо мигрировать

1. **Netlify — RU-hostile.** Один инцидент уже был. Будут ещё: санкции, блокировки, banning аккаунтов. Мы на минном поле.
2. **Beget Supabase — не enterprise.** Нет гарантий SLA, бэкапов, failover. Одна копия данных в одном месте.
3. **Supabase — американский.** Санкционные риски, возможно отключение account.
4. **Resend — американский.** Может в любой момент перестать доставлять в .ru ящики.
5. **Global Infrastructure of the Future** — должна быть **multi-vendor, multi-region, vendor-неутральной**, чтобы проект пережил любые геополитические встряски.

### Целевая архитектура

| Слой | Цель |
|---|---|
| DNS | Cloudflare (оставляем) |
| Edge / CDN / DDoS | Cloudflare (оставляем) |
| Frontend host | **Yandex Cloud Serverless Containers** (Docker → автоскейл) |
| Database | **Yandex Managed PostgreSQL** (managed, failover, backup built-in) |
| Auth | **Self-hosted Supabase GoTrue** на Yandex Cloud VM (или Supabase Cloud как hot-standby) |
| Realtime | **Self-hosted Supabase Realtime** на той же VM |
| Storage | **Yandex Object Storage** (S3-совместимый) — для Design файлов, фото визитов, аватарок |
| Email | **Yandex Sender Pro** (основной) + Resend (fallback для не-РФ получателей) |
| Push | Web Push API (без изменений) |
| Monitoring | Yandex Cloud Monitoring + UptimeRobot (RU-probes) |
| Error tracking | Sentry self-hosted на Yandex Cloud |
| CI/CD | **GitHub Actions → Yandex Container Registry → Serverless Containers** |
| Backups | Yandex Object Storage + еженедельный export в Cloudflare R2 (на случай потери Yandex Cloud) |

**Multi-vendor principle:** критичные данные — в двух независимых местах. Yandex Cloud не может быть single point of failure.

---

## Принципы бесшовности

Все спринты проектируются под правила:

1. **Параллельный прогон.** Старая инфра живёт, пока новая не доказала стабильность минимум 7 дней.
2. **Rollback в 1 команду.** На любом этапе `terraform destroy` или переключение DNS в CF возвращает прод на старую инфру за < 60 секунд.
3. **Cutover только ночью МСК.** Все продовые переключения — 02:00–05:00 по Москве, заранее анонсируя пользователям.
4. **Никаких database downtime > 5 минут.** Для DB-миграции используется logical replication, не dump/restore.
5. **Zero data loss.** Сначала dual-write, потом read-switch, потом прекращение старого write.
6. **Feature freeze на cutover-окна.** За сутки до cutover — stop deploy на main branch.
7. **Каждый спринт — закрытая единица.** Если спринт не удался, можно вернуться к предыдущему состоянию без поломки следующих.
8. **Статус-страница для пользователей.** `status.archflow.ru` на Cloudflare Workers — простая HTML с актуальным состоянием миграции.

---

## Sprint 0 — Решения и безопасность (3–5 дней)

**Цель:** принять архитектурные решения, завести бэкапы, подготовить staging Yandex Cloud.

### От тебя (обязательно)

1. **Яндекс Облако аккаунт.** Завести [yandex.cloud](https://yandex.cloud), привязать карту, получить стартовый грант (обычно ₽4 000 + 60 дней).
2. **Биллинг-план.** Решить: платный тариф сразу или сначала грант. На первые 2 месяца грант покрывает всё, дальше ~₽3 000–8 000/мес в зависимости от нагрузки.
3. **Ответить на вопросы:**
   - Supabase: self-host полностью на Yandex, или оставляем Supabase Cloud как auth-провайдера и мигрируем только БД? (Рекомендую self-host — полная независимость.)
   - Email: Yandex Sender Pro требует бизнес-аккаунт и модерацию домена. Готов ли подать заявку? Альтернатива — UniSender или Mailgun EU.
   - Резервный датацентр: Selectel или Timeweb Cloud как secondary RU-провайдер? (Можно отложить.)
4. **Передать мне доступы:**
   - Yandex Cloud `cloud_id` + `folder_id` (из консоли)
   - Service Account с ролями `editor` + `storage.admin` + `container-registry.admin`
   - Статические ключи SA (я положу в `.env.local.migration`, не в git)

### Что делаю я

- Создаю в `/docs/migration/` папку с подпапками по спринтам (runbooks, rollback-гайды)
- Настраиваю **ежедневный дамп Supabase → Yandex Object Storage** через cron на твоей машине (bash-скрипт + `pg_dump`) — ЭТО ВАЖНО, чтобы до начала миграции у нас уже был бэкап
- Настраиваю **еженедельный rsync Supabase Storage → Yandex Object Storage** (все design-files, photos)
- Устанавливаю `yc` CLI и Terraform на локалке
- Пишу Terraform модули для staging (VPC, subnets, NAT, Object Storage, Container Registry) — infra-as-code с первого дня, никакого click-ops
- Завожу отдельный branch `infra/migration-sprint-0` в репо

### Критерии готовности

- [ ] Supabase дампится ежедневно в Yandex OS bucket `archflow-backups-daily`
- [ ] Файлы из `design-files` зеркалируются в bucket `archflow-storage-mirror`
- [ ] Terraform `plan` проходит без ошибок на staging
- [ ] Yandex Cloud Monitoring видит staging VPC

### Rollback

Нечего откатывать — эта фаза ничего не трогает в проде.

---

## Sprint 1 — Observability (5–7 дней)

**Цель:** прежде чем трогать прод, видеть его насквозь. Чтобы любой баг после cutover ловился за минуты, а не за часы когда Катя напишет в чат.

### От тебя

1. Решить: **Sentry self-hosted** (на Yandex VM, ~₽800/мес) или **Sentry Cloud** (free план 5k events, есть риски санкций)?
2. Создать аккаунт на **UptimeRobot** (free tier хватит) — нужен для мониторинга с RU-узлов
3. Дать мне `NEXT_PUBLIC_SENTRY_DSN` когда Sentry развёрнут
4. Опционально: завести Telegram-канал для алертов (или использовать существующий фидбек-бот)

### Что делаю я

- **Sentry SDK** в Next.js (`@sentry/nextjs`) — захват client+server ошибок, source maps, user context (не email — только ID, privacy)
- **Structured logging** — заменяю все `console.log` в критичных путях (auth, queries, storage) на wrapper с уровнями и контекстом, который уходит в Sentry и в Yandex Cloud Logging
- **Uptime checks** через UptimeRobot:
  - `https://archflow.ru/` (главная)
  - `https://archflow.ru/login`
  - `https://archflow.ru/api/feedback` (sanity check API)
  - каждые 5 минут, probes из Москвы + EU
- **Health check endpoint** `/api/health` — возвращает JSON с статусом Supabase, Storage, в какой build-id работаем
- **Performance monitoring** — Web Vitals отправляются в Sentry
- **Статус-страница** — минимальная HTML на Cloudflare Workers, `status.archflow.ru`
- **Алерты в Telegram** через существующий фидбек-бот (новый tg chat для алертов)

### Критерии готовности

- [ ] Тестовая ошибка в проде ловится в Sentry за < 30 секунд
- [ ] UptimeRobot отправляет алерт в Telegram при downtime
- [ ] `/api/health` возвращает 200
- [ ] `status.archflow.ru` отвечает

### Rollback

Не трогает прод-функциональность. Можно отключить Sentry/UptimeRobot без последствий.

---

## Sprint 2 — Storage: Supabase Storage → Yandex Object Storage (7–10 дней)

**Цель:** отвязать файлы от Supabase/Beget. Это самая изолированная часть стека — можно мигрировать первой без риска.

### Почему сначала Storage

- Файлы — read-mostly (редко удаляются)
- Схема простая: filename → URL
- `file_url` в БД можно менять постепенно
- Не ломает auth, realtime, queries

### От тебя

1. Решить имя bucket'а: `archflow-design-files` (рекомендую) или что-то другое
2. Решить модель доступа: **публичный bucket** (как сейчас в Supabase) или **signed URLs** (более безопасно, но сложнее — нужен server-side API)
3. Ничего руками делать не надо — всё через Terraform

### Что делаю я

**Фаза A — Dual-write (3 дня):**
- Terraform создаёт bucket `archflow-design-files` в Yandex OS с публичным чтением
- Обновляю `DesignFolderView.tsx` upload handler: грузит параллельно в Supabase Storage + Yandex OS, сохраняет оба URL в БД (новая колонка `file_url_yc` в `design_files`)
- Существующие файлы остаются в Supabase как есть

**Фаза B — Backfill (1–2 дня):**
- Скрипт `scripts/migrate-storage.ts` — идёт по всем записям `design_files` с пустым `file_url_yc`, качает из Supabase, заливает в Yandex OS, записывает новый URL
- Запускается ночью, идемпотентный, можно прерывать и продолжать
- То же самое для `photo_records` (supervision-фото) и `profiles.avatar_url`

**Фаза C — Read switch (1 день):**
- Меняю read-код на `file_url_yc ?? file_url` (fallback на старое, если что-то пропустили)
- Deploy через CF-прокси — пользователи видят файлы с нового CDN (Yandex OS + CF proxy)

**Фаза D — Verification (3 дня):**
- Observer: UptimeRobot проверяет несколько известных URL из нового bucket'а
- Проверка целостности: count файлов в обоих местах должен совпасть
- Если 7 дней без инцидентов → Sprint 2 done

**Фаза E — Cleanup (позже, не блокирующая):**
- Stop dual-write, пишем только в Yandex
- Supabase Storage остаётся read-only как backup ещё месяц, потом удаляется

### Критерии готовности

- [ ] Новый bucket доступен, читается через CF proxy
- [ ] Upload через UI пишет в оба места
- [ ] 100% старых файлов смигрированы в YC
- [ ] Фронт читает из YC
- [ ] 7 дней без ошибок 4xx/5xx на запросы файлов

### Rollback

На любой фазе: меняю read-код обратно на `file_url`, оставляю dual-write работающим. Новые файлы уже есть в обоих местах, старые есть в обоих местах. Zero data loss.

### Риски

- **CORS.** Yandex Object Storage требует CORS настройки для загрузок из браузера. Terraform настраивает.
- **Стоимость CF egress.** CF бесплатно отдаёт из cache. При cold cache → из Yandex. Проконтролирую через CF Analytics.
- **Signed URLs (если выбрали):** усложнение — нужен API endpoint, который подписывает URLs перед отдачей фронту. Делаю если решишь идти этим путём.

---

## Sprint 3 — Compute: Netlify → Yandex Cloud Serverless Containers (10–14 дней)

**Цель:** хоститься на Yandex Cloud, Netlify отключить. Самый сложный и рискованный спринт.

### От тебя

1. Создать `service account` для GitHub Actions с ролью `container-registry.editor` + `serverless-containers.editor` — дать мне JSON-ключ
2. Подтвердить готовность **ночного окна** (02:00–05:00 МСК) для финального cutover. Предварительно предупреди первых пользователей (особенно Катю) о короткой технической паузе.
3. Подтверждение: ok ли добавить Dockerfile и GitHub Actions workflow в репо

### Что делаю я

**Фаза A — Docker-ready Next.js (2 дня):**
- Добавляю `output: 'standalone'` в `next.config.js`
- Пишу `Dockerfile` — multi-stage build: deps → builder → runner, alpine-based, ~120MB image
- `docker build && docker run` локально → проверка что Next.js нормально стартует в контейнере
- Локальный smoke test: зайти на localhost:3000, залогиниться, пройти все разделы

**Фаза B — Yandex infra (2 дня):**
- Terraform:
  - Container Registry `cr.yandex/crp.../archflow`
  - Serverless Container `archflow-web` с конфигом: 1 vCPU / 1 GB RAM / min 1 / max 10 instances
  - Environment variables из `.env.production`
  - VPC + Service Account для доступа к Container Registry

**Фаза C — GitHub Actions → Yandex (2 дня):**
- Workflow `.github/workflows/deploy-yc.yml`:
  - On `push` to `main` or `infra/migration-sprint-3`
  - `docker login` в Yandex Container Registry
  - `docker build` + tag с git SHA
  - `docker push`
  - `yc serverless container revision deploy` — атомарный switch
  - Rollback команда в описании workflow
- Тесты деплоя на staging branch до main

**Фаза D — Staging parallel run (3 дня):**
- `staging.archflow.ru` в CF → Yandex Serverless Container
- Я тестирую все критичные пути
- Ты тестируешь реальные сценарии из повседневной работы (create project, upload file, comment, visit, supply item)
- Прогон UptimeRobot в течение 72 часов без ошибок

**Фаза E — Cutover (ночью МСК, 1 час):**
- В 02:00 МСК: в CF меняю origin apex archflow.ru: `archflow-app.netlify.app` → `archflow-app.containers.yandexcloud.net` (или как будет URL)
- Проверка через 5 минут: сайт отвечает, auth работает, Supabase подключается
- Если всё ок — Netlify остаётся warm ещё 7 дней
- Если что-то не так — в CF возвращаю origin обратно за 30 секунд, баг фикшу утром

**Фаза F — Decomission (через 7–14 дней):**
- Stop Netlify auto-deploy
- Site в Netlify остаётся без deploys, но доступен как emergency rollback ещё месяц
- Потом удаление Netlify site

### Критерии готовности

- [ ] Docker image собирается локально и в CI
- [ ] Staging деплоится при push → тестируется 72 часа без ошибок
- [ ] Prod cutover прошёл, Web Vitals не ухудшились
- [ ] 7 дней на Yandex без инцидентов

### Rollback

**Фазы A–D:** ничего не трогают в проде, rollback не нужен.

**Фаза E (cutover):** CF origin обратно на Netlify — 30 секунд, zero downtime. Это критично: DNS не меняется, только origin, пользователи не заметят.

**Фаза F:** пока Netlify site жив — можно в любой момент откатиться. После удаления — через Sprint 2 (Storage) откат невозможен, но компоненты независимы.

### Риски

- **Cold start** Serverless Container может быть 2–4 сек. Лечится `min_instances = 1` (≈₽1 500/мес дополнительно).
- **Environment variables:** все `NEXT_PUBLIC_*` + server-side secrets надо аккуратно перенести. Использую Yandex Lockbox для секретов.
- **Resend / Telegram API:** проверить, что исходящие из Yandex Cloud в эти сервисы не блокируются. Если блокируются — переносим email на Yandex Sender Pro раньше запланированного.
- **Edge middleware:** Next.js middleware работает на Netlify Edge, в Serverless Container тоже работает, но тестировать на staging обязательно.

---

## Sprint 4 — Database: Supabase-on-Beget → Yandex Managed PostgreSQL (10–14 дней)

**Цель:** свой managed PostgreSQL с backup/failover, Beget Supabase отключить.

### От тебя

1. Бизнес-решение: **сохранять доступность во время миграции или принять 15-мин окно?** (Рекомендую первое — через logical replication.)
2. Утвердить `maintenance window` — второе ночное окно МСК
3. Terraform параметры: tier кластера PG (рекомендую `s2.micro` 2 vCPU / 8 GB / 50 GB диска = ~₽3 500/мес)

### Что делаю я

**Фаза A — Provision (2 дня):**
- Terraform: Yandex Managed PostgreSQL 15, 1 host для начала (HA можно добавить потом), отдельный user для приложения, отдельный для репликации
- Настройка `pg_hba.conf`, firewall, SSL enforced
- Backup: Yandex делает autoматически каждый день

**Фаза B — Schema replication (1 день):**
- Dump схемы с Beget Supabase
- Apply на Yandex PG
- Проверка: все tables, views, functions, RLS policies созданы
- **КРИТИЧНО:** Supabase auth schema (`auth.users`, `auth.identities`, `auth.sessions`) — если self-host GoTrue, нужен отдельный GoTrue инстанс, работающий с этой схемой

**Фаза C — Data replication setup (2 дня):**
- Logical replication: publication на Beget → subscription на Yandex PG
- Начальный snapshot + стриминг изменений в реальном времени
- Verification: `SELECT count(*) FROM each_table` на обеих сторонах, должны сходиться

**Фаза D — Supabase stack deployment (3 дня):**
- Компактная Yandex Compute VM (`s3-c2-m4`, 2 vCPU / 4 GB) на Debian
- Docker-compose со всеми Supabase сервисами: PostgREST, GoTrue, Realtime, Kong gateway
- Все они смотрят на Yandex Managed PG
- Supabase Studio опционально — для админ-интерфейса

**Фаза E — Staging cutover (2 дня):**
- Staging фронт начинает ходить в Yandex Supabase stack
- Полный тест: login, queries, realtime, file refs
- 48 часов паралельной работы, проверка что данные сходятся

**Фаза F — Production cutover (ночью, 15 минут):**
- 02:00 МСК: stop writes on Beget (maintenance mode в приложении)
- Проверка что replication caught up
- Promote Yandex PG as primary
- В `.env.production` меняю `NEXT_PUBLIC_SUPABASE_URL` на новый endpoint
- Redeploy Serverless Container
- Resume writes
- Проверка через тест-юзера и Sentry

**Фаза G — Decomission Beget (7 дней observer):**
- Beget Supabase остаётся read-only как backup
- После 7 дней без инцидентов — cancel Beget subscription

### Критерии готовности

- [ ] Yandex Managed PG запущен, схема совпадает с Supabase
- [ ] Logical replication стриминг без lag
- [ ] Все Supabase сервисы работают на Yandex VM
- [ ] Staging работает на новом стеке 48 часов
- [ ] Prod cutover, Web Vitals не ухудшились
- [ ] Realtime subscriptions работают (проверить на чате и tasks)

### Rollback

**Фазы A–E:** новый стек ничего не трогает на Beget.

**Фаза F (prod cutover):**
- Если проблема до stop writes: просто не переключаем, всё как было
- Если проблема после переключения но в первые минуты: обратно в `.env` старый URL, redeploy, потеря 0 данных
- Если проблема через час после переключения: данные уже разошлись, нужно делать reverse replication (сложно). Поэтому мониторим первые 30 минут особенно плотно.

### Риски

- **Supabase self-host сложность.** Можно упростить: миграция только БД (Beget PG → Yandex PG), а Supabase Cloud остаётся как auth/realtime провайдер. Это быстрее и надёжнее, но зависимость от Supabase Cloud сохраняется. Решение принимаем после staging-теста.
- **Realtime.** Supabase Realtime требует postgres `wal_level=logical`. Настраиваем в PG config.
- **RLS policies** надо скрипануть и ре-aplied на Yandex PG 1-в-1.
- **Auth JWT secret** — должен остаться тот же, иначе все пользователи разлогинятся. Это критично, проверяем на staging.

---

## Sprint 5 — Email: Resend → Yandex Sender Pro (5–7 дней)

**Цель:** исходящие письма из РФ, не зависеть от Resend.

### От тебя

1. Подать заявку в Yandex Sender Pro — нужна бизнес-верификация
2. Настроить DNS: SPF, DKIM, DMARC записи в Cloudflare (я подготовлю конкретные записи)
3. Подтвердить домен `archflow.ru` в Sender Pro консоли

### Что делаю я

- API integration layer в `nextjs-src/src/app/api/email/` — абстракция над email-провайдером
- Адаптер для Yandex Sender Pro (основной)
- Адаптер для Resend (fallback для не-РФ адресов, если нужно)
- Логика: по доменному окончанию получателя (`.ru`/`.рф` → Yandex, остальное → Resend)
- Template engine — переезжаем с inline HTML на MJML или React Email
- Тесты: отправка себе на gmail, yandex, mail.ru

### Rollback

Можно держать оба провайдера одновременно. Если Yandex Sender Pro не работает — переключаем все запросы на Resend через env flag.

---

## Sprint 6 — Backups, Multi-region, DR (5–7 дней)

**Цель:** убедиться что если Yandex Cloud умирает целиком, мы восстанавливаемся за часы, а не недели.

### От тебя

- Cloudflare R2 аккаунт (free tier 10GB — хватит для еженедельных снимков)
- Решение: какую частоту DR-синхронизации выбираем (ежедневно / еженедельно)

### Что делаю я

- **DB backups:** Yandex MPG уже делает daily, настраиваю export в Yandex OS + weekly sync в Cloudflare R2
- **Storage backup:** weekly rclone sync Yandex OS → Cloudflare R2
- **Config / IaC:** Terraform state в Yandex OS с версионированием, документированная процедура восстановления
- **DR runbook:** шаг за шагом как развернуть всё с нуля в другом облаке за 4–8 часов, если Yandex Cloud недоступен
- **Quarterly DR drill:** раз в квартал делаем учебное восстановление staging из backup — убеждаемся что процедуры работают

---

## Sprint 7 — Финальный cleanup и документация (3–5 дней)

- Удаление Netlify site
- Удаление Beget Supabase
- Обновление `PROJECT_CONTEXT.md`, `CLAUDE.md`, `README.md` с новой архитектурой
- Runbooks для типичных операций: deploy, rollback, DB migration, restore from backup
- Cost review: фактические расходы на Yandex Cloud за первый месяц, оптимизация
- Security audit: penetration test базовый, проверка secrets, RLS policies

---

## Таймлайн

```
Неделя 1:  Sprint 0 (решения, бэкапы, YC setup)
Неделя 2:  Sprint 1 (observability)
Неделя 3:  Sprint 2 (storage) — фазы A,B
Неделя 4:  Sprint 2 (storage) — фазы C,D,E
Неделя 5:  Sprint 3 (compute) — фазы A,B,C
Неделя 6:  Sprint 3 (compute) — фазы D,E,F  ← первый prod cutover
Неделя 7:  Sprint 4 (database) — фазы A,B,C,D
Неделя 8:  Sprint 4 (database) — фазы E,F,G  ← второй prod cutover
Неделя 9:  Sprint 5 (email)
Неделя 10: Sprint 6 (DR)
Неделя 11: Sprint 7 (cleanup)
```

**Итого: ~11 недель (2.5–3 месяца) при 2–4 часах в день.**

Можно сократить до 6–8 недель если отложить Sprint 5 (email) и Sprint 6 (DR) на потом — они не блокируют главную задачу.

---

## Резюме того, что нужно от тебя

### Немедленно (Sprint 0)

1. **Создать аккаунт Yandex Cloud** + привязать карту → получить грант
2. **Решить по Supabase:** full self-host или только БД на Yandex + Supabase Cloud для auth/realtime
3. **Передать доступы:** Yandex Cloud `cloud_id`, `folder_id`, Service Account JSON ключ (можно через шифрованный канал)
4. **Telegram-канал для алертов** (новый или существующий)

### По ходу спринтов

- Утвердить maintenance-окна для двух ночных cutover (Sprint 3 compute, Sprint 4 database)
- Предупреждать ключевых пользователей (Катя и другие активные) за сутки до каждого окна
- Тестировать staging перед каждым cutover — особенно свои типичные сценарии, которые я могу не покрыть в автотестах
- Бизнес-решения (email провайдер, secondary RU-cloud, etc.) — 1 вопрос ≤ 1 минута на размышление

### Не трогаю без твоего согласия

- Deploy в прод вне запланированных окон
- Удаление чего-либо (Netlify site, Beget subscription, старые файлы) — только по явному `go`
- Изменение биллинг-планов
- Любые действия с реальными деньгами / инвойсами / платёжными данными
- Решения, затрагивающие UX или фичи продукта

---

## Рейтинг важности спринтов

| Sprint | Важность | Блокирует? |
|---|---|---|
| 0 — Решения + бэкапы | 🔴 Критично | Всё |
| 1 — Observability | 🔴 Критично | Спринты 2–4 без него — безрассудны |
| 2 — Storage | 🟡 Высокая | Независим |
| 3 — Compute | 🔴 Критично | Главная цель — отвязаться от Netlify |
| 4 — Database | 🔴 Критично | Отвязаться от Beget |
| 5 — Email | 🟢 Средняя | Можно отложить |
| 6 — DR | 🟡 Высокая | Можно отложить, но не надолго |
| 7 — Cleanup | 🟢 Средняя | Финализация |

**Минимальный путь для "отвязки от Netlify+Beget" = Sprints 0, 1, 2, 3, 4** = ~8 недель.

Email и DR можно добавить уже после, не прерывая работу проекта.

---

## Открытые вопросы для обсуждения

1. **Supabase Cloud vs. self-host на Yandex?** Решает сложность миграции и цену владения.
2. **Email провайдер?** Yandex Sender Pro требует бизнес-верификации (может занять 1–2 недели). Альтернативы: UniSender, Mailgun EU.
3. **Secondary RU-cloud** (Selectel/Timeweb) нужен с первого дня или позже?
4. **Блог / маркетинг-сайт** (если планируется) — хостим там же или отдельно?
5. **Мобильное приложение** — PWA остаётся или будет native? Если native — влияет на auth архитектуру.
6. **Международные пользователи** — планируется ли активная работа за пределами СНГ? Если да — добавляем global edge через CF Workers.

---

**Следующий шаг:** когда будешь готов начать, скажи «начинаем Sprint 0» и я сразу пойду настраивать бэкапы + ждать от тебя данных по Yandex Cloud аккаунту.
