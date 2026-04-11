# Runbook: Weekly Storage Backup

**Цель**: еженедельный sync всех бакетов Supabase Storage → локальный снапшот.

## Архитектура

```
Supabase Storage (S3 API)  ──rclone sync──▶  ~/archflow-backups/storage/snapshot-YYYYMMDD/
                                                  │
                                                  └── latest → symlink на последний snapshot
```

Запуск: launchd агент `com.archflow.backup-storage`, воскресенье **05:23 local**.

## Первичная настройка

### 1. Получить S3 credentials для Supabase Storage

Supabase Storage экспонирует S3-совместимый API. Для self-hosted (Beget):
- **Endpoint**: `https://oyklaglogmaniet.beget.app/storage/v1/s3`
- **Access Key / Secret Key**: генерятся в админке Supabase Dashboard → Storage → Settings → S3 Credentials
- **Region**: `ru-central1` (или что настроено)

Если админка не доступна — можно использовать service role JWT напрямую через `supabase-js`, но для rclone нужны именно статичные S3 ключи. Запросить у провайдера Beget.

Альтернатива на время Sprint 0: использовать API endpoint напрямую через curl + service role key для скачивания файлов (но это медленнее rclone).

### 2. Настроить rclone remote

```bash
source ~/.archflow-backup.env

rclone config create supabase-storage s3 \
  provider Other \
  access_key_id "$SUPABASE_S3_ACCESS_KEY" \
  secret_access_key "$SUPABASE_S3_SECRET_KEY" \
  endpoint "$SUPABASE_S3_ENDPOINT" \
  region "$SUPABASE_S3_REGION" \
  force_path_style true
```

Проверить:
```bash
rclone listremotes                      # должен быть "supabase-storage:"
rclone lsd supabase-storage:            # список бакетов (design-files, avatars, ...)
rclone ls supabase-storage:design-files --max-depth 1 | head -5
```

### 3. Запустить ручной sync

```bash
bash docs/migration/scripts/backup-storage.sh
```

Первый прогон скачает все файлы (может быть десятки-сотни MB). Последующие прогоны только дельту.

### 4. Проверить снапшот

```bash
ls -lh ~/archflow-backups/storage/
du -sh ~/archflow-backups/storage/snapshot-*
ls ~/archflow-backups/storage/latest/
```

## Установка автозапуска

```bash
bash docs/migration/launchd/install.sh
launchctl list com.archflow.backup-storage
```

## Частые проблемы

### "rclone: AccessDenied" при lsd
Неверные ключи или эндпоинт. Проверь `rclone config file` и сверь с `~/.archflow-backup.env`.

### Медленный sync
По умолчанию rclone использует 4 потока. В скрипте выставлено `--transfers=8 --checkers=16 --fast-list`. Для крупных бакетов можно увеличить до `--transfers=16`.

### Снапшот занимает много места
- Смени `STORAGE_RETENTION_DAYS` в `.archflow-backup.env` (по умолчанию 90)
- Или переключись на `rclone copy` с hard links между снапшотами (advanced)

### Бакет приватный но файлы публично-читаемые в Supabase
Это нормально — Supabase Storage использует RLS/signed URLs. Для бэкапа rclone использует service-role credentials, которые видят всё.

## Offsite Copy (позже)

После поднятия Yandex Object Storage:
```bash
rclone sync ~/archflow-backups/storage/latest/ yandex-os:archflow-storage-backup/
```

Запускать раз в 2 недели отдельным агентом.
