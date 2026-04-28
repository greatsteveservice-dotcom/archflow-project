# Sprint: Image annotations / pin-based review

Pin-based comments on design files (визуализации, чертежи, спецификации).
Approved UX prototype: `/annotation-mockup`.

## Scope

### Core (must)
- [ ] Pins overlay on design file image: click → create pin at click point (% coords)
- [ ] Pin = circle with number, color reflects status (black=open, gray ✓=resolved)
- [ ] Click pin → thread popup: original comment + replies + status actions
- [ ] Reply to thread (Enter to send)
- [ ] Resolve / re-open pin (only author + designer)
- [ ] Delete pin (author + designer only)
- [ ] Side panel: list of pins with filter tabs «Открытые / Решённые / Все»
- [ ] Click side-panel item → highlights pin and opens thread
- [ ] Mode toggle in topbar: «Просмотр / Замечания (N)» — shows count of open
- [ ] @mentions with autocomplete from project_members → push notification
- [ ] Realtime: new pins / replies / resolves appear without reload
- [ ] Mobile: long-press to create pin, full-screen sheet for thread
- [ ] Push notifications on new pin / reply / mention

### Out of scope (later sprints)
- Regions (Shift+drag rectangle) — sprint 2
- Voice memo / Whisper transcription — sprint 3
- File versioning + diff view + carry-over open pins — sprint 3
- Drawing/markup (arrows, circles) — never (use regions instead)

## Architecture

### Database (migration `053_design_file_annotations.sql`)

```sql
CREATE TABLE design_file_annotations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id         uuid NOT NULL REFERENCES design_files(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES design_file_annotations(id) ON DELETE CASCADE, -- NULL = root pin, NOT NULL = reply
  author_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- coordinates (% of image, 0..100). NULL on replies.
  x               real,
  y               real,
  -- pin number scoped to file. assigned at insert via trigger. NULL on replies.
  number          int,
  -- content
  content         text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  -- status (root pins only). replies always inherit.
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_by     uuid REFERENCES auth.users(id),
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dfa_file ON design_file_annotations(file_id);
CREATE INDEX idx_dfa_parent ON design_file_annotations(parent_id);
CREATE INDEX idx_dfa_status ON design_file_annotations(file_id, status);

-- auto-assign pin number per file (skips replies via parent_id IS NULL guard)
CREATE OR REPLACE FUNCTION assign_annotation_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NULL AND NEW.number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1
      INTO NEW.number
      FROM design_file_annotations
      WHERE file_id = NEW.file_id AND parent_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_dfa_number
  BEFORE INSERT ON design_file_annotations
  FOR EACH ROW EXECUTE FUNCTION assign_annotation_number();

-- RLS: any project member can read/write annotations on files of their projects
ALTER TABLE design_file_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY dfa_select ON design_file_annotations FOR SELECT USING (
  file_id IN (SELECT id FROM design_files WHERE project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
    UNION SELECT id FROM projects WHERE owner_id = auth.uid()
  ))
);
CREATE POLICY dfa_insert ON design_file_annotations FOR INSERT WITH CHECK (
  author_id = auth.uid() AND file_id IN (
    SELECT id FROM design_files WHERE project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
      UNION SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  )
);
CREATE POLICY dfa_update ON design_file_annotations FOR UPDATE USING (
  -- author can edit own; designer/owner can edit any in project
  author_id = auth.uid() OR file_id IN (
    SELECT id FROM design_files WHERE project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'designer'
      UNION SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  )
);
CREATE POLICY dfa_delete ON design_file_annotations FOR DELETE USING (
  author_id = auth.uid() OR file_id IN (
    SELECT id FROM design_files WHERE project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'designer'
      UNION SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  )
);
```

### Frontend

- New file: `components/design/AnnotatableImage.tsx`
  - Wraps `<img>` in relative container
  - Renders pins as positioned `<button>` with `left: ${x}%, top: ${y}%`
  - Handles click-to-create, draft form, thread popup
  - Imports thumb/preview from `lib/imgUrl` for performance

- New file: `components/design/AnnotationSidePanel.tsx`
  - Filter tabs (open / resolved / all)
  - List of pins (clickable to open thread)
  - Mention autocomplete renders inside thread input

- Update `DesignFolderView.tsx` (or whichever file shows the image preview):
  - Add «Замечания (N)» / «Просмотр» toggle in topbar
  - Render `AnnotatableImage` instead of plain `<img>` when in annotate mode
  - Show side panel only in annotate mode

- New queries in `lib/queries.ts`:
  - `getFileAnnotations(fileId)` — root pins + replies, joined with author profiles
  - `createAnnotation({ fileId, x, y, content, parentId? })`
  - `updateAnnotationStatus(id, 'open' | 'resolved')`
  - `deleteAnnotation(id)`

- New hook in `lib/hooks.ts`:
  - `useFileAnnotations(fileId)` — query + Supabase realtime subscription

### Realtime

Channel name: `annotations:${fileId}`
Subscribe to `postgres_changes` on `design_file_annotations` filtered by `file_id`.
On INSERT/UPDATE/DELETE — refetch with `selfOpsRef` pattern (skip own optimistic ops).

