'use client';

/**
 * Mockup: project stages — variant proposals.
 * Currently the horizontal label strip in ClientProjectHome truncates long
 * Russian stage names. Vertical layouts read cleanly and let us emphasize
 * the current stage without sacrificing legibility.
 */

import { useState } from 'react';

const STAGES = [
  'Сбор ТЗ, обмеры',
  'Планировочное решение',
  'Концепция',
  'Визуализация',
  'Рабочие чертежи',
  'Ведомость и спецификации',
];

export default function StagesMockupPage() {
  const [current, setCurrent] = useState(0);

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F6F6F4',
      padding: '24px 0 100px',
      fontFamily: 'var(--af-font)',
      color: '#111',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>
        <h1 style={{
          fontSize: 'var(--af-fs-13)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 4,
        }}>
          Этапы проекта · мокап
        </h1>
        <p style={{
          fontSize: 'var(--af-fs-9)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          opacity: 0.55,
          marginBottom: 18,
        }}>
          Тапайте этап для предпросмотра разных текущих стадий
        </p>

        {/* Stage selector for demo */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
          {STAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: 32, height: 32,
                border: i === current ? '1px solid #111' : '0.5px solid #EBEBEB',
                background: i === current ? '#111' : '#FFF',
                color: i === current ? '#FFF' : '#111',
                fontFamily: 'var(--af-font)',
                fontSize: 'var(--af-fs-10)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </button>
          ))}
        </div>

        {/* ===== VARIANT A — vertical list, dominant ===== */}
        <Caption label="Вариант А · вертикальный список" />
        <VariantA current={current} />

        {/* ===== VARIANT B — checklist with progress ===== */}
        <div style={{ height: 28 }} />
        <Caption label="Вариант Б · чек-лист с тонкой шкалой" />
        <VariantB current={current} />

        {/* ===== VARIANT C — horizontal stepper, large number ===== */}
        <div style={{ height: 28 }} />
        <Caption label="Вариант В · крупный номер + лента" />
        <VariantC current={current} />
      </div>
    </div>
  );
}

function Caption({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 'var(--af-fs-9)',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      fontWeight: 700,
      marginBottom: 10,
      borderBottom: '1px solid #111',
      paddingBottom: 6,
    }}>
      {label}
    </div>
  );
}

/* ───────────────────────── Variant A — vertical list ───────────────────── */

function VariantA({ current }: { current: number }) {
  return (
    <section style={{
      background: '#FFF',
      border: '0.5px solid #EBEBEB',
      padding: '20px 18px 6px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <span style={{
          fontSize: 'var(--af-fs-9)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          opacity: 0.55,
        }}>Этапы проекта</span>
        <span style={{
          fontSize: 'var(--af-fs-9)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}>{current + 1} / {STAGES.length}</span>
      </div>

      {STAGES.map((name, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 16px',
              alignItems: 'center',
              gap: 12,
              padding: '14px 0',
              borderBottom: i === STAGES.length - 1 ? 'none' : '0.5px solid #EBEBEB',
              opacity: i > current ? 0.4 : 1,
            }}
          >
            <span style={{
              fontFamily: 'var(--af-font)',
              fontSize: 'var(--af-fs-10)',
              letterSpacing: '0.04em',
              fontWeight: now ? 700 : 400,
              color: '#111',
              textAlign: 'left',
            }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{
              fontFamily: 'var(--af-font)',
              fontSize: now ? 'var(--af-fs-13)' : 'var(--af-fs-12)',
              fontWeight: now ? 700 : (done ? 500 : 400),
              letterSpacing: '0.01em',
              color: '#111',
              textTransform: 'none',
              lineHeight: 1.2,
            }}>
              {name}
            </span>
            <span style={{
              width: 14, height: 14,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: now ? 'none' : '1px solid #111',
              background: done ? '#111' : (now ? '#111' : 'transparent'),
              color: '#FFF',
              fontSize: 10,
              fontWeight: 700,
            }}>
              {done ? '✓' : (now ? '●' : '')}
            </span>
          </div>
        );
      })}
    </section>
  );
}

