import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════ */

const PROJECT = {
  title: "Квартира на Патриарших",
  address: "Москва, Б. Патриарший пер. 8, кв. 12",
  designer: "Алиса Флоренс",
  company: "Florence Design Studio",
  progress: 65,
  totalVisits: 12,
  totalPhotos: 48,
  openIssues: 2,
  resolvedIssues: 14,
  budget: { total: 1571000, spent: 892000, delivered: 5, ordered: 3, pending: 2 },
  stages: [
    { label: "Демонтаж", status: "done" },
    { label: "Разметка", status: "done" },
    { label: "Сантехника", status: "done" },
    { label: "Электрика", status: "done" },
    { label: "Перегородки", status: "current" },
    { label: "Черновая отделка", status: "pending" },
    { label: "Чистовая отделка", status: "pending" },
    { label: "Мебель", status: "pending" },
  ],
};

const INVOICES = [
  { id: "inv1", title: "Авторский надзор — март", amount: 45000, dueDate: "2026-03-10", status: "unpaid", stage: "Перегородки", issuedBy: "Алиса Флоренс", issuedAt: "2026-03-01" },
  { id: "inv2", title: "Сантехника Grohe — предоплата 50%", amount: 170000, dueDate: "2026-03-08", status: "unpaid", stage: "Перегородки", issuedBy: "Сантехпром", issuedAt: "2026-03-02" },
  { id: "inv3", title: "Двери Sofia — предоплата", amount: 60000, dueDate: "2026-03-15", status: "unpaid", stage: "Перегородки", issuedBy: "София Двери", issuedAt: "2026-03-04" },
  { id: "inv4", title: "Авторский надзор — февраль", amount: 45000, dueDate: "2026-02-10", status: "paid", stage: "Электрика", issuedBy: "Алиса Флоренс", issuedAt: "2026-02-01", paidAt: "2026-02-09" },
  { id: "inv5", title: "Электрофурнитура Schneider", amount: 45000, dueDate: "2026-02-08", status: "paid", stage: "Электрика", issuedBy: "ЭлектроМир", issuedAt: "2026-02-03", paidAt: "2026-02-07" },
  { id: "inv6", title: "Керамогранит Italon", amount: 185000, dueDate: "2026-02-12", status: "paid", stage: "Сантехника", issuedBy: "Мастер Керамики", issuedAt: "2026-02-05", paidAt: "2026-02-11" },
  { id: "inv7", title: "Ламинат Quick-Step", amount: 92000, dueDate: "2026-02-18", status: "paid", stage: "Сантехника", issuedBy: "Паркет Хаус", issuedAt: "2026-02-10", paidAt: "2026-02-17" },
  { id: "inv8", title: "Светильники Flos IC", amount: 156000, dueDate: "2026-02-22", status: "paid", stage: "Электрика", issuedBy: "Light House", issuedAt: "2026-02-15", paidAt: "2026-02-21" },
  { id: "inv9", title: "Авторский надзор — январь", amount: 45000, dueDate: "2026-01-10", status: "paid", stage: "Разметка", issuedBy: "Алиса Флоренс", issuedAt: "2026-01-01", paidAt: "2026-01-09" },
];

const PAYMENT_SCHEDULE = [
  { stage: "Демонтаж", planned: 95000, paid: 95000, status: "done" },
  { stage: "Разметка", planned: 45000, paid: 45000, status: "done" },
  { stage: "Сантехника", planned: 322000, paid: 322000, status: "done" },
  { stage: "Электрика", planned: 246000, paid: 246000, status: "done" },
  { stage: "Перегородки", planned: 275000, paid: 0, status: "current" },
  { stage: "Черновая отделка", planned: 210000, paid: 0, status: "pending" },
  { stage: "Чистовая отделка", planned: 178000, paid: 0, status: "pending" },
  { stage: "Мебель", planned: 200000, paid: 0, status: "pending" },
];

