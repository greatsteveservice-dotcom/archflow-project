'use client';
import { useState } from 'react';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import Modal from '../Modal';
import type { ProjectWithStats, VisitWithStats, Invoice } from '../../lib/types';
import { formatDate, formatPrice, createInvoice } from '../../lib/queries';

interface JournalTabProps {
  project: ProjectWithStats;
  projectId: string;
  visits: VisitWithStats[];
  invoices: Invoice[];
  onSelectVisit: (visitId: string) => void;
  toast: (msg: string) => void;
  refetchInvoices: () => void;
  canCreateInvoice?: boolean;
}

export default function JournalTab({ project, projectId, visits, invoices, onSelectVisit, toast, refetchInvoices, canCreateInvoice = true }: JournalTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [invTitle, setInvTitle] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invDue, setInvDue] = useState('');
  const [invPaymentUrl, setInvPaymentUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const pendingInv = invoices.filter(i => i.status === 'pending');
  const paidInv = invoices.filter(i => i.status === 'paid');
  const completed = visits.filter(v => v.status !== 'planned').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCreateInvoice = async () => {
    const errs: Record<string, string> = {};
    if (!invTitle.trim()) errs.title = 'Введите название';
    if (!invAmount || Number(invAmount) <= 0) errs.amount = 'Введите сумму больше 0';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      await createInvoice({ project_id: projectId, title: invTitle, amount: Number(invAmount), due_date: invDue || undefined, payment_url: invPaymentUrl || undefined });
      toast('Счёт выставлен');
      refetchInvoices();
      setShowModal(false);
      setInvTitle('');
      setInvAmount('');
      setInvDue('');
      setInvPaymentUrl('');
    } catch (e: any) {
      toast(e.message || 'Ошибка создания счёта');
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Invoice summary */}
      <div className="card p-5 mb-6" style={{ borderLeft: `4px solid ${pendingInv.length > 0 ? '#D97706' : '#16A34A'}` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icons.Receipt className="w-4 h-4 text-[#6B7280]" />
            <h3 className="text-[14px] font-semibold">Счета</h3>
            {pendingInv.length > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#D97706] animate-pulse-custom">
                {pendingInv.length} ожидает
              </span>
            )}
          </div>
          {canCreateInvoice && (
            <button className="btn btn-primary text-[12px] py-1.5 px-3" onClick={() => setShowModal(true)}>
              <Icons.Plus className="w-3.5 h-3.5" /> Выставить счёт
            </button>
          )}
        </div>
        <div className="space-y-2">
          {invoices.map(inv => (
            <div key={inv.id} className="flex items-center justify-between text-[13px] py-2 border-b border-[#F3F4F6] last:border-none">
              <span className="truncate min-w-0">{inv.title}</span>
              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                <span className="font-mono-custom font-medium">{formatPrice(inv.amount)}</span>
                {inv.payment_url && (
                  <a
                    href={inv.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2563EB] hover:text-[#1D4ED8] transition-colors flex items-center gap-1"
                    title="Ссылка на оплату"
                    onClick={e => e.stopPropagation()}
                  >
                    <Icons.Link className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Оплатить</span>
                  </a>
                )}
                <Bdg s={inv.status} />
              </div>
            </div>
          ))}
          {invoices.length === 0 && <div className="text-[13px] text-[#9CA3AF]">Счетов пока нет</div>}
        </div>
      </div>

      {/* Visit timeline */}
      <h3 className="text-[14px] font-semibold mb-4">Визиты</h3>
      <div className="space-y-3">
        {completed.map(v => (
          <div key={v.id} className="card p-4 cursor-pointer hover:bg-[#FAFAFA]" onClick={() => onSelectVisit(v.id)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-2 rounded-full bg-[#111827] flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate">{v.title}</div>
                  <div className="text-[12px] text-[#9CA3AF] mt-0.5">
                    {formatDate(v.date)} · {v.author?.full_name || 'Автор'}
                  </div>
                  {v.note && <div className="text-[12px] text-[#6B7280] mt-1 truncate">{v.note}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {v.photo_count > 0 && (
                  <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                    <Icons.Camera className="w-3 h-3" /> {v.photo_count}
                  </span>
                )}
                <Bdg s={v.status} />
                <Icons.ChevronRight className="w-4 h-4 text-[#D1D5DB]" />
              </div>
            </div>
          </div>
        ))}
        {completed.length === 0 && <div className="text-[13px] text-[#9CA3AF]">Визитов пока нет</div>}
      </div>

      {/* Create Invoice Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Выставить счёт">
        <div className="space-y-4">
          <div className="modal-field">
            <label>Название *</label>
            <input value={invTitle} onChange={e => { setInvTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }} placeholder="Авторский надзор — март" className={errors.title ? 'border-[#DC2626]' : ''} />
            {errors.title && <span className="text-[11px] text-[#DC2626] mt-0.5">{errors.title}</span>}
          </div>
          <div className="modal-field">
            <label>Сумма (₽) *</label>
            <input type="number" value={invAmount} onChange={e => { setInvAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })); }} placeholder="45000" className={errors.amount ? 'border-[#DC2626]' : ''} />
            {errors.amount && <span className="text-[11px] text-[#DC2626] mt-0.5">{errors.amount}</span>}
          </div>
          <div className="modal-field">
            <label>Срок оплаты</label>
            <input type="date" value={invDue} onChange={e => setInvDue(e.target.value)} />
          </div>
          <div className="modal-field">
            <label>Ссылка на оплату</label>
            <input type="url" value={invPaymentUrl} onChange={e => setInvPaymentUrl(e.target.value)} placeholder="https://bank.ru/pay/..." />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Отмена</button>
            <button className="btn btn-primary" onClick={handleCreateInvoice} disabled={saving || !invTitle.trim() || !invAmount}>
              {saving ? 'Сохранение...' : 'Выставить'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
