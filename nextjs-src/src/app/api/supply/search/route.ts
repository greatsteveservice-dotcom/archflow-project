import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { yandexWebSearch } from '../../../lib/yandex-search';
import { fetchPageText, extractProduct, estimateDomainAge } from '../../../lib/page-scraper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // long-running scraping

let _admin: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (!_admin) _admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _admin;
}

type SortBy = 'availability' | 'price' | 'reliability';

interface ResultItem {
  url: string;
  domain: string;
  name: string;
  price: number | null;
  priceText: string | null;
  availability: 'in_stock' | 'in_catalog' | 'unknown';
  phone: string | null;
  domainAge: number | null;
  inBudget: boolean | null;
}

function normalize(q: string): string {
  return q.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

const CACHE_TTL_MIN = 30;

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const accessToken = auth.replace(/^Bearer\s+/i, '').trim();
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const query = String(body.query || '').trim();
    const budget: number | null = typeof body.budget === 'number' ? body.budget : null;
    const sortBy: SortBy = ['availability', 'price', 'reliability'].includes(body.sortBy) ? body.sortBy : 'availability';
    const supplyItemId: string | null = body.supplyItemId || null;
    const projectId: string | null = body.projectId || null;

    if (query.length < 3) return NextResponse.json({ error: 'Короткий запрос (минимум 3 символа)' }, { status: 400 });
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const admin = getAdmin();

    // Permission: owner or member of project (designer/assistant/supplier)
    const { data: project } = await (admin.from('projects') as any)
      .select('owner_id').eq('id', projectId).maybeSingle();
    const isOwner = !!project && (project as any).owner_id === user.id;
    if (!isOwner) {
      const { data: membership } = await (admin.from('project_members') as any)
        .select('role').eq('project_id', projectId).eq('user_id', user.id).maybeSingle();
      const role = (membership as any)?.role;
      if (!role || !['designer', 'assistant', 'supplier'].includes(role)) {
        return NextResponse.json({ error: 'Нет прав для поиска' }, { status: 403 });
      }
    }

    // Check cache (30 min TTL, match query_normalized + budget + sortBy)
    const queryNorm = normalize(query);
    const cutoff = new Date(Date.now() - CACHE_TTL_MIN * 60 * 1000).toISOString();
    const { data: cached } = await (admin.from('supply_search_results') as any)
      .select('*')
      .eq('project_id', projectId)
      .eq('query_normalized', queryNorm)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cached) {
      return NextResponse.json({ results: (cached as any).results, cached: true });
    }

    // 1. Yandex Search
    let hits;
    try {
      hits = await yandexWebSearch(query, 15);
    } catch (e: any) {
      return NextResponse.json({ error: `Поиск недоступен: ${e?.message || e}` }, { status: 502 });
    }

    // 2. Scrape pages in batches of 5
    const results: ResultItem[] = [];
    const BATCH = 5;
    for (let i = 0; i < hits.length; i += BATCH) {
      const batch = hits.slice(i, i + BATCH);
      const batchResults = await Promise.all(batch.map(async (hit) => {
        const domain = (() => { try { return new URL(hit.url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
        if (!domain) return null;
        const page = await fetchPageText(hit.url, 10000);
        if (!page) return null;
        const product = await extractProduct(hit.url, page.title || hit.title, page.text, query);
        const domainAge = await estimateDomainAge(domain);
        const item: ResultItem = {
          url: hit.url,
          domain,
          name: product.companyName || hit.title || domain,
          price: product.price,
          priceText: product.priceText,
          availability: product.availability,
          phone: product.phone,
          domainAge,
          inBudget: budget && product.price ? product.price <= budget : null,
        };
        return item;
      }));
      for (const r of batchResults) if (r) results.push(r);
    }

    // 3. Sort
    const sorted = [...results].sort((a, b) => {
      if (sortBy === 'availability') {
        const order = { in_stock: 0, in_catalog: 1, unknown: 2 } as const;
        return order[a.availability] - order[b.availability];
      }
      if (sortBy === 'price') {
        if (a.price != null && b.price != null) return a.price - b.price;
        if (a.price != null) return -1;
        if (b.price != null) return 1;
        return 0;
      }
      if (sortBy === 'reliability') {
        const aAge = a.domainAge || 0, bAge = b.domainAge || 0;
        return bAge - aAge;
      }
      return 0;
    });

    // 4. Cache
    await (admin.from('supply_search_results') as any).insert({
      project_id: projectId,
      supply_item_id: supplyItemId,
      user_id: user.id,
      query,
      query_normalized: queryNorm,
      budget,
      sort_by: sortBy,
      results: sorted,
      results_count: sorted.length,
    });

    return NextResponse.json({ results: sorted, cached: false });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
