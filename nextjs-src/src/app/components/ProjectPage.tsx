"use client";

import { useState } from "react";
import { Icons } from "./Icons";
import Loading, { ErrorMessage } from "./Loading";
import { useProject, useProjectVisits, useProjectInvoices } from "../lib/hooks";
import { formatDate, formatPrice, formatShortDate, createVisit, inviteProjectMember, createInvoice } from "../lib/queries";
import type { UserRole, Invoice, InvoiceStatus } from "../lib/types";
import SupplyModule from "./supply/SupplyModule";

interface ProjectPageProps {
  projectId: string;
  onNavigate: (page: string, ctx?: any) => void;
}

type ProjectTab = "visits" | "supply" | "invoices";

const INVOICE_STATUS_STYLE: Record<InvoiceStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "Ожидает", bg: "#FFF7ED", text: "#D97706" },
  paid: { label: "Оплачен", bg: "#ECFDF3", text: "#16A34A" },
  overdue: { label: "Просрочен", bg: "#FEE2E2", text: "#DC2626" },
};

export default function ProjectPage({ projectId, onNavigate }: ProjectPageProps) {
  const { data: project, loading: loadingProject, error: errorProject, refetch: refetchProject } = useProject(projectId);
  const { data: visits, loading: loadingVisits, refetch: refetchVisits } = useProjectVisits(projectId);
  const { data: invoices, loading: loadingInvoices, refetch: refetchInvoices } = useProjectInvoices(projectId);

  // Active tab
  const [activeTab, setActiveTab] = useState<ProjectTab>("visits");

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("client");
  const [savingInvite, setSavingInvite] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Create visit modal state
  const [showCreateVisit, setShowCreateVisit] = useState(false);
  const [visitTitle, setVisitTitle] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [visitNote, setVisitNote] = useState("");
  const [savingVisit, setSavingVisit] = useState(false);
  const [visitError, setVisitError] = useState("");

  // Create invoice modal state
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invoiceTitle, setInvoiceTitle] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceSuccess, setInvoiceSuccess] = useState("");

  if (loadingProject || loadingVisits) return <Loading />;
  if (errorProject) return <ErrorMessage message={errorProject} />;
  if (!project) return <ErrorMessage message="Проект не найден" />;

  const projectVisits = visits || [];
  const projectInvoices = invoices || [];

  // --- Handlers ---

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitTitle.trim()) { setVisitError("Введите название визита"); return; }
    if (!visitDate) { setVisitError("Выберите дату"); return; }
    setSavingVisit(true);
    setVisitError("");
    try {
      await createVisit({
        project_id: projectId,
        title: visitTitle.trim(),
        date: visitDate,
        note: visitNote.trim() || undefined,
      });
      refetchVisits();
      refetchProject();
      setShowCreateVisit(false);
      setVisitTitle(""); setVisitDate(""); setVisitNote("");
    } catch (err: any) {
      setVisitError(err.message || "Ошибка создания визита");
    } finally {
      setSavingVisit(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) { setInviteError("Введите email"); return; }
    setSavingInvite(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      await inviteProjectMember({
        project_id: projectId,
        email: inviteEmail.trim(),
        role: inviteRole,
        access_level: inviteRole === "client" ? "view" : "view_comment",
      });
      setInviteSuccess("Участник добавлен!");
      setInviteEmail("");
      setTimeout(() => { setShowInvite(false); setInviteSuccess(""); }, 1500);
    } catch (err: any) {
      setInviteError(err.message || "Ошибка приглашения");
    } finally {
      setSavingInvite(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceTitle.trim()) { setInvoiceError("Введите название счёта"); return; }
    if (!invoiceAmount || Number(invoiceAmount) <= 0) { setInvoiceError("Введите сумму"); return; }
    setSavingInvoice(true);
    setInvoiceError("");
    setInvoiceSuccess("");
    try {
      await createInvoice({
        project_id: projectId,
        title: invoiceTitle.trim(),
        amount: Number(invoiceAmount),
        due_date: invoiceDueDate || undefined,
      });
      setInvoiceSuccess("Счёт создан!");
      setInvoiceTitle(""); setInvoiceAmount(""); setInvoiceDueDate("");
      refetchInvoices();
      setTimeout(() => { setShowCreateInvoice(false); setInvoiceSuccess(""); }, 1500);
    } catch (err: any) {
      setInvoiceError(err.message || "Ошибка создания счёта");
    } finally {
      setSavingInvoice(false);
    }
  };

  // --- Invoice totals ---
  const invoiceTotal = projectInvoices.reduce((s, i) => s + i.amount, 0);
  const invoicePaid = projectInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="animate-fade-in">
      {/* Header card */}
      <div className="bg-white border border-[#E8E6E1] rounded-xl p-6 mb-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold mb-1.5">{project.title}</h2>
            <div className="flex items-center gap-1.5 text-[13px] text-[#9B9B9B]">
              <Icons.Map /> {project.address || '—'}
            </div>
            <div className="flex items-center gap-1.5 text-[13px] text-[#6B6B6B] mt-1.5">
              <Icons.Users /> Заказчик: {project.owner?.full_name || '—'}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setShowInvite(true)}>
              <Icons.Send /> Пригласить
            </button>
          </div>
        </div>

        <div className="flex gap-6 mt-5 pt-4 border-t border-[#F0EEE9] items-center">
          <div>
            <div className="text-lg font-semibold font-mono-custom">{project.visit_count}</div>
            <div className="text-[11px] text-[#9B9B9B]">визитов</div>
          </div>
          <div>
            <div className="text-lg font-semibold font-mono-custom">{project.photo_count}</div>
            <div className="text-[11px] text-[#9B9B9B]">фото</div>
          </div>
          <div>
            <div className="text-lg font-semibold font-mono-custom text-[#E85D3A]">{project.open_issues}</div>
            <div className="text-[11px] text-[#9B9B9B]">замечаний</div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#9B9B9B]">Прогресс</span>
            <div className="h-1 bg-[#F0EEE9] rounded-sm overflow-hidden flex-1 max-w-[120px]">
              <div
                className="h-full bg-[#2C5F2D] rounded-sm transition-all duration-700"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <span className="text-[13px] font-semibold font-mono-custom">{project.progress}%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeTab === "visits" ? "active" : ""}`}
            onClick={() => setActiveTab("visits")}
          >
            <span className="flex items-center gap-1.5">
              <Icons.Camera className="w-3.5 h-3.5" /> Визиты
            </span>
          </button>
          <button
            className={`filter-tab ${activeTab === "supply" ? "active" : ""}`}
            onClick={() => setActiveTab("supply")}
          >
            <span className="flex items-center gap-1.5">
              <Icons.Box className="w-3.5 h-3.5" /> Комплектация
            </span>
          </button>
          <button
            className={`filter-tab ${activeTab === "invoices" ? "active" : ""}`}
            onClick={() => setActiveTab("invoices")}
          >
            <span className="flex items-center gap-1.5">
              <Icons.Receipt className="w-3.5 h-3.5" /> Счета
            </span>
          </button>
        </div>

        {/* Context action for active tab */}
        {activeTab === "visits" && (
          <button className="btn btn-primary" onClick={() => setShowCreateVisit(true)}>
            <Icons.Plus /> Новый визит
          </button>
        )}
        {activeTab === "invoices" && (
          <button className="btn btn-primary" onClick={() => setShowCreateInvoice(true)}>
            <Icons.Plus /> Новый счёт
          </button>
        )}
      </div>

      {/* Tab content */}
      {activeTab === "visits" && (
        <div className="relative">
          <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-[#F0EEE9]" />
          {projectVisits.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-[#9B9B9B]">Нет визитов</div>
          ) : (
            projectVisits.map((visit) => (
              <div
                key={visit.id}
                className="relative ml-12 mb-4 bg-white border border-[#E8E6E1] rounded-xl px-5 py-[18px] cursor-pointer transition-all duration-200 hover:border-[#D5D3CE] hover:shadow-sm"
                onClick={() => onNavigate("visit", { projectId: project.id, visitId: visit.id })}
              >
                <div className="absolute -left-9 top-5 w-2.5 h-2.5 rounded-full bg-[#2C5F2D] border-2 border-[#F7F6F3] shadow-[0_0_0_2px_#E8F0E8]" />
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] font-semibold font-mono-custom">{formatDate(visit.date)}</span>
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1 text-xs text-[#6B6B6B]">
                      <Icons.Camera className="w-4 h-4" /> {visit.photo_count} фото
                    </span>
                    {visit.issue_count > 0 && (
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: visit.issue_count > visit.resolved_count ? "#E85D3A" : "#2A9D5C" }}
                      >
                        <Icons.Alert /> {visit.resolved_count}/{visit.issue_count} исправлено
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-[#6B6B6B] leading-relaxed">{visit.title}</div>
                {visit.note && (
                  <div className="text-[13px] text-[#9B9B9B] mt-1">{visit.note}</div>
                )}
                <div className="flex gap-1.5 mt-2.5">
                  {visit.issue_count > 0 && visit.issue_count > visit.resolved_count && (
                    <span className="badge bg-[#FEF0EC] text-[#E85D3A]">
                      {visit.issue_count - visit.resolved_count} открытых замечаний
                    </span>
                  )}
                  {visit.issue_count > 0 && visit.resolved_count >= visit.issue_count && (
                    <span className="badge bg-[#EAFAF1] text-[#2A9D5C]">
                      <Icons.Check /> Все исправлено
                    </span>
                  )}
                  {visit.status === 'planned' && (
                    <span className="badge bg-[#F3F4F6] text-[#6B7280]">
                      Запланирован
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "supply" && (
        <SupplyModule projectId={projectId} />
      )}

      {activeTab === "invoices" && (
        <div>
          {/* Invoice summary */}
          {projectInvoices.length > 0 && (
            <div className="flex gap-4 mb-4">
              <div className="bg-white border border-[#E8E6E1] rounded-xl px-4 py-3 flex-1">
                <div className="text-[11px] text-[#9B9B9B] mb-1">Всего выставлено</div>
                <div className="text-lg font-semibold font-mono-custom">{formatPrice(invoiceTotal)}</div>
              </div>
              <div className="bg-white border border-[#E8E6E1] rounded-xl px-4 py-3 flex-1">
                <div className="text-[11px] text-[#9B9B9B] mb-1">Оплачено</div>
                <div className="text-lg font-semibold font-mono-custom text-[#16A34A]">{formatPrice(invoicePaid)}</div>
              </div>
              <div className="bg-white border border-[#E8E6E1] rounded-xl px-4 py-3 flex-1">
                <div className="text-[11px] text-[#9B9B9B] mb-1">К оплате</div>
                <div className="text-lg font-semibold font-mono-custom text-[#D97706]">{formatPrice(invoiceTotal - invoicePaid)}</div>
              </div>
            </div>
          )}

          {/* Invoice list */}
          {loadingInvoices ? (
            <Loading />
          ) : projectInvoices.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-[#9B9B9B]">Нет счетов</div>
          ) : (
            <div className="bg-white border border-[#E8E6E1] rounded-xl overflow-hidden">
              {projectInvoices.map((inv: Invoice, i: number) => {
                const statusStyle = INVOICE_STATUS_STYLE[inv.status];
                return (
                  <div
                    key={inv.id}
                    className={`flex items-center gap-4 px-5 py-4 ${
                      i < projectInvoices.length - 1 ? "border-b border-[#F0EEE9]" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium truncate">{inv.title}</div>
                      <div className="text-[12px] text-[#9B9B9B] mt-0.5">
                        {inv.due_date ? `До ${formatShortDate(inv.due_date)}` : "Без срока"}
                        {inv.paid_at && ` · Оплачен ${formatShortDate(inv.paid_at)}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-semibold font-mono-custom">{formatPrice(inv.amount)}</div>
                    </div>
                    <span
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                      style={{ background: statusStyle.bg, color: statusStyle.text }}
                    >
                      {statusStyle.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== Create Visit Modal ===== */}
      {showCreateVisit && (
        <div className="modal-overlay" onClick={() => setShowCreateVisit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-5">Новый визит</h2>
            {visitError && (
              <div className="bg-[#FEF0EC] border border-[#E85D3A]/20 text-[#E85D3A] text-[13px] px-4 py-2.5 rounded-lg mb-4">
                {visitError}
              </div>
            )}
            <form onSubmit={handleCreateVisit}>
              <div className="modal-field mb-4">
                <label>Название визита *</label>
                <input
                  type="text"
                  value={visitTitle}
                  onChange={(e) => setVisitTitle(e.target.value)}
                  placeholder="Проверка штукатурки..."
                  autoFocus
                />
              </div>
              <div className="modal-field mb-4">
                <label>Дата *</label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                />
              </div>
              <div className="modal-field mb-4">
                <label>Заметка</label>
                <textarea
                  value={visitNote}
                  onChange={(e) => setVisitNote(e.target.value)}
                  placeholder="Дополнительная информация..."
                  className="resize-y min-h-[60px]"
                />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateVisit(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingVisit}>
                  {savingVisit ? "Создание..." : "Запланировать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Invite Modal ===== */}
      {showInvite && (
        <div className="modal-overlay" onClick={() => { setShowInvite(false); setInviteError(""); setInviteSuccess(""); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-5">Пригласить участника</h2>
            {inviteError && (
              <div className="bg-[#FEF0EC] border border-[#E85D3A]/20 text-[#E85D3A] text-[13px] px-4 py-2.5 rounded-lg mb-4">
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="bg-[#EAFAF1] border border-[#2A9D5C]/20 text-[#2A9D5C] text-[13px] px-4 py-2.5 rounded-lg mb-4">
                {inviteSuccess}
              </div>
            )}
            <form onSubmit={handleInvite}>
              <div className="modal-field mb-4">
                <label>Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="client@email.com"
                  autoFocus
                />
              </div>
              <div className="modal-field mb-4">
                <label>Роль</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)}>
                  <option value="client">Заказчик (только просмотр)</option>
                  <option value="contractor">Подрядчик</option>
                  <option value="supplier">Комплектатор</option>
                  <option value="assistant">Ассистент</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowInvite(false); setInviteError(""); setInviteSuccess(""); }}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingInvite}>
                  <Icons.Send /> {savingInvite ? "Отправка..." : "Отправить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Create Invoice Modal ===== */}
      {showCreateInvoice && (
        <div className="modal-overlay" onClick={() => { setShowCreateInvoice(false); setInvoiceError(""); setInvoiceSuccess(""); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-5">Новый счёт</h2>
            {invoiceError && (
              <div className="bg-[#FEF0EC] border border-[#E85D3A]/20 text-[#E85D3A] text-[13px] px-4 py-2.5 rounded-lg mb-4">
                {invoiceError}
              </div>
            )}
            {invoiceSuccess && (
              <div className="bg-[#EAFAF1] border border-[#2A9D5C]/20 text-[#2A9D5C] text-[13px] px-4 py-2.5 rounded-lg mb-4">
                {invoiceSuccess}
              </div>
            )}
            <form onSubmit={handleCreateInvoice}>
              <div className="modal-field mb-4">
                <label>Название *</label>
                <input
                  type="text"
                  value={invoiceTitle}
                  onChange={(e) => setInvoiceTitle(e.target.value)}
                  placeholder="Авторский надзор — март 2026"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="modal-field">
                  <label>Сумма *</label>
                  <input
                    type="number"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    placeholder="45000"
                    min="0"
                    step="100"
                  />
                </div>
                <div className="modal-field">
                  <label>Дата оплаты</label>
                  <input
                    type="date"
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateInvoice(false); setInvoiceError(""); setInvoiceSuccess(""); }}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingInvoice}>
                  {savingInvoice ? "Создание..." : "Выставить счёт"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