### Push notifications

Hook into existing push pipeline (see `/api/push/send`).
Triggers:
- New root pin → notify all project members except author («Иван оставил замечание на «Кухня v3»»)
- Reply → notify author of root pin + all participants in thread
- @mention in content → notify mentioned user specifically (ignore other recipients)

### @mentions implementation

- Input: detect `@` → show dropdown with project_members where full_name ILIKE search
- On select: insert `@[Имя](user_id)` into content as markdown
- Render: replace `@[Имя](user_id)` with styled span linking to profile, send notification on save

## Files to create/modify

```
+ nextjs-src/supabase/migrations/053_design_file_annotations.sql
+ nextjs-src/src/app/components/design/AnnotatableImage.tsx
+ nextjs-src/src/app/components/design/AnnotationSidePanel.tsx
+ nextjs-src/src/app/components/design/MentionAutocomplete.tsx
~ nextjs-src/src/app/components/project/DesignFolderView.tsx (integrate, add mode toggle)
~ nextjs-src/src/app/lib/queries.ts (4 new functions)
~ nextjs-src/src/app/lib/hooks.ts (1 new hook)
~ nextjs-src/src/app/lib/types.ts (DesignFileAnnotation interface)
```

## Estimate
~400–500 lines code + 1 migration. 1 work day.

## Acceptance
- Designer & client can both create pins
- Pins survive image resize and panel toggle
- Realtime: open same file in 2 tabs, action in one appears in other within 2s
- Resolved pins hidden by default in the open filter
- Push fires for new pin / reply / mention
- Mobile: long-press creates pin, sheet covers full screen for thread

## Notes from user (sprint expansion — to be filled)

> User said: "сейчас я еще накидаю туда правок и реализуем все разом"

### Pending edits

1. **Удалить раздел КОММЕНТАРИИ под фотографией.** После реализации пинов
   все обсуждения переносятся на пины — общие комментарии под изображением
   становятся избыточными. Удалить из `DesignFolderView.tsx` блок
   «КОММЕНТАРИИ» (поле ввода + список существующих общих комментариев).
   Существующие данные `design_file_comments` — оставить в БД read-only
   (миграция данных не делаем), просто скрыть UI. Если хочется чисто —
   потом отдельной миграцией: либо мигрировать комменты в пины с координатой
   (50, 50), либо дропнуть таблицу. Выбор по факту обсудить.

2. **Видеообзор: переход на canvas-композит (image+camera, без screen-share).**
   Текущий `useScreenRecorder` использует `getDisplayMedia` → требует системного диалога Chrome «выберите окно/вкладку/экран», не работает на iOS, и при наложении floating-виджета с превью камеры в финале получается «два кружка» в записи.

   Новый поток (вариант C из обсуждения):
   - Юзер на странице файла нажимает «📹 Записать обзор»
   - App запрашивает только `getUserMedia({ video, audio })` (камера + микрофон) — без screen-share диалога
   - Создаётся canvas 1920×1080 (или по реальному соотношению картинки)
   - В `requestAnimationFrame` рисуем: фон = картинка файла (`<img>` с CORS=anonymous), camera-circle 240px в углу, тонкая белая обводка + лёгкая тень
   - `canvas.captureStream(30)` + `getUserMedia` audio track → MediaRecorder → webm
   - В виджете во время записи показываем **только** счётчик времени и кнопку «Остановить» (без превью камеры — лицо уже в композите)
   - На мобиле работает идентично (там getDisplayMedia вообще нет → сейчас fallback «загрузить файл», который останется как fallback на случай если камера недоступна)

   Бонус: пины с страницы тоже можно нарисовать в canvas (если активирован annotate-mode), → в записи видны замечания.

   Файлы:
   ~ `nextjs-src/src/app/lib/useScreenRecorder.ts` → переименовать в `useImageReviewRecorder.ts`, переписать `start()` без `getDisplayMedia`. Принимать `imageUrl: string` параметром.
   ~ `nextjs-src/src/app/components/VideoRecorderModal.tsx` → принимать `imageUrl`, отдавать его в хук. Убрать превью камеры из floating-виджета (заменить на красную точку + счётчик).
   ~ `nextjs-src/src/app/components/FileVideoSection.tsx` → передавать `file.file_url` в `<VideoRecorderModal imageUrl={...} />`.

   ~80–100 строк изменений.

