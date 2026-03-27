'use client';
import { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import Topbar from './Topbar';
import { useAuth } from '../lib/auth';
import { updateProfile, uploadAvatar } from '../lib/queries';

const ROLE_LABELS: Record<string, string> = {
  designer: 'Дизайнер',
  client: 'Заказчик',
  contractor: 'Подрядчик',
  supplier: 'Комплектатор',
  assistant: 'Ассистент',
};

interface ProfilePageProps {
  onNavigate: (page: string, ctx?: any) => void;
  onMenuToggle?: () => void;
  toast: (msg: string) => void;
}

export default function ProfilePage({ onNavigate, onMenuToggle, toast }: ProfilePageProps) {
  const { profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Init form fields from profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setTelegram(profile.telegram_id || '');
      setCompany(profile.company || '');
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (!profile) return;
    const changed =
      fullName !== (profile.full_name || '') ||
      phone !== (profile.phone || '') ||
      telegram !== (profile.telegram_id || '') ||
      company !== (profile.company || '');
    setDirty(changed);
  }, [fullName, phone, telegram, company, profile]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast('Введите имя');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        telegram_id: telegram.trim(),
        company: company.trim(),
      });
      await refreshProfile();
      toast('Профиль обновлён');
      setDirty(false);
    } catch (err: any) {
      toast(err.message || 'Ошибка обновления профиля');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Максимум 5 МБ'); return; }
    setUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      await refreshProfile();
      toast('Аватар обновлён');
    } catch (err: any) {
      toast(err.message || 'Ошибка загрузки аватара');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  if (!profile) return null;

  return (
    <>
      <Topbar
        title="Профиль"
        onMenuToggle={onMenuToggle}
        breadcrumbs={[
          { label: 'Дашборд', onClick: () => onNavigate('dashboard') },
          { label: 'Профиль' },
        ]}
      />

      <div className="p-4 sm:p-8 max-w-2xl">
        {/* Avatar + Name header */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative group flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-ink text-srf flex items-center justify-center text-xl font-bold">
                  {initials}
                </div>
              )}
              <button
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icons.Camera className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <div className="text-[17px] font-semibold">{profile.full_name}</div>
              <div className="text-[13px] text-ink-muted mt-0.5">{profile.email}</div>
              <div className="mt-1">
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-srf-secondary text-ink-secondary">
                  {ROLE_LABELS[profile.role] || profile.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="card p-6">
          <h3 className="text-[14px] font-semibold mb-5">Редактирование</h3>

          <div className="space-y-4">
            <div className="modal-field">
              <label>Имя и фамилия *</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Алиса Флоренс"
              />
            </div>

            <div className="modal-field">
              <label>Телефон</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div className="modal-field">
              <label>Telegram</label>
              <div className="relative">
                <input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@username"
                />
              </div>
            </div>

            <div className="modal-field">
              <label>Компания</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Студия дизайна"
              />
            </div>

            <div className="modal-field">
              <label>Email</label>
              <input
                value={profile.email || ''}
                disabled
                className="opacity-50 cursor-not-allowed"
              />
              <span className="text-[11px] text-ink-faint mt-1">Email нельзя изменить</span>
            </div>

            <div className="modal-field">
              <label>Роль</label>
              <input
                value={ROLE_LABELS[profile.role] || profile.role}
                disabled
                className="opacity-50 cursor-not-allowed"
              />
              <span className="text-[11px] text-ink-faint mt-1">Роль устанавливается администратором</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-line-light">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setFullName(profile.full_name || '');
                setPhone(profile.phone || '');
                setTelegram(profile.telegram_id || '');
                setCompany(profile.company || '');
              }}
              disabled={!dirty || saving}
            >
              Отменить
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!dirty || saving || !fullName.trim()}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
