// Mockup: simplified Roles & Access UI for project settings.
// Single member list, centralized invite, inline role/access change, expandable per-member permissions.
"use client";

import { useState } from "react";

const FONT = "var(--af-font)";
const FONT_MONO = "var(--af-font-mono)";

type Role = 'designer' | 'assistant' | 'client' | 'contractor' | 'supplier';
type Access = 'full' | 'view' | 'photos';

interface Member {
  id: string;
  initials: string;
  fullName: string | null;       // null if pending
  email: string;
  role: Role;
  access: Access;
  pending: boolean;
  isOwner: boolean;
  permissions: { design: boolean; supply: boolean; supervision: boolean; chat: boolean };
}

const ROLE_LABEL: Record<Role, string> = {
  designer: 'Дизайнер',
  assistant: 'Ассистент',
  client: 'Заказчик',
  contractor: 'Подрядчик',
  supplier: 'Комплектатор',
};
const ACCESS_LABEL: Record<Access, string> = {
  full: 'Полный',
  view: 'Просмотр',
  photos: 'Фото + комментарии',
};

const INITIAL: Member[] = [
  {
    id: '1', initials: 'ЕК', fullName: 'Евгений Колунов',
    email: 'kolunov@stador.ru', role: 'designer', access: 'full',
    pending: false, isOwner: true,
    permissions: { design: true, supply: true, supervision: true, chat: true },
  },
  {
    id: '2', initials: 'ИК', fullName: 'Иван Кравцов',
    email: 'ivan@gmail.com', role: 'client', access: 'view',
    pending: false, isOwner: false,
    permissions: { design: true, supply: true, supervision: true, chat: true },
  },
  {
    id: '3', initials: '—', fullName: null,
    email: 'kolunov87@bk.ru', role: 'client', access: 'view',
    pending: true, isOwner: false,
    permissions: { design: true, supply: false, supervision: true, chat: true },
  },
  {
    id: '4', initials: 'АП', fullName: 'Анна Петрова',
    email: 'anna@bureau.ru', role: 'assistant', access: 'full',
    pending: false, isOwner: false,
    permissions: { design: true, supply: true, supervision: true, chat: true },
  },
];

