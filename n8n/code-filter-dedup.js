/**
 * Archflow Signal Agent — Filter & Dedup Code Node
 *
 * Куда вставить: n8n → добавь ноду "Code" между Limit и первой AI-нодой
 * Тип: Run Once for All Items
 * Язык: JavaScript
 *
 * Что делает:
 * 1. Убирает дубликаты по заголовку (fuzzy-matching)
 * 2. Отсекает статьи старше 3 дней
 * 3. Убирает слишком короткие/пустые статьи
 * 4. Лимитирует до N статей
 * 5. Определяет источник по домену
 * 6. Форматирует для AI-ноды
 */

// === НАСТРОЙКИ ===
const MAX_ARTICLES = 10;        // Сколько статей отправлять в AI
const MAX_AGE_DAYS = 3;         // Максимальный возраст статьи
const MIN_CONTENT_LENGTH = 50;  // Минимальная длина контента
const SIMILARITY_THRESHOLD = 0.6; // Порог для дубликатов (0-1)

// === ОПРЕДЕЛЕНИЕ ИСТОЧНИКА ===
function getSource(link) {
  if (!link) return 'Unknown';
  const map = {
    'constructiondive': 'Construction Dive',
    'archdaily': 'ArchDaily',
    'dezeen': 'Dezeen',
    'futuretools': 'Future Tools',
    'firstround': 'First Round Review',
    'saastr': 'SaaStr',
    'enr.com': 'ENR',
    'autodesk': 'Autodesk',
    'buildingsmart': 'buildingSMART'
  };
  for (const [domain, name] of Object.entries(map)) {
    if (link.includes(domain)) return name;
  }
  // Извлечь домен как fallback
  try {
    const url = new URL(link);
    return url.hostname.replace('www.', '');
  } catch {
    return 'Other';
  }
}

// === ПРОВЕРКА ВОЗРАСТА ===
function isRecent(pubDate) {
  if (!pubDate) return true; // если нет даты — пропускаем
  try {
    const published = new Date(pubDate);
    const now = new Date();
    const diffDays = (now - published) / (1000 * 60 * 60 * 24);
    return diffDays <= MAX_AGE_DAYS;
  } catch {
    return true;
  }
}

// === ДЕДУПЛИКАЦИЯ ===
function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a, b) {
  const wordsA = new Set(normalizeTitle(a).split(' '));
  const wordsB = new Set(normalizeTitle(b).split(' '));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union; // Jaccard similarity
}

function isDuplicate(title, seenTitles) {
  for (const seen of seenTitles) {
    if (similarity(title, seen) > SIMILARITY_THRESHOLD) {
      return true;
    }
  }
  return false;
}

// === ОСНОВНАЯ ЛОГИКА ===
const items = $input.all();
const seenTitles = [];
const filtered = [];

for (const item of items) {
  const d = item.json;
  const title = d.title || '';
  const content = d.contentSnippet || d.content || d.description || '';
  const link = d.link || '';
  const pubDate = d.pubDate || d.isoDate || '';

  // Фильтр 1: пустые/короткие
  if (!title.trim() || content.replace(/<[^>]*>/g, '').trim().length < MIN_CONTENT_LENGTH) {
    continue;
  }

  // Фильтр 2: старые
  if (!isRecent(pubDate)) {
    continue;
  }

  // Фильтр 3: дубликаты
  if (isDuplicate(title, seenTitles)) {
    continue;
  }

  seenTitles.push(title);

  // Очистка HTML из контента
  const cleanContent = content
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500);

  filtered.push({
    json: {
      source: getSource(link),
      title: title.trim(),
      link: link.trim(),
      content: cleanContent,
      pubDate: pubDate,
      _index: filtered.length + 1
    }
  });
}

// Лимит
const result = filtered.slice(0, MAX_ARTICLES);

// Если ничего не осталось — стоп
if (result.length === 0) {
  return [];
}

return result;

/**
 * === АЛЬТЕРНАТИВНЫЙ ВАРИАНТ ===
 *
 * Если хочешь отправить ВСЕ статьи одним текстом в AI (вместо по одной),
 * раскомментируй код ниже и закомментируй return result выше:
 *
 * const articlesText = result.map(item => {
 *   const d = item.json;
 *   return `[${d._index}] ${d.source} | ${d.title}\n${d.content}`;
 * }).join('\n\n---\n\n');
 *
 * return [{
 *   json: {
 *     articles_text: articlesText,
 *     articles_count: result.length,
 *     sources: [...new Set(result.map(r => r.json.source))].join(', ')
 *   }
 * }];
 */