const VISITS = [
  {
    id: "v1", date: "2026-03-04", title: "Проверка монтажа перегородок",
    note: "Обнаружено отклонение перегородки в спальне на 5 см. Ниша под ТВ требует углубления.",
    createdBy: "Алиса Флоренс", status: "issues_found",
    photos: [
      { id: "p1", comment: "Перегородка в спальне — отклонение от проекта на 5 см вправо", status: "issue", zone: "Спальня", time: "10:15", deadline: "11.03.2026" },
      { id: "p2", comment: "Проём в гостиную — размеры соответствуют проекту", status: "approved", zone: "Гостиная", time: "10:20" },
      { id: "p3", comment: "Ниша под TV — глубина недостаточна, нужно углубить на 3 см", status: "in_progress", zone: "Гостиная", time: "10:25", deadline: "10.03.2026" },
      { id: "p4", comment: "Перегородка в ванной — соответствует проекту", status: "approved", zone: "Ванная", time: "10:30" },
      { id: "p5", comment: "Короб вентиляции на кухне — ОК", status: "approved", zone: "Кухня", time: "10:35" },
      { id: "p6", comment: "Дверной проём в детскую — ОК", status: "approved", zone: "Детская", time: "10:40" },
    ],
  },
  {
    id: "v2", date: "2026-02-28", title: "Приёмка электромонтажа",
    note: "Все точки соответствуют проекту. Розетки на кухне скорректированы на месте.",
    createdBy: "Алиса Флоренс", status: "approved",
    photos: [
      { id: "p7", comment: "Щиток — автоматы установлены корректно", status: "approved", zone: "Прихожая", time: "11:00" },
      { id: "p8", comment: "Разводка в гостиной — все точки по проекту", status: "approved", zone: "Гостиная", time: "11:10" },
      { id: "p9", comment: "Розетки на кухне — высота скорректирована на месте", status: "resolved", zone: "Кухня", time: "11:20" },
      { id: "p10", comment: "Выводы под бра — положение ОК", status: "approved", zone: "Спальня", time: "11:30" },
    ],
  },
  {
    id: "v3", date: "2026-02-20", title: "Проверка разводки сантехники",
    note: "Подводка, канализация, стиральная машина — всё ОК.",
    createdBy: "Алиса Флоренс", status: "approved",
    photos: [
      { id: "p11", comment: "Подводка к раковине — соответствует проекту", status: "approved", zone: "Ванная", time: "14:00" },
      { id: "p12", comment: "Трубы канализации — уклон корректный", status: "approved", zone: "Ванная", time: "14:10" },
      { id: "p13", comment: "Подводка к стиральной машине — ОК", status: "approved", zone: "Ванная", time: "14:20" },
    ],
  },
  {
    id: "v4", date: "2026-02-14", title: "Разметка помещений",
    note: "Разметка стен и санузла выполнена по плану.", createdBy: "Алиса Флоренс", status: "approved",
    photos: [
      { id: "p14", comment: "Разметка стен гостиной — соответствует плану", status: "approved", zone: "Гостиная", time: "10:00" },
      { id: "p15", comment: "Разметка санузла — ОК", status: "approved", zone: "Ванная", time: "10:30" },
    ],
  },
  {
    id: "v5", date: "2026-02-07", title: "Демонтажные работы",
    note: "Демонтаж старых перегородок завершён.", createdBy: "Алиса Флоренс", status: "approved",
    photos: [{ id: "p16", comment: "Демонтаж перегородок — завершён", status: "approved", zone: "Гостиная", time: "12:00" }],
  },
  {
    id: "v6", date: "2026-01-30", title: "Старт работ на объекте",
    note: "Объект принят, ключи получены. Фотофиксация начального состояния.", createdBy: "Алиса Флоренс", status: "approved",
    photos: [
      { id: "p17", comment: "Начальное состояние — гостиная", status: "approved", zone: "Гостиная", time: "09:00" },
      { id: "p18", comment: "Начальное состояние — кухня", status: "approved", zone: "Кухня", time: "09:10" },
    ],
  },
];

const SUPPLY_ITEMS = [
  { id: "s1", name: "Керамогранит Italon 60×60", supplier: "Мастер Керамики", price: 185000, status: "delivered", date: "15.02.2026" },
  { id: "s2", name: "Ламинат Quick-Step Impressive", supplier: "Паркет Хаус", price: 92000, status: "delivered", date: "20.02.2026" },
  { id: "s3", name: "Сантехника Grohe комплект", supplier: "Сантехпром", price: 340000, status: "ordered", date: "15.03.2026" },
  { id: "s4", name: "Кухня IKEA Metod", supplier: "IKEA", price: 280000, status: "in_production", date: "01.04.2026" },
  { id: "s5", name: "Электрофурнитура Schneider", supplier: "ЭлектроМир", price: 45000, status: "delivered", date: "10.02.2026" },
  { id: "s6", name: "Двери Sofia ×4", supplier: "София Двери", price: 120000, status: "ordered", date: "20.03.2026" },
  { id: "s7", name: "Светильники Flos IC", supplier: "Light House", price: 156000, status: "delivered", date: "25.02.2026" },
  { id: "s8", name: "Кондиционер Daikin ×3", supplier: "КлиматПро", price: 210000, status: "ordered", date: "10.03.2026" },
];

