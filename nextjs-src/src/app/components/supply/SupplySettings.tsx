'use client';
import { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import { useProject } from '../../lib/hooks';
import { updateProject } from '../../lib/queries';

interface SupplySettingsProps {
  projectId: string;
  toast: (msg: string) => void;
}

export default function SupplySettings({ projectId, toast }: SupplySettingsProps) {
  const { data: project, refetch } = useProject(projectId);
  const [scenario, setScenario] = useState<'block' | 'gkl'>('block');
  const [startDate, setStartDate] = useState('');
  const [discount, setDiscount] = useState('0');
  const [saving, setSaving] = useState(false);

  // Sync form with project data
  useEffect(() => {
    if (!project) return;
    setScenario(project.scenario_type || 'block');
    setStartDate(project.start_date || '');
    setDiscount(String(project.supply_discount || 0));
  }, [project]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProject(projectId, {
        scenario_type: scenario,
        start_date: startDate || null,
        supply_discount: Number(discount) || 0,
      });
      refetch();
      toast('Настройки сохранены');
    } catch (err: any) {
      toast('Ошибка: ' + (err.message || 'не удалось сохранить'));
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = project && (
    scenario !== (project.scenario_type || 'block') ||
    startDate !== (project.start_date || '') ||
    discount !== String(project.supply_discount || 0)
  );

  return (
    <div className="animate-fade-in max-w-[500px]">
      <div className="card p-6">
        <h3 className="text-[14px] font-semibold mb-5">Настройки комплектации</h3>

        <div className="space-y-5">
          <div>
            <label className="block text-[12px] font-medium text-ink-muted mb-2">Тип перегородок</label>
            <div className="stab w-fit">
              <button className={`stb ${scenario === 'block' ? 'active' : ''}`} onClick={() => setScenario('block')}>
                Блок
              </button>
              <button className={`stb ${scenario === 'gkl' ? 'active' : ''}`} onClick={() => setScenario('gkl')}>
                ГКЛ
              </button>
            </div>
            <p className="text-[11px] text-ink-faint mt-1.5">
              {scenario === 'block' ? 'Блочные перегородки — стандартный порядок этапов' : 'ГКЛ перегородки — изменённый порядок этапов'}
            </p>
          </div>

          <div className="modal-field">
            <label>Дата начала стройки</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <p className="text-[11px] text-ink-faint mt-1">Влияет на расчёт дедлайнов заказа материалов</p>
          </div>

          <div className="modal-field">
            <label>Скидка поставщика (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
            />
            <p className="text-[11px] text-ink-faint mt-1">Применяется к расчёту бюджета позиций</p>
          </div>

          <button
            className="btn btn-primary w-full justify-center py-3 mt-2 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Icons.Check className="w-4 h-4" />
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
