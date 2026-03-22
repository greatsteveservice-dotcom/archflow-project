# CLAUDE.md — Archflow Project

## Обзор проекта

**Archflow** — платформа управления дизайн-проектами интерьера для дизайнеров и заказчиков.
Включает авторский надзор (визиты, фото, замечания), комплектацию (Supply), счета (Journal), документы и управление доступом.

## Роли пользователей

| Роль | Описание |
|------|----------|
| **designer** | Дизайнер — основной пользователь: ведёт проекты, визиты, комплектацию |
| **client** | Заказчик — видит свой проект, оплачивает счета, следит за комплектацией |
| **contractor** | Подрядчик — просмотр + комментарии + фото |
| **supplier** | Комплектатор — доступ к модулю Supply |
| **assistant** | Ассистент дизайнера — полный доступ |

## Структура файлов

```
archflow-project/
├── CLAUDE.md                    ← этот файл
├── .gitignore                   ← корневой .gitignore
├── README.md                    ← описание проекта
├── index.html                   ← полное HTML-демо (standalone)
├── 01-designer-full.jsx         ← React-артефакт: интерфейс дизайнера
├── 02-client-portal.jsx         ← React-артефакт: портал заказчика
├── 03-supply-module.jsx         ← React-артефакт: модуль комплектации
├── n8n/                         ← n8n workflow (Signal-агент)
│   ├── archflow-signal-agent-v2.json ← основной workflow
│   ├── GUIDE.md                 ← руководство по настройке
│   ├── code-filter-dedup.js     ← фильтр дедупликации
│   ├── prompt-1-signal-analysis.md ← промпт анализа сигналов
│   └── prompt-2-report.md       ← промпт генерации отчёта
└── nextjs-src/                  ← Next.js исходники
    ├── tailwind.config.ts
    └── src/app/
        ├── layout.tsx           ← корневой layout (lang=ru)
        ├── page.tsx             ← SPA-шелл (Dashboard → Projects → Project → Visit)
        ├── error.tsx            ← Error Boundary для перехвата ошибок
        ├── globals.css          ← глобальные стили + Tailwind @layer
        ├── lib/
        │   ├── supabase.ts      ← Supabase клиент
        │   ├── auth.tsx         ← AuthProvider (session, profile, signIn/Out)
        │   ├── types.ts         ← TypeScript типы для всех таблиц БД
        │   ├── queries.ts       ← Supabase запросы и мутации
        │   ├── hooks.ts         ← React-хуки для данных
        │   └── permissions.ts   ← RBAC-логика по ролям
        ├── components/
        │   ├── Dashboard.tsx    ← дашборд: KPI, живая лента активности, проекты
        │   ├── EmptyState.tsx   ← переиспользуемый компонент пустого состояния
        │   ├── Icons.tsx        ← SVG-иконки
        │   ├── Modal.tsx        ← переиспользуемая модалка
        │   ├── Toast.tsx        ← toast-уведомления
        │   ├── Topbar.tsx       ← верхняя панель с заголовком и действиями
        │   ├── Bdg.tsx          ← бейдж статуса
        │   ├── LoginPage.tsx    ← страница входа/регистрации
        │   ├── CreateProjectModal.tsx ← модалка создания проекта
        │   ├── ProjectCard.tsx  ← карточка проекта
        │   ├── ProjectPage.tsx  ← страница проекта: 6 табов
        │   ├── ProjectsPage.tsx ← список проектов
        │   ├── Sidebar.tsx      ← боковая навигация (Дашборд, Проекты)
        │   ├── VisitPage.tsx    ← страница визита: фото, замечания, загрузка
        │   ├── project/         ← табы страницы проекта
        │   │   ├── OverviewTab.tsx
        │   │   ├── VisitsTab.tsx
        │   │   ├── JournalTab.tsx
        │   │   ├── DocsTab.tsx
        │   │   └── SettingsTab.tsx
        │   └── supply/          ← модуль комплектации
        │       ├── SupplyModule.tsx
        │       ├── SupplyDashboard.tsx
        │       ├── SupplySpec.tsx
        │       ├── SupplyStages.tsx
        │       ├── SupplyTimeline.tsx
        │       ├── SupplyImport.tsx
        │       └── SupplySettings.tsx
        └── supabase/migrations/ ← SQL-миграции
            ├── 001_initial_schema.sql
            ├── 002_seed_data.sql
            ├── 003_rls_v2.sql
            ├── 004_storage_and_rpc.sql
            ├── 005_rls_select_fix.sql
            ├── 006_documents_bucket.sql
            └── 007_project_invitations.sql
```

