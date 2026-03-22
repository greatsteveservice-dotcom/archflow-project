# Archflow — Таблица разработчика

**Что сделано, зачем, и где искать код**

---

## Инфраструктура

| # | Что сделано | Зачем | Файлы / Расположение |
|---|------------|-------|---------------------|
| 1 | **Git-репозиторий** | Версионирование кода, совместная работа | github.com/greatsteveservice-dotcom/archflow-project |
| 2 | **Next.js 14 App Router** | Фреймворк: SSR, роутинг, оптимизация | `nextjs-src/` — весь исходный код |
| 3 | **Tailwind CSS** | Утилитарные CSS-классы, быстрая стилизация | `tailwind.config.ts`, `globals.css` |
| 4 | **Supabase на Beget Cloud** | БД (PostgreSQL), аутентификация, хранилище файлов | URL: oyklaglogmaniet.beget.app |
| 5 | **Netlify деплой** | Хостинг и CDN | https://archflow-app.netlify.app |
| 6 | **.env.local** | Секреты Supabase (URL + anon key) | `nextjs-src/.env.local` (не в git) |
| 7 | **netlify.toml** | Конфиг деплоя (plugin nextjs) | `nextjs-src/netlify.toml` |

---

## База данных (SQL-миграции)

| # | Миграция | Зачем | Таблицы / Объекты |
|---|---------|-------|-------------------|
| 1 | `001_schema.sql` | Основная схема: 10 таблиц, 14 enum-типов | profiles, projects, project_members, stages, visits, photo_records, invoices, documents, supply_items, contract_payments |
| 2 | `002_seed.sql` | Начальные данные для демо | 8 профилей, 4 проекта, 10 этапов, 8 визитов, 15 позиций supply |
| 3 | `003_rls_v2.sql` | Row Level Security — пользователь видит только свои данные | RLS-политики на все таблицы, SECURITY DEFINER функция `get_user_project_ids()` |
| 4 | `004_storage_and_rpc.sql` | Хранилище фото + RPC поиск по email | Storage bucket `photos`, функция `lookup_profile_by_email` |
| 5 | `005_rls_select_fix.sql` | Фикс INSERT+SELECT для PostgREST | Дополнительные SELECT-политики с проверкой owner_id/created_by |
| 6 | `006_documents_bucket.sql` | Хранилище документов | Storage bucket `documents` + RLS-политики |
| 7 | `007_project_invitations.sql` | Инвайт-ссылки в проект | Таблица `project_invitations`, RPC `accept_project_invitation` |
| 8 | FK fix (DEFERRABLE) | Починка регистрации новых пользователей | Изменение FK `profiles_id_fkey` на DEFERRABLE INITIALLY DEFERRED |

---

## Фронтенд — Ядро

| # | Компонент / Файл | Зачем | Ключевые функции |
|---|------------------|-------|-----------------|
| 1 | **page.tsx** | SPA-шелл: навигация, auth gate, toast | Роутинг через useState, модалка создания проекта, обработка invite-токена |
| 2 | **lib/supabase.ts** | Клиент Supabase | Инициализация с anon key, persistSession |
| 3 | **lib/auth.tsx** | Аутентификация | AuthProvider (контекст), signIn, signUp, signOut, session refresh |
| 4 | **lib/types.ts** | TypeScript-типы | 21 enum-тип, 15 интерфейсов, 7 input-типов, конфиги статусов |
| 5 | **lib/queries.ts** | Запросы к Supabase | 25+ функций: fetch, create, update, upload, RPC |
| 6 | **lib/hooks.ts** | React-хуки для данных | useQuery (generic), 12 специализированных хуков |
| 7 | **lib/permissions.ts** | Ролевой доступ (RBAC) | usePermissions, resolvePermissions, 16 флагов |
| 8 | **globals.css** | Стили + анимации | Кнопки, карточки, модалки, вкладки, мобильная адаптация |

---

## Фронтенд — Компоненты

