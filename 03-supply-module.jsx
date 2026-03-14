import { useState, useMemo, useCallback, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════ */

const TODAY = new Date("2026-03-23");
const todayStr = "2026-03-23";

const STAGES_BLOCK = [
  { id: "s1", name: "Демонтаж", startDate: "2026-03-01", endDate: "2026-03-10", order: 1 },
  { id: "s2", name: "Возведение перегородок (блок)", startDate: "2026-03-11", endDate: "2026-03-25", order: 2 },
  { id: "s3", name: "Стяжка", startDate: "2026-03-26", endDate: "2026-04-05", order: 3 },
  { id: "s4", name: "Инженерия", startDate: "2026-04-06", endDate: "2026-04-20", order: 4 },
  { id: "s5", name: "Черновая отделка", startDate: "2026-04-21", endDate: "2026-05-10", order: 5 },
  { id: "s6", name: "Чистовая отделка", startDate: "2026-05-11", endDate: "2026-06-01", order: 6 },
  { id: "s7", name: "Монтаж дверей", startDate: "2026-06-02", endDate: "2026-06-10", order: 7 },
  { id: "s8", name: "Монтаж света", startDate: "2026-06-11", endDate: "2026-06-20", order: 8 },
  { id: "s9", name: "Установка сантехники", startDate: "2026-06-21", endDate: "2026-06-30", order: 9 },
  { id: "s10", name: "Финальная комплектация", startDate: "2026-07-01", endDate: "2026-07-15", order: 10 },
];

const STAGES_GKL = [
  { id: "s1", name: "Демонтаж", startDate: "2026-03-01", endDate: "2026-03-10", order: 1 },
  { id: "s3", name: "Стяжка", startDate: "2026-03-11", endDate: "2026-03-21", order: 2 },
  { id: "s2g", name: "Перегородки ГКЛ", startDate: "2026-03-22", endDate: "2026-04-05", order: 3 },
  { id: "s4", name: "Инженерия", startDate: "2026-04-06", endDate: "2026-04-20", order: 4 },
  { id: "s5", name: "Черновая отделка", startDate: "2026-04-21", endDate: "2026-05-10", order: 5 },
  { id: "s6", name: "Чистовая отделка", startDate: "2026-05-11", endDate: "2026-06-01", order: 6 },
  { id: "s7", name: "Монтаж дверей", startDate: "2026-06-02", endDate: "2026-06-10", order: 7 },
  { id: "s8", name: "Монтаж света", startDate: "2026-06-11", endDate: "2026-06-20", order: 8 },
  { id: "s9", name: "Установка сантехники", startDate: "2026-06-21", endDate: "2026-06-30", order: 9 },
  { id: "s10", name: "Финальная комплектация", startDate: "2026-07-01", endDate: "2026-07-15", order: 10 },
];

const ITEMS = [
  { id: "i1", name: "Межкомнатные двери Sofia", category: "Двери", status: "pending", leadTimeDays: 120, targetStageId: "s7", quantity: 5, supplier: "Sofia", budget: 450000, notes: "Нужен скрытый короб. Цвет — RAL 9003.", riskLevel: "high" },
  { id: "i2", name: "Керамогранит Italon 60×60", category: "Плитка", status: "approved", leadTimeDays: 20, targetStageId: "s6", quantity: 85, supplier: "Italon", budget: 185000, notes: "Санузел + кухня фартук", riskLevel: "low" },
  { id: "i3", name: "Сантехника Grohe комплект", category: "Сантехника", status: "in_review", leadTimeDays: 30, targetStageId: "s9", quantity: 1, supplier: "Grohe", budget: 340000, notes: "Согласовать модель смесителя ванной", riskLevel: "medium" },
  { id: "i4", name: "Светильники Flos IC", category: "Свет", status: "approved", leadTimeDays: 45, targetStageId: "s8", quantity: 8, supplier: "Flos", budget: 156000, notes: "IC Lights S1 и S2", riskLevel: "low" },
  { id: "i5", name: "Кухня IKEA Metod", category: "Кухня", status: "pending", leadTimeDays: 75, targetStageId: "s10", quantity: 1, supplier: "IKEA", budget: 280000, notes: "Фасады на заказ, столешница Dekton", riskLevel: "medium" },
  { id: "i6", name: "Кондиционеры Daikin", category: "Климат", status: "approved", leadTimeDays: 35, targetStageId: "s4", quantity: 3, supplier: "Daikin", budget: 210000, notes: "Мультисплит на 3 комнаты", riskLevel: "low" },
  { id: "i7", name: "Паркет Quick-Step Impressive", category: "Полы", status: "approved", leadTimeDays: 25, targetStageId: "s6", quantity: 48, supplier: "Quick-Step", budget: 92000, notes: "", riskLevel: "low" },
  { id: "i8", name: "Радиаторы Zehnder", category: "Климат", status: "in_review", leadTimeDays: 40, targetStageId: "s4", quantity: 6, supplier: "Zehnder", budget: 180000, notes: "Дизайн-радиаторы для гостиной", riskLevel: "medium" },
  { id: "i9", name: "Мебель на заказ (гостиная)", category: "Мебель", status: "pending", leadTimeDays: 90, targetStageId: "s10", quantity: 1, supplier: "Столярная мастерская", budget: 520000, notes: "Стеллаж + ТВ-зона + комод", riskLevel: "high" },
  { id: "i10", name: "Электрофурнитура Schneider", category: "Электрика", status: "approved", leadTimeDays: 15, targetStageId: "s5", quantity: 1, supplier: "Schneider", budget: 45000, notes: "Серия Unica New, цвет антрацит", riskLevel: "low" },
  { id: "i11", name: "Обои Cole & Son", category: "Отделка", status: "pending", leadTimeDays: 60, targetStageId: "s6", quantity: 12, supplier: "WallDecor", budget: 78000, notes: "Коллекция Fornasetti, акцентная стена", riskLevel: "medium" },
  { id: "i12", name: "Входная дверь Torex", category: "Двери", status: "approved", leadTimeDays: 30, targetStageId: "s7", quantity: 1, supplier: "Torex", budget: 85000, notes: "", riskLevel: "low" },
  { id: "i13", name: "Зеркала по проекту", category: "Декор", status: "pending", leadTimeDays: 35, targetStageId: "s10", quantity: 2, supplier: "GlassArt", budget: 65000, notes: "С подсветкой, в ванную и прихожую", riskLevel: "low" },
  { id: "i14", name: "Декоративная штукатурка", category: "Отделка", status: "in_review", leadTimeDays: 10, targetStageId: "s6", quantity: 1, supplier: "Decorazza", budget: 42000, notes: "Гостиная, стена за диваном", riskLevel: "low" },
  { id: "i15", name: "Встроенные шкафы-купе", category: "Мебель", status: "pending", leadTimeDays: 60, targetStageId: "s10", quantity: 2, supplier: "Mr.Doors", budget: 320000, notes: "Спальня + прихожая", riskLevel: "medium" },
];

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

const d = (s) => new Date(s);
const addDays = (dt, n) => { const r = new Date(dt); r.setDate(r.getDate() + n); return r; };
const diffDays = (a, b) => Math.round((d(b) - d(a)) / 86400000);
const fmt = (dt) => d(dt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtShort = (dt) => d(dt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
const fmtP = (n) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";

function calcItem(item, stages) {
  const stage = stages.find(s => s.id === item.targetStageId);
  if (!stage) return { ...item, orderDeadline: null, deliveryForecast: null, daysUntilDeadline: null, riskCalc: "low", stageName: "—" };
  const stageStart = d(stage.startDate);
  const orderDeadline = addDays(stageStart, -item.leadTimeDays);
  const deliveryForecast = addDays(TODAY, item.leadTimeDays);
  const daysUntil = diffDays(todayStr, orderDeadline.toISOString().split("T")[0]);
  let riskCalc = "low";
  if (daysUntil < 0) riskCalc = "critical";
  else if (daysUntil <= 7) riskCalc = "high";
  else if (daysUntil <= 30) riskCalc = "medium";
  return { ...item, orderDeadline: orderDeadline.toISOString().split("T")[0], deliveryForecast: deliveryForecast.toISOString().split("T")[0], daysUntilDeadline: daysUntil, riskCalc, stageName: stage.name, stageStart: stage.startDate };
}

const STATUS_MAP = {
  approved: { bg: "#ECFDF3", text: "#16A34A", label: "Согласовано" },
  pending: { bg: "#FFF7ED", text: "#D97706", label: "Ожидает" },
  in_review: { bg: "#EFF6FF", text: "#2563EB", label: "На проверке" },
};
const RISK_MAP = {
  critical: { bg: "#FEE2E2", text: "#DC2626", label: "Критично" },
  high: { bg: "#FEF0EC", text: "#EA580C", label: "Высокий" },
  medium: { bg: "#FFF7ED", text: "#D97706", label: "Средний" },
  low: { bg: "#ECFDF3", text: "#16A34A", label: "Низкий" },
};
const getStatus = (s) => STATUS_MAP[s] || { bg: "#F3F4F6", text: "#6B7280", label: s };
const getRisk = (r) => RISK_MAP[r] || RISK_MAP.low;

const CATEGORIES = [...new Set(ITEMS.map(i => i.category))];

/* ═══════════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════════ */

const I = {
  Grid: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  List: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Timeline: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="3" width="22" height="18" rx="2"/><line x1="1" y1="9" x2="23" y2="9"/><line x1="7" y1="3" x2="7" y2="21"/></svg>,
  Stages: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Upload: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  Settings: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.38.23.62.61.68 1.04"/></svg>,
  Alert: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Check: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  Clock: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Search: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ChevR: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  Download: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Layers: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Box: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  Info: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
};

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--f:'DM Sans',sans-serif;--fm:'JetBrains Mono',monospace}
body{font-family:var(--f);background:#F9FAFB;color:#111827;-webkit-font-smoothing:antialiased}
.fm{font-family:var(--fm)}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
.af{animation:fadeIn .2s ease}.au{animation:slideUp .25s ease}.ar{animation:slideRight .25s ease}

.card{background:#fff;border:1px solid #E5E7EB;border-radius:12px;transition:all .15s}
.card:hover{border-color:#D1D5DB}
.badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:500;padding:2px 10px;border-radius:20px;white-space:nowrap}

.tab-bar{display:flex;gap:2px;background:#F3F4F6;border-radius:10px;padding:3px}
.tab-btn{padding:8px 16px;font-size:13px;font-weight:500;color:#6B7280;cursor:pointer;border-radius:8px;transition:all .15s;border:none;background:transparent;font-family:var(--f);display:flex;align-items:center;gap:6px;white-space:nowrap}
.tab-btn:hover{color:#374151}
.tab-btn.active{background:#fff;color:#111827;box-shadow:0 1px 3px rgba(0,0,0,.06)}

.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;font-size:13px;font-weight:500;font-family:var(--f);border:none;cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-dark{background:#111827;color:#fff}.btn-dark:hover{background:#1F2937}
.btn-outline{background:#fff;color:#374151;border:1px solid #E5E7EB}.btn-outline:hover{background:#F9FAFB}

input,select{padding:8px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;font-family:var(--f);outline:none;transition:border .15s;background:#fff;color:#111827}
input:focus,select:focus{border-color:#111827}

.drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:100;backdrop-filter:blur(3px);animation:fadeIn .15s ease}
.drawer{position:fixed;top:0;right:0;bottom:0;width:480px;max-width:95vw;background:#fff;z-index:101;box-shadow:-10px 0 40px rgba(0,0,0,.1);overflow-y:auto;animation:slideRight .2s ease}

.timeline-row{display:flex;align-items:center;height:40px;position:relative}
.timeline-bar{position:absolute;height:24px;border-radius:6px;top:8px;display:flex;align-items:center;padding:0 8px;font-size:10px;font-weight:500;white-space:nowrap;overflow:hidden;transition:all .2s;cursor:pointer}
.timeline-bar:hover{filter:brightness(0.95);transform:scaleY(1.08)}
.timeline-today{position:absolute;top:0;bottom:0;width:2px;background:#DC2626;z-index:5}
.timeline-today::before{content:'Сегодня';position:absolute;top:-18px;left:-20px;font-size:10px;color:#DC2626;font-weight:600;white-space:nowrap}

.toast{position:fixed;bottom:24px;right:24px;z-index:200;animation:slideUp .3s ease}
.toast-inner{background:#111827;color:#fff;font-size:13px;padding:12px 20px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.15);display:flex;align-items:center;gap:8px}

.step-wizard{display:flex;align-items:center;gap:0;margin-bottom:32px}
.step-item{display:flex;align-items:center;gap:8px;font-size:13px;color:#9CA3AF}
.step-item.active{color:#111827;font-weight:600}
.step-item.done{color:#16A34A}
.step-dot{width:28px;height:28px;border-radius:50%;border:2px solid #E5E7EB;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;background:#fff;transition:all .2s}
.step-item.active .step-dot{border-color:#111827;background:#111827;color:#fff}
.step-item.done .step-dot{border-color:#16A34A;background:#16A34A;color:#fff}
.step-line{width:40px;height:2px;background:#E5E7EB;margin:0 4px}
.step-line.done{background:#16A34A}
`;

/* ═══════════════════════════════════════════════════════════════
   SHARED
   ═══════════════════════════════════════════════════════════════ */

function Badge({ type, value }) {
  const map = type === "status" ? getStatus(value) : getRisk(value);
  return <span className="badge" style={{ background: map.bg, color: map.text }}>{map.label}</span>;
}

function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className="toast"><div className="toast-inner"><I.Check className="w-4 h-4 text-emerald-400" />{message}</div></div>;
}

function KpiCard({ label, value, sub, icon: Icon, color }) {
  return <div className="card p-4"><div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4 text-[#9CA3AF]" /><span className="text-[11px] text-[#9CA3AF] uppercase tracking-wide">{label}</span></div><div className="text-2xl font-bold fm" style={color ? { color } : {}}>{value}</div>{sub && <div className="text-[11px] text-[#9CA3AF] mt-1">{sub}</div>}</div>;
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════ */

function DashboardTab({ items, stages, onNav }) {
  const critical = items.filter(i => i.riskCalc === "critical");
  const high = items.filter(i => i.riskCalc === "high");
  const pending = items.filter(i => i.status === "pending" || i.status === "in_review");
  const needOrder = items.filter(i => i.daysUntilDeadline !== null && i.daysUntilDeadline <= 14 && i.status !== "approved");

  return <div className="af">
    <div className="grid grid-cols-4 gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
      <KpiCard label="Всего позиций" value={items.length} icon={I.Box} sub={`на ${fmtP(items.reduce((a, i) => a + i.budget, 0))}`} />
      <KpiCard label="Требуют согласования" value={pending.length} icon={I.Clock} color={pending.length > 0 ? "#D97706" : undefined} />
      <KpiCard label="Пора заказывать" value={needOrder.length} icon={I.Alert} color={needOrder.length > 0 ? "#EA580C" : undefined} />
      <KpiCard label="Критические риски" value={critical.length} icon={I.Alert} color={critical.length > 0 ? "#DC2626" : undefined} />
    </div>

    {/* Critical alerts */}
    {(critical.length > 0 || high.length > 0) && <div className="card p-5 mb-6 border-l-4 border-l-[#DC2626]">
      <h3 className="text-[14px] font-semibold mb-3 flex items-center gap-2 text-[#DC2626]"><I.Alert className="w-4 h-4" /> Критические предупреждения</h3>
      <div className="space-y-2">
        {[...critical, ...high].slice(0, 6).map(item => <div key={item.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg" style={{ background: item.riskCalc === "critical" ? "#FEF2F2" : "#FFFBEB" }}>
          <div><div className="text-[13px] font-medium">{item.name}</div><div className="text-[11px] text-[#6B7280]">{item.riskCalc === "critical" ? `Просрочено на ${Math.abs(item.daysUntilDeadline)} дн. — заказать нужно было ${fmt(item.orderDeadline)}` : `Дедлайн заказа через ${item.daysUntilDeadline} дн. — ${fmt(item.orderDeadline)}`}</div></div>
          <Badge type="risk" value={item.riskCalc} />
        </div>)}
      </div>
    </div>}

    <div className="grid grid-cols-2 gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
      {/* Upcoming stages */}
      <div className="card p-5">
        <h3 className="text-[14px] font-semibold mb-3">Ближайшие этапы стройки</h3>
        {stages.filter(s => d(s.endDate) >= TODAY).slice(0, 4).map(s => <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-[#F3F4F6] last:border-none">
          <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-[11px] font-bold fm text-[#6B7280]">{s.order}</div>
          <div className="flex-1"><div className="text-[13px] font-medium">{s.name}</div><div className="text-[11px] text-[#9CA3AF] fm">{fmtShort(s.startDate)} — {fmtShort(s.endDate)}</div></div>
          {d(s.startDate) <= TODAY && d(s.endDate) >= TODAY && <span className="badge bg-[#EFF6FF] text-[#2563EB]">Сейчас</span>}
        </div>)}
      </div>

      {/* Quick actions */}
      <div className="card p-5 flex flex-col gap-3">
        <h3 className="text-[14px] font-semibold mb-1">Быстрые действия</h3>
        <button className="btn btn-dark w-full justify-center" onClick={() => onNav("spec")}><I.List className="w-4 h-4" /> Открыть спецификацию</button>
        <button className="btn btn-dark w-full justify-center" onClick={() => onNav("timeline")}><I.Timeline className="w-4 h-4" /> Procurement Timeline</button>
        <button className="btn btn-outline w-full justify-center" onClick={() => onNav("import")}><I.Upload className="w-4 h-4" /> Импортировать Excel</button>
        <button className="btn btn-outline w-full justify-center" onClick={() => onNav("stages")}><I.Stages className="w-4 h-4" /> График этапов</button>
      </div>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   SPECIFICATION TABLE
   ═══════════════════════════════════════════════════════════════ */

function SpecTab({ items, stages, toast }) {
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [catF, setCatF] = useState("all");
  const [critOnly, setCritOnly] = useState(false);
  const [selected, setSelected] = useState(null);

  const filtered = items.filter(i => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusF !== "all" && i.status !== statusF) return false;
    if (catF !== "all" && i.category !== catF) return false;
    if (critOnly && i.riskCalc !== "critical" && i.riskCalc !== "high") return false;
    return true;
  });

  const pendingCount = items.filter(i => i.status === "pending" || i.status === "in_review").length;
  const needOrderCount = items.filter(i => i.daysUntilDeadline !== null && i.daysUntilDeadline <= 14).length;
  const overdueCount = items.filter(i => i.riskCalc === "critical").length;

  return <div className="af">
    {/* Summary bar */}
    <div className="flex gap-3 mb-4 flex-wrap">
      {[{ l: "Не согласовано", v: pendingCount, c: "#D97706" }, { l: "Пора заказывать", v: needOrderCount, c: "#EA580C" }, { l: "Просрочено", v: overdueCount, c: "#DC2626" }].map((s, i) => <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB]"><span className="text-[12px] text-[#6B7280]">{s.l}</span><span className="text-[14px] font-bold fm" style={{ color: s.v > 0 ? s.c : "#9CA3AF" }}>{s.v}</span></div>)}
    </div>

    {/* Filters */}
    <div className="flex gap-2 mb-4 flex-wrap items-center">
      <div className="relative flex-1 max-w-[240px]"><I.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" /><input className="w-full pl-9" placeholder="Поиск по названию..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ width: "auto" }}><option value="all">Все статусы</option><option value="approved">Согласовано</option><option value="pending">Ожидает</option><option value="in_review">На проверке</option></select>
      <select value={catF} onChange={e => setCatF(e.target.value)} style={{ width: "auto" }}><option value="all">Все категории</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
      <label className="flex items-center gap-2 text-[12px] cursor-pointer select-none"><input type="checkbox" checked={critOnly} onChange={e => setCritOnly(e.target.checked)} className="w-4 h-4 accent-[#111827]" style={{ padding: 0, border: "none" }} /> Только критичные</label>
    </div>

    {/* Table */}
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
            {["Позиция", "Категория", "Статус", "Поставка", "Этап монтажа", "Заказать до", "Риск", "Бюджет"].map(h => <th key={h} className="text-left text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map(item => <tr key={item.id} className="border-b border-[#F3F4F6] cursor-pointer hover:bg-[#F9FAFB] transition-colors" onClick={() => setSelected(item)} style={item.riskCalc === "critical" ? { background: "#FEF2F2" } : {}}>
              <td className="px-4 py-3"><div className="font-medium">{item.name}</div><div className="text-[11px] text-[#9CA3AF]">{item.supplier}</div></td>
              <td className="px-4 py-3 text-[#6B7280]">{item.category}</td>
              <td className="px-4 py-3"><Badge type="status" value={item.status} /></td>
              <td className="px-4 py-3 fm text-[#6B7280]">{item.leadTimeDays} дн.</td>
              <td className="px-4 py-3 text-[#6B7280] text-[12px]">{item.stageName}</td>
              <td className="px-4 py-3 fm" style={{ color: item.riskCalc === "critical" ? "#DC2626" : item.riskCalc === "high" ? "#EA580C" : "#6B7280" }}>{item.orderDeadline ? fmt(item.orderDeadline) : "—"}</td>
              <td className="px-4 py-3"><Badge type="risk" value={item.riskCalc} /></td>
              <td className="px-4 py-3 fm font-medium">{fmtP(item.budget)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>

    {/* Drawer */}
    {selected && <>
      <div className="drawer-overlay" onClick={() => setSelected(null)} />
      <div className="drawer">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6"><h2 className="text-lg font-semibold flex-1">{selected.name}</h2><button className="p-1 hover:bg-[#F3F4F6] rounded-lg cursor-pointer" onClick={() => setSelected(null)}><I.X className="w-5 h-5 text-[#6B7280]" /></button></div>

          <div className="w-full h-[180px] rounded-xl bg-gradient-to-br from-[#F3F4F6] to-[#E5E7EB] flex items-center justify-center mb-6"><I.Box className="w-12 h-12 text-[#D1D5DB]" /></div>

          <div className="flex gap-2 mb-6"><Badge type="status" value={selected.status} /><Badge type="risk" value={selected.riskCalc} /></div>

          <div className="space-y-3 mb-6">
            {[
              { l: "Поставщик", v: selected.supplier },
              { l: "Категория", v: selected.category },
              { l: "Кол-во", v: selected.quantity },
              { l: "Бюджет", v: fmtP(selected.budget) },
              { l: "Срок поставки", v: `${selected.leadTimeDays} дней` },
              { l: "Этап монтажа", v: `${selected.stageName} (${selected.stageStart ? fmtShort(selected.stageStart) : "—"})` },
              { l: "Заказать до", v: selected.orderDeadline ? fmt(selected.orderDeadline) : "—" },
              { l: "Прогноз доставки", v: selected.deliveryForecast ? fmt(selected.deliveryForecast) : "—" },
            ].map((r, i) => <div key={i} className="flex justify-between text-[13px] py-2 border-b border-[#F3F4F6] last:border-none"><span className="text-[#9CA3AF]">{r.l}</span><span className="font-medium">{r.v}</span></div>)}
          </div>

          {selected.notes && <div className="card p-4 mb-6 bg-[#F9FAFB]"><div className="text-[11px] text-[#9CA3AF] mb-1">Примечания</div><div className="text-[13px] text-[#374151]">{selected.notes}</div></div>}

          {(selected.riskCalc === "critical" || selected.riskCalc === "high") && <div className="p-4 rounded-xl border-l-4 mb-6" style={{ background: "#FEF2F2", borderLeftColor: "#DC2626" }}>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#DC2626] mb-1"><I.Alert className="w-4 h-4" /> Предупреждение</div>
            <div className="text-[12px] text-[#6B7280]">{selected.riskCalc === "critical" ? `Дедлайн заказа прошёл ${Math.abs(selected.daysUntilDeadline)} дн. назад. Если не заказать сейчас, этап «${selected.stageName}» будет сдвинут.` : `До дедлайна заказа осталось ${selected.daysUntilDeadline} дн. Без согласования и заказа до ${fmt(selected.orderDeadline)} есть риск сдвига этапа «${selected.stageName}».`}</div>
          </div>}

          <button className="btn btn-dark w-full justify-center" onClick={() => { setSelected(null); toast("Статус обновлён"); }}>Согласовать позицию</button>
        </div>
      </div>
    </>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   PROCUREMENT TIMELINE
   ═══════════════════════════════════════════════════════════════ */

function TimelineTab({ items, stages }) {
  const [scale, setScale] = useState("months");
  const [hovered, setHovered] = useState(null);

  const timelineStart = d("2026-02-01");
  const timelineEnd = d("2026-08-01");
  const totalDays = diffDays(timelineStart.toISOString(), timelineEnd.toISOString());

  const toPos = (dateStr) => {
    const days = diffDays(timelineStart.toISOString(), dateStr);
    return Math.max(0, Math.min(100, (days / totalDays) * 100));
  };

  const todayPos = toPos(todayStr);

  const months = [];
  const cur = new Date(timelineStart);
  while (cur < timelineEnd) {
    months.push({ label: cur.toLocaleDateString("ru-RU", { month: "short", year: "numeric" }), pos: toPos(cur.toISOString()) });
    cur.setMonth(cur.getMonth() + 1);
  }

  const sortedItems = [...items].sort((a, b) => {
    if (!a.orderDeadline) return 1;
    if (!b.orderDeadline) return -1;
    return d(a.orderDeadline) - d(b.orderDeadline);
  });

  const barColor = (item) => {
    if (item.riskCalc === "critical") return { bg: "#FEE2E2", border: "#FECACA", text: "#DC2626" };
    if (item.riskCalc === "high") return { bg: "#FFF7ED", border: "#FED7AA", text: "#EA580C" };
    if (item.riskCalc === "medium") return { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706" };
    return { bg: "#F0FDF4", border: "#BBF7D0", text: "#16A34A" };
  };

  return <div className="af">
    <div className="flex justify-between items-center mb-5">
      <div>
        <h3 className="text-[15px] font-semibold">Procurement Timeline</h3>
        <p className="text-[12px] text-[#9CA3AF] mt-0.5">Визуализация сроков закупки и поставки</p>
      </div>
      <div className="tab-bar" style={{ padding: 2 }}>
        {["months", "weeks"].map(s => <button key={s} className={`tab-btn ${scale === s ? "active" : ""}`} style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => setScale(s)}>{s === "months" ? "Месяцы" : "Недели"}</button>)}
      </div>
    </div>

    {/* Legend */}
    <div className="flex gap-4 mb-4 text-[11px]">
      {[{ c: "#DC2626", l: "Дедлайн пропущен" }, { c: "#D97706", l: "Дедлайн скоро" }, { c: "#16A34A", l: "Всё ОК" }].map(lg => <div key={lg.l} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: lg.c, opacity: 0.3 }} /><div className="w-1 h-3 rounded-sm" style={{ background: lg.c }} /><span className="text-[#6B7280]">{lg.l}</span></div>)}
      <div className="flex items-center gap-1.5"><div className="w-0.5 h-3 bg-[#DC2626]" /><span className="text-[#6B7280]">Сегодня</span></div>
    </div>

    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex border-b border-[#E5E7EB]">
        <div className="w-[200px] flex-shrink-0 px-4 py-2 bg-[#F9FAFB] text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">Позиция</div>
        <div className="flex-1 relative bg-[#F9FAFB] border-l border-[#E5E7EB]">
          <div className="flex">{months.map((m, i) => <div key={i} className="text-[10px] text-[#9CA3AF] py-2 px-2 border-r border-[#F3F4F6]" style={{ position: "absolute", left: `${m.pos}%` }}>{m.label}</div>)}</div>
        </div>
      </div>

      {/* Rows */}
      <div className="relative">
        {sortedItems.map((item, idx) => {
          const clr = barColor(item);
          const orderPos = item.orderDeadline ? toPos(item.orderDeadline) : 0;
          const deliveryPos = item.stageStart ? toPos(item.stageStart) : 100;
          const barStart = Math.max(0, orderPos);
          const barWidth = Math.max(2, deliveryPos - barStart);
          const isHov = hovered === item.id;

          return <div key={item.id} className="flex border-b border-[#F3F4F6] hover:bg-[#FAFAFA] transition-colors" style={item.riskCalc === "critical" ? { background: "#FEF2F2" } : {}}>
            <div className="w-[200px] flex-shrink-0 px-4 py-2 flex items-center gap-2 border-r border-[#F3F4F6]">
              <div className="flex-1 min-w-0"><div className="text-[12px] font-medium truncate">{item.name}</div><div className="text-[10px] text-[#9CA3AF]">{item.leadTimeDays} дн.</div></div>
              <Badge type="risk" value={item.riskCalc} />
            </div>
            <div className="flex-1 relative" style={{ height: 40 }} onMouseEnter={() => setHovered(item.id)} onMouseLeave={() => setHovered(null)}>
              {/* Lead time bar */}
              <div className="timeline-bar" style={{ left: `${barStart}%`, width: `${barWidth}%`, background: clr.bg, border: `1px solid ${clr.border}`, color: clr.text }}>
                {barWidth > 8 && <span>{item.name}</span>}
              </div>
              {/* Order deadline marker */}
              {item.orderDeadline && <div style={{ position: "absolute", left: `${orderPos}%`, top: 6, width: 3, height: 28, background: clr.text, borderRadius: 2, opacity: 0.7 }} />}
              {/* Tooltip */}
              {isHov && <div className="absolute z-10 bg-[#111827] text-white text-[11px] px-3 py-2 rounded-lg" style={{ left: `${Math.min(barStart + barWidth / 2, 80)}%`, top: -50, transform: "translateX(-50%)", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,.3)" }}>
                Заказать: {item.orderDeadline ? fmt(item.orderDeadline) : "—"} → Монтаж: {item.stageStart ? fmtShort(item.stageStart) : "—"}
              </div>}
            </div>
          </div>;
        })}
        {/* Today line */}
        <div className="timeline-today" style={{ left: `calc(200px + (100% - 200px) * ${todayPos / 100})` }} />
      </div>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   STAGES
   ═══════════════════════════════════════════════════════════════ */

function StagesTab({ scenario, setScenario }) {
  const stages = scenario === "block" ? STAGES_BLOCK : STAGES_GKL;

  return <div className="af">
    <div className="flex justify-between items-center mb-5">
      <div><h3 className="text-[15px] font-semibold">График этапов стройки</h3><p className="text-[12px] text-[#9CA3AF] mt-0.5">Порядок зависит от типа перегородок</p></div>
      <div className="tab-bar" style={{ padding: 2 }}>
        {[{ id: "block", l: "Блок" }, { id: "gkl", l: "ГКЛ" }].map(s => <button key={s.id} className={`tab-btn ${scenario === s.id ? "active" : ""}`} style={{ padding: "6px 16px", fontSize: 12 }} onClick={() => setScenario(s.id)}>{s.l}</button>)}
      </div>
    </div>

    <div className="card p-5 mb-5 bg-[#EFF6FF] border-[#BFDBFE]">
      <div className="flex items-start gap-2 text-[13px] text-[#2563EB]"><I.Info className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>Тип перегородок влияет на последовательность этапов, а значит — на сроки заказа позиций, привязанных к монтажу.</span></div>
    </div>

    <div className="space-y-2">
      {stages.map((s, i) => {
        const isActive = d(s.startDate) <= TODAY && d(s.endDate) >= TODAY;
        const isDone = d(s.endDate) < TODAY;
        const isFuture = d(s.startDate) > TODAY;
        return <div key={s.id} className="card p-4 flex items-center gap-4" style={isActive ? { borderColor: "#2563EB", borderLeftWidth: 4 } : isDone ? { opacity: 0.6 } : {}}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-bold fm" style={{ background: isActive ? "#EFF6FF" : isDone ? "#ECFDF3" : "#F3F4F6", color: isActive ? "#2563EB" : isDone ? "#16A34A" : "#9CA3AF" }}>{s.order}</div>
          <div className="flex-1"><div className="text-[14px] font-medium">{s.name}</div><div className="text-[12px] text-[#9CA3AF] fm">{fmtShort(s.startDate)} — {fmtShort(s.endDate)}</div></div>
          {isDone && <span className="badge bg-[#ECFDF3] text-[#16A34A]"><I.Check className="w-3 h-3" /> Завершён</span>}
          {isActive && <span className="badge bg-[#EFF6FF] text-[#2563EB]">В процессе</span>}
          {isFuture && <span className="text-[11px] text-[#9CA3AF]">через {diffDays(todayStr, s.startDate)} дн.</span>}
        </div>;
      })}
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   IMPORT
   ═══════════════════════════════════════════════════════════════ */

function ImportTab({ toast }) {
  const [step, setStep] = useState(1);

  const mappings = [
    { excel: "Наименование", field: "Item name" },
    { excel: "Статус", field: "Status" },
    { excel: "Срок поставки", field: "Lead time" },
    { excel: "Этап", field: "Target stage" },
    { excel: "Кол-во", field: "Quantity" },
    { excel: "Поставщик", field: "Supplier" },
    { excel: "Бюджет", field: "Budget" },
  ];

  const preview = [
    ["Двери Sofia", "Ожидает", "120", "Монтаж дверей", "5", "Sofia", "450 000"],
    ["Плитка Italon", "Согласовано", "20", "Чистовая отделка", "85", "Italon", "185 000"],
    ["Сантехника Grohe", "На проверке", "30", "Установка сантехники", "1", "Grohe", "340 000"],
    ["Светильники Flos", "Согласовано", "45", "Монтаж света", "8", "Flos", "156 000"],
    ["Кухня IKEA", "Ожидает", "75", "Финальная комплектация", "1", "IKEA", "280 000"],
  ];

  return <div className="af">
    <h3 className="text-[15px] font-semibold mb-1">Импорт из Excel</h3>
    <p className="text-[12px] text-[#9CA3AF] mb-6">Перенесите спецификацию в Archflow за 4 шага</p>

    {/* Stepper */}
    <div className="step-wizard">
      {["Загрузка", "Маппинг", "Превью", "Результат"].map((label, i) => <>
        {i > 0 && <div key={`l${i}`} className={`step-line ${step > i ? "done" : ""}`} />}
        <div key={label} className={`step-item ${step === i + 1 ? "active" : step > i + 1 ? "done" : ""}`}>
          <div className="step-dot">{step > i + 1 ? <I.Check className="w-3.5 h-3.5" /> : i + 1}</div>
          <span className="hidden sm:inline">{label}</span>
        </div>
      </>)}
    </div>

    {step === 1 && <div className="card p-8">
      <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-12 text-center cursor-pointer hover:border-[#111827] hover:bg-[#F9FAFB] transition-all" onClick={() => setStep(2)}>
        <I.Upload className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3" />
        <div className="text-[15px] font-medium mb-1">Перетащите Excel-файл сюда</div>
        <div className="text-[13px] text-[#9CA3AF]">или нажмите для выбора · .xlsx, .xls</div>
      </div>
      <div className="flex justify-center mt-4"><button className="btn btn-outline"><I.Download className="w-4 h-4" /> Скачать шаблон</button></div>
    </div>}

    {step === 2 && <div className="card p-6">
      <h4 className="text-[14px] font-semibold mb-4">Сопоставление колонок</h4>
      <table className="w-full text-[13px] mb-6"><thead><tr className="border-b border-[#E5E7EB]"><th className="text-left py-2 text-[11px] text-[#9CA3AF] uppercase">Колонка из Excel</th><th className="text-left py-2 text-[11px] text-[#9CA3AF] uppercase">Поле Archflow</th></tr></thead>
        <tbody>{mappings.map(m => <tr key={m.excel} className="border-b border-[#F3F4F6]"><td className="py-3 font-medium">{m.excel}</td><td className="py-3"><select defaultValue={m.field} style={{ width: "auto" }}><option>{m.field}</option><option>—</option></select></td></tr>)}</tbody>
      </table>
      <div className="flex gap-2 justify-end"><button className="btn btn-outline" onClick={() => setStep(1)}>Назад</button><button className="btn btn-dark" onClick={() => setStep(3)}>Далее</button></div>
    </div>}

    {step === 3 && <div className="card p-6">
      <h4 className="text-[14px] font-semibold mb-4">Превью импорта</h4>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-[12px]"><thead><tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">{mappings.map(m => <th key={m.excel} className="text-left px-3 py-2 text-[10px] text-[#9CA3AF] uppercase whitespace-nowrap">{m.field}</th>)}</tr></thead>
          <tbody>{preview.map((row, i) => <tr key={i} className="border-b border-[#F3F4F6]">{row.map((cell, j) => <td key={j} className="px-3 py-2 whitespace-nowrap">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="flex gap-2 justify-end"><button className="btn btn-outline" onClick={() => setStep(2)}>Назад</button><button className="btn btn-dark" onClick={() => setStep(4)}>Импортировать</button></div>
    </div>}

    {step === 4 && <div className="card p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-[#ECFDF3] flex items-center justify-center mx-auto mb-4"><I.Check className="w-8 h-8 text-[#16A34A]" /></div>
      <h4 className="text-[18px] font-semibold mb-2">Импорт завершён</h4>
      <div className="space-y-1 text-[13px] text-[#6B7280] mb-6">
        <div>Импортировано: <strong className="text-[#111827]">124 позиции</strong></div>
        <div>Требуют проверки: <strong className="text-[#D97706]">8 строк</strong></div>
        <div>Не распознано: <strong className="text-[#DC2626]">3 поля</strong></div>
      </div>
      <button className="btn btn-dark" onClick={() => { setStep(1); toast("Позиции импортированы"); }}>Перейти к спецификации</button>
    </div>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   SETTINGS
   ═══════════════════════════════════════════════════════════════ */

function SettingsTab({ scenario, setScenario, toast }) {
  return <div className="af">
    <h3 className="text-[15px] font-semibold mb-5">Настройки сценария стройки</h3>
    <div className="card p-6 max-w-[560px]">
      <div className="mb-5"><label className="block text-[12px] font-medium text-[#6B7280] mb-2">Тип перегородок</label>
        <div className="tab-bar" style={{ padding: 2 }}>{[{ id: "block", l: "Блок" }, { id: "gkl", l: "ГКЛ" }].map(s => <button key={s.id} className={`tab-btn ${scenario === s.id ? "active" : ""}`} style={{ padding: "8px 20px" }} onClick={() => setScenario(s.id)}>{s.l}</button>)}</div>
      </div>
      <div className="mb-5"><label className="block text-[12px] font-medium text-[#6B7280] mb-2">Буфер между этапами (дней)</label><input type="number" defaultValue={3} style={{ width: "120px" }} /></div>
      <div className="mb-5"><label className="block text-[12px] font-medium text-[#6B7280] mb-2">Дата старта проекта</label><input type="date" defaultValue="2026-03-01" style={{ width: "180px" }} /></div>
      <div className="mb-5"><label className="block text-[12px] font-medium text-[#6B7280] mb-2">Предупреждать о дедлайнах за</label>
        <select defaultValue="14" style={{ width: "160px" }}><option value="7">7 дней</option><option value="14">14 дней</option><option value="30">30 дней</option></select>
      </div>

      <div className="card p-4 bg-[#EFF6FF] border-[#BFDBFE] mb-5">
        <div className="flex items-start gap-2 text-[12px] text-[#2563EB]"><I.Info className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>Тип перегородок влияет на последовательность этапов, а значит — на сроки заказа позиций, привязанных к монтажу.</span></div>
      </div>

      <button className="btn btn-dark" onClick={() => toast("Настройки сохранены")}>Сохранить</button>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════════ */

export default function SupplyModule() {
  const [tab, setTab] = useState("dashboard");
  const [scenario, setScenario] = useState("block");
  const [toastMsg, setToastMsg] = useState(null);
  const toast = useCallback(msg => setToastMsg(msg), []);

  const stages = scenario === "block" ? STAGES_BLOCK : STAGES_GKL;
  const items = useMemo(() => ITEMS.map(i => calcItem(i, stages)), [stages]);

  const tabs = [
    { id: "dashboard", label: "Обзор", icon: I.Grid },
    { id: "spec", label: "Спецификация", icon: I.List },
    { id: "timeline", label: "Timeline", icon: I.Timeline },
    { id: "stages", label: "Этапы", icon: I.Stages },
    { id: "import", label: "Импорт", icon: I.Upload },
    { id: "settings", label: "Настройки", icon: I.Settings },
  ];

  return <>
    <style>{CSS}</style>
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#111827] flex items-center justify-center"><I.Layers className="w-4 h-4 text-white" /></div>
            <span className="text-[16px] font-bold tracking-tight">Archflow</span>
            <span className="text-[13px] text-[#9CA3AF] ml-1">/ Комплектация</span>
            <span className="text-[13px] text-[#6B7280] ml-1">/ Квартира на Патриках</span>
          </div>
          <div className="tab-bar w-fit">{tabs.map(t => <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}><t.icon className="w-3.5 h-3.5" />{t.label}</button>)}</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        {tab === "dashboard" && <DashboardTab items={items} stages={stages} onNav={setTab} />}
        {tab === "spec" && <SpecTab items={items} stages={stages} toast={toast} />}
        {tab === "timeline" && <TimelineTab items={items} stages={stages} />}
        {tab === "stages" && <StagesTab scenario={scenario} setScenario={setScenario} />}
        {tab === "import" && <ImportTab toast={toast} />}
        {tab === "settings" && <SettingsTab scenario={scenario} setScenario={setScenario} toast={toast} />}
      </div>
    </div>
    {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
  </>;
}
