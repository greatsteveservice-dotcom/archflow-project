'use client';
import { useState } from 'react';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import Modal from '../Modal';
import type { ProjectWithStats, ProjectMemberWithProfile, UserRole, AccessLevel } from '../../lib/types';
import { useProjectMembersWithProfiles } from '../../lib/hooks';
import { inviteProjectMember, createProjectInvitation } from '../../lib/queries';

const ROLE_LABEL: Record<string, string> = {
  client: 'Заказчик', contractor: 'Подрядчик', supplier: 'Комплектатор', assistant: 'Ассистент', designer: 'Дизайнер',
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'client', label: 'Заказчик' },
  { value: 'contractor', label: 'Подрядчик' },
  { value: 'supplier', label: 'Комплектатор' },
  { value: 'assistant', label: 'Ассистент' },
];

const ACCESS_OPTIONS: { value: AccessLevel; label: string }[] = [
  { value: 'view', label: 'Только просмотр' },
  { value: 'view_comment', label: 'Просмотр + комментарии' },
  { value: 'view_comment_photo', label: 'Просмотр + фото + комментарии' },
  { value: 'view_supply', label: 'Supply-операции' },
  { value: 'full', label: 'Полный доступ' },
];

interface SettingsTabProps {
  project: ProjectWithStats;
  projectId: string;
  toast: (msg: string) => void;
}