export default function RolesMockupPage() {
  const [members, setMembers] = useState<Member[]>(INITIAL);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('client');
  const [inviteAccess, setInviteAccess] = useState<Access>('view');

  const handleRoleChange = (id: string, role: Role) => {
    setMembers(members.map(m => m.id === id ? { ...m, role } : m));
  };
  const handleAccessChange = (id: string, access: Access) => {
    setMembers(members.map(m => m.id === id ? { ...m, access } : m));
  };
  const togglePermission = (id: string, key: keyof Member['permissions']) => {
    setMembers(members.map(m => m.id === id
      ? { ...m, permissions: { ...m.permissions, [key]: !m.permissions[key] } }
      : m,
    ));
  };
  const removeMember = (id: string) => setMembers(members.filter(m => m.id !== id));

  const submitInvite = () => {
    if (!inviteEmail.trim()) return;
    const newM: Member = {
      id: `n${Date.now()}`,
      initials: '—',
      fullName: null,
      email: inviteEmail.trim(),
      role: inviteRole,
      access: inviteAccess,
      pending: true,
      isOwner: false,
      permissions: { design: true, supply: true, supervision: true, chat: true },
    };
    setMembers([...members, newM]);
    setInviteEmail('');
    setInviteOpen(false);
  };

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
          <span style={{ fontSize: 11, fontWeight: 700 }}>Евгений К.</span>
          <span style={{ width: 28, height: 28, background: '#111', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>ЕК</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ background: '#FFF', borderBottom: '0.5px solid #EBEBEB', padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 0 }}>
          {['Роли и доступ', 'Детали проекта', 'Уведомления'].map((t, i) => (
            <button key={t} style={{
              padding: '14px 20px', background: 'none', border: 'none',
              borderBottom: i === 0 ? '2px solid #111' : '2px solid transparent',
              fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer', color: i === 0 ? '#111' : '#999',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>Команда проекта</h1>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999' }}>
              {members.length} {members.length === 1 ? 'участник' : 'участников'} · {members.filter(m => m.pending).length} ожидает
            </div>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            style={{
              height: 36, padding: '0 18px', background: '#111', color: '#F6F6F4',
              border: 'none', cursor: 'pointer',
              fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
            }}
          >
            + Пригласить
          </button>
        </div>

        {/* Members table */}
        <div style={{ background: '#FFF', border: '0.5px solid #EBEBEB' }}>
          {/* Table head */}
          <div style={{
            display: 'grid', gridTemplateColumns: '44px 1fr 1fr 160px 160px 32px',
            gap: 12, padding: '10px 16px',
            fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: '#999', borderBottom: '0.5px solid #EBEBEB',
          }}>
            <div></div>
            <div>Имя</div>
            <div>Email</div>
            <div>Роль</div>
            <div>Доступ</div>
            <div></div>
          </div>

          {members.map(m => (
            <div key={m.id}>
              {/* Row */}
              <div
                style={{
                  display: 'grid', gridTemplateColumns: '44px 1fr 1fr 160px 160px 32px',
                  gap: 12, padding: '14px 16px', alignItems: 'center',
                  borderBottom: expandedId === m.id ? 'none' : '0.5px solid #F6F6F4',
                  background: expandedId === m.id ? '#F6F6F4' : '#FFF',
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
              >
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32,
                  background: m.pending ? '#F6F6F4' : '#111',
                  color: m.pending ? '#999' : '#F6F6F4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  border: m.pending ? '0.5px dashed #999' : 'none',
                }}>{m.initials}</div>

                {/* Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: m.pending ? '#999' : '#111' }}>
                    {m.fullName || 'Не зарегистрировался'}
                    {m.isOwner && (
                      <span style={{ marginLeft: 8, fontFamily: FONT_MONO, fontSize: 8, letterSpacing: '0.1em', color: '#999', fontWeight: 400 }}>
                        ВЛАДЕЛЕЦ
                      </span>
                    )}
                  </div>
                  {m.pending && (
                    <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c80' }}>
                      ● Ожидает приглашение
                    </span>
                  )}
                </div>

                {/* Email */}
                <div style={{ fontSize: 12, color: '#666', fontFamily: FONT_MONO }}>{m.email}</div>

                {/* Role select */}
                <select
                  value={m.role}
                  disabled={m.isOwner}
                  onClick={e => e.stopPropagation()}
                  onChange={e => handleRoleChange(m.id, e.target.value as Role)}
                  style={{
                    height: 32, border: '0.5px solid #EBEBEB', background: '#FFF',
                    fontFamily: FONT, fontSize: 12, padding: '0 8px',
                    cursor: m.isOwner ? 'not-allowed' : 'pointer',
                    opacity: m.isOwner ? 0.5 : 1,
                  }}
                >
                  {(Object.keys(ROLE_LABEL) as Role[]).map(r => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>

                {/* Access select */}
                <select
                  value={m.access}
                  disabled={m.isOwner}
                  onClick={e => e.stopPropagation()}
                  onChange={e => handleAccessChange(m.id, e.target.value as Access)}
                  style={{
                    height: 32, border: '0.5px solid #EBEBEB', background: '#FFF',
                    fontFamily: FONT, fontSize: 12, padding: '0 8px',
                    cursor: m.isOwner ? 'not-allowed' : 'pointer',
                    opacity: m.isOwner ? 0.5 : 1,
                  }}
                >
                  {(Object.keys(ACCESS_LABEL) as Access[]).map(a => (
                    <option key={a} value={a}>{ACCESS_LABEL[a]}</option>
                  ))}
                </select>

                {/* Action menu */}
                <button
                  disabled={m.isOwner}
                  onClick={e => { e.stopPropagation(); removeMember(m.id); }}
                  style={{
                    width: 28, height: 28, background: 'none', border: 'none',
                    fontSize: 18, color: m.isOwner ? '#EBEBEB' : '#999',
                    cursor: m.isOwner ? 'default' : 'pointer',
                    fontFamily: FONT,
                  }}
                  title={m.isOwner ? 'Владельца нельзя удалить' : 'Убрать из проекта'}
                >×</button>
              </div>

              {/* Expanded permissions */}
              {expandedId === m.id && (
                <div style={{
                  background: '#F6F6F4', padding: '12px 16px 16px 60px',
                  borderBottom: '0.5px solid #EBEBEB',
                }}>
                  <div style={{
                    fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: '#999', marginBottom: 10,
                  }}>
                    Видимые разделы для {m.fullName || m.email}
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {(Object.keys(m.permissions) as (keyof Member['permissions'])[]).map(k => {
                      const labels: Record<string, string> = {
                        design: 'Дизайн', supply: 'Комплектация', supervision: 'Авторнадзор', chat: 'Чат',
                      };
                      const on = m.permissions[k];
                      return (
                        <button
                          key={k}
                          onClick={() => togglePermission(m.id, k)}
                          disabled={m.isOwner}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 12px', background: on ? '#111' : '#FFF',
                            color: on ? '#F6F6F4' : '#666',
                            border: '0.5px solid #111',
                            fontFamily: FONT, fontSize: 12,
                            cursor: m.isOwner ? 'not-allowed' : 'pointer',
                            opacity: m.isOwner ? 0.4 : 1,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>{on ? '●' : '○'}</span>
                          {labels[k]}
                        </button>
                      );
                    })}
                  </div>
                  {m.pending && (
                    <button style={{
                      marginTop: 14, padding: '6px 12px', background: 'transparent',
                      border: '0.5px solid #EBEBEB',
                      fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                      cursor: 'pointer', color: '#666',
                    }}>
                      Переслать приглашение
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Hint */}
        <div style={{
          marginTop: 24, padding: 14, background: '#FFF', border: '0.5px solid #EBEBEB',
          fontFamily: FONT_MONO, fontSize: 10, lineHeight: 1.6, color: '#666',
        }}>
          💡 Клик по строке — детальная настройка видимых разделов.
          Роль и Доступ меняются прямо в строке. Один кнопка «Пригласить» сверху.
        </div>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div
          onClick={() => setInviteOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFF', border: '0.5px solid #111',
              width: 'min(440px, 90vw)', padding: 24,
            }}
          >
            <div style={{
              fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: '#999', marginBottom: 6,
            }}>Пригласить в проект</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 16 }}>Новый участник</h2>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>Email</div>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                style={{ width: '100%', height: 36, border: '0.5px solid #EBEBEB', padding: '0 10px', fontFamily: FONT, fontSize: 13, outline: 'none' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>Роль</div>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as Role)}
                style={{ width: '100%', height: 36, border: '0.5px solid #EBEBEB', padding: '0 10px', fontFamily: FONT, fontSize: 13, background: '#FFF' }}
              >
                {(Object.keys(ROLE_LABEL) as Role[]).map(r => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: 16 }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>Уровень доступа</div>
              <select
                value={inviteAccess}
                onChange={e => setInviteAccess(e.target.value as Access)}
                style={{ width: '100%', height: 36, border: '0.5px solid #EBEBEB', padding: '0 10px', fontFamily: FONT, fontSize: 13, background: '#FFF' }}
              >
                {(Object.keys(ACCESS_LABEL) as Access[]).map(a => (
                  <option key={a} value={a}>{ACCESS_LABEL[a]}</option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setInviteOpen(false)} style={{
                padding: '8px 14px', background: 'transparent', border: '0.5px solid #EBEBEB',
                fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer', color: '#666',
              }}>Отмена</button>
              <button
                onClick={submitInvite} disabled={!inviteEmail.trim()}
                style={{
                  padding: '8px 16px', background: '#111', color: '#F6F6F4',
                  border: 'none', cursor: inviteEmail.trim() ? 'pointer' : 'default',
                  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                  opacity: inviteEmail.trim() ? 1 : 0.4,
                }}
              >Отправить</button>
            </div>
            <div style={{
              marginTop: 14, fontFamily: FONT_MONO, fontSize: 10, color: '#999',
            }}>
              Или <a href="#" style={{ color: '#111' }}>скопировать ссылку приглашения</a> и отправить вручную.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
