'use client';
import { useState } from 'react';
import { Icons } from '../Icons';

interface SupplySettingsProps {
  toast: (msg: string) => void;
}

export default function SupplySettings({ toast }: SupplySettingsProps) {
  const [scenario, setScenario] = useState<'block' | 'gkl'>('block');
  const [buffer, setBuffer] = useState('3');
  const [startDate, setStartDate] = useState('2026-03-01');
  const [threshold, setThreshold] = useState('14');

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
          </div>

          <div className="modal-field">
            <label>Буфер между этапами (дни)</label>
            <input type="number" value={buffer} onChange={e => setBuffer(e.target.value)} />
          </div>

          <div className="modal-field">
            <label>Дата начала стройки</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <div className="modal-field">
            <label>Порог предупреждения</label>
            <select value={threshold} onChange={e => setThreshold(e.target.value)}>
              <option value="7">7 дней</option>
              <option value="14">14 дней</option>
              <option value="30">30 дней</option>
            </select>
          </div>

          <button className="btn btn-primary w-full justify-center py-3 mt-2" onClick={() => toast('Сохранено')}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