export default function SettingsTab({ project, projectId, toast }: SettingsTabProps) {
  const [sub, setSub] = useState<'roles' | 'details'>('roles');
  const { data: members, loading, refetch: refetchMembers } = useProjectMembersWithProfiles(projectId);

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteTab, setInviteTab] = useState<'email' | 'link'>('email');
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState<UserRole>('client');
  const [invAccess, setInvAccess] = useState<AccessLevel>('view');
  const [saving, setSaving] = useState(false);
  const [invError, setInvError] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleInviteByEmail = async () => {
    if (!invEmail.trim()) { setInvError('Введите email'); return; }
    if (!isValidEmail(invEmail.trim())) { setInvError('Некорректный формат email'); return; }
    setSaving(true);
    setInvError('');
    try {
      await inviteProjectMember({
        project_id: projectId,
        email: invEmail.trim(),
        role: invRole,
        access_level: invAccess,
      });
      toast('Участник приглашён');
      refetchMembers();
      closeInviteModal();
    } catch (err: any) {
      setInvError(err.message || 'Ошибка приглашения');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateLink = async () => {
    setSaving(true);
    setInvError('');
    try {
      const invitation = await createProjectInvitation(projectId, invRole, invAccess);
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}?invite=${invitation.token}`);
    } catch (err: any) {
      setInvError(err.message || 'Ошибка генерации ссылки');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast('Ссылка скопирована');
  };

  const closeInviteModal = () => {
    setShowInvite(false);
    setInvEmail('');
    setInvRole('client');
    setInvAccess('view');
    setInvError('');
    setInviteLink('');
    setInviteTab('email');
  };

  const getInitials = (member: ProjectMemberWithProfile) => {
    if (member.profile?.full_name) {
      return member.profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }
    return '??';
  };

  const getName = (member: ProjectMemberWithProfile) => {
    return member.profile?.full_name || member.profile?.email || 'Участник';
  };

  return (
    <div className="animate-fade-in">
      <div className="stab mb-6 w-fit">
        <button className={`stb ${sub === 'roles' ? 'active' : ''}`} onClick={() => setSub('roles')}>
          <Icons.Users className="w-3.5 h-3.5" /> Роли и доступ
        </button>
        <button className={`stb ${sub === 'details' ? 'active' : ''}`} onClick={() => setSub('details')}>
          <Icons.Settings className="w-3.5 h-3.5" /> Детали проекта
        </button>
      </div>

      {sub === 'roles' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold">Участники проекта</h3>
            <button className="btn btn-primary text-[12px] py-1.5 px-3" onClick={() => setShowInvite(true)}>
              <Icons.Plus className="w-3.5 h-3.5" /> Пригласить
            </button>
          </div>

          {loading ? (
            <div className="text-[13px] text-[#9CA3AF]">Загрузка...</div>
          ) : (
            <div className="space-y-2 mb-6">
              {(members || []).map((m) => (
                <div key={m.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[11px] font-semibold text-[#6B7280]">
                      {getInitials(m)}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium">{getName(m)}</div>
                      <div className="text-[11px] text-[#9CA3AF]">{ROLE_LABEL[m.role] || m.role}</div>
                    </div>
                  </div>
                  <Bdg s={m.role === 'designer' ? 'active' : m.access_level === 'full' ? 'approved' : 'pending'} />
                </div>
              ))}
              {(!members || members.length === 0) && (
                <div className="text-[13px] text-[#9CA3AF]">Участников пока нет</div>
              )}
            </div>
          )}

          {/* Role templates */}
          <div className="card p-5">
            <h4 className="text-[13px] font-semibold mb-3">Шаблоны ролей</h4>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center gap-2"><Bdg s="active" /><span className="text-[#6B7280]">Заказчик — только просмотр</span></div>
              <div className="flex items-center gap-2"><Bdg s="pending" /><span className="text-[#6B7280]">Подрядчик — просмотр + фото + комментарии</span></div>
              <div className="flex items-center gap-2"><Bdg s="in_review" /><span className="text-[#6B7280]">Комплектатор — Supply + обновление статусов</span></div>
              <div className="flex items-center gap-2"><Bdg s="approved" /><span className="text-[#6B7280]">Ассистент — на усмотрение дизайнера</span></div>
            </div>
          </div>
        </div>
      )}

      {sub === 'details' && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icons.Calendar className="w-4 h-4 text-[#6B7280]" />
              <h4 className="text-[13px] font-semibold">Даты и визиты</h4>
            </div>
            <div className="space-y-3">
              <div className="modal-field">
                <label>Дата старта</label>
                <input type="date" defaultValue={project.start_date || ''} />
              </div>
              <div className="modal-field">
                <label>Визитов по договору</label>
                <input type="number" defaultValue={project.visit_count || 0} />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icons.Receipt className="w-4 h-4 text-[#6B7280]" />
              <h4 className="text-[13px] font-semibold">Платежи</h4>
            </div>
            <div className="space-y-3">
              <div className="modal-field">
                <label>Авторский надзор (₽/мес)</label>
                <input type="number" defaultValue={45000} />
              </div>
              <div className="modal-field">
                <label>Следующий платёж</label>
                <input type="date" />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icons.Box className="w-4 h-4 text-[#6B7280]" />
              <h4 className="text-[13px] font-semibold">Комплектация</h4>
            </div>
            <div className="space-y-3">
              <div className="modal-field">
                <label>Скидка поставщикам (%)</label>
                <input type="number" defaultValue={12} />
              </div>
              <div className="modal-field">
                <label>Комиссия (%)</label>
                <input type="number" defaultValue={12} />
              </div>
            </div>
          </div>

          <div className="flex items-end">
            <button className="btn btn-primary w-full justify-center py-3" onClick={() => toast('Сохранено')}>
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <Modal open={showInvite} onClose={closeInviteModal} title="Пригласить участника">
        <div>
          {/* Tabs: email / link */}
          <div className="stab mb-4 w-fit">
            <button className={`stb ${inviteTab === 'email' ? 'active' : ''}`} onClick={() => { setInviteTab('email'); setInviteLink(''); }}>
              По email
            </button>
            <button className={`stb ${inviteTab === 'link' ? 'active' : ''}`} onClick={() => { setInviteTab('link'); setInviteLink(''); }}>
              По ссылке
            </button>
          </div>

          {invError && (
            <div className="bg-[#FEF2F2] border border-[#DC2626]/20 text-[#DC2626] text-[13px] px-4 py-2.5 rounded-lg mb-4">
              {invError}
            </div>
          )}

          {/* Role & access (shared) */}
          <div className="space-y-4 mb-4">
            <div className="modal-field">
              <label>Роль</label>
              <select value={invRole} onChange={e => setInvRole(e.target.value as UserRole)}>
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="modal-field">
              <label>Уровень доступа</label>
              <select value={invAccess} onChange={e => setInvAccess(e.target.value as AccessLevel)}>
                {ACCESS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {inviteTab === 'email' && (
            <>
              <div className="modal-field mb-4">
                <label>Email</label>
                <input
                  type="email"
                  value={invEmail}
                  onChange={e => setInvEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button className="btn btn-secondary" onClick={closeInviteModal}>Отмена</button>
                <button className="btn btn-primary" onClick={handleInviteByEmail} disabled={saving || !invEmail.trim()}>
                  {saving ? 'Отправка...' : 'Пригласить'}
                </button>
              </div>
            </>
          )}

          {inviteTab === 'link' && (
            <>
              {inviteLink ? (
                <div className="space-y-3">
                  <div className="bg-[#F3F4F6] rounded-lg p-3 text-[12px] font-mono-custom break-all">
                    {inviteLink}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button className="btn btn-secondary" onClick={closeInviteModal}>Закрыть</button>
                    <button className="btn btn-primary" onClick={handleCopyLink}>
                      <Icons.Link className="w-3.5 h-3.5" /> Скопировать
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 justify-end">
                  <button className="btn btn-secondary" onClick={closeInviteModal}>Отмена</button>
                  <button className="btn btn-primary" onClick={handleGenerateLink} disabled={saving}>
                    {saving ? 'Генерация...' : 'Сгенерировать ссылку'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
