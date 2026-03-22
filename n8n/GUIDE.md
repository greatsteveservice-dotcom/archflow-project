# Archflow Signal Agent — Полный гайд по настройке

## Архитектура воркфлоу

```
Schedule Trigger (9:00 ежедневно)
    │
    ├── RSS: Construction Dive
    ├── RSS: ArchDaily
    ├── RSS: Dezeen
    ├── RSS: Future Tools
    └── RSS: First Round Review
            │
            ▼
      Merge (Append) ← объединение всех фидов
            │
            ▼
      Code: Filter & Dedup ← фильтрация, дедуп, очистка
            │
            ▼
      Limit (10 items)
            │
            ▼
      AI: Signal Analysis ← prompt-1-signal-analysis.md
            │
            ▼
      AI: Report Generator ← prompt-2-report.md
            │
            ▼
      Telegram: Send Report
```

---

## 1. Schedule Trigger (замена Manual Trigger)

Замени "When clicking Execute" на **Schedule Trigger**:

| Параметр | Значение |
|----------|----------|
| Trigger | Cron |
| Expression | `0 9 * * 1-5` |

Расшифровка: в 9:00, понедельник-пятница.

Другие варианты:
- `0 9 * * *` — каждый день включая выходные
- `0 9,18 * * 1-5` — два раза в день (утро + вечер)
- `0 */6 * * *` — каждые 6 часов

---

## 2. RSS-источники

### Ядро (обязательные)

| Источник | URL | Что даёт |
|----------|-----|----------|
| Construction Dive | `https://www.constructiondive.com/feeds/news/` | Проблемы строек, координация, сроки |
| ArchDaily | `https://www.archdaily.com/rss` | Архитектурные процессы, технологии |
| Dezeen | `https://www.dezeen.com/feed/` | Дизайн интерьера, работа с клиентом |

### AI/Автоматизация

| Источник | URL | Что даёт |
|----------|-----|----------|
| Future Tools | `https://www.futuretools.io/news/rss.xml` | AI-инструменты, автоматизация |

### SaaS/Продуктовые паттерны (опционально)

| Источник | URL | Что даёт |
|----------|-----|----------|
| First Round Review | `https://review.firstround.com/rss/` | UX, продуктовые решения |
| SaaStr | `https://www.saastr.com/feed/` | B2B SaaS паттерны |

### Как добавить RSS-ноду в n8n:
1. Добавь ноду **RSS Feed Read**
2. В поле URL вставь ссылку
3. Подключи выход к **Merge** ноде

### Merge нескольких RSS:
- **Вариант A** (простой): 2 RSS → Merge → ещё RSS → Merge → ...
- **Вариант B** (через Code): один Code-нод, который получает все items

Для Merge ноды:
- Type: **Merge**
- Mode: **Append**
- Подключи RSS-ноды к Input 1 и Input 2

Для 5+ источников — цепочка Merge:
```
RSS1 ──┐
       ├── Merge1 ──┐
RSS2 ──┘            ├── Merge2 ──┐
RSS3 ───────────────┘            ├── Merge3 → Code Filter → ...
RSS4 ────────────────────────────┘
```

---

## 3. Code Node: Filter & Dedup

**Файл**: `code-filter-dedup.js`

Вставь между Merge и Limit (или вместо Limit):

1. Добавь ноду **Code**
2. Language: **JavaScript**
3. Mode: **Run Once for All Items**
4. Скопируй содержимое `code-filter-dedup.js`

Настройки внутри кода (константы вверху файла):
```
MAX_ARTICLES = 10       // макс. статей для AI
MAX_AGE_DAYS = 3        // не старше 3 дней
MIN_CONTENT_LENGTH = 50 // мин. длина текста
SIMILARITY_THRESHOLD = 0.6  // порог дубликатов
```

---

## 4. AI Node #1 — Signal Analysis

**Файл**: `prompt-1-signal-analysis.md`

### Настройки ноды "Message a model":

| Параметр | Значение |
|----------|----------|
| Model | `gpt-4o` (рекомендуется) или `gpt-4o-mini` (дешевле) |
| System Prompt | Скопируй из `prompt-1-signal-analysis.md` → секция "System Prompt" |
| Temperature | `0.3` (низкая — для аналитической точности) |
| Max Tokens | `2000` |

### User Prompt:

Если items приходят по одному (через Limit):
```
Проанализируй статью и найди сигнал для Archflow:

Источник: {{ $json.source }}
Заголовок: {{ $json.title }}
Контент: {{ $json.content }}
```

Если все items объединены (через Code → альтернативный вариант):
```
Проанализируй статьи и найди сигналы для Archflow:

{{ $json.articles_text }}
```