const DOCS = [
  { id: "d1", title: "Планировочное решение", version: "v3.2", date: "15.01.2026", format: "PDF" },
  { id: "d2", title: "Развёртки стен", version: "v2.1", date: "20.01.2026", format: "PDF" },
  { id: "d3", title: "3D-визуализация гостиной", version: "v2.0", date: "10.02.2026", format: "PNG" },
  { id: "d4", title: "Спецификация материалов", version: "v4.0", date: "05.02.2026", format: "XLSX" },
  { id: "d5", title: "Договор авторского надзора", version: "v1.0", date: "10.01.2026", format: "PDF" },
];

/* ═══════════════════════════════════════════ */

const unpaidInvoices = INVOICES.filter(i => i.status === "unpaid");
const unpaidCount = unpaidInvoices.length;
const unpaidTotal = unpaidInvoices.reduce((a, i) => a + i.amount, 0);

const STATUS = {
  issue: { bg: "#FEF0EC", text: "#DC4A2A", label: "Замечание" },
  approved: { bg: "#ECFDF3", text: "#16A34A", label: "Принято" },
  resolved: { bg: "#ECFDF3", text: "#16A34A", label: "Исправлено" },
  in_progress: { bg: "#FFF7ED", text: "#D97706", label: "В работе" },
  issues_found: { bg: "#FEF0EC", text: "#DC4A2A", label: "Есть замечания" },
  delivered: { bg: "#ECFDF3", text: "#16A34A", label: "Доставлено" },
  ordered: { bg: "#EFF6FF", text: "#2563EB", label: "Заказано" },
  in_production: { bg: "#FFF7ED", text: "#D97706", label: "В производстве" },
  unpaid: { bg: "#FEF0EC", text: "#DC4A2A", label: "К оплате" },
  paid: { bg: "#ECFDF3", text: "#16A34A", label: "Оплачен" },
  overdue: { bg: "#FEF0EC", text: "#DC4A2A", label: "Просрочен" },
};
const getS = (s) => STATUS[s] || { bg: "#F3F4F6", text: "#6B7280", label: s };
const fmtPrice = (p) => new Intl.NumberFormat("ru-RU").format(p) + " ₽";
const fmt = (d) => d ? new Date(d).toLocaleDateString("ru-RU") : "—";
const isOverdue = (d) => new Date(d) < new Date();

/* ═══════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════ */

const I = {
  Check: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Alert: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Camera: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Clock: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Download: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  ChevD: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Map: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Shield: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Eye: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  File: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Box: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Image: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Layers: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Receipt: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>,
  Calendar: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
};

/* ═══════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--f:'DM Sans',sans-serif;--fm:'JetBrains Mono',monospace}
body{font-family:var(--f);background:#F9FAFB;color:#111827;-webkit-font-smoothing:antialiased}
.fm{font-family:var(--fm)}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
.anim-fade{animation:fadeIn .25s ease}
.anim-up{animation:slideUp .3s ease}
.anim-pulse{animation:pulse 2s infinite}
.login-bg{background:linear-gradient(135deg,#111827 0%,#1F2937 50%,#374151 100%);min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:#fff;border:1px solid #E5E7EB;border-radius:12px;transition:border-color .15s}
.badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:500;padding:2px 10px;border-radius:20px;white-space:nowrap}
input[type=email],input[type=password]{width:100%;padding:10px 14px;border:1px solid #E5E7EB;border-radius:10px;font-size:14px;font-family:var(--f);outline:none;transition:border .15s;background:#fff;color:#111827}
input:focus{border-color:#111827}
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:500;font-family:var(--f);border:none;cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-dark{background:#111827;color:#fff}.btn-dark:hover{background:#1F2937}
.btn-outline{background:#fff;color:#374151;border:1px solid #E5E7EB}.btn-outline:hover{background:#F9FAFB}
.tab-bar{display:flex;gap:0;border-bottom:1px solid #E5E7EB;background:#fff;position:sticky;top:0;z-index:10}
.tab-btn{padding:12px 20px;font-size:13px;font-weight:500;color:#9CA3AF;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;display:flex;align-items:center;gap:6px;white-space:nowrap;font-family:var(--f);background:none;border-top:none;border-left:none;border-right:none;position:relative}
.tab-btn:hover{color:#374151}
.tab-btn.active{color:#111827;border-bottom-color:#111827}
.progress-track{height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden}
.progress-bar-fill{height:100%;border-radius:3px;transition:width .8s ease}
.photo-thumb{width:100%;aspect-ratio:4/3;border-radius:10px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:linear-gradient(145deg,#F3F4F6 0%,#E5E7EB 100%)}
.stage-dot{width:14px;height:14px;border-radius:50%;border:3px solid;position:relative;z-index:1;flex-shrink:0}
.stage-line{height:3px;flex:1;border-radius:2px;min-width:16px}
.accordion-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;cursor:pointer;transition:all .15s;user-select:none}
.accordion-header:hover{border-color:#D1D5DB;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.accordion-header.open{border-radius:12px 12px 0 0;border-bottom-color:#F3F4F6}
.accordion-body{background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:8px 14px 14px;animation:fadeIn .2s ease}
.invoice-card{border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;transition:all .15s;display:flex;align-items:center;gap:14px}
.invoice-card.unpaid{border-color:#FECDC2;background:#FFFBFA}
.invoice-card.paid{background:#fff}
.chart-bar-track{height:32px;background:#F3F4F6;border-radius:6px;overflow:hidden;position:relative;display:flex}
.chart-bar-planned{height:100%;border-radius:6px;position:absolute;top:0;left:0}
.chart-bar-paid{height:100%;border-radius:6px;position:relative;z-index:1}
`;

/* ═══════════════════════════════════════════
   SHARED
   ═══════════════════════════════════════════ */

