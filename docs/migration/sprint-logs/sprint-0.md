# Sprint 0 — Подготовка и бэкапы

**Start**: 2026-04-11
**Status**: 🟡 In progress
**Owner**: Claude + @evgeny

## Цель

Создать локальную систему бэкапов Supabase (DB + Storage), развернуть рабочий фреймворк миграции в `docs/migration/`, собрать список решений от пользователя. Подготовиться к Sprint 1 (Yandex Cloud staging) без риска для текущего production.

## Принципы

- **Не ломать текущий prod** — все работы в отдельной ветке/директории, Supabase остаётся источником истины до Sprint 5
- **Бэкапы нужны вчера** — даже без Yandex Cloud, поднимаем локальные бэкапы сразу
- **Decisions → log** — каждое принятое решение фиксируем здесь

## Что сделано (Claude)

### Инструменты
- ✅ Установлены: `libpq` (pg_dump 18.3), `rclone` v1.73.4, `gnupg` 2.5.18, `jq` 1.8.1
- ✅ Путь к pg_dump: `/opt/homebrew/opt/libpq/bin/pg_dump` (keg-only)
- ⏸ Отложено: `terraform`, `yc` CLI — поставим когда появится Yandex Cloud аккаунт

### Структура проекта
```
docs/migration/
├── README.md                  ← главный индекс
├── runbooks/
│   ├── 00-sprint0-setup.md    ← что делать в Sprint 0
│   ├── 10-db-backup.md        ← ежедневный pg_dump
│   ├── 20-storage-backup.md   ← еженедельный rclone sync
│   └── 30-restore.md          ← restore из бэкапа
├── scripts/
│   ├── backup-db.sh           ← PGDUMP → GPG → local
│   ├── backup-storage.sh      ← rclone sync
│   └── verify-backups.sh      ← health check
├── launchd/
│   ├── com.archflow.backup-db.plist       ← daily 04:17
│   ├── com.archflow.backup-storage.plist  ← Sunday 05:23
│   ├── install.sh
│   └── uninstall.sh
├── terraform/staging/         ← Yandex Cloud IaC (skeleton)
│   ├── versions.tf
│   ├── variables.tf
│   ├── network.tf
│   ├── postgres.tf
│   ├── storage.tf
│   ├── registry.tf
│   └── README.md
└── sprint-logs/
    └── sprint-0.md            ← этот файл
```

### Скрипты
- ✅ `backup-db.sh`: pg_dump custom format compressed → GPG encrypt → retention cleanup → health file
- ✅ `backup-storage.sh`: rclone sync всех бакетов с fast-list + retention
- ✅ `verify-backups.sh`: health check с цветным выводом + exit codes для мониторинга

### Launchd
- ✅ Два plist агента готовы к установке через `install.sh`
- ⏸ Пока не установлены — ждём заполнения `~/.archflow-backup.env`

### Terraform
- ✅ Скелет для staging (не применяется):
  - VPC + subnet в ru-central1-a
  - Managed Postgres 16 (s2.micro, 20 GB SSD)
  - Object Storage bucket с versioning + CORS
  - Container Registry + CI service account
- 📋 Оценка стоимости staging: ~1900 ₽/мес

## Что требует решения от @evgeny

### 🔴 Blocker (без этого нельзя идти в Sprint 1)

1. **Yandex Cloud аккаунт**
   - [ ] Физлицо или ООО? (ООО даёт НДС-вычет но нужны реквизиты)
   - [ ] Регион: `ru-central1` (Москва) — рекомендуется
   - [ ] Кто владелец? (твой логин или shared?)
   - [ ] Карта привязана, бюджет согласован (≥ 2000 ₽/мес для staging, ~5-8к для prod)

2. **Supabase credentials — direct Postgres connection**
   - [ ] В `.env.local` только REST keys. Нужен полный connection string: `postgres://USER:PASS@HOST:5432/postgres`
   - [ ] Посмотреть в админке Beget Supabase (обычно Settings → Database)
   - [ ] Если не найдёшь — написать в поддержку Beget

