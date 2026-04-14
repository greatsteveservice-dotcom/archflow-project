'use client';
import { useState } from 'react';
import { Icons } from '../Icons';
import { updateProjectWebcam } from '../../lib/queries';

interface CameraViewProps {
  projectId: string;
  webcamUrl: string | null;
  toast: (msg: string) => void;
  canEdit?: boolean;
  refetchProject: () => void;
}

export default function CameraView({ projectId, webcamUrl, toast, canEdit = true, refetchProject }: CameraViewProps) {
  const [url, setUrl] = useState(webcamUrl || '');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(!webcamUrl);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProjectWebcam(projectId, url.trim() || null);
      toast('Ссылка на камеру сохранена');
      refetchProject();
      setIsEditing(false);
    } catch (e: any) {
      toast(e.message || 'Ошибка');
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <Icons.Camera className="w-4 h-4 text-ink-muted" />
        <h3 style={{ fontFamily: 'var(--af-font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase' as const }}>Камера с объекта</h3>
      </div>

      {webcamUrl && !isEditing ? (
        <div>
          {/* Preview/Link */}
          <div className="card p-5 mb-4">
            <div className="aspect-video bg-srf-secondary rounded-xl overflow-hidden mb-3">
              <iframe
                src={webcamUrl}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Веб-камера"
              />
            </div>
            <div className="flex items-center justify-between">
              <a
                href={webcamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-info hover:underline flex items-center gap-1.5"
              >
                <Icons.Link className="w-3.5 h-3.5" />
                Открыть в новом окне
              </a>
              {canEdit && (
                <button className="btn btn-secondary text-[12px] py-1.5 px-3" onClick={() => setIsEditing(true)}>
                  <Icons.Edit className="w-3 h-3" /> Изменить
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-5">
          <div className="flex flex-col items-center justify-center py-8 text-center mb-4">
            <Icons.Camera className="w-10 h-10 text-ink-ghost mb-3" />
            <div className="text-[13px] text-ink-muted mb-1">
              {webcamUrl ? 'Изменить ссылку на веб-камеру' : 'Добавьте ссылку на веб-камеру объекта'}
            </div>
            <div className="text-[11px] text-ink-faint">
              Вставьте URL трансляции (YouTube, IP-камера и др.)
            </div>
          </div>

          {canEdit && (
            <div className="space-y-3">
              <div className="modal-field">
                <label>URL камеры</label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://youtube.com/embed/... или IP-камера"
                />
              </div>
              <div className="flex gap-2 justify-end">
                {webcamUrl && (
                  <button className="btn btn-secondary" onClick={() => { setIsEditing(false); setUrl(webcamUrl || ''); }}>
                    Отмена
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