/* ───────────────────────── Variant B — checklist + bar ─────────────────── */

function VariantB({ current }: { current: number }) {
  const pct = Math.round(((current) / (STAGES.length - 1)) * 100);
  return (
    <section style={{
      background: '#FFF',
      border: '0.5px solid #EBEBEB',
      padding: '18px',
    }}>
      <div style={{
        fontSize: 'var(--af-fs-9)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        opacity: 0.55,
        marginBottom: 6,
      }}>Этапы проекта</div>

      <div style={{
        fontFamily: 'var(--af-font)',
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: '0.01em',
        lineHeight: 1.05,
        marginBottom: 4,
      }}>
        {STAGES[current]}
      </div>

      <div style={{
        fontSize: 'var(--af-fs-10)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        Этап <strong>{current + 1}</strong> из {STAGES.length} · {pct}%
      </div>

      {/* segmented bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`,
        gap: 3,
        marginBottom: 16,
      }}>
        {STAGES.map((_, i) => (
          <div
            key={i}
            style={{
              height: 4,
              background: i <= current ? '#111' : '#EBEBEB',
            }}
          />
        ))}
      </div>

      {STAGES.map((name, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 0',
              borderTop: i === 0 ? 'none' : '0.5px solid #EBEBEB',
              color: '#111',
              opacity: i > current ? 0.45 : 1,
            }}
          >
            <span style={{
              width: 16, height: 16,
              border: '1px solid #111',
              background: done || now ? '#111' : '#FFF',
              color: '#FFF',
              fontSize: 10, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {done ? '✓' : ''}
            </span>
            <span style={{
              fontSize: 'var(--af-fs-12)',
              fontWeight: now ? 700 : 400,
              flex: 1,
            }}>
              {name}
            </span>
            <span style={{
              fontFamily: 'var(--af-font)',
              fontSize: 'var(--af-fs-9)',
              letterSpacing: '0.12em',
              opacity: 0.45,
              fontWeight: 600,
            }}>
              {String(i + 1).padStart(2, '0')}
            </span>
          </div>
        );
      })}
    </section>
  );
}

/* ───────────────────────── Variant C — big number + ribbon ─────────────── */

function VariantC({ current }: { current: number }) {
  return (
    <section style={{
      background: '#111',
      color: '#FFF',
      padding: '22px 20px 18px',
    }}>
      <div style={{
        fontSize: 'var(--af-fs-9)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        opacity: 0.6,
        marginBottom: 12,
      }}>Этапы проекта</div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 16 }}>
        <span style={{
          fontFamily: 'var(--af-font)',
          fontSize: 64,
          fontWeight: 900,
          lineHeight: 0.9,
          letterSpacing: '-0.02em',
        }}>
          {String(current + 1).padStart(2, '0')}
        </span>
        <div style={{ flex: 1, paddingBottom: 4 }}>
          <div style={{
            fontFamily: 'var(--af-font)',
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 4,
          }}>
            {STAGES[current]}
          </div>
          <div style={{
            fontSize: 'var(--af-fs-9)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            opacity: 0.6,
          }}>
            Из {STAGES.length} этапов
          </div>
        </div>
      </div>

      {/* dots strip */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {STAGES.map((_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 3,
              background: i <= current ? '#FFF' : 'rgba(255,255,255,0.25)',
            }}
          />
        ))}
      </div>

      {/* mini list of remaining stages */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '4px 12px',
        fontSize: 'var(--af-fs-9)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {STAGES.map((name, i) => (
          <span
            key={i}
            style={{
              opacity: i === current ? 1 : (i < current ? 0.7 : 0.35),
              fontWeight: i === current ? 700 : 400,
              borderBottom: i === current ? '1px solid #FFF' : 'none',
              paddingBottom: 1,
            }}
          >
            {String(i + 1).padStart(2, '0')} · {name.split(',')[0].split(' и ')[0]}
          </span>
        ))}
      </div>
    </section>
  );
}