| # | Компонент | Зачем | Что видит пользователь |
|---|-----------|-------|----------------------|
| 1 | **Sidebar.tsx** | Навигация | Боковая панель: Дашборд, Проекты, профиль, выход. Мобильный overlay. |
| 2 | **Topbar.tsx** | Заголовок страницы | Хлебные крошки, заголовок, кнопки действий, колокольчик уведомлений |
| 3 | **Dashboard.tsx** | Главная страница | 4 KPI-карточки, лента активности, карточки проектов |
| 4 | **ProjectsPage.tsx** | Список проектов | Сетка карточек с пустым состоянием |
| 5 | **ProjectCard.tsx** | Карточка проекта | Название, адрес, прогресс, статистика, статус |
| 6 | **ProjectPage.tsx** | Страница проекта | 6 вкладок с RBAC-фильтрацией, редактирование названия |
| 7 | **VisitPage.tsx** | Страница визита | Фото-галерея, фильтры, загрузка, смена статуса |
| 8 | **Modal.tsx** | Переиспользуемая модалка | Backdrop + контент, заголовок, закрытие |
| 9 | **Loading.tsx** | Состояния загрузки/ошибки | Спиннер, сообщение об ошибке |
| 10 | **EmptyState.tsx** | Пустые состояния | Иконка + текст + кнопка действия |
| 11 | **Bdg.tsx** | Badge статусов | Цветные бейджи для всех типов статусов |
| 12 | **Icons.tsx** | SVG-иконки | 28 иконок (Plus, Camera, Edit, Link, Menu...) |
| 13 | **LoginPage.tsx** | Вход/регистрация | Форма с табами Login/SignUp, демо-подсказка |

---

## Фронтенд — Вкладки проекта

| # | Вкладка | Файл | Зачем |
|---|---------|------|-------|
| 1 | Обзор | `OverviewTab.tsx` | KPI, информация о проекте, последние визиты |
| 2 | Journal | `JournalTab.tsx` | Счета (создание, статусы, ссылки на оплату) + таймлайн визитов |
| 3 | Визиты | `VisitsTab.tsx` | Планирование визитов, прогресс, два раздела (план/завершённые) |
| 4 | Supply | `SupplyModule.tsx` | 6 подвкладок: Dashboard, Спецификация, Timeline, Этапы, Импорт, Настройки |
| 5 | Документы | `DocsTab.tsx` | Загрузка файлов в Supabase Storage, карточки с форматами |
| 6 | Настройки | `SettingsTab.tsx` | Участники проекта, приглашения (email / ссылка), детали |

---

## Фронтенд — Supply-модуль

| # | Компонент | Зачем |
|---|-----------|-------|
| 1 | `SupplyModule.tsx` | Контейнер с 6 подвкладками, расчёт рисков/дедлайнов |
| 2 | `SupplyDashboard.tsx` | KPI комплектации: статусы, риски, бюджет |
| 3 | `SupplySpec.tsx` | Таблица позиций с фильтрами, сортировкой, добавлением |
| 4 | `SupplyTimeline.tsx` | Gantt-диаграмма поставок по этапам |
| 5 | `SupplyStages.tsx` | Управление этапами стройки (блок/ГКЛ) |
| 6 | `SupplyImport.tsx` | 4-шаговый визард импорта из Excel |
| 7 | `SupplySettings.tsx` | Настройки дисконта, параметры |

---

## CRUD-операции (queries.ts)

