'use client';
import { useState } from 'react';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import type { ProjectWithStats, ProjectMember } from '../../lib/types';
import { useProjectMembers } from '../../lib/hooks';

const ROLE_LABEL: Record<string, string> = {
  client: 'Заказчик', contractor: 'Подрядчик', supplier: 'Комплектатор', assistant: 'Ассистент', designer: 'Дизайнер',
};

interface SettingsTabProps {
  project: ProjectWithStats;
  projectId: string;
  toast: (msg: string) => void;
}

export default function SettingsTab({ project, projectId, toast }: SettingsTabProps) {
  const [sub, setSub] = useState<'roles' | 'details'>('roles');
  const { data: members, loading } = useProjectMembers(projectId);

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
            <button className="btn btn-primary text-[12px] py-1.5 px-3" onClick={() => toast('Ссылка-приглашение скопирована')}>
              <Icons.Link className="w-3.5 h-3.5" /> Пригласить
            </button>
          </div>

          {loading ? (
            <div className="text-[13px] text-[#9CA3AF]">Загрузка...</div>
          ) : (
            <div className="space-y-2 mb-6">
              {(members || []).map((m: ProjectMember) => (
                <div key={m.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[11px] font-semibold text-[#6B7280]">
                      {(m.user_id || '??').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium">{m.user_id || 'Участник'}</div>
                      <div className="text-[11px] text-[#9CA3AF]">{ROLE_LABEL[m.role] || m.role}</div>
                    </div>
                  </div>
                  <Bdg s={m.role === 'designer' ? 'active' : 'pending'} />
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
    </div>
  );
}
