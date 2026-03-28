# CLAUDE.md — ArchFlow
> Инструкции для Claude Code. Читай этот файл перед любым действием в проекте.

---

## Режим работы

- Действуй автономно. Не спрашивай подтверждений на правки файлов, установку зависимостей, рефакторинг до 300 строк
- Принимай решения сам, если задача не требует продуктового выбора
- Если нужно уточнение по продуктовой логике — задай один вопрос, не несколько
- После выполнения задачи кратко напиши что сделал (2-3 строки)

---

## Стек

- **Frontend:** React + TypeScript + Tailwind CSS
- **Framework:** Next.js (App Router)
- **БД:** TBD — Supabase или PostgreSQL + Prisma
- **Auth:** invite-links + role-based access

---

## Дизайн-система — СТРОГО СОБЛЮДАТЬ

### Шрифты (подключены через Google Fonts):
```
Playfair Display 700 — все заголовки
IBM Plex Mono 400 — все лейблы, интерфейсные элементы
```

### Цвета — ТОЛЬКО ЭТИ:
```
#111111   — основной текст, инвертированный фон
#F6F6F4   — фон страниц
#EBEBEB   — разделители, бордеры
#FFFFFF   — фон карточек
```

### Правила вёрстки:
- `border-radius: 0` везде — без исключений
- Зазоры между блоками: `gap: 2px`
- Hover-состояние: инверсия цвета (bg меняется с белого на #111, текст — наоборот)
- Кнопки: ghost (border + transparent bg), при hover — инверсия
- Никаких цветных акцентов, никаких теней

---

## Архитектура — навигация

```
/login
/projects                        — список проектов
/projects/:id                    — выбор раздела (4 блока)
/projects/:id/design             — Дизайн (вкладки)
/projects/:id/supply             — Комплектация
/projects/:id/supply/items       — Позиции
/projects/:id/supply/timeline    — Gantt
/projects/:id/supply/stages      — Этапы
/projects/:id/supply/import      — Импорт Excel
/projects/:id/journal            — Авторский надзор
/projects/:id/journal/visits     — Визиты
/projects/:id/journal/invoices   — Счета
/projects/:id/journal/planning   — Планирование
/projects/:id/settings           — Настройки проекта
```

---

## База данных

12 таблиц. Ключевые:

```
User, Project, Contract
Visit → PhotoRecord
ConstructionStage → SupplyItem
ProjectMember (роли: designer, client, contractor, supplier, assistant)
Invoice, PaymentSchedule, ProjectDocument
```

`order_deadline` для SupplyItem = `stage.start_date - lead_time_days`

---

## Компоненты — соглашения

- Компоненты в `src/components/`
- Страницы в `src/app/` (Next.js App Router)
- Shared UI в `src/components/ui/`
- Типы в `src/types/`
- Mock data для разработки в `src/lib/mock-data.ts`

---

## Что запрещено менять без явного указания

- Шрифтовую пару
- Цветовую палитру
- border-radius (он всегда 0)
- Структуру навигации
- Логику ролей

---

## Обратная связь (компонент)

На всех экранах кроме логина — фиксированная строка снизу: `"Что-то не так?"` → открывает форму обратной связи. Позиция: `fixed bottom-0`, высота 40px, фон `#111111`, текст `#FFFFFF`, шрифт IBM Plex Mono.

---

## Demo credentials

```
designer: demo@archflow.app / demo
client:   client@archflow.app / client123
```

---

*При значимых изменениях обновляй PROJECT_CONTEXT.md*