| # | Функция | Действие | Таблица |
|---|---------|----------|---------|
| 1 | `fetchProjects()` | Список проектов + статистика | projects + visits + photos |
| 2 | `fetchProject(id)` | Один проект + владелец + статистика | projects + profiles + visits + photos |
| 3 | `fetchProjectVisits(id)` | Визиты проекта + авторы + фото-стат | visits + profiles + photos |
| 4 | `fetchVisitPhotos(id)` | Фото визита | photo_records |
| 5 | `fetchProjectInvoices(id)` | Счета проекта | invoices |
| 6 | `fetchProjectStages(id)` | Этапы стройки | stages |
| 7 | `fetchProjectSupplyItems(id)` | Позиции комплектации | supply_items |
| 8 | `fetchProjectDocuments(id)` | Документы проекта | documents |
| 9 | `fetchProjectMembers(id)` | Участники проекта | project_members |
| 10 | `fetchActivityFeed()` | Лента активности | photos + visits + invoices + supply |
| 11 | `fetchNotifications()` | Уведомления | photos + invoices + visits |
| 12 | `createProject(input)` | Создать проект | projects |
| 13 | `updateProject(id, updates)` | Обновить проект (название) | projects |
| 14 | `createVisit(input)` | Создать визит | visits |
| 15 | `uploadPhoto(file, ...)` | Загрузить фото в Storage | storage: photos |
| 16 | `createPhotoRecord(input)` | Создать запись фото | photo_records |
| 17 | `updatePhotoStatus(id, status)` | Сменить статус фото | photo_records |
| 18 | `createInvoice(input)` | Создать счёт (+ ссылка на оплату) | invoices |
| 19 | `inviteProjectMember(input)` | Пригласить по email | project_members (через RPC) |
| 20 | `createSupplyItem(input)` | Создать позицию | supply_items |
| 21 | `createSupplyItems(items[])` | Массовый импорт позиций | supply_items |
| 22 | `uploadDocument(file, ...)` | Загрузить документ | storage: documents |
| 23 | `createDocument(input)` | Создать запись документа | documents |
| 24 | `createProjectInvitation(...)` | Создать инвайт-ссылку | project_invitations |
| 25 | `acceptProjectInvitation(token)` | Принять приглашение | RPC: accept_project_invitation |
| 26 | `updateProfile(input)` | Обновить профиль | profiles |

---

## Безопасность

| # | Что | Как реализовано |
|---|-----|----------------|
| 1 | Аутентификация | Supabase Auth (email + password), JWT-токены, session refresh |
| 2 | Авторизация (бэкенд) | RLS-политики на всех таблицах — пользователь видит только данные своих проектов |
| 3 | Авторизация (фронтенд) | RBAC: `usePermissions()` — скрытие вкладок и кнопок по роли |
| 4 | Хранилище | Supabase Storage с RLS-политиками для buckets `photos` и `documents` |
| 5 | FK-целостность | Profiles → auth.users (DEFERRABLE), каскадное удаление |

---

## Хронология разработки

| Дата | Что сделано |
|------|------------|
| **18.03** | Git init, GitHub repo, изучение проекта, CLAUDE.md, ER-диаграмма |
| **18.03** | Supabase на Beget: 10 таблиц, 14 enum, RLS, триггеры, seed-данные |
| **19.03** | Next.js проект, TypeScript типы, Supabase клиент, хуки, интеграция компонентов |
| **19.03** | Auth: AuthProvider, LoginPage, RLS v2, session management |
| **19.03** | CRUD: 7 мутаций, модалки создания (проект, визит, счёт), загрузка фото |
| **19.03** | Storage: bucket photos, RPC lookup_profile_by_email |
| **22.03** | UX: toast-ошибки, валидация форм, Error Boundary, пустые состояния, auth refresh |
| **22.03** | Dashboard: живая лента активности, переход на Дашборд по умолчанию |
| **22.03** | Очистка: удаление дублей данных, удаление App Router stubs, .gitignore, n8n |
| **22.03** | Деплой на Netlify: https://archflow-app.netlify.app |
| **22.03** | SQL 006: documents bucket + policies |
| **22.03** | SQL 007: project_invitations + RPC accept_project_invitation |
| **22.03** | Фичи: редактирование названия проекта, ссылка на оплату в счетах |
| **22.03** | RBAC: permissions.ts, фильтрация вкладок и кнопок по ролям |
| **22.03** | Документы: загрузка файлов в Supabase Storage, DocsTab |
| **22.03** | Supply Import: 4-шаговый визард из Excel (xlsx) |
| **22.03** | Приглашения: по email + по ссылке (токен), SettingsTab |
| **22.03** | Мобильная адаптация: sidebar overlay, responsive tabs, bottom-sheet модалки |
| **22.03** | Аккаунт Анны Мавысян (designer, N.I + A), фикс FK DEFERRABLE |