3. **Убрать промежуточный lightbox при клике на файл во всех разделах.**
   Сейчас: клик на превью → открывается затемнённый lightbox с уменьшенной картинкой и кнопкой «Подробнее» снизу справа → клик «Подробнее» → попадаешь в детальный вид (Скачать / Видеообзоры / Комментарии / в будущем — пины).

   Надо: клик на превью **сразу** ведёт в детальный вид (тот, что сейчас открывается через «Подробнее»). Lightbox-«звено» удалить.

   Касается всех разделов с прикреплёнными файлами:
   - Дизайн → визуализации, дизайн-проект, чертежи, мебель, инженерия, документы (все папки 01–06 в `DesignFolderView`)
   - Supply → документы (`SupplyDocuments`)
   - Supervision → фото визитов (`PhotoGallery` — клик на превью раскрывает в lightbox; для фото авторнадзора lightbox оставляем как есть, потому что там нет «детального вида» с комментами/видео — но потом возможно тоже унифицировать с пинами)
   - Любые другие блоки с файлами

   Реализация: найти компонент-обёртку lightbox (вероятно `Lightbox` / `ImagePreview` / inline в `DesignFolderView`), удалить его как промежуточный шаг. Onclick карточки файла → сразу `router.push('/projects/.../files/<id>')` или открытие модалки с детальным видом (как сейчас «Подробнее»).

   Проверить что:
   - Esc / клик вне детальной области закрывает (как раньше lightbox)
   - Свайп влево/вправо для перехода между файлами в галерее работает (если был)
   - Кнопка «Скачать» / «Удалить» на месте

4. **Восстановить прикрепление скриншота в блоке «Помощь» (Поддержка).**
   В `SupportPanel.tsx` (вызывается из BottomTabBar → «Помощь») сейчас только текстовое поле «Напишите сообщение…» и кнопка отправки. Раньше была возможность прикрепить скриншот/изображение к обращению. Восстановить.

   Реализация:
   - Добавить кнопку 📎 / иконку clip в footer рядом с input (или внутри input как у Telegram)
   - Поддержать paste из буфера (Cmd+V) для вставки скриншота прямо в поле — особенно удобно для маков, где Cmd+Shift+4 → буфер обмена
   - Drag-and-drop файла в окно поддержки → автоматически прикрепляется
   - Превью прикреплённого изображения над полем ввода с крестиком «убрать»
   - При отправке: загрузка в bucket `feedback-screenshots`, attachment_url передаётся в `/api/feedback` → Telegram-бот получает текст + ссылку на скрин
   - Поддерживать множественное прикрепление (до 5 файлов на сообщение)

   Файл: `nextjs-src/src/app/components/SupportPanel.tsx` + проверить что `/api/feedback` или `/api/support-send` уже принимает attachment URL (раньше принимал, см. git log: «Support chat: two-way messaging via Telegram bot» 26c8a57).

5. **Кабинет заказчика → Дизайн: панель навигации/breadcrumbs не закрепляется.**
   На широком экране в просмотре заказчика блок с папками 01–07 (Дизайн-проект, Визуализации и т.д.) занимает только правую половину экрана, а левая половина пустая. При этом breadcrumbs «ПРОЕКТЫ / ЖК ILOVE / ДИЗАЙН» и весь топбар уезжают за пределы видимой области при горизонтальной прокрутке (скрин 1: контент сдвинут вправо, навигации не видно вообще; скрин 2: после прокрутки влево появляются breadcrumbs).

   Проблема: layout не центрирован / не адаптирован под viewport / есть overflow-x. Топбар должен быть `position: sticky; top: 0` и оставаться на месте независимо от скролла. Вариант: контент-обёртка должна иметь `max-width` и центрироваться, без горизонтального сдвига.

   Нужно:
   - Топбар (с breadcrumbs «ПРОЕКТЫ / ЖК ILOVE / ДИЗАЙН» + аватар + кнопка ВЫЙТИ) — `position: sticky; top: 0; z-index: 50` на всех экранах кабинета заказчика. Никогда не должен уезжать.
   - Контент (сетка папок) центрируется по горизонтали с `max-width: 1200px` (или сколько подходит) и `margin: 0 auto`. Чтобы не было пустой левой половины.
   - Убрать любой `overflow-x: scroll/auto` на корне или родителях, который позволяет горизонтальную прокрутку. Контент должен вмещаться в viewport.
   - Тоже самое проверить для других экранов кабинета заказчика (Supply, Supervision, Chat) — все должны иметь sticky topbar.

   Файлы: `nextjs-src/src/app/components/ClientDashboard.tsx` (если есть), `nextjs-src/src/app/components/Topbar.tsx`, корневой layout кабинета заказчика, `DesignSection.tsx`. Найти где CSS `overflow-x` или фиксированная ширина больше viewport.

6. **Кабинет заказчика: сразу открывать его единственный проект.**
   У заказчика, как правило, ровно один проект. Сейчас он после логина попадает на список проектов с одной карточкой → должен ещё раз кликнуть. Лишний шаг.

   Логика после логина (для `role === 'client'`):
   - Если у клиента **ровно 1 проект** → редирект сразу на `/projects/<id>` (на дашборд этого проекта со скрина: «Стадия проекта Концепция», блоки Дизайн / Комплектация / Авторнадзор / Чат, дизайнер, активность). Список проектов пропускаем.
   - Если **0 проектов** → показать пустой стейт «Вы ещё не приглашены ни в один проект» с инструкцией.
   - Если **2+ проектов** (редкий кейс — у одного заказчика несколько объектов с одним дизайнером) → текущий список проектов как сейчас.

   Реализация: в catch-all `[...path]/page.tsx` или там где обрабатывается пустой path после логина:
   - Дождаться загрузки `useProjects()` для текущего юзера
   - Если `profile?.role === 'client'` и `projects.length === 1` → `router.replace(`/projects/${projects[0].id}`)`
   - Иначе текущая логика

   Тоже самое применить для **подрядчика** (`role === 'contractor'`) — он тоже обычно работает в рамках одного проекта.

   Внимание: если клиент находится в проекте и нажимает «← ПРОЕКТЫ» в breadcrumbs, при попадании на список проектов с 1 проектом не должно произойти бесконечного редиректа обратно. Решение: редирект делать только при первом заходе (после логина). Клик на breadcrumbs «ПРОЕКТЫ» → отдельный URL `/projects` остаётся доступен явно (без авто-редиректа). То есть редирект только когда юзер пришёл на пустой path / `/`, не когда уже находится на `/projects`.