## Текущие сущности (из моковых данных)

### Из 01-designer-full.jsx (основной):
- **Project** — id, title, address, owner, status, modules, progress, visits, photos, openIssues, contractVisits, startDate, supplyDiscount, scenarioType (block/gkl), contractPayments
- **Visit** — id, projectId, date, title, note, createdBy, status, type (completed/planned)
- **PhotoRecord** — id, visitId, comment, status (issue/approved), zone, createdAt
- **Invoice** — id, projectId, title, amount, dueDate, status (pending/paid), issuedAt, paidAt
- **Document** — id, projectId, title, version, uploadedBy, createdAt, format, status
- **ProjectMember** — id, projectId, name, email, role, access
- **Stage** (block/gkl) — id, name, startDate, endDate, order
- **SupplyItem** — id, name, category, status, leadTimeDays, targetStageId, quantity, supplier, budget, notes

### Из 02-client-portal.jsx:
- Те же сущности + **PaymentSchedule** (stage, planned, paid, status)
- **SupplyItem** для клиента с полями: name, supplier, price, status, date

### Из 03-supply-module.jsx:
- **SupplyItem** расширен: riskLevel, orderDeadline (расчётное), deliveryForecast, daysUntilDeadline, riskCalc

## Бизнес-логика

### Авторский надзор
- Дизайнер создаёт визиты на объект
- На каждом визите делает фото с комментариями
- Каждое фото — статус: issue / approved / in_progress / new
- Визит получает итоговый статус: approved / issues_found / planned

### Комплектация (Supply)
- Позиции привязаны к этапам стройки (Stage)
- Два сценария стройки: **блок** и **ГКЛ** (разный порядок этапов)
- Автоматический расчёт дедлайна заказа: stageStart - leadTimeDays
- Риск-уровень: critical (<0 дней), high (≤7), medium (≤30), low (>30)
- Gantt-таймлайн для визуализации сроков

### Счета (Journal)
- Дизайнер выставляет счета клиенту
- Типы: авторский надзор (ежемесячно), предоплаты за материалы
- Статусы: pending / paid / overdue
- График платежей по этапам стройки

### Документы
- Загрузка проектных документов (PDF, DWG, XLSX, PNG)
- Версионирование
- Статусы: approved / in_review / draft

## Технологии

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Шрифты**: DM Sans (основной в артефактах), Outfit (в Next.js), JetBrains Mono (моноширинный)
- **Backend**: Supabase на Beget Cloud (oyklaglogmaniet.beget.app) — PostgreSQL + Auth + Storage
- **Язык интерфейса**: русский

## Известные проблемы

1. ~~Два дубля моковых данных~~ — ✅ удалены (2026-03-22)
2. ~~Две системы навигации~~ — ✅ консолидировано: SPA-only, App Router роуты удалены (2026-03-22)
3. ~~Sidebar несовместимые интерфейсы~~ — ✅ исправлено (2026-03-22)
4. ~~Нет бэкенда~~ — ✅ Supabase (2026-03-18)
5. ~~Нет аутентификации~~ — ✅ Supabase Auth (2026-03-19)

## Лог работы

### 2026-03-18
- [x] Инициализирован git-репозиторий
- [x] Создан приватный репозиторий на GitHub: https://github.com/greatsteveservice-dotcom/archflow-project
- [x] Репозиторий переведён в публичный
- [x] Изучен весь проект: 3 React-артефакта + Next.js исходники
- [x] Создан CLAUDE.md
- [x] ER-диаграмма для Supabase — 10 таблиц
- [x] Развёрнут Supabase на Beget Cloud (oyklaglogmaniet.beget.app)
- [x] Настроен .env.local с ключами Supabase
- [x] Создан Supabase клиент (lib/supabase.ts)
- [x] Выполнена миграция: 10 таблиц, 14 enum-типов, RLS-политики, триггеры
- [x] Загружены seed-данные: 8 профилей, 4 проекта, 10 этапов, 8 визитов, 15 позиций комплектации
- [x] Интеграция фронтенда с Supabase (замена моковых данных)

