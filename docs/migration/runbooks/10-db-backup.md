# Runbook: Daily Postgres Backup

**Цель**: ежедневный автоматический pg_dump БД Supabase → локальный диск + GPG шифрование.

## Архитектура

```
Supabase (Beget)  ──pg_dump──▶  ~/archflow-backups/db/archflow-db-YYYYMMDD-HHMMSS.dump
                                            │
                                            └── gpg --encrypt ──▶  *.dump.gpg (unencrypted удалён)
```

Запуск: launchd агент `com.archflow.backup-db`, ежедневно в **04:17 local**.

## Первичная настройка

### Переменные окружения

Создать `~/.archflow-backup.env` (chmod 600) по шаблону из `00-sprint0-setup.md`.

Критичные поля:
- `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`
- `SUPABASE_DB_NAME` (обычно `postgres`)
- `GPG_RECIPIENT` — user-id твоего GPG ключа
- `BACKUP_ROOT` — обычно `$HOME/archflow-backups`
- `DB_RETENTION_DAYS` — сколько дней хранить (по умолчанию 30)

### Установка launchd

```bash
bash docs/migration/launchd/install.sh
launchctl list | grep archflow  # убедиться что com.archflow.backup-db висит
```

## Тестирование

### Ручной запуск

```bash
bash docs/migration/scripts/backup-db.sh
# → создаст ~/archflow-backups/db/archflow-db-<ts>.dump.gpg
# → лог в ~/archflow-backups/logs/backup-db-<ts>.log
```

### Проверка последнего бэкапа

```bash
bash docs/migration/scripts/verify-backups.sh
```

Должно вывести `OK    DB backup: 0h old, 12M` (или похожее).

### Проверка что файл расшифровывается

```bash
LATEST=$(ls -t ~/archflow-backups/db/*.dump.gpg | head -1)
gpg --decrypt "$LATEST" > /tmp/test.dump
ls -lh /tmp/test.dump   # должен быть несколько MB
/opt/homebrew/opt/libpq/bin/pg_restore --list /tmp/test.dump | head -20
rm /tmp/test.dump
```

## Частые проблемы

### "pg_dump: error: connection to server ... FATAL: password authentication failed"
Неверный `SUPABASE_DB_PASSWORD`. Получи пароль из админки Beget Supabase.

### "pg_dump: error: server version mismatch"
Локальный `pg_dump` должен быть >= версии сервера. `brew upgrade libpq` решает.

### "gpg: no valid addressees"
`GPG_RECIPIENT` не соответствует ни одному ключу. Проверь:
```bash
gpg --list-keys
```

### Launchd не запускает задачу
```bash
# Проверить статус
launchctl list com.archflow.backup-db

# Посмотреть ошибки
tail ~/archflow-backups/logs/launchd-db.err.log

# Перезагрузить
launchctl unload ~/Library/LaunchAgents/com.archflow.backup-db.plist
launchctl load ~/Library/LaunchAgents/com.archflow.backup-db.plist

# Вызвать вручную через launchd (не через скрипт, чтобы проверить env)
launchctl start com.archflow.backup-db
```

Если macOS блокирует по Full Disk Access → System Settings → Privacy & Security → Full Disk Access → добавить `/bin/bash`.

## Offsite Copy (позже)

После поднятия Yandex Object Storage:
1. Добавить в скрипт: `rclone copy "$ENC_FILE" yandex-os:archflow-backups/db/`
2. Или ставим отдельный агент раз в неделю для копирования последних 7 дампов
