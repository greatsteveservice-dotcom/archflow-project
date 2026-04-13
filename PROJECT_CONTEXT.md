# ArchFlow — Project Context
> Этот файл — главный источник правды о проекте.
> Обновляй после каждого значимого решения.

---

## Суть продукта

SaaS-платформа для дизайнеров интерьера и строительных компаний.
Управление проектами через 4 раздела: Дизайн, Комплектация, Авторский надзор, Настройки.
Целевой рынок: СНГ (Россия в приоритете).
Статус: MVP готов, идёт онбординг первых пользователей.

---

## Инфраструктура

| Компонент | Текущее решение | Детали |
|-----------|----------------|--------|
| Frontend | Next.js 14 (App Router, SPA) | Единая точка входа `page.tsx` |
| Backend | Supabase self-hosted | Beget Cloud VPS (85.198.66.31), 2 core / 3GB RAM |
| App VPS | Beget Cloud | 212.67.10.6 (СПБ), nginx + Node.js standalone |
| Домен | archflow.ru | Cloudflare DNS → App VPS |
| SSL | Let's Encrypt | certbot, автообновление, проверка ежедневно |
| CI/CD | rsync deploy | Сборка локально → rsync → symlink switch → systemd restart |
| Мониторинг | Cron + Telegram | health-check.sh (каждую минуту), ssl-check.sh (ежедневно) |
| Бэкапы | REST API export | backup-rest.sh (ежедневно в 3:00), 15 таблиц → JSON, 7 дней ротация |

### VPS Cron (пользователь archflow)
```
* * * * *  /home/archflow/scripts/health-check.sh   # Supabase + App мониторинг
0 8 * * *  /home/archflow/scripts/ssl-check.sh      # SSL сертификат
0 3 * * *  /home/archflow/scripts/backup-rest.sh     # Бэкап БД через REST API
```

### Известные проблемы инфраструктуры
- Supabase VPS (3GB RAM) — переодически падает от нехватки памяти. Нужно увеличить до 4-6GB или мигрировать.
- PostgreSQL connection string через Beget неизвестен — pg_dump невозможен. Бэкап через REST API как workaround.
- Миграция 033 (UPDATE policy для design_files) не применена — ренейм работает через API route с service role key.

---

## Роли в системе

| Роль | Доступ |
|---|---|
| Дизайнер | Полный доступ |
| Заказчик | Только просмотр |
| Подрядчик | Просмотр + фото + комментарии |
| Комплектатор | Просмотр Supply |
| Ассистент | По усмотрению дизайнера |

Приглашение через invite-link с base64 токенами. 5 ролей x 20 флагов прав (`permissions.ts`).

---

## Архитектура

### 4 основных раздела:
1. **Дизайн** — папки помещений, загрузка фото/PDF, лайтбокс с зумом, переименование
2. **Комплектация (Supply)** — позиции, Timeline (Gantt), Этапы, Импорт Excel, Настройки
3. **Авторский надзор (Journal)** — Визиты, Фотофиксация, Счета, Планирование
4. **Настройки** — Роли и доступ, Детали проекта

### Стек:
- **SPA** — `page.tsx` (client-side routing через useState + history)
- **Data layer** — `queries.ts` (~70KB, 55+ функций), `hooks.ts` (22 хука), `types.ts`
- **Auth** — Supabase Auth (email/password), `auth.tsx` контекст
- **Real-time** — Supabase `postgres_changes` → auto-refetch hooks
- **PWA** — Service Worker с cache-first (static) + network-first (API), push-уведомления
- **Тёмная тема** — CSS variables (RGB) + `.dark` class + `ThemeProvider`

### API Routes (server-side):
- `/api/auth/signup` — регистрация
- `/api/feedback` — обратная связь → Telegram
- `/api/push/send` — push-уведомления
- `/api/design/rename` — переименование файлов (service role key, bypass RLS)

---

