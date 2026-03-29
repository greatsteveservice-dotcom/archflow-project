'use client';
import { useState } from 'react';
import { Icons } from '../Icons';
import type { MemberRole, RbacMemberWithProfile } from '../../lib/types';
import { useRbacMembers, useAccessSettings } from '../../lib/hooks';
import { createRbacInvite, removeRbacMember, upsertAccessSettings } from '../../lib/queries';

// ─── Section config ──────────────────────────────────────
const SECTIONS: { role: MemberRole; label: string }[] = [
  { role: 'team', label: 'Команда' },
  { role: 'client', label: 'Заказчик' },
  { role: 'contractor', label: 'Подрядчик' },
];

// ─── Helpers ─────────────────────────────────────────────
function getInitials(m: RbacMemberWithProfile): string {
  if (m.profile?.full_name) {
    return m.profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
  return '??';
}

function getDisplayName(m: RbacMemberWithProfile): string {
  return m.profile?.full_name || m.invite_email || 'Участник';
}

function getEmail(m: RbacMemberWithProfile): string {
  return m.profile?.email || m.invite_email || '';
}

// ─── Component ───────────────────────────────────────────
interface AccessScreenProps {
  projectId: string;
  toast: (msg: string) => void;
  onBack: () => void;
}

export default function AccessScreen({ projectId, toast, onBack }: AccessScreenProps) {
  const { data: members, loading, refetch: refetchMembers } = useRbacMembers(projectId);
  const { data: accessSettings, refetch: refetchSettings } = useAccessSettings(projectId);

  // Per-section inline form state
  const [openForm, setOpenForm] = useState<MemberRole | null>(null);
  const [formEmail, setFormEmail] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  // Toggle saving
  const [toggling, setToggling] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const filteredMembers = (role: MemberRole) =>
    (members || []).filter(m => m.member_role === role);

  // ─── Invite handler ────────────────────────────────────
  const handleInvite = async (role: MemberRole) => {
    const email = formEmail.trim();
    if (!email) { setFormError('Введите email'); return; }
    if (!isValidEmail(email)) { setFormError('Некорректный формат email'); return; }
    setFormSaving(true);
    setFormError('');
    try {
      const member = await createRbacInvite(projectId, role, email);
      const link = `${window.location.origin}/invite/${member.invite_token}`;
      setLastInviteLink(link);
      toast('Приглашение создано');
      setFormEmail('');
      setOpenForm(null);
      refetchMembers();
    } catch (err: any) {
      setFormError(err.message || 'Ошибка');
    } finally {
      setFormSaving(false);
    }
  };

  // ─── Remove handler ────────────────────────────────────
  const handleRemove = async (memberId: string) => {
    try {
      await removeRbacMember(memberId);
      toast('Участник удалён');
      refetchMembers();
    } catch (err: any) {
      toast(err.message || 'Ошибка удаления');
    }
  };

  // ─── Toggle handler ────────────────────────────────────
  const handleToggle = async (field: 'client_can_see_design' | 'client_can_see_furnishing') => {
    setToggling(true);
    try {
      const current = accessSettings || { client_can_see_design: false, client_can_see_furnishing: false };
      await upsertAccessSettings(projectId, {
        client_can_see_design: field === 'client_can_see_design' ? !current.client_can_see_design : current.client_can_see_design,
        client_can_see_furnishing: field === 'client_can_see_furnishing' ? !current.client_can_see_furnishing : current.client_can_see_furnishing,
      });
      refetchSettings();
    } catch (err: any) {
      toast(err.message || 'Ошибка сохранения');
    } finally {
      setToggling(false);
    }
  };

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Header with back */}
      <button
        className="flex items-center gap-1 text-[11px] text-ink-muted mb-4 hover:text-ink transition-colors"
        style={{ fontFamily: 'var(--font-mono)' }}
        onClick={onBack}
      >
        ← Назад
      </button>

      <h2
        className="text-[18px] mb-6"
        style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}
      >
        Доступ
      </h2>

      {/* Invite link banner */}
      {lastInviteLink && (
        <div
          style={{
            padding: '10px 12px',
            background: '#F6F6F4',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#999', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Ссылка-приглашение
            </div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#111', wordBreak: 'break-all' }}>
              {lastInviteLink}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => { navigator.clipboard.writeText(lastInviteLink); toast('Ссылка скопирована'); }}
              style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '4px 10px', background: '#111', color: '#FFF', border: 'none', cursor: 'pointer' }}
            >
              Копировать
            </button>
            <button
              onClick={() => setLastInviteLink(null)}
              style={{ fontSize: 13, color: '#CCC', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-[13px] text-ink-faint" style={{ fontFamily: 'var(--font-mono)' }}>
          Загрузка...
        </div>
      ) : (
        <div className="space-y-0">
          {SECTIONS.map(({ role, label }) => {
            const sectionMembers = filteredMembers(role);
            const isFormOpen = openForm === role;
            const isClient = role === 'client';

            return (
              <div key={role}>
                {/* Section header */}
                <div
                  className="text-[8px] uppercase tracking-[0.08em] mb-2 mt-6"
                  style={{ fontFamily: 'var(--font-mono)', color: '#BBB' }}
                >
                  {label}
                </div>

                {/* Member list */}
                {sectionMembers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {sectionMembers.map(m => (
                      <div
                        key={m.id}
                        className="group"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: '#FFFFFF',
                          borderBottom: '0.5px solid #EBEBEB',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* Avatar */}
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              background: '#F6F6F4',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 600,
                              fontFamily: 'var(--font-mono)',
                              color: '#999',
                            }}
                          >
                            {getInitials(m)}
                          </div>
                          {/* Info */}
                          <div>
                            <div
                              style={{ fontSize: 11, color: '#111', fontFamily: 'var(--font-mono)' }}
                            >
                              {getDisplayName(m)}
                            </div>
                            {getEmail(m) && getEmail(m) !== getDisplayName(m) && (
                              <div
                                style={{ fontSize: 10, color: '#999', fontFamily: 'var(--font-mono)' }}
                              >
                                {getEmail(m)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Status badge */}
                          <span
                            style={{
                              fontSize: 9,
                              fontFamily: 'var(--font-mono)',
                              padding: '2px 6px',
                              background: m.status === 'active' ? '#111' : '#F6F6F4',
                              color: m.status === 'active' ? '#FFF' : '#999',
                            }}
                          >
                            {m.status === 'active' ? 'Активен' : 'Ожидает'}
                          </span>
                          {/* Remove button */}
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{
                              fontSize: 14,
                              color: '#CCC',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              lineHeight: 1,
                              padding: '2px 4px',
                            }}
                            onClick={() => handleRemove(m.id)}
                            title="Удалить"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 11,
                      color: '#CCC',
                      fontFamily: 'var(--font-mono)',
                      padding: '8px 12px',
                    }}
                  >
                    Нет участников
                  </div>
                )}

                {/* Client access toggles */}
                {isClient && (
                  <div style={{ marginTop: 2 }}>
                    <ToggleRow
                      label="Показать раздел Дизайн"
                      value={accessSettings?.client_can_see_design ?? false}
                      disabled={toggling}
                      onChange={() => handleToggle('client_can_see_design')}
                    />
                    <ToggleRow
                      label="Показать раздел Комплектация"
                      value={accessSettings?.client_can_see_furnishing ?? false}
                      disabled={toggling}
                      onChange={() => handleToggle('client_can_see_furnishing')}
                    />
                  </div>
                )}

                {/* Add button / inline form */}
                {isFormOpen ? (
                  <div
                    style={{
                      padding: '10px 12px',
                      background: '#FFFFFF',
                      borderBottom: '0.5px solid #EBEBEB',
                    }}
                  >
                    {formError && (
                      <div
                        style={{
                          fontSize: 10,
                          color: '#D00',
                          fontFamily: 'var(--font-mono)',
                          marginBottom: 6,
                        }}
                      >
                        {formError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={e => { setFormEmail(e.target.value); setFormError(''); }}
                        placeholder="email@example.com"
                        autoFocus
                        style={{
                          flex: 1,
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          padding: '6px 8px',
                          border: '1px solid #EBEBEB',
                          background: '#F6F6F4',
                          outline: 'none',
                          borderRadius: 0,
                          color: '#111',
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') handleInvite(role); if (e.key === 'Escape') { setOpenForm(null); setFormEmail(''); setFormError(''); } }}
                      />
                      <button
                        onClick={() => handleInvite(role)}
                        disabled={formSaving}
                        style={{
                          fontSize: 10,
                          fontFamily: 'var(--font-mono)',
                          padding: '6px 12px',
                          background: '#111',
                          color: '#FFF',
                          border: 'none',
                          cursor: formSaving ? 'wait' : 'pointer',
                          whiteSpace: 'nowrap',
                          opacity: formSaving ? 0.5 : 1,
                        }}
                      >
                        {formSaving ? '...' : 'Отправить приглашение →'}
                      </button>
                      <button
                        onClick={() => { setOpenForm(null); setFormEmail(''); setFormError(''); }}
                        style={{
                          fontSize: 13,
                          color: '#CCC',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px 4px',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setOpenForm(role); setFormEmail(''); setFormError(''); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 12px',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: '#999',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'color 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#111')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#999')}
                  >
                    <Icons.Plus className="w-3 h-3" />
                    Добавить
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Toggle Row ──────────────────────────────────────────

function ToggleRow({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: '#FFFFFF',
        borderBottom: '0.5px solid #EBEBEB',
      }}
    >
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#111' }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: '2px' }}>
        <ChipToggle active={value} label="Вкл" disabled={disabled} onClick={() => { if (!value) onChange(); }} />
        <ChipToggle active={!value} label="Выкл" disabled={disabled} onClick={() => { if (value) onChange(); }} />
      </div>
    </div>
  );
}

// ─── Chip Toggle ─────────────────────────────────────────

function ChipToggle({
  active,
  label,
  disabled,
  onClick,
}: {
  active: boolean;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 9,
        fontFamily: 'var(--font-mono)',
        padding: '2px 8px',
        background: active ? '#111' : '#F6F6F4',
        color: active ? '#FFF' : '#999',
        border: 'none',
        cursor: disabled ? 'wait' : 'pointer',
        transition: 'all 0.12s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}
