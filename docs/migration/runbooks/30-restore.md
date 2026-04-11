# Runbook: Restore from Local Backup

**Когда нужно**: восстановление БД после инцидента, тестовый rehearsal, миграция в staging Yandex Cloud.

## Pre-flight

- [ ] Достаточно места на диске (~ 3x размер дампа для распакованной БД)
- [ ] Целевой Postgres доступен и пустой (или есть план перезаписи)
- [ ] GPG ключ который шифровал бэкап доступен локально
- [ ] `pg_restore`, `gpg` установлены

## Шаг 1. Расшифровать дамп

```bash
cd ~/archflow-backups/db
LATEST=$(ls -t *.dump.gpg | head -1)
echo "Using: $LATEST"

gpg --decrypt "$LATEST" > /tmp/archflow-restore.dump
ls -lh /tmp/archflow-restore.dump
```

## Шаг 2. Проверить содержимое

```bash
/opt/homebrew/opt/libpq/bin/pg_restore --list /tmp/archflow-restore.dump | head -30
# Должен показать: CREATE TABLE, INSERT, CREATE INDEX, и т.п.

# Посчитать таблицы
/opt/homebrew/opt/libpq/bin/pg_restore --list /tmp/archflow-restore.dump | grep -c "TABLE DATA"
```

## Шаг 3a. Restore в локальный Postgres (тест)

```bash
# Создать тестовую БД
createdb -h localhost -U postgres archflow_restore_test

pg_restore \
  --host=localhost --port=5432 --username=postgres \
  --dbname=archflow_restore_test \
  --no-owner --no-privileges \
  --verbose \
  /tmp/archflow-restore.dump

# Проверка
psql -h localhost -U postgres -d archflow_restore_test -c "\dt public.*"
psql -h localhost -U postgres -d archflow_restore_test -c "SELECT count(*) FROM projects;"
```

## Шаг 3b. Restore в Yandex Managed Postgres

```bash
# Подключение настроено через cluster fqdn (из terraform output pg_host_fqdn)
export PG_HOST="<fqdn>"
export PG_USER="archflow"
export PG_PASS="<from terraform.tfvars.local>"
export PG_DB="archflow"

PGPASSWORD="$PG_PASS" pg_restore \
  --host="$PG_HOST" --port=6432 --username="$PG_USER" \
  --dbname="$PG_DB" \
  --no-owner --no-privileges \
  --verbose \
  /tmp/archflow-restore.dump
```

Yandex Managed Postgres использует порт 6432 (pgbouncer) или 5432 напрямую — см. outputs.

## Шаг 4. Verify

```bash
# Sanity checks
psql "$PG_CONN" -c "SELECT count(*) FROM auth.users;"
psql "$PG_CONN" -c "SELECT count(*) FROM public.projects;"
psql "$PG_CONN" -c "SELECT max(created_at) FROM public.chat_messages;"

# Все таблицы Supabase (auth, storage, realtime) + public
psql "$PG_CONN" -c "\dn"
```

## Шаг 5. Cleanup

```bash
rm /tmp/archflow-restore.dump  # НЕ оставляем plaintext на диске
```

## Storage Restore

Для бакетов — просто копируем снапшот обратно:

```bash
# Локально (тест)
rclone copy ~/archflow-backups/storage/latest/ /tmp/restore-check/

# В Yandex Object Storage (staging)
rclone copy ~/archflow-backups/storage/latest/ yandex-os:archflow-staging-files/
```

## Rehearsal

Раз в месяц провести полный dry-run restore в локальный Postgres, чтобы убедиться что бэкапы валидны. Записать в `sprint-logs/backup-rehearsals.md`.
