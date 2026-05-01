# Archflow — Design System

Краткий референс для Claude и любого, кто рисует/верстает экраны Archflow. Полный документ-источник: `ARCHFLOW_STYLEGUIDE.md`. Этот файл — выжимка для быстрой проверки.

---

## 1. Бренд

**Editorial monochrome.** Газетно-журнальный сериф (small-caps), четыре цвета + охра, никакого радиуса, никаких теней, инверсия на hover. Никаких градиентов, иконок-заглушек, декоративных элементов.

Образ: выставочный каталог архитектурной студии × швейцарская типографика × Bauhaus.

---

## 2. Цвета

### 4 базовых

| Токен | HEX | Назначение |
|-------|-----|-----------|
| `--af-black` | `#111111` | Основной текст, инвертированные блоки, бордеры активных состояний |
| `--af-offwhite` | `#F6F6F4` | Фон страницы, мягкие зоны |
| `--af-border` | `#EBEBEB` | Линии, разделители, неактивные элементы, плейсхолдеры |
| `--af-white` | `#FFFFFF` | Фон карточек, topbar, инверсия на hover |

### 1 акцентный

| Токен | HEX | Назначение |
|-------|-----|-----------|
| `--af-ochre` | `#B8862A` | Hero CTA, action-кнопки (`+ Новый проект`, `Загрузить`, `Скачать`, `Записать`, `+ Пригласить`), pricing featured card, why-drawer триггер, changelog kicker, левые rail-рамки блоков. Hover: `#9a6f1f`. |

**Охра — не для:** текста заголовков, навигации, бордеров блоков, фонов больших зон.

### Текстовые оттенки серого (только для текста!)

- `--ink-muted` `rgb(100,100,100)` — вторичный текст
- `--ink-faint` `rgb(150,150,150)` — третичный
- `--ink-ghost` `rgb(200,200,200)` — placeholder-like

**Запрещено:** красный (`#E24B4A`, `#DC2626`), синий (`#2563EB`), зелёный, любые промежуточные серые (`#999`, `#666`), любые brand-акценты. Эмфаз делается **инверсией** (`#111` блок) или **охрой**, а не другими цветами.

Тёмная тема **выключена принудительно** в `theme.tsx` — всегда светлая.

---

## 3. Типографика

### Продукт (`/projects/*`, кабинет, чат, etc.)

**Один шрифт: Vollkorn SC** (small-caps serif, Google Fonts).

Веса:
- **400** — body, лейблы, кнопки, подписи
- **600** — активное состояние, акцент
- **700** — заголовки секций, карточек, табов
- **900** — заголовок страницы, крупные метрики

⚠️ Веса **300 в Vollkorn SC нет** — использовать 400.

Vollkorn SC уже рендерит lowercase как small-caps, поэтому `text-transform: uppercase` применяется **только** к мелкой микрокопи ≤11px (whitelist в `globals.css`: `.af-label, .af-topbar-context, .af-crumb, .af-block-index, .af-tab-index, .af-project-meta, .af-status, .af-input-label, .af-settings-heading, .af-btn, .ti, .stb, .filter-tab, .supply-tab`). На заголовках — никогда.

CSS-переменные: `--af-font` (canonical); `--af-font-display`, `--af-font-mono` — алиасы (legacy).

Letter-spacing для Vollkorn: **компактный**.
- 9–11px микрокопи: `0.18em`–`0.2em`
- 12–18px: `0.04em`–`0.06em`
- 20px+: `0.01em`–`0.02em`

Mobile font CSS vars: `--af-fs-7` … `--af-fs-13`. Использовать `fontSize: 'var(--af-fs-12)'`, не хардкодить.
На мобильных `input/textarea/select` → `16px !important` (anti-iOS-zoom).

### Лендинг (`/welcome`)

**Другой шрифтовой стек:** Playfair Display (display) + Inter (body). Привязан **только** через `.afl-root` scoped-rebind переменных `--af-landing-*`. Глобальные `--af-font*` остаются Vollkorn SC.

CSS-классы лендинга — `.afl-*` (не `.af-*`). Изменения типографики лендинга — в `globals.css`, не inline.

---

## 4. Геометрия

- **`border-radius: 0` ВЕЗДЕ** — без исключений (модалки, тултипы, unread-точки, бейджи, аватары — да-да).
- **Block gaps: `2px`** между карточками в списках.
- **No shadows.** Тень — это эффект, а у нас edges and ink only.
- **No gradients.** Цвет либо есть, либо нет.

---

## 5. Hover / Active

- **Hover = инверсия цвета**: белый фон → `#111`, тёмный текст → белый.
- Никаких opacity-переходов, никаких scale. Только swap цвета.
- **Inline styles блокируют `:hover` / `:active`** — у inline специфичность выше CSS-класса. На интерактивных элементах с hover-логикой использовать `.af-*` классы, не inline `color`/`background`.

---

## 6. Кнопки

### Ghost (по умолчанию)

```css
border: 1px solid #111;
background: transparent;
color: #111;
padding: …; /* зависит от размера */
text-transform: uppercase; /* только если ≤11px */
letter-spacing: 0.06em–0.18em;
font-weight: 400;
/* hover: */
background: #111;
color: #FFF;
```

### Primary (охра) — для action-кнопок

```css
background: #B8862A;
color: #FFF;
border: 1px solid #B8862A;
/* hover: */
background: #9a6f1f;
border-color: #9a6f1f;
```

Применять охру на: «+ Новый проект», «Загрузить», «Скачать», «Записать», «+ Пригласить», CTA лендинга/pricing. **Не применять** на «Сохранить», «Отмена», табах, фильтрах.

### Inverted (чёрный фон)

```css
background: #111;
color: #FFF;
border: 1px solid #111;
/* hover: */
background: #FFF;
color: #111;
```

---

## 7. Микрокопи / Лейблы

- ВСЁ uppercase + tracking ≥`0.12em`.
- Размер `var(--af-fs-9)` или `var(--af-fs-10)` (~9–11px).
- Цвет `#111` opacity 0.55 для вторичной микрокопи, `#111` opacity 1 для активной.
- Класс — `.af-label`, `.af-block-index`, `.af-status` etc.

---

## 8. Иконки

- SVG inline или React-компоненты в `components/Icons.tsx`.
- Stroke-width 2.4 для иконок таббара (28×28), 2 для остальных.
- **Иконки принимают `className` only, НЕ `style`** — inline style ломает production build (выживает в HMR, но падает при сборке).

---

## 9. Файлы для глубокого погружения

- **Полная спецификация**: [`ARCHFLOW_STYLEGUIDE.md`](./ARCHFLOW_STYLEGUIDE.md)
- **CSS реализация**: `nextjs-src/src/app/globals.css` (классы `.af-*`, `.afl-*`)
- **Шрифты**: `nextjs-src/src/app/layout.tsx` (Google Fonts link + Next/font fallback)
- **Тема (kill-switch dark mode)**: `nextjs-src/src/app/lib/theme.tsx`

---

## 10. Что НЕ менять без явного запроса

- Шрифт (Vollkorn SC single-font system для продукта; Playfair/Inter для `/welcome`).
- Палитра (4 базовых + охра, никаких новых цветов).
- `border-radius: 0`.
- Структура навигации.
- Permission-логика.
- Dark mode kill-switch в `theme.tsx`.