3. **S3 credentials для Supabase Storage**
   - [ ] Access/Secret keys для S3 API (отдельны от service role)
   - [ ] Endpoint path — обычно `{SUPABASE_URL}/storage/v1/s3`
   - [ ] Посмотреть в админке Supabase Dashboard → Storage → S3

### 🟡 Важно но не блокирует

4. **Supabase hosting mode (target)**
   - Вариант A: **Managed Supabase Cloud** (supabase.com) — они сами хостят, мы просто point to them
     - Pro: zero-ops, встроенная аналитика, свежая версия, глобальный CDN
     - Con: данные EU/US, payment в USD (санкционно-рискованно из РФ)
   - Вариант B: **Self-host Supabase на Yandex** (docker-compose stack)
     - Pro: данные в РФ, оплата рубли, полный контроль
     - Con: сами эксплуатируем (бэкапы, обновления, мониторинг)
   - Вариант C: **Отказаться от Supabase stack**, перейти на Managed Postgres + кастомный backend
     - Pro: минимум vendor lock-in, Yandex-native
     - Con: переписывать auth, realtime, storage API
   - **Рекомендация Claude**: B — self-host на Yandex. Есть reference docker-compose, работаем в своём периметре.

5. **Telegram канал для алертов**
   - [ ] Создать приватный канал "ArchFlow Ops" или использовать существующий feedback bot
   - [ ] Куда падают алерты: failed backups, high error rate, DB disk usage > 80%

6. **GPG ключ для шифрования бэкапов**
   - [ ] Сгенерировать свой GPG ключ: `gpg --full-generate-key`
   - [ ] Экспортировать public key в 1Password / USB
   - [ ] Передать user-id (email) в `GPG_RECIPIENT`

## Рисики

| Риск | Импакт | Mitigation |
|------|--------|------------|
| Бэкапы падают тихо | Потеря данных | `verify-backups.sh` + Telegram alert (Sprint 1) |
| Закончилось место на macbook | Backups прекращаются | Retention policy + мониторинг `df -h` |
| GPG ключ потерян | Все зашифрованные бэкапы бесполезны | Key backup на USB + 1Password |
| Ноутбук украден | Credentials в открытом виде | `chmod 600 ~/.archflow-backup.env`, FileVault ON |

## Next Actions (в этом же спринте)

- [x] Создать структуру `docs/migration/`
- [x] Написать backup скрипты
- [x] Написать launchd plist + installer
- [x] Написать Terraform skeleton
- [x] Написать runbooks 00-30
- [ ] @evgeny заполнить `~/.archflow-backup.env`
- [ ] @evgeny сгенерировать GPG ключ
- [ ] @evgeny первый ручной `backup-db.sh` + `backup-storage.sh`
- [ ] @evgeny `bash docs/migration/launchd/install.sh`
- [ ] Проверить через 24 часа: `bash docs/migration/scripts/verify-backups.sh`
- [ ] @evgeny ответить на 6 вопросов выше

## Exit Criteria для Sprint 0

- [ ] Минимум один полный бэкап БД успешно создан и расшифрован обратно
- [ ] Минимум один sync бакетов storage выполнен
- [ ] Launchd агенты активны, `launchctl list` показывает оба
- [ ] `verify-backups.sh` → `OK`
- [ ] Все 6 решений от @evgeny зафиксированы в этом файле
- [ ] Yandex Cloud аккаунт готов к использованию (Sprint 1 можно стартовать)

## Notes

- **2026-04-11**: archflow.ru успешно переведён на Cloudflare DNS, Netlify остаётся origin. Это отдельный fix, не часть миграции, но показывает что Netlify → Yandex переезд вынужден (санкционные блокировки EU edge).
- **archflow.art dropped from scope** — это 301 redirect на archflow.ru, не нужен для миграции. Рекомендация: отключить auto-renewal.
