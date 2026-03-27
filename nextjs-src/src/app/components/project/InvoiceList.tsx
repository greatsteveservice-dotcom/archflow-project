'use client';
import { useState, useMemo } from 'react';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';
import type { Invoice } from '../../lib/types';
import { formatPrice, createInvoice, updateInvoiceStatus, deleteInvoice } from '../../lib/queries';

interface InvoiceListProps {
  projectId: string;
  invoices: Invoice[];
  toast: (msg: string) => void;
  refetchInvoices: () => void;
  canCreateInvoice?: boolean;
}

export default function InvoiceList({ projectId, invoices, toast, refetchInvoices, canCreateInvoice = true }: InvoiceListProps) {
  const [showModal, setShowModal] = useState(false);
  const [invTitle, setInvTitle] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invDue, setInvDue] = useState('');
  const [invPaymentUrl, setInvPaymentUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [invSearch, setInvSearch] = useState('');
  const [invStatusFilter, setInvStatusFilter] = useState<string>('all');
  const [invToDelete, setInvToDelete] = useState<Invoice | null>(null);
  const [deletingInv, setDeletingInv] = useState(false);

  const pendingInv = invoices.filter(i => i.status === 'pending');
  const paidInv = invoices.filter(i => i.status === 'paid');
  const totalPending = pendingInv.reduce((s, i) => s + i.amount, 0);
  const totalPaid = paidInv.reduce((s, i) => s + i.amount, 0);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = !invSearch || inv.title.toLowerCase().includes(invSearch.toLowerCase());
      const matchStatus = invStatusFilter === 'all' || inv.status === invStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, invSearch, invStatusFilter]);

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
      setInvTitle(''); setInvAmount(''); setInvDue(''); setInvPaymentUrl('');
    } catch (e: any) {
      toast(e.message || 'Ошибка создания счёта');
    }
    setSaving(false);
  };

  const handleToggleStatus = async (inv: Invoice) => {
    const newStatus = inv.status === 'paid' ? 'pending' : 'paid';
    try {
      await updateInvoiceStatus(inv.id, newStatus);
      toast(newStatus === 'paid' ? 'Счёт оплачен' : 'Статус снят');
      refetchInvoices();
    } catch (e: any) {
      toast(e.message || 'Ошибка обновления');
    }
  };

  const handleDeleteInv = async () => {
    if (!invToDelete) return;
    setDeletingInv(true);
    try {
      await deleteInvoice(invToDelete.id);
      toast('Счёт удалён');
      refetchInvoices();
      setInvToDelete(null);
    } catch (e: any) {
      toast(e.message || 'Ошибка удаления');
    }
    setDeletingInv(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Summary */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="card p-4 text-center">
            <div className="text-[18px] font-bold font-mono-custom">{formatPrice(totalPaid + totalPending)}</div>
            <div className="text-[11px] text-ink-faint mt-0.5">Всего</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-[18px] font-bold font-mono-custom text-ok">{formatPrice(totalPaid)}</div>
            <div className="text-[11px] text-ink-faint mt-0.5">Оплачено</div>
          </div>
          <div className="card p-4 text-center">
            <div className={`text-[18px] font-bold font-mono-custom ${totalPending > 0 ? 'text-warn' : ''}`}>{formatPrice(totalPending)}</div>
            <div className="text-[11px] text-ink-faint mt-0.5">Ожидает</div>
          </div>
        </div>
      )}

      {/* Header + actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icons.Receipt className="w-4 h-4 text-ink-muted" />
          <h3 className="text-[14px] font-semibold">Счета</h3>
          {pendingInv.length > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-warn-bg text-warn">
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

      {/* Filter */}
      {invoices.length > 3 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-[260px] w-full">
            <Icons.Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input type="text" value={invSearch} onChange={(e) => setInvSearch(e.target.value)}
              placeholder="Поиск..." className="w-full pl-8 pr-3 py-1.5 border border-line rounded-lg text-[12px] outline-none focus:border-ink transition-colors bg-srf" />
          </div>
          <div className="flex gap-1">
            {(['all', 'pending', 'paid'] as const).map(s => (
              <button key={s} className={`text-[11px] px-2.5 py-1 rounded-lg transition-all ${
                invStatusFilter === s ? 'bg-ink text-srf' : 'bg-srf-secondary text-ink-muted hover:bg-line'
              }`} onClick={() => setInvStatusFilter(s)}>
                {s === 'all' ? 'Все' : s === 'pending' ? 'Ожидает' : 'Оплачен'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {filteredInvoices.map(inv => (
          <div key={inv.id} className="flex items-center justify-between text-[13px] py-2.5 border-b border-srf-secondary last:border-none group">
            <span className="truncate min-w-0">{inv.title}</span>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <span className="font-mono-custom font-medium">{formatPrice(inv.amount)}</span>
              {inv.payment_url && (
                <a href={inv.payment_url} target="_blank" rel="noopener noreferrer"
                  className="text-info hover:text-blue-700 transition-colors flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <Icons.Link className="w-3.5 h-3.5" />
                </a>
              )}
              {canCreateInvoice ? (
                <button className={`text-[11px] font-medium px-2 py-0.5 rounded-full cursor-pointer ${
                  inv.status === 'paid' ? 'bg-ok-bg text-ok hover:bg-green-100' : 'bg-warn-bg text-warn hover:bg-orange-100'
                }`} onClick={() => handleToggleStatus(inv)}>
                  {inv.status === 'paid' ? '✓ Оплачен' : 'Ожидает'}
                </button>
              ) : (
                <Bdg s={inv.status} />
              )}
              {canCreateInvoice && (
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-err-bg text-ink-faint hover:text-err"
                  onClick={() => setInvToDelete(inv)}>
                  <Icons.Trash className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {invoices.length === 0 && <div className="text-[13px] text-ink-faint py-4 text-center">Счетов пока нет</div>}
      </div>

      {/* Create Invoice Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Выставить счёт">
        <div className="space-y-4">
          <div className="modal-field">
            <label>Название *</label>
            <input value={invTitle} onChange={e => { setInvTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }}
              placeholder="Авторский надзор — март" className={errors.title ? 'border-err' : ''} />
            {errors.title && <span className="text-[11px] text-err mt-0.5">{errors.title}</span>}
          </div>
          <div className="modal-field">
            <label>Сумма (₽) *</label>
            <input type="number" value={invAmount} onChange={e => { setInvAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })); }}
              placeholder="45000" className={errors.amount ? 'border-err' : ''} />
            {errors.amount && <span className="text-[11px] text-err mt-0.5">{errors.amount}</span>}
          </div>
          <div className="modal-field">
            <label>Срок оплаты</label>
            <input type="date" value={invDue} onChange={e => setInvDue(e.target.value)} />
          </div>
          <div className="modal-field">
            <label>Ссылка на оплату</label>
            <input type="url" value={invPaymentUrl} onChange={e => setInvPaymentUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Отмена</button>
            <button className="btn btn-primary" onClick={handleCreateInvoice} disabled={saving || !invTitle.trim() || !invAmount}>
              {saving ? 'Сохранение...' : 'Выставить'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!invToDelete}
        title="Удалить счёт?"
        message={`Счёт «${invToDelete?.title || ''}» на ${invToDelete ? formatPrice(invToDelete.amount) : ''} будет удалён.`}
        confirmLabel="Удалить"
        loading={deletingInv}
        onConfirm={handleDeleteInv}
        onCancel={() => setInvToDelete(null)}
      />
    </div>
  );
}
