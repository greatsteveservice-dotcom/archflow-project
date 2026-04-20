'use client';

import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

type SortBy = 'availability' | 'price' | 'reliability';

interface SearchResult {
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

interface Props {
  projectId: string;
  supplyItemId?: string;
  initialQuery?: string;
  initialBudget?: number | null;
  onClose: () => void;
}

const AVAILABILITY_LABEL: Record<SearchResult['availability'], string> = {
  in_stock: 'В наличии',
  in_catalog: 'Под заказ',
  unknown: 'Уточнить',
};

export default function SupplySearch({ projectId, supplyItemId, initialQuery, initialBudget, onClose }: Props) {
  const [query, setQuery] = useState(initialQuery || '');
  const [budget, setBudget] = useState<string>(initialBudget ? String(initialBudget) : '');
  const [sortBy, setSortBy] = useState<SortBy>('availability');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSearch(overrideQuery?: string, overrideSort?: SortBy) {
    const q = (overrideQuery ?? query).trim();
    if (q.length < 3) { setError('Слишком короткий запрос'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/supply/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          query: q,
          budget: budget ? parseInt(budget, 10) : null,
          sortBy: overrideSort ?? sortBy,
          supplyItemId,
          projectId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка поиска');
        setResults([]);
      } else {
        setResults(data.results || []);
        setCached(!!data.cached);
      }
    } catch (e: any) {
      setError(e?.message || 'Ошибка сети');
    }
    setLoading(false);
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files[0]) return;
    setTranscribing(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append('image', files[0]);
      const res = await fetch('/api/supply/search-by-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.detectedQuery) {
        setQuery(data.detectedQuery);
        // auto-search with detected query
        handleSearch(data.detectedQuery);
      } else {
        setError(data.error || 'Не удалось распознать изображение');
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка сети');
    }
    setTranscribing(false);
  }

  const onSort = (s: SortBy) => { setSortBy(s); if (results.length) handleSearch(undefined, s); };

  const inBudgetCount = results.filter(r => r.inBudget === true).length;
  const clarifyCount = results.filter(r => r.price == null).length;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', width: '100%', maxWidth: 560,
          maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
          marginBottom: `calc(68px + env(safe-area-inset-bottom))`,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px', borderBottom: '0.5px solid #EBEBEB',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ fontFamily: 'var(--af-font)', fontWeight: 700, fontSize: 14, color: '#111' }}>
            Поиск товара
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              width: 32, height: 32, border: '0.5px solid #EBEBEB',
              background: 'transparent', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        {/* Search form */}
        <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #EBEBEB', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              className="af-input"
              style={{ flex: 1 }}
              placeholder="напр. Стол дубовый 60×90"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={transcribing}
              title="Поиск по фото"
              style={{
                width: 44, height: 40, background: transcribing ? '#EBEBEB' : '#fff',
                border: '0.5px solid #EBEBEB', cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {transcribing ? (
                <div className="w-4 h-4 border-2 border-ink-faint border-t-ink rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#111" strokeWidth="1.3" strokeLinejoin="round">
                  <rect x="1.5" y="3" width="15" height="12" />
                  <circle cx="9" cy="9" r="3.2" />
                  <path d="M6 3 L7.5 1.2 H10.5 L12 3" />
                </svg>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <span className="af-input-label" style={{ whiteSpace: 'nowrap' }}>Бюджет до</span>
            <input
              className="af-input"
              style={{ flex: 1 }}
              placeholder="150 000"
              type="number"
              inputMode="numeric"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            <span style={{ fontFamily: 'var(--af-font)', fontSize: 12, color: '#999' }}>₽</span>
          </div>

          <button
            className="af-btn-pill"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={query.trim().length < 3 || loading}
            onClick={() => handleSearch()}
            type="button"
          >
            {loading ? 'Ищем, это займёт ~20 сек...' : 'Найти →'}
          </button>

          {error && (
            <div style={{
              marginTop: 10, padding: '8px 10px', background: '#F6F6F4',
              fontFamily: 'var(--af-font)', fontSize: 11, color: '#111',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Sort tabs */}
        {results.length > 0 && (
          <div style={{
            padding: '10px 16px', borderBottom: '0.5px solid #EBEBEB',
            display: 'flex', gap: 6, flexShrink: 0, overflowX: 'auto',
          }}>
            {(['availability', 'price', 'reliability'] as SortBy[]).map(s => (
              <button
                key={s}
                onClick={() => onSort(s)}
                disabled={loading}
                style={{
                  fontFamily: 'var(--af-font)', fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: sortBy === s ? '#111' : 'transparent',
                  color: sortBy === s ? '#fff' : '#646464',
                  border: '0.5px solid ' + (sortBy === s ? '#111' : '#EBEBEB'),
                }}
              >
                {s === 'availability' ? 'Наличие' : s === 'price' ? 'Цена' : 'Надёжность'}
              </button>
            ))}
          </div>
        )}

        {/* Summary */}
        {results.length > 0 && (
          <div style={{
            padding: '8px 16px', borderBottom: '0.5px solid #EBEBEB',
            fontFamily: 'var(--af-font)', fontSize: 10,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            color: '#999', flexShrink: 0,
          }}>
            {results.length} поставщиков
            {inBudgetCount > 0 && ` · ${inBudgetCount} в бюджете`}
            {clarifyCount > 0 && ` · ${clarifyCount} уточнить цену`}
            {cached && ' · из кэша'}
          </div>
        )}

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {results.map((r, i) => (
            <div
              key={r.url}
              style={{
                padding: '14px 16px', borderBottom: '0.5px solid #EBEBEB',
                display: 'flex', gap: 8,
                opacity: r.inBudget === false ? 0.55 : 1,
              }}
            >
              <span style={{
                fontFamily: 'var(--af-font)', fontSize: 9, color: '#AAA',
                width: 20, flexShrink: 0, paddingTop: 2,
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{
                    fontFamily: 'var(--af-font)', fontSize: 13, fontWeight: 700, color: '#111',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                  }}>
                    {r.name}
                  </span>
                  <span style={{
                    fontFamily: 'var(--af-font)',
                    fontSize: r.price ? 13 : 11,
                    fontWeight: r.price ? 700 : 400,
                    color: r.price ? '#111' : '#999',
                    textDecoration: r.inBudget === false ? 'line-through' : 'none',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {r.priceText || (r.price ? `${r.price.toLocaleString('ru')} ₽` : 'По запросу')}
                  </span>
                </div>

                <span style={{ fontFamily: 'var(--af-font)', fontSize: 10, color: '#999' }}>
                  {r.domain}
                </span>

                {r.phone && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontFamily: 'var(--af-font)', fontSize: 12, fontWeight: 600, color: '#111' }}>
                      +{r.phone.replace(/(\d)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5')}
                    </span>
                    <a
                      href={`tel:+${r.phone}`}
                      style={{
                        fontFamily: 'var(--af-font)', fontSize: 9,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        border: '0.5px solid #111', padding: '3px 8px',
                        color: '#111', textDecoration: 'none',
                      }}
                    >
                      Позвонить
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  <span style={{
                    fontFamily: 'var(--af-font)', fontSize: 8,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    padding: '2px 6px',
                    border: '0.5px solid ' + (r.availability === 'in_stock' ? '#111' : '#EBEBEB'),
                    color: r.availability === 'in_stock' ? '#111' : '#999',
                    fontWeight: r.availability === 'in_stock' ? 700 : 400,
                  }}>
                    {AVAILABILITY_LABEL[r.availability]}
                  </span>
                  {r.inBudget === true && (
                    <span style={{
                      fontFamily: 'var(--af-font)', fontSize: 8,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      padding: '2px 6px', border: '0.5px solid #111',
                      color: '#111', fontWeight: 700,
                    }}>В бюджете</span>
                  )}
                  {r.inBudget === false && (
                    <span style={{
                      fontFamily: 'var(--af-font)', fontSize: 8,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      padding: '2px 6px', border: '0.5px solid #EBEBEB', color: '#999',
                    }}>Выше бюджета</span>
                  )}
                </div>
              </div>

              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'var(--af-font)', fontSize: 9,
                  textTransform: 'uppercase',
                  border: '0.5px solid #EBEBEB',
                  padding: '4px 8px', color: '#999', textDecoration: 'none',
                  alignSelf: 'flex-start', whiteSpace: 'nowrap',
                }}
              >Сайт →</a>
            </div>
          ))}

          {!loading && results.length === 0 && !error && (
            <div style={{
              padding: '48px 16px', textAlign: 'center',
              fontFamily: 'var(--af-font)', fontSize: 11, color: '#999',
              lineHeight: 1.6,
            }}>
              Впишите название товара или загрузите фото — мы найдём поставщиков.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
