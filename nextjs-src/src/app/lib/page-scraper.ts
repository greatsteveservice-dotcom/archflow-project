// Scrape supplier pages with puppeteer-core + @sparticuz/chromium.
// Singleton browser pattern — launched lazily, reused across requests.
// Extracts price / availability / phone / company name via GPT-4o-mini
// (much more reliable than raw regex across diverse e-commerce layouts).

import type { Browser, Page } from 'puppeteer-core';

let _browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browserPromise) return _browserPromise;
  _browserPromise = (async () => {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = await import('puppeteer-core');
    // Allow GPU / more rendering on long-running servers vs Lambda
    const args = [
      ...chromium.args,
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ];
    const executablePath = await chromium.executablePath();
    return puppeteer.default.launch({
      args,
      executablePath,
      headless: true,
      defaultViewport: { width: 1280, height: 800 },
    });
  })();
  return _browserPromise;
}

/**
 * Fetch a single page's innerText (after JS render).
 * Returns null on timeout / crash.
 */
export async function fetchPageText(url: string, timeoutMs = 10000): Promise<{ text: string; title: string } | null> {
  let page: Page | null = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; Archflow/1.0; +https://archflow.ru)');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ru-RU,ru;q=0.9' });
    // Block heavy resources (images, fonts, media) for speed
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) req.abort();
      else req.continue();
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    // Give JS a moment to render prices (React/Vue SPAs)
    await new Promise(r => setTimeout(r, 800));
    const title = await page.title().catch(() => '');
    const text = await page.evaluate(() => {
      const body = document.body?.innerText || '';
      // Truncate to first ~8KB — enough for GPT to find price/phone
      return body.slice(0, 8000);
    }).catch(() => '');
    return { text, title };
  } catch {
    return null;
  } finally {
    if (page) { try { await page.close(); } catch {} }
  }
}

export interface ScrapedProduct {
  price: number | null;
  priceText: string | null;
  availability: 'in_stock' | 'in_catalog' | 'unknown';
  phone: string | null;
  companyName: string | null;
}

/**
 * Extract structured product data from page text via GPT-4o-mini.
 * Expects OPENAI_API_KEY in env (lazy-init pattern).
 */
export async function extractProduct(url: string, title: string, text: string, query: string): Promise<ScrapedProduct> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // fallback to regex-only when key missing
    return regexExtract(text, title);
  }

  const domain = (() => { try { return new URL(url).hostname; } catch { return url; } })();
  const systemPrompt = `Ты извлекаешь данные о товаре с веб-страницы поставщика для интерьерных дизайнеров. Отвечай СТРОГО JSON-объектом с полями:
{"price": число или null, "priceText": "строка как на странице" или null, "availability": "in_stock" | "in_catalog" | "unknown", "phone": "79XXXXXXXXX" или null, "companyName": "название компании" или null}
Правила:
- price — только цена ОДНОЙ единицы искомого товара в рублях. НЕ артикул, НЕ диагональ, НЕ вес, НЕ код. Если цены нет — null.
- priceText — как цена выглядит на странице ("45 000 ₽", "от 15 300 руб", "по запросу").
- availability: in_stock = явно "в наличии", in_catalog = "под заказ"/"на заказ"/"в каталоге"/"ожидается", unknown = ничего не сказано.
- phone — только российский, формат "79XXXXXXXXX" (11 цифр, начинается с 7). Если телефона нет — null.
- companyName — название магазина/компании, а не товара.`;

  const userPrompt = `URL: ${url}
Домен: ${domain}
Title: ${title}
Запрос пользователя: "${query}"

Текст страницы:
${text.slice(0, 6000)}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        max_tokens: 200,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!res.ok) return regexExtract(text, title);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return regexExtract(text, title);
    const parsed = JSON.parse(content);
    return {
      price: typeof parsed.price === 'number' && parsed.price > 0 ? Math.round(parsed.price) : null,
      priceText: parsed.priceText ? String(parsed.priceText).slice(0, 60) : null,
      availability: ['in_stock', 'in_catalog', 'unknown'].includes(parsed.availability) ? parsed.availability : 'unknown',
      phone: parsed.phone && /^7\d{10}$/.test(String(parsed.phone)) ? String(parsed.phone) : null,
      companyName: parsed.companyName ? String(parsed.companyName).slice(0, 80) : null,
    };
  } catch {
    return regexExtract(text, title);
  }
}

/** Fallback regex extractor */
function regexExtract(text: string, title: string): ScrapedProduct {
  const priceMatch = text.match(/(\d[\d\s]{2,8})\s*(₽|руб)/i);
  const price = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, ''), 10) : null;
  const priceText = priceMatch ? priceMatch[0].trim() : null;
  const inStock = /в наличии|есть в наличии/i.test(text);
  const inCatalog = /под заказ|на заказ|в каталоге/i.test(text);
  const availability: ScrapedProduct['availability'] = inStock ? 'in_stock' : inCatalog ? 'in_catalog' : 'unknown';
  const phoneMatch = text.match(/(?:\+7|8|7)[\s\-–]?\(?\d{3}\)?[\s\-–]?\d{3}[\s\-–]?\d{2}[\s\-–]?\d{2}/);
  const phone = phoneMatch ? normalizeRuPhone(phoneMatch[0]) : null;
  const companyName = title ? title.split(/[|\-–]/)[0].trim().slice(0, 80) : null;
  return { price: price && price > 0 ? price : null, priceText, availability, phone, companyName };
}

function normalizeRuPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) return '7' + digits.slice(1);
  if (digits.length === 10) return '7' + digits;
  return null;
}

/**
 * Approximate domain age via a simple HEAD to the root + heuristic.
 * For real WHOIS we'd need a paid API; here we just return null by default.
 * UI treats null as "unknown".
 */
export async function estimateDomainAge(_domain: string): Promise<number | null> {
  // Deliberately a no-op for MVP — WHOIS-free services are unreliable.
  // Future: wire up a WHOIS provider with API key.
  return null;
}