function Badge({ status }) {
  const s = getS(status);
  return <span className="badge" style={{ background: s.bg, color: s.text }}>{s.label}</span>;
}

function InvoiceBadge({ count }) {
  if (!count) return null;
  return (
    <span className="anim-pulse inline-flex items-center justify-center min-w-[20px] h-[20px] rounded-full bg-[#DC4A2A] text-white text-[11px] font-bold px-1.5 ml-1.5">
      {count}
    </span>
  );
}

/* ═══════════════════════════════════════════
   LOGIN
   ═══════════════════════════════════════════ */

function ClientLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = () => {
    setError("");
    if (email === "client@archflow.app" && pass === "client123") { setLoading(true); setTimeout(onLogin, 700); }
    else setError("Используйте client@archflow.app / client123");
  };
  return (
    <div className="login-bg">
      <div className="anim-up" style={{ width: 400, maxWidth: "92vw" }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center"><I.Layers className="w-5 h-5 text-[#111827]" /></div>
            <span className="text-2xl font-bold text-white tracking-tight">Archflow</span>
          </div>
          <p className="text-sm text-white/40">Портал заказчика</p>
        </div>
        <div className="bg-white rounded-2xl p-8" style={{ boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
          <h2 className="text-lg font-semibold mb-1">Войти как заказчик</h2>
          <p className="text-[13px] text-[#9CA3AF] mb-6">Demo: client@archflow.app / client123</p>
          <div className="mb-4"><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Email</label>
            <input type="email" placeholder="client@archflow.app" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} /></div>
          <div className="mb-4"><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Пароль</label>
            <input type="password" placeholder="client123" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} /></div>
          {error && <div className="text-[13px] text-red-600 mb-4 p-3 bg-red-50 rounded-lg">{error}</div>}
          <button className="btn btn-dark w-full justify-center py-3 text-sm" onClick={submit}>{loading ? "Загрузка..." : "Войти"}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HEADER + HERO
   ═══════════════════════════════════════════ */

function Header({ onLogout }) {
  return (
    <div className="bg-[#111827] text-white">
      <div className="max-w-[1120px] mx-auto px-6 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center"><I.Layers className="w-4 h-4 text-white/70" /></div>
          <span className="text-[15px] font-bold tracking-tight">Archflow</span>
          <div className="w-px h-4 bg-white/15 mx-1" />
          <span className="text-[12px] text-white/40">Портал заказчика</span>
        </div>
        <div className="flex items-center gap-3">
          {unpaidCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#DC4A2A]/20 rounded-full text-[12px] text-[#FCA5A5]">
              <I.Receipt className="w-3.5 h-3.5" />
              {unpaidCount} {unpaidCount === 1 ? "счёт" : "счёта"} к оплате
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[.07] rounded-full">
            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-[10px] font-semibold">АК</div>
            <span className="text-[12px]">Анна Козлова</span>
          </div>
          <button className="text-[12px] text-white/40 hover:text-white/70 transition-colors cursor-pointer bg-transparent border-none" onClick={onLogout}>Выйти</button>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="bg-gradient-to-br from-[#111827] via-[#1F2937] to-[#374151] text-white pb-8 pt-6">
      <div className="max-w-[1120px] mx-auto px-6">
        <h1 className="text-[24px] font-bold mb-1.5">{PROJECT.title}</h1>
        <div className="flex items-center gap-1.5 text-[13px] text-white/45 mb-1"><I.Map className="w-3.5 h-3.5" /> {PROJECT.address}</div>
        <div className="text-[13px] text-white/35 mb-6">Дизайнер: {PROJECT.designer} · {PROJECT.company}</div>
        <div className="flex gap-2 flex-wrap mb-6">
          {[
            { v: PROJECT.totalVisits, l: "визитов" },
            { v: PROJECT.totalPhotos, l: "фотофиксаций" },
            { v: PROJECT.resolvedIssues, l: "исправлено", color: "#4ADE80" },
            { v: PROJECT.openIssues, l: "открыто", color: "#FB923C" },
            { v: unpaidCount, l: "счетов к оплате", color: "#F87171" },
          ].map((s, i) => (
            <div key={i} className="px-4 py-2.5 bg-white/[.08] rounded-xl backdrop-blur">
              <div className="text-[20px] font-bold fm" style={s.color ? { color: s.color } : {}}>{s.v}</div>
              <div className="text-[11px] text-white/40">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="progress-track flex-1 max-w-[320px]"><div className="progress-bar-fill bg-emerald-400" style={{ width: `${PROJECT.progress}%` }} /></div>
          <span className="text-[14px] font-semibold fm text-emerald-400">{PROJECT.progress}%</span>
          <span className="text-[12px] text-white/35">общий прогресс</span>
        </div>
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {PROJECT.stages.map((st, i) => (
            <div key={i} className="flex items-center" style={{ flex: i < PROJECT.stages.length - 1 ? 1 : "none" }}>
              <div className="flex flex-col items-center" style={{ minWidth: 50 }}>
                <div className="stage-dot" style={{
                  background: st.status === "done" ? "#4ADE80" : st.status === "current" ? "#111827" : "transparent",
                  borderColor: st.status === "done" ? "#4ADE80" : st.status === "current" ? "#FBBF24" : "rgba(255,255,255,.2)",
                  boxShadow: st.status === "current" ? "0 0 0 4px rgba(251,191,36,.2)" : "none",
                }} />
                <span className="text-[10px] mt-1.5 text-center leading-tight" style={{ color: st.status === "pending" ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.6)" }}>{st.label}</span>
              </div>
              {i < PROJECT.stages.length - 1 && <div className="stage-line mt-[-16px]" style={{ background: st.status === "done" ? "#4ADE80" : "rgba(255,255,255,.1)" }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════ */

function OverviewTab() {
  const issues = [];
  VISITS.forEach(v => v.photos.forEach(p => {
    if (p.status === "issue" || p.status === "in_progress") issues.push({ ...p, visitDate: v.date });
  }));

  return (
    <div className="anim-fade">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl mb-5 text-[13px] text-[#2563EB]">
        <I.Eye className="w-4 h-4 flex-shrink-0" /> Вы просматриваете проект в режиме заказчика.
      </div>

      {/* Unpaid invoices alert */}
      {unpaidCount > 0 && (
        <div className="border border-[#FECDC2] bg-[#FFFBFA] rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#DC4A2A] mb-3">
            <I.Receipt className="w-4 h-4" /> Счета к оплате — {unpaidCount} на сумму {fmtPrice(unpaidTotal)}
          </div>
          {unpaidInvoices.map(inv => (
            <div key={inv.id} className="flex justify-between items-center py-2.5 border-b border-[#FEE2E2] last:border-none">
              <div>
                <div className="text-[13px] font-medium">{inv.title}</div>
                <div className="text-[11px] text-[#9CA3AF]">{inv.issuedBy} · выставлен {fmt(inv.issuedAt)}</div>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-bold fm">{fmtPrice(inv.amount)}</div>
                <div className="text-[11px] fm flex items-center gap-1 justify-end" style={{ color: isOverdue(inv.dueDate) ? "#DC4A2A" : "#D97706" }}>
                  <I.Clock className="w-3 h-3" /> до {fmt(inv.dueDate)} {isOverdue(inv.dueDate) && "· просрочен!"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {issues.length > 0 && (
        <div className="border border-[#FECDC2] bg-[#FEF0EC] rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#DC4A2A] mb-3"><I.Alert className="w-4 h-4" /> Открытые замечания — {issues.length}</div>
          {issues.map(iss => (
            <div key={iss.id} className="flex justify-between items-center py-2.5 bg-white rounded-lg px-3 mb-1.5 last:mb-0">
              <div><div className="text-[13px] font-medium">{iss.comment}</div><div className="text-[11px] text-[#9CA3AF]">{iss.zone}</div></div>
              <div className="text-right flex-shrink-0 ml-3"><Badge status={iss.status} />
                {iss.deadline && <div className="text-[10px] text-[#DC4A2A] fm mt-1 flex items-center gap-1 justify-end"><I.Clock className="w-3 h-3" />{iss.deadline}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center gap-2 text-[14px] font-semibold mb-4"><I.Shield className="w-4 h-4 text-[#9CA3AF]" /> Сводка по проекту</div>
        {[
          { l: "Визитов на объект", v: PROJECT.totalVisits },
          { l: "Фотофиксаций", v: PROJECT.totalPhotos },
          { l: "Замечаний выявлено", v: PROJECT.openIssues + PROJECT.resolvedIssues },
          { l: "Исправлено", v: PROJECT.resolvedIssues, color: "#16A34A" },
          { l: "Открыто", v: PROJECT.openIssues, color: "#DC4A2A" },
        ].map((r, i) => (
          <div key={i} className="flex justify-between py-2.5 border-b border-[#F3F4F6] last:border-none text-[13px]">
            <span className="text-[#9CA3AF]">{r.l}</span><span className="font-semibold fm" style={r.color ? { color: r.color } : {}}>{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   JOURNAL TAB (with invoices)
   ═══════════════════════════════════════════ */

function JournalTab() {
  const [openId, setOpenId] = useState(VISITS[0].id);
  const [filter, setFilter] = useState("all");
  const [showInvoices, setShowInvoices] = useState(true);

  return (
    <div className="anim-fade">
      {/* Invoices block */}
      {unpaidCount > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 cursor-pointer" onClick={() => setShowInvoices(!showInvoices)}>
            <I.Receipt className="w-4 h-4 text-[#DC4A2A]" />
            <h3 className="text-[15px] font-semibold">Счета к оплате</h3>
            <span className="anim-pulse inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-[#DC4A2A] text-white text-[12px] font-bold px-1.5">{unpaidCount}</span>
            <span className="text-[13px] text-[#9CA3AF] ml-1">на {fmtPrice(unpaidTotal)}</span>
            <I.ChevD className={`w-4 h-4 text-[#9CA3AF] ml-auto transition-transform ${showInvoices ? "rotate-180" : ""}`} />
          </div>
          {showInvoices && (
            <div className="space-y-2 anim-fade">
              {unpaidInvoices.map(inv => (
                <div key={inv.id} className="invoice-card unpaid">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF0EC] flex items-center justify-center flex-shrink-0">
                    <I.Receipt className="w-5 h-5 text-[#DC4A2A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">{inv.title}</div>
                    <div className="text-[11px] text-[#9CA3AF]">{inv.issuedBy} · этап: {inv.stage}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[15px] font-bold fm">{fmtPrice(inv.amount)}</div>
                    <div className="text-[11px] fm flex items-center gap-1 justify-end" style={{ color: isOverdue(inv.dueDate) ? "#DC4A2A" : "#D97706" }}>
                      <I.Clock className="w-3 h-3" /> {fmt(inv.dueDate)}
                      {isOverdue(inv.dueDate) && <span className="text-[#DC4A2A] font-semibold">просрочен</span>}
                    </div>
                  </div>
                  <button className="btn btn-dark text-[12px] py-2 px-4 flex-shrink-0">Оплатить</button>
                </div>
              ))}

              {/* Paid invoices collapsed */}
              <details className="mt-2">
                <summary className="text-[12px] text-[#9CA3AF] cursor-pointer hover:text-[#6B7280] transition-colors py-1">
                  Оплаченные счета ({INVOICES.filter(i => i.status === "paid").length})
                </summary>
                <div className="space-y-2 mt-2">
                  {INVOICES.filter(i => i.status === "paid").map(inv => (
                    <div key={inv.id} className="invoice-card paid">
                      <div className="w-10 h-10 rounded-xl bg-[#ECFDF3] flex items-center justify-center flex-shrink-0">
                        <I.Check className="w-5 h-5 text-[#16A34A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#6B7280]">{inv.title}</div>
                        <div className="text-[11px] text-[#9CA3AF]">{inv.issuedBy} · {inv.stage}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[14px] font-medium fm text-[#6B7280]">{fmtPrice(inv.amount)}</div>
                        <div className="text-[11px] text-[#16A34A] fm">оплачен {fmt(inv.paidAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Visits */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[15px] font-semibold">Визиты на объект</h3>
        <div className="flex gap-1 bg-[#F3F4F6] rounded-lg p-0.5">
          {[{ id: "all", l: "Все" }, { id: "issues", l: "С замечаниями" }, { id: "ok", l: "Принято" }].map(t => (
            <button key={t.id} className={`px-3 py-1.5 text-[12px] font-medium rounded-md border-none cursor-pointer transition-all ${filter === t.id ? "bg-white text-[#111827] shadow-sm" : "bg-transparent text-[#9CA3AF]"}`} style={{ fontFamily: "var(--f)" }} onClick={() => setFilter(t.id)}>{t.l}</button>
          ))}
        </div>
      </div>

      {VISITS.filter(v => {
        if (filter === "issues") return v.photos.some(p => p.status === "issue" || p.status === "in_progress");
        if (filter === "ok") return v.photos.every(p => p.status === "approved" || p.status === "resolved");
        return true;
      }).map(v => {
        const open = openId === v.id;
        const issueCount = v.photos.filter(p => p.status === "issue" || p.status === "in_progress").length;
        const approvedCount = v.photos.filter(p => p.status === "approved" || p.status === "resolved").length;
        return (
          <div key={v.id} className="mb-3">
            <div className={`accordion-header ${open ? "open" : ""}`} onClick={() => setOpenId(open ? null : v.id)}>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold fm min-w-[85px]">{fmt(v.date)}</span>
                <span className="text-[13px] text-[#6B7280]">{v.title}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="badge bg-[#ECFDF3] text-[#16A34A]"><I.Check className="w-3 h-3" />{approvedCount}</span>
                {issueCount > 0 && <span className="badge bg-[#FEF0EC] text-[#DC4A2A]"><I.Alert className="w-3 h-3" />{issueCount}</span>}
                <span className="text-[11px] text-[#9CA3AF]">{v.photos.length} фото</span>
                <I.ChevD className={`w-4 h-4 text-[#9CA3AF] transition-transform ${open ? "rotate-180" : ""}`} />
              </div>
            </div>
            {open && (
              <div className="accordion-body">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 pt-2">
                  {v.photos.map(ph => {
                    const s = getS(ph.status);
                    return (
                      <div key={ph.id} className="card overflow-hidden">
                        <div className="photo-thumb">
                          <I.Image className="w-9 h-9 text-[#D1D5DB]" />
                          <div className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/85 text-[#6B7280] backdrop-blur-sm">{ph.zone}</div>
                          <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full" style={{ background: s.text, border: "2px solid rgba(255,255,255,.7)" }} />
                        </div>
                        <div className="p-3">
                          <p className="text-[12px] leading-relaxed mb-2">{ph.comment}</p>
                          <div className="flex justify-between items-center">
                            <Badge status={ph.status} />
                            {ph.deadline && <span className="text-[10px] text-[#DC4A2A] fm flex items-center gap-1"><I.Clock className="w-3 h-3" />{ph.deadline}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUPPLY TAB (with payment schedule chart)
   ═══════════════════════════════════════════ */

function SupplyTab() {
  const total = SUPPLY_ITEMS.reduce((a, s) => a + s.price, 0);
  const delivered = SUPPLY_ITEMS.filter(s => s.status === "delivered").length;
  const maxPlanned = Math.max(...PAYMENT_SCHEDULE.map(p => p.planned));
  const totalPlanned = PAYMENT_SCHEDULE.reduce((a, p) => a + p.planned, 0);
  const totalPaid = PAYMENT_SCHEDULE.reduce((a, p) => a + p.paid, 0);

  return (
    <div className="anim-fade">
      {/* Payment Schedule Chart */}
      <div className="card p-5 mb-6">
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="flex items-center gap-2 text-[14px] font-semibold mb-1"><I.Calendar className="w-4 h-4 text-[#9CA3AF]" /> График платежей по этапам</div>
            <p className="text-[12px] text-[#9CA3AF]">План: {fmtPrice(totalPlanned)} · Оплачено: {fmtPrice(totalPaid)} · Остаток: {fmtPrice(totalPlanned - totalPaid)}</p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#111827]" /> План</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#4ADE80]" /> Оплачено</div>
          </div>
        </div>

        <div className="space-y-3">
          {PAYMENT_SCHEDULE.map((ps, i) => {
            const plannedWidth = (ps.planned / maxPlanned) * 100;
            const paidWidth = ps.paid > 0 ? (ps.paid / maxPlanned) * 100 : 0;
            const isCurrent = ps.status === "current";
            const isDone = ps.status === "done";

            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-[120px] flex-shrink-0 text-right">
                  <div className="text-[12px] font-medium" style={{ color: isCurrent ? "#111827" : isDone ? "#6B7280" : "#D1D5DB" }}>
                    {ps.stage}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="chart-bar-track">
                    <div className="chart-bar-planned" style={{ width: `${plannedWidth}%`, background: isDone ? "#E5E7EB" : isCurrent ? "#111827" : "#F3F4F6", opacity: isDone ? 0.5 : isCurrent ? 0.15 : 0.5 }} />
                    {paidWidth > 0 && (
                      <div className="chart-bar-paid" style={{ width: `${paidWidth}%`, background: "#4ADE80" }} />
                    )}
                    {isCurrent && paidWidth === 0 && (
                      <div className="h-full flex items-center pl-3">
                        <span className="text-[10px] font-medium text-[#9CA3AF]">ожидает оплаты</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-[100px] flex-shrink-0 text-right">
                  {isDone ? (
                    <span className="text-[12px] fm text-[#16A34A] font-medium">{fmtPrice(ps.paid)}</span>
                  ) : isCurrent ? (
                    <span className="text-[12px] fm font-medium">{fmtPrice(ps.planned)}</span>
                  ) : (
                    <span className="text-[12px] fm text-[#D1D5DB]">{fmtPrice(ps.planned)}</span>
                  )}
                </div>
                <div className="w-[20px] flex-shrink-0">
                  {isDone && <I.Check className="w-4 h-4 text-[#16A34A]" />}
                  {isCurrent && <div className="w-2.5 h-2.5 rounded-full bg-[#FBBF24] anim-pulse" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals bar */}
        <div className="mt-5 pt-4 border-t border-[#F3F4F6]">
          <div className="flex items-center gap-3">
            <div className="w-[120px] flex-shrink-0 text-right text-[12px] font-semibold">Итого</div>
            <div className="flex-1">
              <div className="progress-track h-2">
                <div className="progress-bar-fill bg-[#4ADE80] h-full" style={{ width: `${(totalPaid / totalPlanned) * 100}%` }} />
              </div>
            </div>
            <div className="w-[100px] flex-shrink-0 text-right text-[13px] font-bold fm">{fmtPrice(totalPaid)}</div>
            <div className="w-[20px]" />
          </div>
          <div className="text-right text-[11px] text-[#9CA3AF] mt-1 mr-[24px]">из {fmtPrice(totalPlanned)}</div>
        </div>
      </div>

      {/* Supply items list */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-[15px] font-semibold">Позиции комплектации</h3>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">Итого: {fmtPrice(total)} · Доставлено {delivered}/{SUPPLY_ITEMS.length}</p>
        </div>
      </div>
      <div className="card p-5">
        {SUPPLY_ITEMS.map(s => (
          <div key={s.id} className="flex items-center py-3 border-b border-[#F3F4F6] last:border-none gap-3 text-[13px]">
            <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0"><I.Box className="w-4 h-4 text-[#9CA3AF]" /></div>
            <div className="flex-1 min-w-0"><div className="font-medium truncate">{s.name}</div><div className="text-[11px] text-[#9CA3AF]">{s.supplier}</div></div>
            <div className="font-medium fm text-right min-w-[90px]">{fmtPrice(s.price)}</div>
            <div className="text-[11px] text-[#9CA3AF] fm min-w-[80px] text-right">{s.date}</div>
            <div className="min-w-[100px] text-right"><Badge status={s.status} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DOCS TAB
   ═══════════════════════════════════════════ */

function DocsTab() {
  const fc = { PDF: { bg: "#FEE2E2", t: "#DC2626" }, DWG: { bg: "#DBEAFE", t: "#2563EB" }, XLSX: { bg: "#D1FAE5", t: "#059669" }, PNG: { bg: "#FEF3C7", t: "#D97706" } };
  return (
    <div className="anim-fade">
      <h3 className="text-[15px] font-semibold mb-4">Проектная документация</h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
        {DOCS.map(d => {
          const c = fc[d.format] || { bg: "#F3F4F6", t: "#6B7280" };
          return (
            <div key={d.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-[#F3F4F6] hover:border-[#E5E7EB] hover:bg-[#F9FAFB] transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold" style={{ background: c.bg, color: c.t }}>{d.format}</div>
              <div className="flex-1 min-w-0"><div className="text-[13px] font-medium">{d.title}</div><div className="text-[11px] text-[#9CA3AF] mt-0.5">{d.version} · {d.date}</div></div>
              <button className="rounded-lg px-2.5 py-1.5 text-[11px] flex items-center gap-1 flex-shrink-0 bg-transparent border border-[#E5E7EB] cursor-pointer font-medium text-[#374151] hover:bg-[#F9FAFB] transition-all" style={{ fontFamily: "var(--f)" }}><I.Download className="w-3 h-3" /> Скачать</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   APP
   ═══════════════════════════════════════════ */

export default function ClientPortal() {
  const [auth, setAuth] = useState(false);
  const [tab, setTab] = useState("overview");

  if (!auth) return <><style>{CSS}</style><ClientLogin onLogin={() => setAuth(true)} /></>;

  const tabs = [
    { id: "overview", label: "Обзор", icon: I.Shield, badge: null },
    { id: "journal", label: "Journal", icon: I.Camera, badge: unpaidCount > 0 ? unpaidCount : null },
    { id: "supply", label: "Supply", icon: I.Box, badge: null },
    { id: "docs", label: "Документы", icon: I.File, badge: null },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen bg-[#F9FAFB]">
        <Header onLogout={() => setAuth(false)} />
        <Hero />
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="tab-bar -mt-px rounded-t-xl overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
                {t.badge && (
                  <span className="anim-pulse inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#DC4A2A] text-white text-[10px] font-bold px-1 -mr-1">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="py-6">
            {tab === "overview" && <OverviewTab />}
            {tab === "journal" && <JournalTab />}
            {tab === "supply" && <SupplyTab />}
            {tab === "docs" && <DocsTab />}
          </div>
        </div>
      </div>
    </>
  );
}
