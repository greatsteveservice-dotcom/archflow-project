'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import { useNotificationPreferences } from '../../lib/hooks';
import { upsertNotificationPreferences, generateTelegramLinkToken, unlinkTelegram, generateMaxLinkToken, unlinkMax } from '../../lib/queries';
import type { ScheduleType } from '../../lib/types';

interface NotificationSettingsProps {
  projectId: string;
  toast: (msg: string) => void;
}

const mono = 'var(--af-font-mono)';
const display = 'var(--af-font-display)';

const SCHEDULE_OPTIONS: { value: ScheduleType; label: string; desc: string }[] = [
  { value: 'any', label: 'Любое время', desc: 'Уведомления приходят круглосуточно' },
  { value: 'work_hours_weekend', label: 'Рабочие часы + суббота', desc: '09:00 — 20:00' },
  { value: 'work_hours', label: 'Только будни', desc: '09:00 — 18:00' },
  { value: 'custom', label: 'Своё расписание', desc: '' },
];

export default function NotificationSettings({ projectId, toast }: NotificationSettingsProps) {
  const { user, profile } = useAuth();
  const userId = user?.id || '';

  const { data: prefs, loading, refetch } = useNotificationPreferences(userId || null, projectId);

  // Local form state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState<string | null>(null);
  const [maxEnabled, setMaxEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('work_hours_weekend');
  const [scheduleFrom, setScheduleFrom] = useState('09:00');
  const [scheduleTo, setScheduleTo] = useState('20:00');
  const [saving, setSaving] = useState(false);

  // Telegram linking
  const [tgLinkUrl, setTgLinkUrl] = useState<string | null>(null);
  const [tgLinking, setTgLinking] = useState(false);

  // MAX linking
  const [maxChatId, setMaxChatId] = useState<string | null>(null);
  const [maxLinkUrl, setMaxLinkUrl] = useState<string | null>(null);
  const [maxLinking, setMaxLinking] = useState(false);

  // Sync from DB
  useEffect(() => {
    if (prefs) {
      setEmailEnabled(prefs.email_enabled);
      setTelegramEnabled(prefs.telegram_enabled);
      setTelegramChatId(prefs.telegram_chat_id);
      setMaxEnabled(prefs.max_enabled);
      setMaxChatId(prefs.max_chat_id || null);
      setPushEnabled(prefs.push_enabled);
      setScheduleType(prefs.schedule_type);
      setScheduleFrom(prefs.schedule_from || '09:00');
      setScheduleTo(prefs.schedule_to || '20:00');
    }
  }, [prefs]);

  const handleSave = useCallback(async () => {
    if (!userId || !projectId) return;
    setSaving(true);
    try {
      await upsertNotificationPreferences({
        user_id: userId,
        project_id: projectId,
        email_enabled: emailEnabled,
        telegram_enabled: telegramEnabled,
        max_enabled: maxEnabled,
        push_enabled: pushEnabled,
        schedule_type: scheduleType,
        schedule_from: scheduleFrom,
        schedule_to: scheduleTo,
        schedule_weekends: scheduleType === 'work_hours_weekend' || scheduleType === 'any',
      });
      toast('Настройки уведомлений сохранены');
      refetch();
    } catch (err: any) {
      toast('Ошибка: ' + (err.message || 'не удалось сохранить'));
    } finally {
      setSaving(false);
    }
  }, [userId, projectId, emailEnabled, telegramEnabled, maxEnabled, pushEnabled, scheduleType, scheduleFrom, scheduleTo, toast, refetch]);

  const handleLinkTelegram = useCallback(async () => {
    if (!userId || !projectId) return;
    setTgLinking(true);
    try {
      const token = await generateTelegramLinkToken(userId, projectId);
      setTgLinkUrl(`https://t.me/archflow_bot?start=${token}`);
    } catch (err: any) {
      toast(err.message || 'Не удалось привязать Telegram. Попробуйте позже.');
    } finally {
      setTgLinking(false);
    }
  }, [userId, projectId, toast]);

  const handleUnlinkTelegram = useCallback(async () => {
    if (!userId || !projectId) return;
    try {
      await unlinkTelegram(userId, projectId);
      setTelegramEnabled(false);
      setTelegramChatId(null);
      setTgLinkUrl(null);
      toast('Telegram отвязан');
      refetch();
    } catch (err: any) {
      toast('Ошибка: ' + (err.message || ''));
    }
  }, [userId, projectId, toast, refetch]);

  const handleLinkMax = useCallback(async () => {
    if (!userId || !projectId) return;
    setMaxLinking(true);
    try {
      const token = await generateMaxLinkToken(userId, projectId);
      setMaxLinkUrl(`https://max.ru/archflow_bot?start=${token}`);
    } catch (err: unknown) {
      toast('Ошибка: ' + (err instanceof Error ? err.message : 'не удалось привязать'));
    } finally {
      setMaxLinking(false);
    }
  }, [userId, projectId, toast]);

  const handleUnlinkMax = useCallback(async () => {
    if (!userId || !projectId) return;
    try {
      await unlinkMax(userId, projectId);
      setMaxEnabled(false);
      setMaxChatId(null);
      setMaxLinkUrl(null);
      toast('MAX отвязан');
      refetch();
    } catch (err: any) {
      toast('Ошибка: ' + (err.message || ''));
    }
  }, [userId, projectId, toast, refetch]);

  if (loading) {
    return (
      <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: '#111', padding: 20 }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h3 style={{
        fontFamily: display, fontSize: 20, fontWeight: 700,
        color: 'rgb(var(--ink))', marginBottom: 24, textTransform: 'uppercase' as const,
      }}>
        Уведомления заказчика
      </h3>

      {/* ============ CHANNELS ============ */}
      <div style={{
        background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))',
        padding: 20, marginBottom: 2,
      }}>
        <h4 style={{
          fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
          letterSpacing: '0.14em', color: 'rgb(var(--ink))', marginBottom: 16,
        }}>
          Каналы доставки
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Email */}
          <ChannelRow
            label="Email"
            sublabel={profile?.email || '—'}
            enabled={emailEnabled}
            onChange={setEmailEnabled}
          />

          {/* Telegram */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0', borderBottom: '0.5px solid rgb(var(--line))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle enabled={telegramEnabled} onChange={setTelegramEnabled} disabled={!telegramChatId} />
              <div>
                <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))' }}>
                  Telegram
                </div>
                {telegramChatId ? (
                  <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'rgb(var(--ink))', opacity: 0.6, marginTop: 2 }}>
                    Привязан · <button
                      onClick={handleUnlinkTelegram}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'rgb(var(--ink))',
                        textDecoration: 'underline', padding: 0,
                      }}
                    >
                      Отвязать
                    </button>
                  </div>
                ) : tgLinkUrl ? (
                  <div style={{ marginTop: 4 }}>
                    <a
                      href={tgLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'rgb(var(--ink))',
                        textDecoration: 'underline',
                      }}
                    >
                      Открыть Telegram бота →
                    </a>
                    <button
                      onClick={() => { navigator.clipboard.writeText(tgLinkUrl); toast('Ссылка скопирована'); }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: mono, fontSize: 'var(--af-fs-8)', color: 'rgb(var(--ink))',
                        opacity: 0.5, marginLeft: 8, padding: 0,
                      }}
                    >
                      Копировать
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleLinkTelegram}
                    disabled={tgLinking}
                    style={{
                      marginTop: 4, background: 'none', border: '0.5px solid rgb(var(--line))',
                      cursor: 'pointer', fontFamily: mono, fontSize: 'var(--af-fs-9)',
                      color: 'rgb(var(--ink))', padding: '2px 8px',
                    }}
                  >
                    {tgLinking ? 'Генерация...' : 'Привязать'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* MAX */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0', borderBottom: '0.5px solid rgb(var(--line))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle enabled={maxEnabled} onChange={setMaxEnabled} disabled={!maxChatId} />
              <div>
                <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))' }}>
                  MAX
                </div>
                {maxChatId ? (
                  <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'rgb(var(--ink))', opacity: 0.6, marginTop: 2 }}>
                    Привязан · <button
                      onClick={handleUnlinkMax}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'rgb(var(--ink))',
                        textDecoration: 'underline', padding: 0,
                      }}
                    >
                      Отвязать
                    </button>
                  </div>
                ) : maxLinkUrl ? (
                  <div style={{ marginTop: 4 }}>
                    <a
                      href={maxLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'rgb(var(--ink))',
                        textDecoration: 'underline',
                      }}
                    >
                      Открыть MAX бота →
                    </a>
                    <button
                      onClick={() => { navigator.clipboard.writeText(maxLinkUrl); toast('Ссылка скопирована'); }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: mono, fontSize: 'var(--af-fs-8)', color: 'rgb(var(--ink))',
                        opacity: 0.5, marginLeft: 8, padding: 0,
                      }}
                    >
                      Копировать
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleLinkMax}
                    disabled={maxLinking}
                    style={{
                      marginTop: 4, background: 'none', border: '0.5px solid rgb(var(--line))',
                      cursor: 'pointer', fontFamily: mono, fontSize: 'var(--af-fs-9)',
                      color: 'rgb(var(--ink))', padding: '2px 8px',
                    }}
                  >
                    {maxLinking ? 'Генерация...' : 'Привязать'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Web Push */}
          <ChannelRow
            label="Web Push"
            sublabel={typeof window !== 'undefined' && 'Notification' in window
              ? Notification.permission === 'granted' ? 'Разрешено' : 'Не разрешено'
              : 'Не поддерживается'
            }
            enabled={pushEnabled}
            onChange={setPushEnabled}
          />
        </div>
      </div>

      {/* ============ SCHEDULE ============ */}
      <div style={{
        background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))',
        padding: 20, marginBottom: 2,
      }}>
        <h4 style={{
          fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
          letterSpacing: '0.14em', color: 'rgb(var(--ink))', marginBottom: 16,
        }}>
          Расписание
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SCHEDULE_OPTIONS.map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', padding: '6px 0',
              }}
            >
              <input
                type="radio"
                name="schedule"
                checked={scheduleType === opt.value}
                onChange={() => setScheduleType(opt.value)}
                style={{ accentColor: '#111', width: 14, height: 14 }}
              />
              <div>
                <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))' }}>
                  {opt.label}
                </div>
                {opt.desc && (
                  <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'rgb(var(--ink))', opacity: 0.5 }}>
                    {opt.desc}
                  </div>
                )}
              </div>
            </label>
          ))}

          {/* Custom time pickers */}
          {scheduleType === 'custom' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginLeft: 24, marginTop: 4,
            }}>
              <input
                type="time"
                value={scheduleFrom}
                onChange={e => setScheduleFrom(e.target.value)}
                style={{
                  fontFamily: mono, fontSize: 'var(--af-fs-11)', padding: '4px 8px',
                  border: '0.5px solid rgb(var(--line))', background: 'transparent',
                  color: 'rgb(var(--ink))', borderRadius: 0,
                }}
              />
              <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))' }}>—</span>
              <input
                type="time"
                value={scheduleTo}
                onChange={e => setScheduleTo(e.target.value)}
                style={{
                  fontFamily: mono, fontSize: 'var(--af-fs-11)', padding: '4px 8px',
                  border: '0.5px solid rgb(var(--line))', background: 'transparent',
                  color: 'rgb(var(--ink))', borderRadius: 0,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ============ URGENT ============ */}
      <div style={{
        background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))',
        padding: 20, marginBottom: 24,
      }}>
        <h4 style={{
          fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
          letterSpacing: '0.14em', color: 'rgb(var(--ink))', marginBottom: 12,
        }}>
          Срочные уведомления
        </h4>
        <p style={{
          fontFamily: mono, fontSize: 'var(--af-fs-10)', color: 'rgb(var(--ink))', opacity: 0.7,
          lineHeight: 1.5, marginBottom: 8,
        }}>
          Оплаты, дедлайны и согласования отправляются в любое время
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Toggle enabled={true} onChange={() => {}} disabled={true} />
          <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'rgb(var(--ink))', opacity: 0.5 }}>
            Всегда включено
          </span>
        </div>
      </div>

      {/* ============ SAVE ============ */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="af-btn af-btn-full"
        style={{ width: '100%' }}
      >
        {saving ? 'Сохранение...' : 'Сохранить'}
      </button>
    </div>
  );
}

// ======================== SUB-COMPONENTS ========================

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      style={{
        width: 36, height: 20, padding: 2,
        background: enabled ? '#111' : 'rgb(var(--line))',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center',
        justifyContent: enabled ? 'flex-end' : 'flex-start',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.15s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 14, height: 14,
        background: enabled ? '#fff' : 'rgb(var(--srf))',
        transition: 'all 0.15s',
      }} />
    </button>
  );
}

function ChannelRow({ label, sublabel, enabled, onChange }: {
  label: string; sublabel: string; enabled: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 0', borderBottom: '0.5px solid rgb(var(--line))',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Toggle enabled={enabled} onChange={onChange} />
        <div>
          <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))' }}>
            {label}
          </div>
          <div style={{
            fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-9)',
            color: 'rgb(var(--ink))', opacity: 0.5, marginTop: 2,
          }}>
            {sublabel}
          </div>
        </div>
      </div>
    </div>
  );
}