7. **Кабинет заказчика → Чат: убрать табы каналов, оставить один чат с дизайнером.**
   Сейчас клиент видит табы «Заказчик / Команда / Подрядчик / + Новый чат» — для него это бессмыслица: он сам заказчик, других сторон в его кабинете быть не должно.

   Предложение по UX (рекомендую):
   - Никаких табов и кнопок «новый чат» — единственная одностраничная переписка
   - Заголовок чата: аватар дизайнера + «Дизайнер: Евгений» (имя из profile.full_name) + статус онлайн/last seen
   - Под заголовком — лента сообщений как в Telegram/iMessage: справа свои, слева от дизайнера
   - Внизу — поле ввода + 📎 attach + send
   - Если у проекта есть **ассистент дизайнера**, его сообщения тоже идут в этот же поток (от его имени, с подписью «помощник Евгения»). Заказчику не нужно различать «дизайнер vs ассистент» — это одна сторона
   - Подрядчик/комплектатор клиенту вообще не виден — это внутренние чаты команды

   Логика на бэке: в `ChatView` для `role === 'client'`:
   - Принудительно открываем канал `client` (между заказчиком и дизайнером/командой)
   - Скрываем табы (не рендерим переключатель)
   - Скрываем кнопку «Новый чат»
   - Шапка показывает аватар + имя дизайнера (а не «Заказчик»)

   Для дизайнера и ассистента сторона — табы остаются как есть (им нужно различать заказчика, внутреннюю команду, подрядчиков).

   Файл: `nextjs-src/src/app/components/project/ChatView.tsx` — добавить branch для роли клиента.

8. **Настройки → Роли и доступ: упрощённая компоновка (одна таблица + единая модалка приглашения).**
   Текущая верстка перегружена: разные секции «Команда / Заказчик / Подрядчик», у каждой свой блок «Добавить» + email + «Отправить приглашение», плюс «+ ПРИГЛАСИТЬ» сверху. Не видно общей картины кто в каких ролях. Изменение роли неинтуитивно.

   Прототип: `/roles-mockup` (live, в стиле Archflow).

   Реализация:
   - **Один список** всех участников в виде таблицы:
     `Аватар | Имя | Email | Роль (select) | Доступ (select) | × удалить`
   - Pending-приглашения в той же таблице, отличаются: пунктирная рамка аватара, серый текст, метка «● Ожидает приглашение»
   - Владелец проекта — селекты заблокированы, нельзя удалить, бейдж «ВЛАДЕЛЕЦ» рядом с именем
   - Изменение роли и уровня доступа — прямо через select в строке, изменения через RPC `update_member_role` / direct UPDATE
   - **Клик по строке** → раскрывается панель снизу с тумблерами «Дизайн / Комплектация / Авторнадзор / Чат» — видимые разделы для конкретного юзера. Тумблеры используют чёрный/белый toggle (см. mockup)
   - Шаблоны ролей (Только просмотр / Фото+комменты / Комплектация+статусы / На усмотрение дизайнера) — переносятся внутрь селекта «Доступ» (presets), отдельный блок «Шаблоны ролей» удаляется

   - **Одна кнопка «+ Пригласить»** сверху, открывает модалку с двумя табами:
     1. **«По email»**: input email + select роль + select доступ → «Отправить приглашение» (текущий flow)
     2. **«По ссылке»** (обязательно сохранить!): select роль + select доступ → кнопка «Создать ссылку» → показывает сгенерированную ссылку с base64-токеном + кнопка «Копировать». Можно зашерить в Telegram/WhatsApp/SMS — заказчик откроет, зарегистрируется и сразу получит роль.
     - Ссылка — это `accept_project_invitation` flow с одноразовым токеном, который уже работает в проекте
     - Срок жизни ссылки: 7 дней по умолчанию, можно переключить на «без срока»

   Pending-инвайт можно «переслать» через кнопку «Переслать приглашение» в раскрывающейся панели строки — отправляется тот же email повторно.

   Файлы:
   ~ `nextjs-src/src/app/components/project/SettingsTab.tsx` — переписать секцию «Роли и доступ» под новую таблицу + модалку с двумя табами
   ~ `nextjs-src/src/app/lib/queries.ts` — RPC для смены роли/доступа конкретного юзера, генерация ссылки-приглашения