### Важно: JSON Response
Если используешь OpenAI — включи **JSON Mode**:
- В ноде → Advanced → Response Format → `JSON Object`

---

## 5. AI Node #2 — Report Generator

**Файл**: `prompt-2-report.md`

### Настройки ноды:

| Параметр | Значение |
|----------|----------|
| Model | `gpt-4o` или `gpt-4o-mini` |
| System Prompt | Скопируй из `prompt-2-report.md` → секция "System Prompt" |
| Temperature | `0.5` (чуть выше — для стилистики) |
| Max Tokens | `1500` |

### User Prompt:
```
Сформируй Telegram-отчёт из результатов анализа:

{{ $json.message.content }}
```

> Проверь название поля! Может быть `$json.text`, `$json.output`, `$json.message.content` — зависит от типа AI-ноды.

---

## 6. Telegram Node

### Настройка бота:
1. Напиши `/newbot` в @BotFather в Telegram
2. Получи **Bot Token** (формат: `123456:ABC-DEF...`)
3. Отправь боту любое сообщение
4. Узнай свой **Chat ID**: `https://api.telegram.org/bot<TOKEN>/getUpdates`

### Настройки ноды:

| Параметр | Значение |
|----------|----------|
| Credential | Telegram Bot API (вставь Bot Token) |
| Chat ID | Твой Chat ID |
| Text | `{{ $json.message.content }}` или `{{ $json.text }}` |
| Parse Mode | **HTML** |

### Ограничения Telegram:
- Максимум **4096 символов** на сообщение
- Поддерживаемые HTML теги: `<b>`, `<i>`, `<code>`, `<pre>`, `<a>`, `<s>`, `<u>`
- НЕ поддерживаются: `<br>`, `<p>`, `<div>`, `<h1>`-`<h6>`

---

## 7. Error Handling

### На каждой RSS ноде:
Settings → **Continue On Fail** → ✅ (чтобы один упавший фид не блокировал весь воркфлоу)

### На AI нодах:
Settings → **Retry On Fail** → ✅
- Max Retries: `2`
- Wait Between: `5000` ms

### На Telegram ноде:
Settings → **Retry On Fail** → ✅
- Max Retries: `3`

---

## 8. Стоимость

### Примерный расход в день:

| Компонент | Токены/день | Стоимость |
|-----------|-------------|-----------|
| GPT-4o: Signal Analysis | ~3000 input + ~1500 output | ~$0.02 |
| GPT-4o: Report | ~2000 input + ~800 output | ~$0.01 |
| **Итого** | | **~$0.03/день ≈ $1/месяц** |

С GPT-4o-mini — в 10 раз дешевле (~$0.003/день).

---

## 9. Тестирование

### Шаг 1: Проверь RSS
Запусти только RSS-ноды → убедись что items приходят с `title`, `link`, `contentSnippet`.

### Шаг 2: Проверь Filter
Подключи Code-ноду → запусти → проверь что дубли убраны, старые отсечены.

### Шаг 3: Проверь AI #1
Запусти до первой AI-ноды → проверь что ответ приходит в JSON с `signals[]`.

### Шаг 4: Проверь AI #2
Запусти полный флоу → проверь что Telegram-сообщение:
- Форматировано в HTML
- Содержит сигналы, тренды, приоритеты
- Не длиннее 4096 символов

### Шаг 5: Включи Schedule
Замени Manual Trigger на Schedule → активируй воркфлоу.

---

## 10. Пример результата в Telegram

```
🚀 Archflow Signal Report
20 марта 2026

📡 Сигналы

• AI-powered punch lists [🏗 supervision]
Подрядчики используют Vision AI для автоматического обнаружения дефектов по фото
💡 Идея: auto-classify замечаний на фото визита — AI определяет тип дефекта и присваивает зону/приоритет

• Predictive delivery tracking [📦 supply]
Supply chain платформы прогнозируют задержки поставок через ML на исторических данных
💡 Идея: обогатить risk-расчёт комплектации — предсказывать реальный leadTime поставщика на основе истории заказов

🧠 Куда движется рынок
AI-аудит объектов, предиктивная логистика материалов, автосогласование через фото

⚡ Что проработать первым
1. AI-классификация фото — минимальная доработка VisitPage, высокий impact на скорость надзора
2. Предиктивный leadTime — уже есть данные в Supply, нужен ML-слой

📊 Статистика
Проанализировано: 10 статей | Сигналов: 2 | Отброшено: 8
```

---

## Файлы в этой папке

| Файл | Назначение |
|------|-----------|
| `GUIDE.md` | Этот гайд |
| `prompt-1-signal-analysis.md` | System prompt для первой AI-ноды |
| `prompt-2-report.md` | System prompt для второй AI-ноды |
| `code-filter-dedup.js` | JavaScript для Code-ноды фильтрации |
