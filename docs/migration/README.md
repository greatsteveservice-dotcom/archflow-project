# ArchFlow Migration Workspace

Рабочая директория для миграции ArchFlow с текущей инфраструктуры (Netlify + Supabase on Beget) на Yandex Cloud (Serverless Containers + Managed Postgres + Object Storage).

План см.: `~/Desktop/ArchFlow_Migration_Plan.md` (копия `docs/MIGRATION_SPRINTS.md`).

## Структура

```
docs/migration/
├── README.md               ← этот файл
├── runbooks/               ← пошаговые инструкции (что делать когда)
│   ├── 00-sprint0-setup.md
│   ├── 10-db-backup.md
│   ├── 20-storage-backup.md
│   └── 30-restore.md
├── scripts/                ← исполняемые скрипты
│   ├── backup-db.sh        ← ежедневный pg_dump
│   ├── backup-storage.sh   ← еженедельный rclone sync
│   └── verify-backups.sh   ← проверка целостности
├── launchd/                ← macOS launchd agents (cron-аналог)
│   ├── com.archflow.backup-db.plist
│   └── com.archflow.backup-storage.plist
├── terraform/              ← IaC для Yandex Cloud
│   └── staging/            ← staging окружение (скелет)
└── sprint-logs/            ← журнал принятых решений
    └── sprint-0.md
```

## Sprint Status

- **Sprint 0** — Подготовка и бэкапы: 🟡 in progress
- **Sprint 1** — Yandex Cloud staging setup: ⚪ pending
- **Sprint 2** — DB миграция staging: ⚪ pending
- **Sprint 3** — Storage миграция staging: ⚪ pending
- **Sprint 4** — App контейнеризация: ⚪ pending
- **Sprint 5** — Cutover (staging → prod): ⚪ pending
- **Sprint 6** — Production staging test: ⚪ pending
- **Sprint 7** — Финальный cutover + мониторинг: ⚪ pending

## Quick Commands

```bash
# Ручной бэкап БД прямо сейчас
bash docs/migration/scripts/backup-db.sh

# Ручной бэкап Storage прямо сейчас
bash docs/migration/scripts/backup-storage.sh

# Проверить последние бэкапы
ls -lht ~/archflow-backups/db/ | head -10
ls -lht ~/archflow-backups/storage/ | head -10

# Установить launchd агенты (автоматические бэкапы)
bash docs/migration/launchd/install.sh

# Удалить launchd агенты
bash docs/migration/launchd/uninstall.sh
```

## Security Notes

- Все credentials (DB password, S3 keys, etc.) **НЕ** коммитим в git.
- Секреты храним в `~/.archflow-backup.env` (chmod 600).
- Бэкапы GPG-шифруем перед сохранением.
- Бэкап-директория `~/archflow-backups/` добавлена в `.gitignore` глобально (не является частью проекта).