### 2026-03-19
- [x] Инициализирован Next.js проект (package.json, tsconfig, postcss, next.config)
- [x] Установлены зависимости: next, react, @supabase/supabase-js, tailwindcss, typescript
- [x] Отключён RLS на таблицах (временно, для разработки без аутентификации)
- [x] Созданы TypeScript типы для всех 10 таблиц БД (lib/types.ts)
- [x] Создан сервис запросов к Supabase (lib/queries.ts) — fetchProjects, fetchProjectVisits, fetchVisitPhotos и др.
- [x] Созданы React-хуки для данных (lib/hooks.ts) — useProjects, useProject, useProjectVisits, useVisit, useVisitPhotos
- [x] Обновлены компоненты Dashboard, ProjectCard, ProjectsPage, ProjectPage, VisitPage — моковые данные заменены на Supabase
- [x] Добавлен компонент Loading/ErrorMessage для состояний загрузки
- [x] App Router страницы (projects, project/[id], visit/...) заменены на редиректы к SPA
- [x] Проект успешно собирается (next build) и работает (next dev)
- [x] Проверена работа: дашборд, список проектов, страница проекта, визиты, фотокарточки — всё из Supabase
- [x] Создан auth-пользователь Алиса Флоренс (alisa@florence-design.ru / demo1234)
- [x] Миграция UUID: все FK со старого ID (00000000-...) на реальный auth UUID (f8c8db0d-...)
- [x] Создан AuthProvider (lib/auth.tsx) — контекст с session, user, profile, signIn, signUp, signOut
- [x] Создана страница LoginPage с формой входа/регистрации и демо-подсказкой
- [x] Обновлён layout.tsx — обёрнут в AuthProvider
- [x] Обновлён page.tsx — auth gate: загрузка → логин → основное приложение
- [x] Обновлён Sidebar — реальный профиль пользователя, инициалы, роль на русском, кнопка выхода
- [x] Новые RLS-политики v2 (003_rls_v2.sql): SECURITY DEFINER функция get_user_project_ids() для безрекурсивных политик
- [x] Включён RLS на всех 10 таблицах с рабочими политиками
- [x] Проверен полный цикл: логин → дашборд → проекты → выход
- [x] CRUD-операции (создание визитов, загрузка фото, выставление счетов)
- [x] Input-типы: CreateProjectInput, CreateVisitInput, CreatePhotoRecordInput, CreateProjectMemberInput, CreateInvoiceInput
- [x] 7 мутаций в queries.ts: createProject, createVisit, uploadPhoto, createPhotoRecord, updatePhotoStatus, inviteProjectMember, createInvoice
- [x] Хуки с refetch(): refreshKey + useCallback в useQuery
- [x] CreateProjectModal.tsx — модалка создания проекта
- [x] ProjectPage.tsx — модалки: новый визит, пригласить участника, новый счёт
- [x] VisitPage.tsx — загрузка фото (drag-drop + file input), inline-смена статуса фото
- [x] SQL: Storage bucket 'photos' + RPC lookup_profile_by_email (004_storage_and_rpc.sql)
- [x] RLS SELECT fix (005_rls_select_fix.sql): INSERT+SELECT (PostgREST return=representation) — добавлены прямые проверки owner_id/created_by
- [x] Протестировано в браузере: создание проекта, визита, счёта — всё работает через Supabase

### 2026-03-22
- [x] Toast-ошибки: все мутации показывают ошибку пользователю (VisitPage, JournalTab, VisitsTab, SupplySpec)
- [x] Error Boundary (error.tsx): перехват непредвиденных ошибок с кнопкой повтора
- [x] Auth: обработка TOKEN_REFRESHED для корректного re-login при истечении токена
- [x] Валидация форм: inline-ошибки в визитах, счетах, email-валидация при приглашении
- [x] Пустые состояния: компонент EmptyState, улучшены Dashboard и ProjectsPage
- [x] Удалены дубли моковых данных: `lib/data.ts` и `components/data.ts` (никем не использовались)
- [x] Живая активность на Dashboard: fetchActivityFeed() из photo_records, visits, invoices, supply_items
- [x] Dashboard — стартовая страница, добавлен пункт «Дашборд» в Sidebar
- [x] Консолидация навигации: удалены пустые App Router роуты (projects, project/[id], visit, notifications, settings) — всё через SPA
- [x] Добавлен корневой .gitignore
- [x] Закоммичен n8n/ workflow (Signal-агент)
- [x] Обновлена структура файлов и известные проблемы в CLAUDE.md
