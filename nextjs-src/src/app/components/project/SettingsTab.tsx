'use client';
import { useState } from 'react';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';
import AccessScreen from './AccessScreen';
import NotificationSettings from './NotificationSettings';
import type { ProjectWithStats, ProjectMemberWithProfile, UserRole, AccessLevel } from '../../lib/types';
import { useProjectMembersWithProfiles } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { inviteProjectMember, createProjectInvitation, removeProjectMember, deleteProject } from '../../lib/queries';

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
  { value: 'view_supply', label: 'Комплектация' },
  { value: 'full', label: 'Полный доступ' },
];

interface SettingsTabProps {
  project: ProjectWithStats;
  projectId: string;
  toast: (msg: string) => void;
  canDeleteProject?: boolean;
  onDeleteProject?: () => void;
}

export default function SettingsTab({ project, projectId, toast, canDeleteProject = false, onDeleteProject }: SettingsTabProps) {
  const [sub, setSub] = useState<'roles' | 'details' | 'notifications'>('roles');
  const { data: members, loading, refetch: refetchMembers } = useProjectMembersWithProfiles(projectId);
  const { profile } = useAuth();

  // Show notifications tab for designer/owner and client
  const showNotifications = profile?.role === 'designer' || profile?.role === 'client';

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteTab, setInviteTab] = useState<'email' | 'link'>('email');
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState<UserRole>('client');
  const [invAccess, setInvAccess] = useState<AccessLevel>('view');
  const [saving, setSaving] = useState(false);
  const [invError, setInvError] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  // Delete member confirm
  const [memberToDelete, setMemberToDelete] = useState<ProjectMemberWithProfile | null>(null);
  const [deletingMember, setDeletingMember] = useState(false);

  // Delete project confirm
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

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

  const handleRemoveMember = async () => {
    if (!memberToDelete) return;
    setDeletingMember(true);
    try {
      await removeProjectMember(memberToDelete.id);
      toast('Участник удалён');
      refetchMembers();
      setMemberToDelete(null);
    } catch (err: any) {
      toast(err.message || 'Ошибка удаления участника');
    } finally {
      setDeletingMember(false);
    }
  };

  const handleDeleteProject = async () => {
    setDeletingProject(true);
    try {
      await deleteProject(projectId);
      toast('Проект удалён');
      setShowDeleteProject(false);
      onDeleteProject?.();
    } catch (err: any) {
      toast(err.message || 'Ошибка удаления проекта');
    } finally {
      setDeletingProject(false);
    }
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

  const mono = "'IBM Plex Mono', monospace";
  const display = "'Playfair Display', serif";

  return (
    <div className="animate-fade-in">
      <div className="stab mb-6">
        <button className={`stb ${sub === 'roles' ? 'active' : ''}`} onClick={() => setSub('roles')}>
          <Icons.Users className="w-3.5 h-3.5" /> Роли и доступ
        </button>
        <button className={`stb ${sub === 'details' ? 'active' : ''}`} onClick={() => setSub('details')}>
          <Icons.Settings className="w-3.5 h-3.5" /> Детали проекта
        </button>
        {showNotifications && (
          <button className={`stb ${sub === 'notifications' ? 'active' : ''}`} onClick={() => setSub('notifications')}>
            <Icons.Bell className="w-3.5 h-3.5" /> Уведомления
          </button>
        )}
      </div>

      {sub === 'roles' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: display, fontSize: 16, fontWeight: 700, color: 'var(--af-black)' }}>Участники проекта</h3>
            <button className="af-btn" onClick={() => setShowInvite(true)}>
              + Пригласить
            </button>
          </div>

          {loading ? (
            <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'var(--af-black)' }}>Загрузка...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 24 }}>
              {(Array.isArray(members) ? members : []).map((m) => (
                <div key={m.id} className="group" style={{
                  background: 'var(--af-white)', border: '0.5px solid var(--af-border)', padding: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 28, height: 28, background: 'var(--af-offwhite)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: mono, fontSize: 'var(--af-fs-9)', fontWeight: 600, color: 'var(--af-black)',
                    }}>
                      {getInitials(m)}
                    </div>
                    <div>
                      <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)', color: 'var(--af-black)' }}>{getName(m)}</div>
                      <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'var(--af-black)' }}>{ROLE_LABEL[m.role] || m.role}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: mono, fontSize: 'var(--af-fs-9)', width: 96, textAlign: 'center',
                      display: 'inline-block', whiteSpace: 'nowrap', padding: '2px 0',
                      background: m.role === 'designer' ? 'var(--af-black)' : 'transparent',
                      color: m.role === 'designer' ? 'var(--af-white)' : 'var(--af-black)',
                      border: m.role === 'designer' ? 'none' : '0.5px solid var(--af-border)',
                    }}>
                      {m.role === 'designer' ? 'Владелец' : m.access_level === 'full' ? 'Полный' : 'Ограничен'}
                    </span>
                    {m.role !== 'designer' && (
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setMemberToDelete(m)}
                        title="Удалить участника"
                        style={{ padding: 4, color: 'var(--af-border)' }}
                      >
                        <Icons.Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(!members || members.length === 0) && (
                <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'var(--af-black)' }}>Участников пока нет</div>
              )}
            </div>
          )}

          {/* Role templates */}
          <div style={{ background: 'var(--af-white)', border: '0.5px solid var(--af-border)', padding: 16 }}>
            <h4 style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--af-black)', marginBottom: 12 }}>Шаблоны ролей</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', width: 96, display: 'inline-block', textAlign: 'center', padding: '2px 0', border: '0.5px solid var(--af-border)', color: 'var(--af-black)' }}>Заказчик</span><span style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'var(--af-black)' }}>Только просмотр</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', width: 96, display: 'inline-block', textAlign: 'center', padding: '2px 0', border: '0.5px solid var(--af-border)', color: 'var(--af-black)' }}>Подрядчик</span><span style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'var(--af-black)' }}>Просмотр + фото + комментарии</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', width: 96, display: 'inline-block', textAlign: 'center', padding: '2px 0', border: '0.5px solid var(--af-border)', color: 'var(--af-black)' }}>Комплектатор</span><span style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'var(--af-black)' }}>Комплектация + обновление статусов</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', width: 96, display: 'inline-block', textAlign: 'center', padding: '2px 0', border: '0.5px solid var(--af-border)', color: 'var(--af-black)' }}>Ассистент</span><span style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'var(--af-black)' }}>На усмотрение дизайнера</span></div>
            </div>
          </div>

          {/* Access management (merged from separate tab) */}
          <div style={{ marginTop: 24 }}>
            <AccessScreen projectId={projectId} projectName={project?.title} toast={toast} onBack={() => {}} embedded />
          </div>
        </div>
      )}

      {sub === 'details' && (
        <div>
          <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
            <div style={{ background: 'var(--af-white)', border: '0.5px solid var(--af-border)', padding: 20 }}>
              <h4 style={{ fontFamily: display, fontSize: 16, fontWeight: 700, color: 'var(--af-black)', marginBottom: 16 }}>Даты и визиты</h4>
              <div className="space-y-3">
                <div className="modal-field">
                  <label style={{ fontFamily: mono, fontSize: 9 }}>Дата старта</label>
                  <input type="date" defaultValue={project.start_date || ''} className="af-input" />
                </div>
                <div className="modal-field">
                  <label style={{ fontFamily: mono, fontSize: 9 }}>Визитов по договору</label>
                  <input type="number" defaultValue={project.visit_count || 0} className="af-input" />
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--af-white)', border: '0.5px solid var(--af-border)', padding: 20 }}>
              <h4 style={{ fontFamily: display, fontSize: 16, fontWeight: 700, color: 'var(--af-black)', marginBottom: 16 }}>Платежи</h4>
              <div className="space-y-3">
                <div className="modal-field">
                  <label style={{ fontFamily: mono, fontSize: 9 }}>Авторский надзор (₽/мес)</label>
                  <input type="number" defaultValue={45000} className="af-input" />
                </div>
                <div className="modal-field">
                  <label style={{ fontFamily: mono, fontSize: 9 }}>Следующий платёж</label>
                  <input type="date" className="af-input" />
                </div>
              </div>
            </div>

            <div className="flex items-end">
              <button className="af-btn af-btn-full" onClick={() => toast('Сохранено')}>
                Сохранить
              </button>
            </div>
          </div>
          <p style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'var(--af-black)', marginTop: 12 }}>
            Настройки комплектации — в разделе Комплектация
          </p>

          {/* Danger zone */}
          {canDeleteProject && (
            <div style={{ border: '0.5px solid var(--af-border)', padding: 20, marginTop: 24 }}>
              <h4 style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--af-black)', marginBottom: 8 }}>Опасная зона</h4>
              <p style={{ fontFamily: mono, fontSize: 'var(--af-fs-9)', color: 'var(--af-black)', marginBottom: 16 }}>
                Удаление проекта невозможно отменить. Все визиты, фото, документы и счета будут удалены.
              </p>
              <button
                className="af-btn"
                onClick={() => setShowDeleteProject(true)}
                style={{ color: 'var(--af-black)', borderColor: 'var(--af-black)' }}
              >
                Удалить проект
              </button>
            </div>
          )}
        </div>
      )}

      {sub === 'notifications' && (
        <NotificationSettings projectId={projectId} toast={toast} />
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
            <div className="bg-err-bg border border-err/20 text-err text-[13px] px-4 py-2.5 rounded-lg mb-4">
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
                  <div className="bg-srf-secondary rounded-lg p-3 text-[12px] font-mono-custom break-all">
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

      {/* Confirm remove member */}
      <ConfirmDialog
        open={!!memberToDelete}
        title="Удалить участника?"
        message={`${memberToDelete ? getName(memberToDelete) : ''} будет удалён из проекта и потеряет доступ.`}
        confirmLabel="Удалить"
        loading={deletingMember}
        onConfirm={handleRemoveMember}
        onCancel={() => setMemberToDelete(null)}
      />

      {/* Confirm delete project */}
      <ConfirmDialog
        open={showDeleteProject}
        title="Удалить проект?"
        message={`Проект «${project.title}» и все связанные данные (визиты, фото, документы, счета) будут безвозвратно удалены.`}
        confirmLabel="Удалить проект"
        loading={deletingProject}
        onConfirm={handleDeleteProject}
        onCancel={() => setShowDeleteProject(false)}
      />
    </div>
  );
}
