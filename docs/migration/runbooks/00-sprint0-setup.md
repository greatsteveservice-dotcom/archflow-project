# Sprint 0 — Setup Runbook

**Goal**: Подготовить локальное окружение для миграции, настроить ежедневные бэкапы Supabase → локально, собрать решения.

## Предусловия

- macOS (ARM64/x86) с Homebrew
- Доступ к `nextjs-src/.env.local` (содержит Supabase URL + service role key)
- **Направление требующее решения**: прямой Postgres connection string (host/port/user/password) от Supabase на Beget. `.env.local` содержит REST API ключи, но не DB credentials. Нужно получить из админки Beget Supabase или спросить у провайдера.

## Шаги

### 1. Установить tooling

```bash
brew install libpq rclone gnupg jq
```

`libpq` — keg-only, `pg_dump` будет по пути `/opt/homebrew/opt/libpq/bin/pg_dump`. Добавь в PATH или используй абсолютный путь.

```bash
# Опционально: добавить libpq в PATH
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
```

Проверка:
```bash
/opt/homebrew/opt/libpq/bin/pg_dump --version   # PostgreSQL 18+
rclone --version                                # 1.73+
gpg --version                                   # 2.5+
jq --version
```

### 2. Собрать секреты в `~/.archflow-backup.env`

Создать файл с переменными:

```bash
cat > ~/.archflow-backup.env <<'EOF'
# Supabase direct Postgres (from Beget admin panel)
SUPABASE_DB_HOST=oyklaglogmaniet.beget.app
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=<get-from-beget-admin>

# Supabase Storage S3-compatible endpoint
# (Beget Supabase exposes S3 via /storage/v1/s3 with service role key)
SUPABASE_S3_ENDPOINT=https://oyklaglogmaniet.beget.app/storage/v1/s3
SUPABASE_S3_ACCESS_KEY=<service-role-or-storage-key>
SUPABASE_S3_SECRET_KEY=<from-beget-admin>
SUPABASE_S3_REGION=ru-central1

# Local backup destination
BACKUP_ROOT="$HOME/archflow-backups"

# GPG recipient for encryption (gpg --list-keys → user-id)
GPG_RECIPIENT=evgeny@archflow.local

# Retention policy (days)
DB_RETENTION_DAYS=30
STORAGE_RETENTION_DAYS=90
EOF
chmod 600 ~/.archflow-backup.env
```

### 3. Создать GPG ключ (если нет)

```bash
gpg --full-generate-key
# → RSA 4096, no expiration, passphrase в keychain
gpg --list-keys
```

Экспортировать public-key backup в `~/Documents/archflow-gpg-pub.asc` и разложить в безопасное место (USB, 1Password).

### 4. Протестировать pg_dump вручную

```bash
source ~/.archflow-backup.env
/opt/homebrew/opt/libpq/bin/pg_dump \
  "postgresql://$SUPABASE_DB_USER:$SUPABASE_DB_PASSWORD@$SUPABASE_DB_HOST:$SUPABASE_DB_PORT/$SUPABASE_DB_NAME" \
  --no-owner --no-privileges --format=custom \
  -f /tmp/archflow-test.dump
```

Если работает — создаст файл несколько MB.

### 5. Протестировать rclone с Supabase Storage

```bash
# Конфигурация S3 remote в rclone
rclone config create supabase-storage s3 \
  provider Other \
  access_key_id "$SUPABASE_S3_ACCESS_KEY" \
  secret_access_key "$SUPABASE_S3_SECRET_KEY" \
  endpoint "$SUPABASE_S3_ENDPOINT" \
  region "$SUPABASE_S3_REGION"

# Список бакетов
rclone lsd supabase-storage:
```

### 6. Запустить тестовый бэкап

```bash
bash docs/migration/scripts/backup-db.sh
bash docs/migration/scripts/backup-storage.sh
```

Проверить:
```bash
ls -lh ~/archflow-backups/db/
ls -lh ~/archflow-backups/storage/
cat ~/archflow-backups/logs/backup-db-*.log | tail -30
```

### 7. Установить launchd агенты

```bash
bash docs/migration/launchd/install.sh
launchctl list | grep archflow
```

## Acceptance Criteria

- [x] pg_dump, rclone, gpg установлены
- [ ] `~/.archflow-backup.env` создан с реальными credentials
- [ ] GPG ключ создан, public-key вне machine
- [ ] Ручной бэкап DB работает, файл появляется в `~/archflow-backups/db/`
- [ ] Ручной бэкап Storage работает (хотя бы 1 bucket копируется)
- [ ] Launchd агенты установлены и активны
- [ ] `docs/migration/sprint-logs/sprint-0.md` обновлён с решениями

## Blockers

- Нужен direct Postgres connection string от Beget (host/user/password). Спросить у поддержки Beget или найти в их панели управления.
- Нужны S3 access keys для Supabase Storage (обычно генерятся отдельно от service role key в новых версиях Supabase).
- Нужно решение пользователя: Yandex Cloud аккаунт (физлицо/юрлицо), регион, биллинг.
