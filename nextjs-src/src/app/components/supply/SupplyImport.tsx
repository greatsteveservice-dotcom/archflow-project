'use client';
import { useState } from 'react';
import { Icons } from '../Icons';

interface SupplyImportProps {
  toast: (msg: string) => void;
}

export default function SupplyImport({ toast }: SupplyImportProps) {
  const [step, setStep] = useState(1);

  const steps = [
    { n: 1, label: 'Загрузка' },
    { n: 2, label: 'Маппинг' },
    { n: 3, label: 'Предпросмотр' },
    { n: 4, label: 'Готово' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold ${
              step > s.n ? 'bg-[#111827] text-white' : step === s.n ? 'bg-[#111827] text-white' : 'bg-[#F3F4F6] text-[#9CA3AF]'
            }`}>
              {step > s.n ? <Icons.Check className="w-3.5 h-3.5" /> : s.n}
            </div>
            <span className={`text-[12px] ${step >= s.n ? 'text-[#111827] font-medium' : 'text-[#9CA3AF]'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-[#E5E7EB]" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card p-8 text-center">
          <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-12 hover:border-[#D1D5DB] transition-colors cursor-pointer">
            <Icons.Upload className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
            <div className="text-[14px] font-medium mb-1">Перетащите файл Excel сюда</div>
            <div className="text-[12px] text-[#9CA3AF]">или нажмите для выбора (.xlsx, .xls)</div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card p-5">
          <h3 className="text-[14px] font-semibold mb-4">Сопоставление колонок</h3>
          <div className="space-y-3">
            {['Название', 'Статус', 'Срок поставки', 'Этап', 'Количество', 'Поставщик'].map(field => (
              <div key={field} className="flex items-center gap-4">
                <span className="text-[13px] text-[#6B7280] w-[140px]">{field}</span>
                <select className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-[13px]">
                  <option>Колонка A</option>
                  <option>Колонка B</option>
                  <option>Колонка C</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card p-5">
          <h3 className="text-[14px] font-semibold mb-2">Предпросмотр</h3>
          <p className="text-[13px] text-[#9CA3AF] mb-4">5 строк из 124 будут импортированы</p>
          <div className="bg-[#F9FAFB] rounded-lg p-4 text-[12px] text-[#6B7280]">
            Данные из файла будут показаны здесь...
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-[#ECFDF3] flex items-center justify-center mx-auto mb-3">
            <Icons.Check className="w-6 h-6 text-[#16A34A]" />
          </div>
          <div className="text-[16px] font-semibold mb-1">Импорт завершён</div>
          <div className="text-[13px] text-[#9CA3AF]">124 позиции успешно импортированы</div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-5">
        <button
          className="btn btn-secondary"
          onClick={() => setStep(Math.max(1, step - 1))}
          style={{ visibility: step > 1 && step < 4 ? 'visible' : 'hidden' }}
        >
          Назад
        </button>
        {step < 3 && (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
            Далее
          </button>
        )}
        {step === 3 && (
          <button className="btn btn-primary" onClick={() => { setStep(4); toast('Позиции импортированы'); }}>
            Импортировать
          </button>
        )}
        {step === 4 && (
          <button className="btn btn-primary" onClick={() => setStep(1)}>
            Новый импорт
          </button>
        )}
      </div>
    </div>
  );
}
