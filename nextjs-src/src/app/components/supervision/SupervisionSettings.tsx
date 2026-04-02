'use client';
import { useState, useEffect } from 'react';
import type { SupervisionConfig } from '../../lib/types';
import { loadSupervisionConfig, saveSupervisionConfig } from '../../lib/queries';

interface SupervisionSettingsProps {
  projectId: string;
  toast: (msg: string) => void;
}

const WEEKDAYS = [
  { value: 0, label: 'Пн' },
  { value: 1, label: 'Вт' },
  { value: 2, label: 'Ср' },
  { value: 3, label: 'Чт' },
  { value: 4, label: 'Пт' },
  { value: 5, label: 'Сб' },
];

const FREQ_OPTIONS: { value: SupervisionConfig['visitSchedule']['type']; label: string }[] = [
  { value: 'weekly', label: 'Каждую неделю' },
  { value: 'biweekly', label: 'Через неделю' },
  { value: 'monthly', label: 'Раз в месяц' },
  { value: 'custom', label: 'Своя дата' },
];

const BILLING_OPTIONS = [1, 5, 10, 15, 20];
const REMINDER_OPTIONS = [
  { value: 1, label: 'За 1 р.д.' },
  { value: 3, label: 'За 3 р.д.' },
  { value: 5, label: 'За 5 р.д.' },
];

export default function SupervisionSettings({ projectId, toast }: SupervisionSettingsProps) {
  const [weekday, setWeekday] = useState<number | null>(3); // Thu (0=Mon)
  const [freq, setFreq] = useState<SupervisionConfig['visitSchedule']['type']>('weekly');
  const [customDay, setCustomDay] = useState<number>(20);
  const [billingDay, setBillingDay] = useState<number>(5);
  const [customBilling, setCustomBilling] = useState(false);
  const [customBillingDay, setCustomBillingDay] = useState<number>(5);
  const [reminderDays, setReminderDays] = useState<number>(3);
  const [extraCost, setExtraCost] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cfg = loadSupervisionConfig(projectId);
    if (cfg) {
      setFreq(cfg.visitSchedule.type);
      setWeekday(cfg.visitSchedule.weekday);
      if (cfg.visitSchedule.customDay !== null) setCustomDay(cfg.visitSchedule.customDay);
      setBillingDay(cfg.billingDay);
      if (!BILLING_OPTIONS.includes(cfg.billingDay)) {
        setCustomBilling(true);
        setCustomBillingDay(cfg.billingDay);
      }
      setReminderDays(cfg.reminderDays);
      setExtraCost(cfg.extraVisitCost !== null ? String(cfg.extraVisitCost) : '');
    }
  }, [projectId]);

  const handleSave = () => {
    setError(null);
    // Validation: if freq is not 'custom', weekday is required
    if (freq !== 'custom' && weekday === null) {
      setError('Выберите день недели');
      return;
    }
    const config: SupervisionConfig = {
      visitSchedule: {
        type: freq,
        weekday: freq !== 'custom' ? weekday : null,
        customDay: freq === 'custom' ? customDay : null,
      },
      billingDay: customBilling ? customBillingDay : billingDay,
      reminderDays,
      extraVisitCost: extraCost.trim() ? Number(extraCost) : null,
    };
    saveSupervisionConfig(projectId, config);
    toast('Настройки надзора сохранены');
  };

  const isCustomDate = freq === 'custom';

  return (
    <div className="animate-fade-in">

      {/* ── Field 1: Периодичность визитов ── */}
      <div style={sectionStyle}>
        {/* Step 1 — День (hidden when "Своя дата") */}
        {!isCustomDate && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>День</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {WEEKDAYS.map(d => (
                <button key={d.value} type="button" onClick={() => { setWeekday(d.value); setError(null); }} style={chipStyle(weekday === d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
            {error && (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: '#111111', marginTop: 6, letterSpacing: '0.05em' }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Частота */}
        <div>
          <label style={labelStyle}>Частота</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {FREQ_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setFreq(opt.value)} style={chipStyle(freq === opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* "Своя дата" — day of month input */}
        {isCustomDate && (
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Дата</label>
            <input
              type="number"
              min={1}
              max={28}
              value={customDay}
              onChange={e => setCustomDay(Math.min(28, Math.max(1, Number(e.target.value))))}
              style={inputStyle}
            />
            <div style={helperStyle}>число каждого месяца</div>
          </div>
        )}
      </div>

      {/* ── Field 2: Дата выставления счёта ── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Дата</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {BILLING_OPTIONS.map(d => (
            <button key={d} type="button" onClick={() => { setBillingDay(d); setCustomBilling(false); }} style={chipStyle(!customBilling && billingDay === d)}>
              {d}-го
            </button>
          ))}
          <button type="button" onClick={() => setCustomBilling(true)} style={chipStyle(customBilling)}>
            Своя
          </button>
        </div>
        {customBilling && (
          <div style={{ marginTop: 10 }}>
            <input
              type="number"
              min={1}
              max={28}
              value={customBillingDay}
              onChange={e => setCustomBillingDay(Math.min(28, Math.max(1, Number(e.target.value))))}
              style={inputStyle}
              placeholder="1–28"
            />
          </div>
        )}
      </div>

      {/* ── Field 3: Напоминание о счёте ── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Напоминание</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {REMINDER_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => setReminderDays(opt.value)} style={chipStyle(reminderDays === opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Field 4: Стоимость доп. визита ── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Стоимость доп. визита</label>
        <div style={{ position: 'relative' }}>
          <input
            type="number"
            min={0}
            value={extraCost}
            onChange={e => setExtraCost(e.target.value)}
            style={{ ...inputStyle, paddingRight: 32 }}
            placeholder="0"
          />
          <span style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#EBEBEB',
          }}>₽</span>
        </div>
        <div style={helperStyle}>заполните если визит сверх договора</div>
      </div>

      {/* ── Save ── */}
      <div style={{ padding: '10px 14px' }}>
        <button
          type="button"
          onClick={handleSave}
          style={{
            width: '100%', height: 44,
            background: '#111', color: '#FFF', border: 'none',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase' as const,
            cursor: 'pointer', transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Сохранить →
        </button>
      </div>
    </div>
  );
}

// ─── Shared styles ───────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '0.5px solid #EBEBEB',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 8,
  fontWeight: 400,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: '#111',
  marginBottom: 8,
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 8,
  fontWeight: 400,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  padding: '4px 8px',
  border: active ? '0.5px solid #111' : '0.5px solid #EBEBEB',
  background: active ? '#111' : '#FFF',
  color: active ? '#FFF' : '#111',
  cursor: 'pointer',
  transition: 'background 0.12s ease',
});

const inputStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 11,
  fontWeight: 300,
  width: '100%',
  height: 40,
  padding: '0 10px',
  border: '0.5px solid #EBEBEB',
  background: '#FFF',
  color: '#111',
  outline: 'none',
  borderRadius: 0,
};

const helperStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 7,
  color: '#111',
  marginTop: 6,
  letterSpacing: '0.05em',
};
