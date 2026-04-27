// Mockup: compact 2-column Notifications settings.
"use client";

import { useState } from "react";

const FONT = "var(--af-font)";
const FONT_MONO = "var(--af-font-mono)";

interface Channel {
  id: string;
  label: string;
  meta: string;
  enabled: boolean;
  needsLink?: boolean;
}

export default function NotificationsMockupPage() {
  const [channels, setChannels] = useState<Channel[]>([
    { id: 'email', label: 'Email', meta: 'kolunov@stador.ru', enabled: true },
    { id: 'tg', label: 'Telegram', meta: 'не привязан', enabled: false, needsLink: true },
    { id: 'max', label: 'MAX', meta: 'не привязан', enabled: false, needsLink: true },
    { id: 'push', label: 'Web Push', meta: 'не разрешено', enabled: true, needsLink: true },
  ]);
  const [schedule, setSchedule] = useState<'24/7' | 'work' | 'weekdays' | 'custom'>('work');
  const [urgent, setUrgent] = useState(true);

  const toggleChannel = (id: string) =>
    setChannels(channels.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));

  return (
    <div style={{ minHeight: '100vh', background: '#F6F6F4', fontFamily: FONT, color: '#111' }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#FFF', borderBottom: '0.5px solid #EBEBEB',
        height: 48, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999' }}>
          Проекты <span style={{ color: '#EBEBEB' }}>/</span> ЖК iLove <span style={{ color: '#EBEBEB' }}>/</span> <span style={{ color: '#111' }}>Настройки</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>Иван К.</span>
          <span style={{ width: 28, height: 28, background: '#111', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>ИК</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ background: '#FFF', borderBottom: '0.5px solid #EBEBEB', padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 0 }}>
          {['Роли и доступ', 'Детали проекта', 'Уведомления'].map((t, i) => (
            <button key={t} style={{
              padding: '14px 20px', background: 'none', border: 'none',
              borderBottom: i === 2 ? '2px solid #111' : '2px solid transparent',
              fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer', color: i === 2 ? '#111' : '#999',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Уведомления заказчика</h1>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999' }}>
            активны: {channels.filter(c => c.enabled).length} канала
          </div>
        </div>

        {/* Two-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Left: channels */}
          <section style={{ background: '#FFF', border: '0.5px solid #EBEBEB' }}>
            <header style={{
              padding: '14px 16px', borderBottom: '0.5px solid #EBEBEB',
              fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#666',
            }}>Каналы доставки</header>
            {channels.map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderBottom: i < channels.length - 1 ? '0.5px solid #F6F6F4' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{c.label}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: c.meta.startsWith('не') ? '#c80' : '#999' }}>{c.meta}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.needsLink && c.meta.startsWith('не') && (
                    <button style={{
                      padding: '4px 10px', background: 'transparent', border: '0.5px solid #EBEBEB',
                      fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                      cursor: 'pointer', color: '#666',
                    }}>Привязать</button>
                  )}
                  <Toggle on={c.enabled} onClick={() => toggleChannel(c.id)} />
                </div>
              </div>
            ))}
          </section>

          {/* Right column: schedule + urgent stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={{ background: '#FFF', border: '0.5px solid #EBEBEB' }}>
              <header style={{
                padding: '14px 16px', borderBottom: '0.5px solid #EBEBEB',
                fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#666',
              }}>Расписание</header>
              <div style={{ padding: '8px 0' }}>
                <Radio
                  active={schedule === '24/7'} onClick={() => setSchedule('24/7')}
                  title="Любое время" sub="круглосуточно"
                />
                <Radio
                  active={schedule === 'work'} onClick={() => setSchedule('work')}
                  title="Рабочие часы + сб" sub="09:00 — 20:00"
                />
                <Radio
                  active={schedule === 'weekdays'} onClick={() => setSchedule('weekdays')}
                  title="Только будни" sub="09:00 — 18:00"
                />
                <Radio
                  active={schedule === 'custom'} onClick={() => setSchedule('custom')}
                  title="Своё расписание" sub="настроить вручную"
                />
              </div>
            </section>

            <section style={{ background: '#FFF', border: '0.5px solid #EBEBEB' }}>
              <header style={{
                padding: '14px 16px', borderBottom: '0.5px solid #EBEBEB',
                fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#666',
              }}>Срочные уведомления</header>
              <div style={{
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Игнорировать расписание</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: '#999', maxWidth: 360, lineHeight: 1.4 }}>
                    Оплаты, дедлайны и согласования отправляются в любое время.
                  </div>
                </div>
                <Toggle on={urgent} onClick={() => setUrgent(!urgent)} />
              </div>
            </section>
          </div>
        </div>

        {/* Save bar — sticky bottom */}
        <div style={{
          marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button style={{
            padding: '10px 16px', background: 'transparent', border: '0.5px solid #EBEBEB',
            fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: 'pointer', color: '#666',
          }}>Отмена</button>
          <button style={{
            padding: '10px 24px', background: '#111', color: '#F6F6F4',
            border: 'none', cursor: 'pointer',
            fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
          }}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative', width: 40, height: 22,
        background: on ? '#111' : '#EBEBEB',
        border: 'none', cursor: 'pointer', padding: 0,
      }}
      aria-checked={on} role="switch"
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 21 : 3, width: 16, height: 16,
        background: '#FFF', transition: 'left 0.15s',
      }} />
    </button>
  );
}

function Radio({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '10px 16px', background: 'none', border: 'none',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{
        width: 14, height: 14, border: '0.5px solid #111',
        background: active ? '#111' : '#FFF',
        position: 'relative', flexShrink: 0,
      }}>
        {active && <span style={{
          position: 'absolute', inset: 3, background: '#FFF',
        }} />}
      </span>
      <span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#111' }}>{title}</span>
        <span style={{ display: 'block', fontFamily: FONT_MONO, fontSize: 10, color: '#999' }}>{sub}</span>
      </span>
    </button>
  );
}