9. **Настройки → Детали проекта: кнопка «Удалить проект» должна быть видима всегда.**
   На вкладке «Детали проекта» в секции «Опасная зона» кнопка «Удалить проект» отображается как чёрный прямоугольник без текста — текст появляется только при наведении (hover). Это сбивает с толку: пользователь не понимает что это кликабельный элемент.

   Причина (предположительно): inline-стиль `color: '#111'` на элементе с фоном `#111` или CSS `:hover` правило подменяет color, а в дефолтном состоянии цвет совпадает с фоном.

   Файл: `nextjs-src/src/app/components/project/SettingsTab.tsx` — строки около 301–307 (кнопка с `style={{ color: '#111', borderColor: '#111' }}` внутри `af-btn`).

   Фикс: убрать inline-стиль `color: '#111'` (он навешивается поверх класса `.af-btn` и текст не виден на белом/чёрном фоне в зависимости от состояния), оставить просто `className="af-btn"`. Если хочется акцент — вместо тёмного фона использовать классику ghost-кнопки `.af-btn` с обводкой `0.5px #111`, текст `#111`, на hover — инверсия (фон #111 / текст #F6F6F4).

10. **Настройки → Уведомления: 2-колоночная вёрстка вместо вертикального стэка.**
    Текущая страница тянется на 1.5 экрана, справа большое пустое место на десктопе. Объединить:
    - Левая колонка (50%): «Каналы доставки» — компактные строки `Имя | мета | (Привязать) | toggle`
    - Правая колонка (50%) — стэк двух карточек:
      - «Расписание» — 4 radio (Любое время / Рабочие+сб / Только будни / Своё) с подзаголовком-часами
      - «Срочные уведомления» — одна строка «Игнорировать расписание» + объяснение + toggle
    - Save/Cancel вынесены в правый нижний (отмена + сохранить), не teleport-кнопка через всю ширину
    Прототип: `/notifications-mockup`.

    Файл: `nextjs-src/src/app/components/project/NotificationSettings.tsx`.

## Sprint 2 — Mobile responsiveness

> User: «вчера хорошо поработали на десктопе, но мобилка поплыла»

### M1. Настройки → Роли и доступ — таблица не вмещается на iPhone.
Скрин: Email и колонка «Доступ» обрезаются справа, колонка «Роль» (`select`) подрезана.
Причина: жёсткий grid `44px 1.4fr 1.6fr 160px 200px 32px` в `SettingsTab.tsx` — суммарно ~700px минимум, не помещается в 375px viewport.

Реализация (mobile <768px):
- Скрыть header-строку с подписями колонок
- Каждая строка участника становится «карточкой»:
  ```
  [avatar] Имя ВЛАДЕЛЕЦ                 ×
  [avatar] email@example.com
  [select Роль                        ]
  [select Доступ                      ]
  ```
- Селекты `width: 100%`, высота 36px (touch-friendly)
- Делитe-крестик в правом верхнем углу карточки

Файлы: `nextjs-src/src/app/components/project/SettingsTab.tsx`, `globals.css` (новые классы `.af-roles-header / .af-roles-row / .af-roles-avatar / -name / -email / -role / -access / -del` с медиа-запросом).

> Note: уже частично сделано в этой сессии (CSS-классы и базовый responsive layout) — но в финальном спринте проверить на реальном iPhone, что:
> - Селекты `<select>` не зумятся при тапе (font-size ≥ 16px на мобиле)
> - Длинные email обрезаются ellipsis, не ломают вёрстку
> - Bottom-tabbar не наезжает на последнюю карточку — добавить `padding-bottom: 80px` контейнеру

### M2. Пины (annotation mode) → окно ввода замечания не вмещается на мобиле.
Скрин: попап «Замечание... / ESC / ОТПРА…» уезжает за правый край экрана, кнопка «ОТПРАВИТЬ» обрезана. Юзер не может оставить комментарий.
Причина: в `AnnotatableImage.tsx` thread-popup позиционируется абсолютно от пина (`left: pin.x%`) с фиксированной шириной — на мобиле при пине справа на картинке попап выходит за viewport.

Реализация:
- На мобиле (<768px) thread-popup должен быть **bottom sheet**, а не floating-popup рядом с пином:
  - `position: fixed; bottom: 0; left: 0; right: 0`
  - Высота auto, max-height ~60dvh, scroll внутри
  - Бэкдроп `position: fixed; inset: 0; background: rgba(0,0,0,0.4)` для закрытия по тапу мимо
  - Шапка sheet: «Пин #N» + кнопка ✕
  - Текстовое поле full-width, padding 16px, font-size 16px (анти-zoom iOS)
  - Кнопка «Отправить» full-width внизу
- На десктопе оставить floating-popup как сейчас (он там работает)
- Реализация через media query или `useMediaQuery('(max-width: 767px)')` хук

Файл: `nextjs-src/src/app/components/project/AnnotatableImage.tsx` — рендер popup переключать в зависимости от viewport.

### M3. Пройтись по всем экранам и проверить мобилку (после правок выше).
Стандартные подозреваемые после редизайна десктопа:
- Settings → Детали проекта (карточки в grid auto-fill — могут не помещаться)
- Settings → Уведомления (2-колоночный layout, должен схлопнуться в 1 колонку — проверить)
- Дизайн → детальный вид файла (видеообзоры/замечания/скачать — кнопки в строку, могут переполнить)
- Чат заказчика (новый single-thread layout)
- Roles modal — селекты роли/доступа в инвайт-окне
- Кабинет/ProfileCabinet (bottom sheet на 88dvh)

Чек-лист на каждом экране:
- Нет horizontal scroll
- Все кнопки/селекты ≥ 44px высота (touch target)
- Шрифт инпутов ≥ 16px (анти-zoom iOS Safari)
- Bottom-tabbar (`BottomTabBar`) не наезжает на интерактив — везде `padding-bottom: 72px` контейнеру

## Sprint 3 — Landing

### L1. Триал на лендинге: 7 → 14 дней.
✅ Сделано в этой сессии:
- `Landing.tsx`: «Попробовать 14 дней →» (3 кнопки), «14 дней полного доступа» в pricing-блоке.
- `Landing.tsx` Final CTA: заголовок «14 дней, чтобы проверить.» (было «Семь дней»), тело «Если через 2 недели не увидите разницы…» (было «через неделю»).
- `pricing/page.tsx`: «14 дней бесплатного доступа».
- Миграция `054_trial_14_days.sql` — применена на проде, триггер `create_trial_subscription` теперь даёт 14 дней.
Деплой фронта вместе с остальным спринтом.

### L2. Блок «Почему мы это сделали» → выезжающая панель (drawer).
✅ Реализовано в этой сессии. Контракт зафиксирован:
- **Десктоп (≥901px):** боковая панель справа, 560px на всю высоту, overlay затемняет фон
- **Мобайл/планшет (≤900px):** bottom-sheet снизу, full-width, max-height 88dvh, drag-handle вверху, swipe-down закрывает, `padding-bottom: env(safe-area-inset-bottom)` для iPhone home-indicator
- Один общий drawer на всю страницу — контент подменяется через `CustomEvent('why:open', {detail: ModuleDef})`. Не плодим 5 отдельных drawer'ов.
- Триггер `.afl-why-trigger` — компактный underline-link «ПОЧЕМУ МЫ ЭТО СДЕЛАЛИ →» вместо громоздкой ghost-кнопки. Соответствует визуальной плотности лендинга.
- Заголовки drawer'a по модулям: `whyKicker` (например «Модуль · Кабинет заказчика») + `whyTitle` (например «Прозрачность для клиента»). Хранятся в `MODULES`.
- Закрытие: ✕ / overlay / Esc / swipe-down (мобайл).
- Body scroll lock + focus возвращается на триггер при закрытии (a11y).

Файлы:
- `nextjs-src/src/app/landing/Landing.tsx` — `WhyDrawer` компонент в конце файла, `ModuleCopy` использует `dispatchEvent('why:open')`, `MODULES` обогащён `whyTitle/whyKicker`.
- `nextjs-src/src/app/globals.css` — `.afl-why-trigger / .afl-why-overlay / .afl-why-drawer` + media query `(max-width: 900px)`.

Решение по UX: пользователь подтвердил — на узком экране снизу, на широком сбоку. Брейкпоинт 900px (покрывает iPad portrait 768/820/834).

### L3. Акцентный цвет — горчичная охра `#B8862A` (точечно).
Добавить в `globals.css` переменную `--af-ochre: #B8862A` и `--af-ochre-hover: #9a6f1f` (тёмная охра для hover). **Применять только в трёх точках лендинга — больше нигде**.

1. **Pricing — карточка «Полгода» (популярный тариф)**:
   - Фон карточки: `#B8862A` (заменяет текущий чёрный/серый акцент).
   - Бейдж «ПОПУЛЯРНЫЙ» сверху: фон белый, текст `#B8862A` (либо наоборот — белый текст на охре, как сейчас); граница 0.5px ochre.
   - Текст внутри карточки — белый `#FFF` (на охре читается).
   - Тонкие разделители между фичами — `rgba(255,255,255,0.25)`.
   - CTA «Выбрать полгода →» внутри: фон прозрачный, обводка 1px белая, на hover инверсия (фон белый, текст ochre).
   - Файл: `nextjs-src/src/app/landing/Landing.tsx` секция `Pricing`, селектор `.afl-pri-card.featured` в `globals.css`.

2. **Hero CTA «Попробовать 14 дней →»**:
   - Фон `#B8862A`, текст `#FFF`. Сейчас, видимо, чёрный/inverted.
   - Hover: фон `#9a6f1f` (`--af-ochre-hover`), текст `#FFF`.
   - Файл: `Landing.tsx`, классы `.afl-btn.inverted` (hero) — добавить override через дополнительный класс `.afl-btn-ochre` или применить только к hero-кнопке через локальный селектор. **Не трогать остальные `.afl-btn` на странице.** Final CTA («Попробовать 14 дней →» в самом низу) — оставить чёрной (или тоже сделать охрой? — уточнить если важно; по умолчанию оставляю чёрной, охра только в hero и featured-карточке).
   - Альтернатива: создать класс `.afl-btn-accent` и навешать его только на нужные две кнопки.

3. **Триггер «Почему мы это сделали →»**:
   - `.afl-why-trigger`: текст и стрелка `#B8862A`, подчёркивание `0.5px solid #B8862A` (вместо `#EBEBEB`).
   - Hover: текст и подчёркивание `#9a6f1f` (или `#111` — обсудить, но судя по скрину пользователь хочет именно охру).
   - Файл: `globals.css` селектор `.afl-why-trigger`.

Hover-стратегия (договорились): **в фирменных акцентах ochre темнеет в hover (`--af-ochre-hover`)**, не инвертируется в чёрный. В монохромных (ghost) кнопках везде остаётся прежняя инверсия чёрная.

Не трогать (сохранить текущий монохром):
- Топбар, ссылки в навигации, FAQ-аккордеоны
- Footer, footer-ссылки
- Все остальные кнопки `.afl-btn` (hero secondary, modules links, итд)
- Final CTA в самом низу (по умолчанию остаётся чёрной — если хочется и её сделать охрой, скажи отдельно)
- Цвета внутри приложения (`/projects/...`, `/login`, `/pricing` — pricing-страница это не лендинг, а табличная выкладка тарифов; там охру не применяем)

Чек после реализации: на лендинге охра встречается **ровно** в этих 3 местах. Где-то ещё — баг, чинить.

## Sprint 4 — Misc UI fixes

### S1. Авторский надзор → детальный отчёт → «Общий комментарий» обрезан в маленьком окошке.
Скрин: на странице отчёта (`/projects/<id>/supervision/reports/<reportId>`) длинный комментарий на 4+ пунктов влезает только частично — внутренний скролл (видны стрелки ↑↓ справа). Для дизайнера это бесит: текст скрыт, нужно скроллить в крошечном поле.

Нужно:
- Поле «Общий комментарий» должно растягиваться по высоте контента (auto-grow textarea), без внутреннего scrollbar.
- В режиме просмотра (заполненный отчёт) — рендерить как plain `<div>` с `white-space: pre-wrap`, без фиксированной высоты.
- В режиме редактирования — `<textarea>` с `field-sizing: content` (новый CSS) или JS-resize по input. Min-height ~6 строк, max-height не ограничивать (или ~50dvh с внешним скроллом страницы).
- Убрать любой `max-height: Npx; overflow-y: auto` с самого поля.

Файл: `nextjs-src/src/app/components/supervision/ReportDetailView.tsx` (или там где рендерится «Общий комментарий»).

## Sprint 5 — App-wide ochre accents

> Расширение L3 — охра `#B8862A` уходит из лендинга в продуктовые экраны.

### A1. Левая вертикальная рамка (rail) во всех разделах сервиса.
Сейчас 80px-rail-колонка слева в layout каждого раздела (Дизайн / Авторнадзор / Комплектация / Чат / Проекты / Кабинет) — чёрная или светло-серая. **Сделать охрой `#B8862A`**.
- Конкретные кейсы со скрина:
  - Кремово-жёлтый dashed-блок «+ Новый проект» на главной — рамка dashed целиком становится охрой (`border: 1px dashed var(--af-ochre)`), фон оставить кремовым. Иконка `+` — охра.
  - Баннер «Обновление: Электронная подпись договоров — теперь в Archflow» — слева вертикальная полоса 4px ochre. Заголовок «ОБНОВЛЕНИЕ» (kicker) — тоже охрой.
- Поиск всех мест с rail/vertical-accent:
  - `globals.css` селекторы с `border-left: ... solid #111` или `border-left: ... solid var(--af-black)` на main-контейнерах разделов
  - Возможно есть утилитарный класс типа `.af-rail` / `.af-accent-bar` — все вхождения переключить на `var(--af-ochre)`
  - Bottom-tabbar активная вкладка — НЕ трогать (там палец активного раздела), сохранить чёрный

### A2. Action-microcopy: переименовать в охру слова-действия (uppercase микрокнопки).
**Конкретный список** (по запросу пользователя — пока только эти, не все uppercase):
- `+ Новый проект`
- `+ Пригласить` (Settings → Роли)
- `Загрузить` (везде где есть upload)
- `Скачать` (везде где есть download — Архив проекта, файлы дизайна, отчёты, мудборд)
- `Записать` (видеообзор)
- `Обновление` (kicker баннеров с новостями фич)

**Стилизация:**
- Цвет текста: `var(--af-ochre)`
- Иконка перед действием (`+`, `↑`, `↓`, `🎬`, `↗`) — **тоже охра** (color наследуется или явно прописан)
- Hover: текст темнее охры — `var(--af-ochre-hover) #9a6f1f`. Background не меняется (это не fill-кнопка, а text-link/ghost).
- Если у кнопки есть border (как `.af-btn`), border тоже идёт охрой; на hover — фон ochre, текст белый (инверсия в фирменный акцент, не в чёрный).

**НЕ трогать**:
- Кнопка «Сохранить» / «Отправить» / «Подтвердить» — основные fill-чёрные CTA остаются чёрными
- «Удалить», «Отмена» — серые/чёрные ghost-кнопки оставляем монохромными (это destructive/cancel, не action)
- Любые table-headers, breadcrumbs, метки полей — монохромные
- Иконки в навигации (BottomTabBar, Topbar) — монохромные
- Кнопки `Экспорт ↗` в топбаре — пока **не трогать** (юзер не упомянул, в следующей итерации обсудить если надо)

### A3. Реализационные заметки.
- Переменные `--af-ochre: #B8862A` и `--af-ochre-hover: #9a6f1f` объявить **глобально** в `:root` в `globals.css` (не локально в .afl-* секции, чтобы переиспользовать в продуктовых экранах).
- Добавить utility-классы или модификаторы:
  - `.af-action` — для уже существующего `.af-btn` style, но с ochre-палитрой. Применять адресно через `className="af-btn af-action"`.
  - Или прямо в TSX — заменить `style={{ color: '#111' }}` на `style={{ color: 'var(--af-ochre)' }}` где явно действие.
- **Не делать** глобальный override `.af-btn { color: var(--af-ochre) }` — это перекрасит ВСЁ. Адресная замена через дополнительный класс или прямой стиль.

### A4. Файлы (минимум, по которым пройтись):
- `nextjs-src/src/app/components/ProjectsPage.tsx` — карточка «+ Новый проект»
- `nextjs-src/src/app/components/ChangelogBanner.tsx` — баннер «Обновление»
- `nextjs-src/src/app/components/project/SettingsTab.tsx` — кнопка «+ Пригласить» (новая ochre-стилизация)
- `nextjs-src/src/app/components/project/DesignFolderView.tsx` — «Загрузить», «Скачать»
- `nextjs-src/src/app/components/project/DesignFileDetail.tsx` — «Скачать», «Записать обзор»
- `nextjs-src/src/app/components/supervision/ReportDetailView.tsx` — «Скачать»
- `nextjs-src/src/app/components/supply/SupplyDocuments.tsx` — «Загрузить», «Скачать»
- `nextjs-src/src/app/components/moodboard/MoodboardCanvas.tsx` — «Скачать PNG», если есть
- `nextjs-src/src/app/globals.css` — переменные + при необходимости utility-класс `.af-action`

### A5. Чек после реализации.
- Охра видна на всех `+ Новый проект` и dashed-блоках в разделах
- Все «Загрузить/Скачать/Пригласить/Записать» — охра, hover темнее
- Иконки перед action-словами — тоже охра
- Бейджи «Обновление» — слева вертикальная полоса ochre
- Тёмные fill-кнопки («Сохранить» и пр.) остались чёрными — не должны быть охрой
- Топбар/breadcrumbs/footer/инпуты — без охры, монохромны
- На странице нет неконсистентных «полу-охра / полу-чёрные» — где есть охра, там она и в hover, и в иконке
- Контрастность охра-на-белом и охра-на-кремовом ≥ AA для текста ≥ 14px (проверить — `#B8862A` на `#FFF` ≈ 4.7:1 — норм; на `#F6F6F4` ≈ 4.5:1 — на грани)

### S2. Голосовые в чате не транскрибируются. **[ROOT CAUSE]**
Голосовые шлются в Edge Function `process-voice` на **старой** Supabase инстанции `fcbllfvlpzlczinlydcm.supabase.co` (`ChatView.tsx:484`). После миграции БД на Yandex VM (`db.archflow.ru`, апрель 2026) JWT, который выдаёт новая Supabase, не валиден для старой Edge Function — она 401-ит и плейсхолдер «обрабатывается…» так и висит навсегда.

Решение (выбрать):
1. **Перенести `process-voice` в Next.js API route на VPS** — `/api/voice/transcribe`. Принимает FormData (audio + meta), грузит в Yandex Supabase Storage через service role, зовёт OpenAI Whisper API, апдейтит `chat_messages.text`. Удалить хардкод старой Supabase URL.
2. Развернуть Edge Function на Yandex VM (если там настроен deno-runtime).
3. Сменить JWT secret в старой Edge Function на тот же что в новой Supabase (плохо — две системы под одним секретом).

Рекомендую (1).

Файл: `nextjs-src/src/app/components/project/ChatView.tsx:484`, новый: `nextjs-src/src/app/api/voice/transcribe/route.ts`.

### S3. Комментарии к пинам визуализаций не загружаются. ✅ **FIXED**
Причина: `getFileAnnotations()` делал JOIN `profiles!design_file_annotations_author_id_fkey`, но FK ссылается на `auth.users`, а не на `profiles` — PostgREST 500-ит, queries.ts кидает throw, в `AnnotatableImage` зависает loading.

Фикс: убран hint, аннотации и авторы загружаются раздельно (2 запроса), затем хидрейтятся в `author` поле в коде.

Файл: `nextjs-src/src/app/lib/queries.ts:619`.

[add user-provided requirements here as they come in]