## База данных — 15+ таблиц

**Ядро:** `profiles`, `projects`, `project_members`
**Journal:** `visits`, `photo_records`, `invoices`, `visit_reports`, `visit_remarks`
**Supply:** `supply_items`, `stages`, `contract_payments`
**Design:** `design_files`
**Другое:** `documents`, `tasks`, `chat_messages`

33 миграции в `supabase/migrations/`. RLS включён на всех таблицах.

---

## Дизайн-система (строго соблюдать)

### Типографика:
- Заголовки: **Playfair Display 700** (serif)
- Лейблы и интерфейс: **IBM Plex Mono 400** (monospace)

### Цветовая палитра (только это):
- `#111111` — основной текст / фон инвертированных блоков
- `#F6F6F4` — фон страниц
- `#EBEBEB` — разделители, бордеры
- `#FFFFFF` — фон карточек

### Принципы:
- Строго чёрно-белый, нет цветных акцентов
- `border-radius: 0` — нет скруглений
- Зазоры между блоками: 2px
- Hover: инверсия цвета
- Ghost buttons (обводка, без заливки)

---

## Домен и GitHub

- Домен: **archflow.ru** (Cloudflare DNS)
- GitHub: `https://github.com/greatsteveservice-dotcom/archflow-project`

## Demo-доступ

- Дизайнер: `demo@archflow.ru` / `oDEgaa9rsAJD&ocw`

---

## Что НЕ делать

- НЕ добавлять цветные акценты в UI
- НЕ добавлять border-radius к блокам
- НЕ менять шрифтовую пару без обсуждения
- НЕ менять навигационную структуру
- НЕ менять логику ролей/прав

---

## Спринт-лог

| Спринт | Содержание | Коммит |
|--------|-----------|--------|
| 1-4 | CRUD, Auth, поиск/фильтры, UX polish | Отдельные коммиты |
| 5-8 | Supervision, Design tab, PWA, export, notifications | 214a29f |
| 9 | Dark theme, avatar, PWA icons, SupplySettings, YM analytics | c2d74fe |
| 10 | Global search (Cmd+K), task assignment, realtime, SW | В процессе |
| **0 (ops)** | **VPS deploy, мониторинг, бэкапы, SSL** | **Текущий** |

### Sprint 0 — Ops (апрель 2026)
- [x] VPS deploy (212.67.10.6) — nginx + Node.js standalone + systemd
- [x] SSL cert (Let's Encrypt) через certbot
- [x] Cloudflare DNS (archflow.ru → VPS)
- [x] Health monitoring — Telegram алерты при падении Supabase/App (каждую минуту)
- [x] SSL expiry check — ежедневная проверка, алерт при <14 дней
- [x] REST API backup — ежедневный экспорт 15 таблиц в JSON (7 дней ротация)
- [x] Service Worker fix — auto-versioning, offline page, update banner
- [x] Design lightbox fix — compact bottom bar, rename через API route
- [ ] pg_dump backup — заблокировано (нет PostgreSQL connection string)
- [ ] Yandex Cloud migration — запланировано (Sprint 2-4)

---

## Лог решений

| Дата | Решение | Причина |
|------|---------|---------|
| март 2026 | Supabase на Beget Cloud | Быстрый старт, встроенный Auth + Storage |
| март 2026 | SPA вместо App Router | Проще навигация, единый state |
| март 2026 | Netlify Deploy | Первоначальный деплой |
| апр 2026 | Cloudflare DNS | Netlify NS1 блокировал RU трафик (GeoDNS → Frankfurt) |
| апр 2026 | VPS deploy (Beget SPB) | Полный контроль, нет блокировок для RU пользователей |
| апр 2026 | REST API backup | Нет прямого доступа к PostgreSQL на Beget |
| апр 2026 | API route для rename | Нет UPDATE RLS policy на design_files, workaround с service role |

---

*Последнее обновление: апрель 2026*
