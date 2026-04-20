// Yandex Cloud Search API v2 wrapper.
// Docs: https://yandex.cloud/ru/docs/search-api/
// Lazy-init per CI build constraints.

let _config: { apiKey: string; folderId: string } | null = null;

function getConfig() {
  if (_config) return _config;
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  if (!apiKey) throw new Error('YANDEX_API_KEY not configured');
  if (!folderId) throw new Error('YANDEX_FOLDER_ID not configured');
  _config = { apiKey, folderId };
  return _config;
}

export interface YandexSearchHit {
  url: string;
  title: string;
  passages: string[];
}

/**
 * Perform a web search via Yandex Search API v2 (sync endpoint).
 * Returns up to `limit` results (default 15).
 */
export async function yandexWebSearch(query: string, limit = 15): Promise<YandexSearchHit[]> {
  const { apiKey, folderId } = getConfig();

  const body = {
    query: {
      searchType: 'SEARCH_TYPE_RU',
      queryText: query,
      familyMode: 'FAMILY_MODE_MODERATE',
      page: '0',
      fixTypoMode: 'FIX_TYPO_MODE_ON',
    },
    groupSpec: {
      groupMode: 'GROUP_MODE_FLAT',
      groupsOnPage: String(limit),
      docsInGroup: '1',
    },
    maxPassages: '2',
    region: '225', // Russia
    l10n: 'LOCALIZATION_RU',
    folderId,
    responseFormat: 'FORMAT_XML',
    userAgent: 'Mozilla/5.0 (Archflow/1.0; supply-search)',
  };

  const res = await fetch('https://searchapi.api.cloud.yandex.net/v2/web/search', {
    method: 'POST',
    headers: {
      Authorization: `Api-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Yandex Search ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  // Response is a base64-encoded XML in `rawData`
  const rawB64 = data?.rawData;
  if (!rawB64) return [];

  const xml = Buffer.from(rawB64, 'base64').toString('utf-8');

  // Parse XML: extract <doc> blocks with <url> and <title>
  const hits: YandexSearchHit[] = [];
  const docRegex = /<doc[^>]*>([\s\S]*?)<\/doc>/g;
  let m: RegExpExecArray | null;
  while ((m = docRegex.exec(xml)) && hits.length < limit) {
    const doc = m[1];
    const urlMatch = doc.match(/<url>([\s\S]*?)<\/url>/);
    const titleMatch = doc.match(/<title>([\s\S]*?)<\/title>/);
    const passages: string[] = [];
    const passageRegex = /<passage[^>]*>([\s\S]*?)<\/passage>/g;
    let p: RegExpExecArray | null;
    while ((p = passageRegex.exec(doc))) {
      passages.push(stripTags(p[1]).trim());
    }
    const url = urlMatch ? stripTags(urlMatch[1]).trim() : '';
    const title = titleMatch ? stripTags(titleMatch[1]).trim() : '';
    if (url && /^https?:\/\//i.test(url)) {
      hits.push({ url, title, passages });
    }
  }
  return hits;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
