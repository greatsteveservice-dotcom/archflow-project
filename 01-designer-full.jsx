import { useState, useMemo, useEffect, useCallback } from "react";

/* ═══════════════════════════════ DATA ═══════════════════════════════ */

const TODAY = new Date("2026-03-23");
const todayStr = "2026-03-23";
const dd = (s) => new Date(s);
const addD = (dt, n) => { const r = new Date(dt); r.setDate(r.getDate() + n); return r; };
const diffD = (a, b) => Math.round((dd(b) - dd(a)) / 86400000);
const fmt = (dt) => dt ? dd(dt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const fmtS = (dt) => dt ? dd(dt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "—";
const fmtP = (n) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";
const timeAgo = (dt) => { const h = Math.floor((Date.now() - dd(dt).getTime()) / 3600000); if (h < 1) return "только что"; if (h < 24) return `${h} ч. назад`; const days = Math.floor(h / 24); return days < 7 ? `${days} дн. назад` : fmt(dt); };
const daysBetween = (a, b) => Math.round((dd(b) - dd(a)) / 86400000);

const PROJECTS = [
  { id: "p1", title: "Квартира на Патриарших", address: "Москва, Б. Патриарший пер. 8, кв. 12", owner: "Анна Козлова", status: "active", updatedAt: "2026-03-04T14:30:00", modules: ["journal","supply","docs"], progress: 65, visits: 12, photos: 48, openIssues: 2, contractVisits: 16, startDate: "2026-01-20", supplyDiscount: 12, scenarioType: "block", contractPayments: { supervision: { amount: 45000, period: "monthly", nextDue: "2026-04-01" }, design: { amount: 350000, status: "paid" }, supply: { commission: 12 } } },
  { id: "p2", title: "Загородный дом в Барвихе", address: "Барвиха, ул. Рублёвская 15", owner: "Сергей Петров", status: "active", updatedAt: "2026-03-03T10:00:00", modules: ["journal","supply","docs"], progress: 40, visits: 8, photos: 34, openIssues: 4, contractVisits: 20, startDate: "2026-02-01", supplyDiscount: 10, scenarioType: "block", contractPayments: { supervision: { amount: 55000, period: "monthly", nextDue: "2026-04-01" }, design: { amount: 500000, status: "paid" }, supply: { commission: 10 } } },
  { id: "p3", title: "Офис на Белой Площади", address: "Москва, ул. Лесная 7", owner: "ООО Берёза", status: "completed", updatedAt: "2026-02-20T16:45:00", modules: ["journal","docs"], progress: 100, visits: 24, photos: 96, openIssues: 0, contractVisits: 24, startDate: "2025-06-01", supplyDiscount: 0, scenarioType: "block", contractPayments: { supervision: { amount: 40000 }, design: { amount: 280000, status: "paid" }, supply: { commission: 0 } } },
  { id: "p4", title: "Студия на Чистых прудах", address: "Москва, Чистопрудный бул. 12", owner: "Мария Иванова", status: "active", updatedAt: "2026-03-01T09:15:00", modules: ["journal","supply"], progress: 15, visits: 3, photos: 11, openIssues: 1, contractVisits: 12, startDate: "2026-02-15", supplyDiscount: 8, scenarioType: "gkl", contractPayments: { supervision: { amount: 35000, period: "monthly", nextDue: "2026-04-01" }, design: { amount: 200000, status: "partial" }, supply: { commission: 8 } } },
];

const VISITS = [
  { id: "v1", projectId: "p1", date: "2026-03-04", title: "Проверка монтажа перегородок", note: "Обнаружено отклонение в спальне на 5 см.", createdBy: "Алиса Флоренс", status: "issues_found", type: "completed" },
  { id: "v2", projectId: "p1", date: "2026-02-28", title: "Приёмка электромонтажа", note: "Все точки соответствуют проекту.", createdBy: "Алиса Флоренс", status: "approved", type: "completed" },
  { id: "v3", projectId: "p1", date: "2026-02-20", title: "Проверка сантехники", note: "Подводка, канализация — всё ОК.", createdBy: "Алиса Флоренс", status: "approved", type: "completed" },
  { id: "v4", projectId: "p1", date: "2026-02-14", title: "Разметка помещений", note: "Разметка по плану.", createdBy: "Алиса Флоренс", status: "approved", type: "completed" },
  { id: "v5", projectId: "p1", date: "2026-02-07", title: "Демонтажные работы", note: "Демонтаж завершён.", createdBy: "Алиса Флоренс", status: "approved", type: "completed" },
  { id: "v6", projectId: "p1", date: "2026-01-30", title: "Старт работ", note: "Объект принят.", createdBy: "Алиса Флоренс", status: "approved", type: "completed" },
  { id: "vp1", projectId: "p1", date: "2026-03-28", title: "Проверка штукатурки", note: "", createdBy: "Алиса Флоренс", status: "planned", type: "planned" },
  { id: "vp2", projectId: "p1", date: "2026-04-05", title: "Приёмка стяжки", note: "", createdBy: "Алиса Флоренс", status: "planned", type: "planned" },
];

const PHOTO_RECORDS = [
  { id: "ph1", visitId: "v1", comment: "Перегородка в спальне — отклонение 5 см", status: "issue", createdAt: "2026-03-04T10:15:00", zone: "Спальня" },
  { id: "ph2", visitId: "v1", comment: "Проём в гостиную — ОК", status: "approved", createdAt: "2026-03-04T10:20:00", zone: "Гостиная" },
  { id: "ph3", visitId: "v1", comment: "Ниша под TV — углубить 3 см", status: "issue", createdAt: "2026-03-04T10:25:00", zone: "Гостиная" },
  { id: "ph4", visitId: "v1", comment: "Перегородка ванной — ОК", status: "approved", createdAt: "2026-03-04T10:30:00", zone: "Ванная" },
  { id: "ph5", visitId: "v2", comment: "Щиток — ОК", status: "approved", createdAt: "2026-02-28T11:00:00", zone: "Прихожая" },
  { id: "ph6", visitId: "v2", comment: "Разводка гостиной — ОК", status: "approved", createdAt: "2026-02-28T11:10:00", zone: "Гостиная" },
];

const INVOICES = [
  { id: "inv1", projectId: "p1", title: "Авторский надзор — март", amount: 45000, dueDate: "2026-04-01", status: "pending", issuedAt: "2026-03-01" },
  { id: "inv2", projectId: "p1", title: "Авторский надзор — февраль", amount: 45000, dueDate: "2026-03-01", status: "paid", issuedAt: "2026-02-01", paidAt: "2026-02-28" },
  { id: "inv3", projectId: "p1", title: "Авторский надзор — январь", amount: 45000, dueDate: "2026-02-01", status: "paid", issuedAt: "2026-01-20", paidAt: "2026-01-30" },
];

const PROJECT_DOCS = [
  { id: "d1", projectId: "p1", title: "Планировочное решение", version: "v3.2", uploadedBy: "Алиса Флоренс", createdAt: "2026-01-15", format: "PDF", status: "approved" },
  { id: "d2", projectId: "p1", title: "Развёртки стен", version: "v2.1", uploadedBy: "Алиса Флоренс", createdAt: "2026-01-20", format: "PDF", status: "approved" },
  { id: "d3", projectId: "p1", title: "Электропроект", version: "v1.4", uploadedBy: "Алиса Флоренс", createdAt: "2026-01-25", format: "DWG", status: "approved" },
  { id: "d4", projectId: "p1", title: "3D-визуализация", version: "v2.0", uploadedBy: "Алиса Флоренс", createdAt: "2026-02-10", format: "PNG", status: "approved" },
  { id: "d5", projectId: "p1", title: "Спецификация материалов", version: "v4.0", uploadedBy: "Алиса Флоренс", createdAt: "2026-02-05", format: "XLSX", status: "in_review" },
];

const PROJECT_MEMBERS = [
  { id: "m1", projectId: "p1", name: "Анна Козлова", email: "anna@mail.ru", role: "client", access: "view" },
  { id: "m2", projectId: "p1", name: "Бригада Строймастер", email: "foreman@stroy.ru", role: "contractor", access: "view_comment_photo" },
  { id: "m3", projectId: "p1", name: "Ирина Комплект", email: "irina@supply.ru", role: "supplier", access: "view_supply" },
  { id: "m4", projectId: "p1", name: "Мария Ассистент", email: "maria@florence.ru", role: "assistant", access: "full" },
];

// Supply-specific data
const STAGES_BLOCK = [
  { id: "s1", name: "Демонтаж", startDate: "2026-03-01", endDate: "2026-03-10", order: 1 },
  { id: "s2", name: "Возведение перегородок", startDate: "2026-03-11", endDate: "2026-03-25", order: 2 },
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

const SUPPLY_ITEMS_RAW = [
  { id: "i1", name: "Межкомнатные двери Sofia", category: "Двери", status: "pending", leadTimeDays: 120, targetStageId: "s7", quantity: 5, supplier: "Sofia", budget: 450000, notes: "Скрытый короб, RAL 9003" },
  { id: "i2", name: "Керамогранит Italon 60×60", category: "Плитка", status: "approved", leadTimeDays: 20, targetStageId: "s6", quantity: 85, supplier: "Italon", budget: 185000, notes: "" },
  { id: "i3", name: "Сантехника Grohe", category: "Сантехника", status: "in_review", leadTimeDays: 30, targetStageId: "s9", quantity: 1, supplier: "Grohe", budget: 340000, notes: "Согласовать смеситель ванной" },
  { id: "i4", name: "Светильники Flos IC", category: "Свет", status: "approved", leadTimeDays: 45, targetStageId: "s8", quantity: 8, supplier: "Flos", budget: 156000, notes: "" },
  { id: "i5", name: "Кухня IKEA Metod", category: "Кухня", status: "pending", leadTimeDays: 75, targetStageId: "s10", quantity: 1, supplier: "IKEA", budget: 280000, notes: "Фасады на заказ" },
  { id: "i6", name: "Кондиционеры Daikin", category: "Климат", status: "approved", leadTimeDays: 35, targetStageId: "s4", quantity: 3, supplier: "Daikin", budget: 210000, notes: "" },
  { id: "i7", name: "Паркет Quick-Step", category: "Полы", status: "approved", leadTimeDays: 25, targetStageId: "s6", quantity: 48, supplier: "Quick-Step", budget: 92000, notes: "" },
  { id: "i8", name: "Радиаторы Zehnder", category: "Климат", status: "in_review", leadTimeDays: 40, targetStageId: "s4", quantity: 6, supplier: "Zehnder", budget: 180000, notes: "" },
  { id: "i9", name: "Мебель на заказ", category: "Мебель", status: "pending", leadTimeDays: 90, targetStageId: "s10", quantity: 1, supplier: "Столярная мастерская", budget: 520000, notes: "Стеллаж + ТВ-зона" },
  { id: "i10", name: "Электрофурнитура Schneider", category: "Электрика", status: "approved", leadTimeDays: 15, targetStageId: "s5", quantity: 1, supplier: "Schneider", budget: 45000, notes: "" },
  { id: "i11", name: "Обои Cole & Son", category: "Отделка", status: "pending", leadTimeDays: 60, targetStageId: "s6", quantity: 12, supplier: "WallDecor", budget: 78000, notes: "Fornasetti, акцентная стена" },
  { id: "i12", name: "Входная дверь Torex", category: "Двери", status: "approved", leadTimeDays: 30, targetStageId: "s7", quantity: 1, supplier: "Torex", budget: 85000, notes: "" },
  { id: "i13", name: "Зеркала по проекту", category: "Декор", status: "pending", leadTimeDays: 35, targetStageId: "s10", quantity: 2, supplier: "GlassArt", budget: 65000, notes: "" },
  { id: "i14", name: "Декоративная штукатурка", category: "Отделка", status: "in_review", leadTimeDays: 10, targetStageId: "s6", quantity: 1, supplier: "Decorazza", budget: 42000, notes: "" },
  { id: "i15", name: "Встроенные шкафы-купе", category: "Мебель", status: "pending", leadTimeDays: 60, targetStageId: "s10", quantity: 2, supplier: "Mr.Doors", budget: 320000, notes: "" },
];

function calcSupplyItem(item, stages) {
  const stage = stages.find(s => s.id === item.targetStageId);
  if (!stage) return { ...item, orderDeadline: null, deliveryForecast: null, daysUntilDeadline: null, riskCalc: "low", stageName: "—", stageStart: null };
  const stageStart = dd(stage.startDate);
  const orderDeadline = addD(stageStart, -item.leadTimeDays);
  const deliveryForecast = addD(TODAY, item.leadTimeDays);
  const daysUntil = diffD(todayStr, orderDeadline.toISOString().split("T")[0]);
  let riskCalc = "low";
  if (daysUntil < 0) riskCalc = "critical";
  else if (daysUntil <= 7) riskCalc = "high";
  else if (daysUntil <= 30) riskCalc = "medium";
  return { ...item, orderDeadline: orderDeadline.toISOString().split("T")[0], deliveryForecast: deliveryForecast.toISOString().split("T")[0], daysUntilDeadline: daysUntil, riskCalc, stageName: stage.name, stageStart: stage.startDate };
}

const CATEGORIES = [...new Set(SUPPLY_ITEMS_RAW.map(i => i.category))];

/* ═══════════════════════════════ STATUS MAPS ═══════════════════════════════ */

const ST = {
  issue: { bg: "#FEF0EC", text: "#DC4A2A", label: "Замечание" }, approved: { bg: "#ECFDF3", text: "#16A34A", label: "Принято" },
  resolved: { bg: "#ECFDF3", text: "#16A34A", label: "Исправлено" }, issues_found: { bg: "#FEF0EC", text: "#DC4A2A", label: "Есть замечания" },
  delivered: { bg: "#ECFDF3", text: "#16A34A", label: "Доставлено" }, ordered: { bg: "#EFF6FF", text: "#2563EB", label: "Заказано" },
  in_production: { bg: "#FFF7ED", text: "#D97706", label: "В производстве" }, pending: { bg: "#FFF7ED", text: "#D97706", label: "Ожидает" },
  paid: { bg: "#ECFDF3", text: "#16A34A", label: "Оплачен" }, planned: { bg: "#EFF6FF", text: "#2563EB", label: "Запланирован" },
  in_review: { bg: "#EFF6FF", text: "#2563EB", label: "На проверке" }, draft: { bg: "#F3F4F6", text: "#6B7280", label: "Черновик" },
  active: { bg: "#ECFDF3", text: "#16A34A", label: "Активный" }, completed: { bg: "#F3F4F6", text: "#6B7280", label: "Завершён" },
  critical: { bg: "#FEE2E2", text: "#DC2626", label: "Критично" }, high: { bg: "#FEF0EC", text: "#EA580C", label: "Высокий" },
  medium: { bg: "#FFF7ED", text: "#D97706", label: "Средний" }, low: { bg: "#ECFDF3", text: "#16A34A", label: "Низкий" },
};
const getS = (s) => ST[s] || { bg: "#F3F4F6", text: "#6B7280", label: s };

/* ═══════════════════════════════ ICONS ═══════════════════════════════ */

const I = {
  Folder: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  Check: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  Alert: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Camera: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Plus: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  ChevR: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  Download: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  File: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Box: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Map: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Users: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  LogOut: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Bell: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Image: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Grid: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Layers: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Receipt: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>,
  Calendar: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Settings: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.38.23.62.61.68 1.04"/></svg>,
  Link: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Clock: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Search: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Upload: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  Timeline: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="3" width="22" height="18" rx="2"/><line x1="1" y1="9" x2="23" y2="9"/><line x1="7" y1="3" x2="7" y2="21"/></svg>,
  List: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Info: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
};
const ic4 = "w-4 h-4";

/* ═══════════════════════════════ CSS ═══════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--f:'DM Sans',sans-serif;--fm:'JetBrains Mono',monospace}
body{font-family:var(--f);background:#F9FAFB;color:#111827;-webkit-font-smoothing:antialiased}
.fm{font-family:var(--fm)}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.af{animation:fadeIn .2s ease}.au{animation:slideUp .25s ease}.ar{animation:slideRight .25s ease}.ap{animation:pulse 2s infinite}

.sidebar{width:240px;background:#111827;color:#fff;display:flex;flex-direction:column;height:100vh;position:sticky;top:0;flex-shrink:0}
.si{display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:8px;color:rgba(255,255,255,.5);cursor:pointer;font-size:13px;transition:all .15s;margin-bottom:1px}
.si:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.8)}
.si.active{background:rgba(255,255,255,.1);color:#fff;font-weight:500}

.card{background:#fff;border:1px solid #E5E7EB;border-radius:12px;transition:all .15s}
.card:hover{border-color:#D1D5DB}
.badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:500;padding:2px 10px;border-radius:20px;white-space:nowrap}

.tn{display:flex;gap:0;border-bottom:1px solid #E5E7EB}
.ti{padding:10px 18px;font-size:13px;font-weight:500;color:#6B7280;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;white-space:nowrap;display:flex;align-items:center;gap:6px}
.ti:hover{color:#374151}.ti.active{color:#111827;border-bottom-color:#111827}

.stab{display:flex;gap:2px;background:#F3F4F6;border-radius:10px;padding:3px}
.stb{padding:7px 14px;font-size:12px;font-weight:500;color:#6B7280;cursor:pointer;border-radius:8px;transition:all .15s;border:none;background:transparent;font-family:var(--f);display:flex;align-items:center;gap:5px;white-space:nowrap}
.stb:hover{color:#374151}.stb.active{background:#fff;color:#111827;box-shadow:0 1px 3px rgba(0,0,0,.06)}

input,textarea,select{width:100%;padding:9px 13px;border:1px solid #E5E7EB;border-radius:9px;font-size:13px;font-family:var(--f);outline:none;transition:border .15s;background:#fff;color:#111827}
input:focus,textarea:focus,select:focus{border-color:#111827}

.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;font-size:13px;font-weight:500;font-family:var(--f);border:none;cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-dark{background:#111827;color:#fff}.btn-dark:hover{background:#1F2937}
.btn-outline{background:#fff;color:#374151;border:1px solid #E5E7EB}.btn-outline:hover{background:#F9FAFB}

.mo{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(3px);animation:fadeIn .15s ease}
.mb{background:#fff;border-radius:16px;padding:28px;width:480px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.15);animation:slideUp .2s ease}

.drawer-ov{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:100;backdrop-filter:blur(3px);animation:fadeIn .15s ease}
.drawer-box{position:fixed;top:0;right:0;bottom:0;width:480px;max-width:95vw;background:#fff;z-index:101;box-shadow:-10px 0 40px rgba(0,0,0,.1);overflow-y:auto;animation:slideRight .2s ease}

.login-bg{background:linear-gradient(135deg,#111827 0%,#1F2937 50%,#374151 100%);min-height:100vh;display:flex;align-items:center;justify-content:center}

.timeline-bar{position:absolute;height:24px;border-radius:6px;top:8px;display:flex;align-items:center;padding:0 8px;font-size:10px;font-weight:500;white-space:nowrap;overflow:hidden;transition:all .2s;cursor:pointer}
.timeline-bar:hover{filter:brightness(.95);transform:scaleY(1.08)}
.tl-today{position:absolute;top:0;bottom:0;width:2px;background:#DC2626;z-index:5}
.tl-today::before{content:'Сегодня';position:absolute;top:-18px;left:-20px;font-size:10px;color:#DC2626;font-weight:600;white-space:nowrap}
`;

/* ═══════════════════════════════ SHARED ═══════════════════════════════ */

function Bdg({ s }) { const m = getS(s); return <span className="badge" style={{ background: m.bg, color: m.text }}>{m.label}</span>; }
function Toast({ msg, onClose }) { useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]); return <div className="fixed bottom-6 right-6 z-[200] au"><div className="bg-[#111827] text-white text-sm px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2"><I.Check className="w-4 h-4 text-emerald-400" />{msg}</div></div>; }

/* ═══════════════════════════════ LOGIN ═══════════════════════════════ */

function LoginPage({ onLogin }) {
  const [e, setE] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(""); const [ld, setLd] = useState(false);
  const go = () => { setErr(""); if (e === "demo@archflow.app" && p === "demo12345") { setLd(true); setTimeout(onLogin, 700); } else setErr("demo@archflow.app / demo12345"); };
  return <div className="login-bg"><div className="au" style={{ width: 400, maxWidth: "92vw" }}>
    <div className="text-center mb-8"><div className="inline-flex items-center gap-2.5 mb-2"><div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center"><I.Layers className="w-5 h-5 text-[#111827]" /></div><span className="text-2xl font-bold text-white tracking-tight">Archflow</span></div><p className="text-sm text-white/40">Architecture Workflow Platform</p></div>
    <div className="bg-white rounded-2xl p-8 shadow-2xl"><h2 className="text-lg font-semibold mb-1">Войти</h2><p className="text-[13px] text-[#9CA3AF] mb-6">demo@archflow.app / demo12345</p>
      <div className="mb-4"><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Email</label><input placeholder="demo@archflow.app" value={e} onChange={x => setE(x.target.value)} onKeyDown={x => x.key === "Enter" && go()} /></div>
      <div className="mb-4"><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Пароль</label><input type="password" placeholder="demo12345" value={p} onChange={x => setP(x.target.value)} onKeyDown={x => x.key === "Enter" && go()} /></div>
      {err && <div className="text-[13px] text-red-600 mb-4 p-3 bg-red-50 rounded-lg">{err}</div>}
      <button className="btn btn-dark w-full justify-center py-3 text-sm" onClick={go}>{ld ? "Загрузка..." : "Войти"}</button>
    </div></div></div>;
}

/* ═══════════════════════════════ SHELL ═══════════════════════════════ */

function Sidebar({ page, onNav, onLogout }) {
  return <div className="sidebar">
    <div className="px-5 pt-5 pb-4 border-b border-white/[.08]"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center"><I.Layers className="w-4 h-4 text-white/70" /></div><span className="text-[15px] font-bold tracking-tight">Archflow</span></div></div>
    <nav className="p-3 flex-1"><div className="text-[10px] font-medium text-white/25 uppercase tracking-wider px-3 mb-2">Навигация</div>
      <div className={`si ${page === "projects" || page === "project" ? "active" : ""}`} onClick={() => onNav("projects")}><I.Folder className={ic4} />Проекты</div>
    </nav>
    <div className="p-3 border-t border-white/[.08]">
      <div className="si" onClick={onLogout}><I.LogOut className={ic4} />Выйти</div>
      <div className="flex items-center gap-2.5 px-3 py-2 mt-1"><div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold">АФ</div><div><div className="text-[12px] font-medium">Алиса Флоренс</div><div className="text-[10px] text-white/35">Дизайнер</div></div></div>
    </div></div>;
}

function Topbar({ title, breadcrumbs, actions }) {
  return <div className="px-7 py-4 flex items-center justify-between border-b border-[#E5E7EB] bg-white sticky top-0 z-10">
    <div>{breadcrumbs && <div className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF] mb-0.5">{breadcrumbs.map((b, i) => <span key={i} className="flex items-center gap-1.5">{i > 0 && <I.ChevR className="w-3 h-3" />}{b.onClick ? <span className="cursor-pointer hover:text-[#374151] transition-colors" onClick={b.onClick}>{b.label}</span> : <span className="text-[#6B7280]">{b.label}</span>}</span>)}</div>}<h1 className="text-[17px] font-semibold">{title}</h1></div>
    <div className="flex items-center gap-2">{actions}<button className="btn-outline rounded-lg p-2 relative border border-[#E5E7EB] bg-white cursor-pointer"><I.Bell className="w-[18px] h-[18px]" /><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" /></button></div>
  </div>;
}

/* ═══════════════════════════════ PROJECTS LIST ═══════════════════════════════ */

function ProjectsList({ onSelect }) {
  return <div className="af"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{PROJECTS.map(p => <div key={p.id} className="card p-5 cursor-pointer group" onClick={() => onSelect(p.id)}>
    <div className="flex justify-between items-start mb-3"><div className="flex-1 min-w-0"><h3 className="text-[15px] font-semibold truncate">{p.title}</h3><div className="flex items-center gap-1 text-[12px] text-[#9CA3AF] mt-1"><I.Map className="w-3 h-3 flex-shrink-0" /><span className="truncate">{p.address}</span></div></div><Bdg s={p.status} /></div>
    <div className="flex gap-5 text-center pt-3 border-t border-[#F3F4F6]">{[{ v: p.visits, l: "визитов" }, { v: p.photos, l: "фото" }, { v: p.openIssues, l: "замечаний" }].map((s, i) => <div key={i}><div className="text-[16px] font-semibold fm" style={i === 2 && s.v > 0 ? { color: "#DC4A2A" } : {}}>{s.v}</div><div className="text-[10px] text-[#9CA3AF] mt-0.5">{s.l}</div></div>)}<div className="flex-1" /><div className="flex items-center gap-2 self-center"><div className="h-1 bg-[#E5E7EB] rounded-sm overflow-hidden w-16"><div className="h-full bg-[#111827] rounded-sm" style={{ width: `${p.progress}%` }} /></div><span className="text-[12px] font-medium fm">{p.progress}%</span></div></div>
  </div>)}</div></div>;
}

/* ═══════════════════════════════ PROJECT DETAIL ═══════════════════════════════ */

function ProjectDetail({ projectId, onBack, toast }) {
  const project = PROJECTS.find(p => p.id === projectId) || PROJECTS[0];
  const [tab, setTab] = useState("overview");
  const [visitId, setVisitId] = useState(null);

  if (visitId) return <VisitDetailPage visitId={visitId} project={project} onBack={() => setVisitId(null)} toast={toast} />;

  const tabs = [
    { id: "overview", label: "Обзор", icon: I.Grid },
    { id: "journal", label: "Journal", icon: I.Camera },
    { id: "visits", label: "Визиты", icon: I.Calendar },
    { id: "supply", label: "Supply", icon: I.Box },
    { id: "docs", label: "Документы", icon: I.File },
    { id: "settings", label: "Настройки", icon: I.Settings },
  ];

  return <div className="af">
    <Topbar title={project.title} breadcrumbs={[{ label: "Проекты", onClick: onBack }, { label: project.title }]} actions={<button className="btn btn-outline"><I.Download className={ic4} />Экспорт</button>} />
    <div className="tn px-7">{tabs.map(t => <div key={t.id} className={`ti ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}><t.icon className="w-3.5 h-3.5" />{t.label}</div>)}</div>
    <div className="p-7">
      {tab === "overview" && <OverviewTab project={project} setTab={setTab} />}
      {tab === "journal" && <JournalTab project={project} onSelectVisit={setVisitId} toast={toast} />}
      {tab === "visits" && <VisitsTab project={project} toast={toast} />}
      {tab === "supply" && <FullSupplyModule project={project} toast={toast} />}
      {tab === "docs" && <DocsTab project={project} toast={toast} />}
      {tab === "settings" && <SettingsTab project={project} toast={toast} />}
    </div></div>;
}

/* ═══════════════════ OVERVIEW ═══════════════════ */

function OverviewTab({ project, setTab }) {
  const pVisits = VISITS.filter(v => v.projectId === project.id && v.type === "completed");
  const pInv = INVOICES.filter(i => i.projectId === project.id);
  const pendingInv = pInv.filter(i => i.status === "pending");
  return <div className="af">
    <div className="grid grid-cols-4 gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
      {[{ l: "Визитов", v: `${pVisits.length}/${project.contractVisits}`, icon: I.Camera }, { l: "Фото", v: project.photos, icon: I.Image }, { l: "Замечаний", v: project.openIssues, icon: I.Alert, danger: project.openIssues > 0 }, { l: "Счета", v: pendingInv.length > 0 ? `${pendingInv.length} к оплате` : "Оплачено", icon: I.Receipt, danger: pendingInv.length > 0 }].map((s, i) => <div key={i} className="card p-4"><div className="flex items-center gap-2 mb-2"><s.icon className="w-4 h-4 text-[#9CA3AF]" /><span className="text-[11px] text-[#9CA3AF]">{s.l}</span></div><div className="text-xl font-bold fm" style={s.danger ? { color: "#DC4A2A" } : {}}>{s.v}</div></div>)}
    </div>
    <div className="grid grid-cols-2 gap-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
      <div className="card p-5"><div className="flex justify-between items-center mb-4"><h3 className="text-[14px] font-semibold">Информация</h3><Bdg s={project.status} /></div>
        {[{ l: "Адрес", v: project.address }, { l: "Заказчик", v: project.owner }, { l: "Начало", v: fmt(project.startDate) }, { l: "Визитов по договору", v: project.contractVisits }].map((r, i) => <div key={i} className="flex justify-between py-2.5 border-b border-[#F3F4F6] last:border-none text-[13px]"><span className="text-[#9CA3AF]">{r.l}</span><span className="font-medium text-right">{r.v}</span></div>)}</div>
      <div className="card p-5"><div className="flex justify-between items-center mb-4"><h3 className="text-[14px] font-semibold">Последние визиты</h3><span className="text-[12px] text-[#6B7280] cursor-pointer hover:text-[#111827]" onClick={() => setTab("journal")}>Все →</span></div>
        {pVisits.slice(0, 4).map(v => <div key={v.id} className="flex items-center gap-3 py-2.5 border-b border-[#F3F4F6] last:border-none"><div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0"><I.Camera className="w-3.5 h-3.5 text-[#6B7280]" /></div><div className="flex-1 min-w-0"><div className="text-[13px] font-medium truncate">{v.title}</div><div className="text-[11px] text-[#9CA3AF]">{fmt(v.date)}</div></div><Bdg s={v.status} /></div>)}</div>
    </div></div>;
}

/* ═══════════════════ JOURNAL ═══════════════════ */

function JournalTab({ project, onSelectVisit, toast }) {
  const pVisits = VISITS.filter(v => v.projectId === project.id && v.type === "completed");
  const pInv = INVOICES.filter(i => i.projectId === project.id);
  const pendingInv = pInv.filter(i => i.status === "pending");
  const lastPaid = pInv.filter(i => i.status === "paid").sort((a, b) => dd(b.paidAt) - dd(a.paidAt))[0];
  const daysSinceLast = lastPaid ? daysBetween(lastPaid.issuedAt, todayStr) : null;
  const [showInvModal, setShowInvModal] = useState(false);

  return <div className="af">
    <div className="card p-5 mb-5 border-l-4" style={{ borderLeftColor: pendingInv.length > 0 ? "#D97706" : "#16A34A" }}>
      <div className="flex justify-between items-start">
        <div><div className="flex items-center gap-2 mb-2"><I.Receipt className="w-4 h-4 text-[#6B7280]" /><h3 className="text-[14px] font-semibold">Счета за авторский надзор</h3>
          {pendingInv.length > 0 && <span className="ap inline-flex items-center justify-center min-w-[20px] h-[20px] rounded-full bg-[#DC4A2A] text-white text-[11px] font-bold px-1.5">{pendingInv.length}</span>}</div>
          <div className="text-[13px] text-[#6B7280]">{pendingInv.length > 0 ? <span>Ожидает: <strong className="text-[#111827]">{fmtP(pendingInv.reduce((a, i) => a + i.amount, 0))}</strong></span> : <span className="text-[#16A34A]">Всё оплачено</span>}{daysSinceLast !== null && <span className="ml-3 text-[#9CA3AF]">· Последний {daysSinceLast} дн. назад</span>}</div></div>
        <button className="btn btn-dark" onClick={() => setShowInvModal(true)}><I.Receipt className={ic4} />Выставить</button>
      </div>
      <div className="mt-4 pt-3 border-t border-[#F3F4F6] space-y-2">{pInv.map(inv => <div key={inv.id} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: inv.status === "pending" ? "#FFFBFA" : "transparent" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: inv.status === "pending" ? "#FFF7ED" : "#ECFDF3" }}>{inv.status === "pending" ? <I.Clock className="w-4 h-4 text-[#D97706]" /> : <I.Check className="w-4 h-4 text-[#16A34A]" />}</div>
        <div className="flex-1 min-w-0"><div className="text-[13px] font-medium">{inv.title}</div><div className="text-[11px] text-[#9CA3AF]">выставлен {fmt(inv.issuedAt)}{inv.paidAt && ` · оплачен ${fmt(inv.paidAt)}`}</div></div>
        <div className="text-[14px] font-semibold fm">{fmtP(inv.amount)}</div><Bdg s={inv.status} /></div>)}</div>
    </div>
    <div className="flex justify-between items-center mb-4"><h3 className="text-[15px] font-semibold">Визиты</h3></div>
    <div className="relative"><div className="absolute left-[17px] top-4 bottom-4 w-px bg-[#E5E7EB]" />
      {pVisits.map(v => { const vP = PHOTO_RECORDS.filter(p => p.visitId === v.id); return <div key={v.id} className="relative ml-10 mb-3 card p-4 cursor-pointer group" onClick={() => onSelectVisit(v.id)}>
        <div className="absolute -left-[26px] top-[18px] w-2.5 h-2.5 rounded-full bg-[#111827] border-[3px] border-[#F9FAFB]" style={{ boxShadow: "0 0 0 1px #E5E7EB" }} />
        <div className="flex justify-between items-start mb-1.5"><div><span className="text-[13px] font-semibold fm">{fmt(v.date)}</span><span className="text-[12px] text-[#9CA3AF] ml-2">· {v.createdBy}</span></div><div className="flex items-center gap-2"><span className="text-[11px] text-[#9CA3AF] flex items-center gap-1"><I.Camera className="w-3 h-3" />{vP.length}</span><Bdg s={v.status} /></div></div>
        <h4 className="text-[14px] font-medium mb-1">{v.title}</h4><p className="text-[13px] text-[#6B7280]">{v.note}</p></div>; })}
    </div>
    {showInvModal && <div className="mo" onClick={() => setShowInvModal(false)}><div className="mb" onClick={e => e.stopPropagation()}><h2 className="text-lg font-semibold mb-5">Выставить счёт</h2>
      <div className="mb-4"><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Название</label><input defaultValue={`Авторский надзор — ${new Date().toLocaleString("ru-RU", { month: "long" })}`} /></div>
      <div className="mb-4"><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Сумма</label><input defaultValue={project.contractPayments?.supervision?.amount || 45000} /></div>
      <div className="mb-4"><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Срок оплаты</label><input type="date" /></div>
      <div className="flex gap-2 justify-end mt-6"><button className="btn btn-outline" onClick={() => setShowInvModal(false)}>Отмена</button><button className="btn btn-dark" onClick={() => { setShowInvModal(false); toast("Счёт выставлен"); }}>Выставить</button></div></div></div>}
  </div>;
}

/* ═══════════════════ VISITS ═══════════════════ */

function VisitsTab({ project, toast }) {
  const allV = VISITS.filter(v => v.projectId === project.id);
  const completed = allV.filter(v => v.type === "completed");
  const planned = allV.filter(v => v.type === "planned");
  const remaining = project.contractVisits - completed.length;
  const [showPlan, setShowPlan] = useState(false);
  return <div className="af">
    <div className="grid grid-cols-4 gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
      <div className="card p-4"><div className="text-[11px] text-[#9CA3AF] mb-1">По договору</div><div className="text-2xl font-bold fm">{project.contractVisits}</div></div>
      <div className="card p-4"><div className="text-[11px] text-[#9CA3AF] mb-1">Выполнено</div><div className="text-2xl font-bold fm text-[#16A34A]">{completed.length}</div></div>
      <div className="card p-4"><div className="text-[11px] text-[#9CA3AF] mb-1">Осталось</div><div className="text-2xl font-bold fm" style={{ color: remaining <= 2 ? "#DC4A2A" : "#111827" }}>{remaining}</div></div>
      <div className="card p-4"><div className="text-[11px] text-[#9CA3AF] mb-1">Запланировано</div><div className="text-2xl font-bold fm text-[#2563EB]">{planned.length}</div></div>
    </div>
    <div className="card p-4 mb-6"><div className="flex justify-between text-[12px] mb-2"><span className="text-[#6B7280]">Прогресс</span><span className="fm font-medium">{completed.length}/{project.contractVisits}</span></div><div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden"><div className="h-full bg-[#111827] rounded-full" style={{ width: `${(completed.length / project.contractVisits) * 100}%` }} /></div></div>
    <div className="flex justify-between items-center mb-4"><h3 className="text-[15px] font-semibold">Запланированные</h3><button className="btn btn-dark" onClick={() => setShowPlan(true)}><I.Calendar className={ic4} />Запланировать</button></div>
    {planned.length === 0 ? <div className="card p-8 text-center text-[13px] text-[#9CA3AF] mb-6">Нет запланированных визитов</div> :
      <div className="space-y-2 mb-6">{planned.map(v => <div key={v.id} className="card p-4 flex items-center gap-4 border-l-4 border-l-[#2563EB]"><div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0"><I.Calendar className="w-5 h-5 text-[#2563EB]" /></div><div className="flex-1"><div className="text-[14px] font-medium">{v.title}</div><div className="text-[12px] text-[#9CA3AF]">{fmt(v.date)}</div></div><Bdg s="planned" /></div>)}</div>}
    <h3 className="text-[15px] font-semibold mb-4">Выполненные</h3>
    <div className="space-y-2">{completed.map(v => <div key={v.id} className="card p-4 flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center flex-shrink-0"><I.Camera className="w-5 h-5 text-[#6B7280]" /></div><div className="flex-1"><div className="text-[14px] font-medium">{v.title}</div><div className="text-[12px] text-[#9CA3AF]">{fmt(v.date)}</div></div><Bdg s={v.status} /></div>)}</div>
    {showPlan && <div className="mo" onClick={() => setShowPlan(false)}><div className="mb" onClick={e => e.stopPropagation()}><h2 className="text-lg font-semibold mb-5">Запланировать визит</h2>
      <div className="mb-4"><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Название</label><input placeholder="Проверка штукатурки..." /></div>
      <div className="mb-4"><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Дата</label><input type="date" /></div>
      <div className="p-3 bg-[#EFF6FF] rounded-lg text-[12px] text-[#2563EB] mb-4">Осталось {remaining} визитов из {project.contractVisits}</div>
      <div className="flex gap-2 justify-end"><button className="btn btn-outline" onClick={() => setShowPlan(false)}>Отмена</button><button className="btn btn-dark" onClick={() => { setShowPlan(false); toast("Визит запланирован"); }}>Запланировать</button></div></div></div>}
  </div>;
}

/* ═══════════════════ VISIT DETAIL ═══════════════════ */

function VisitDetailPage({ visitId, project, onBack, toast }) {
  const visit = VISITS.find(v => v.id === visitId) || VISITS[0];
  const photos = PHOTO_RECORDS.filter(p => p.visitId === visit.id);
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? photos : photos.filter(p => p.status === filter);
  return <div className="af">
    <Topbar title={visit.title} breadcrumbs={[{ label: "Проекты" }, { label: project.title, onClick: onBack }, { label: visit.title }]} actions={<button className="btn btn-outline" onClick={() => toast("PDF сформирован")}><I.Download className={ic4} />Отчёт</button>} />
    <div className="p-7">
      <div className="card p-5 mb-5"><div className="flex items-center gap-2 mb-1"><span className="text-[14px] font-semibold fm">{fmt(visit.date)}</span><span className="text-[13px] text-[#9CA3AF]">· {visit.createdBy}</span><Bdg s={visit.status} /></div><p className="text-[13px] text-[#6B7280] mt-1">{visit.note}</p>
        <div className="flex gap-5 mt-4 pt-3 border-t border-[#F3F4F6]"><div className="flex items-center gap-1.5 text-[13px]"><I.Camera className={ic4} /><strong>{photos.length}</strong> <span className="text-[#9CA3AF]">фото</span></div><div className="flex items-center gap-1.5 text-[13px] text-emerald-600"><I.Check className={ic4} /><strong>{photos.filter(p => p.status === "approved").length}</strong> принято</div><div className="flex items-center gap-1.5 text-[13px] text-red-500"><I.Alert className={ic4} /><strong>{photos.filter(p => p.status === "issue").length}</strong> замечаний</div></div></div>
      <div className="flex justify-between items-center mb-4"><div className="stab">{[{ id: "all", l: `Все (${photos.length})` }, { id: "approved", l: "Принято" }, { id: "issue", l: "Замечания" }].map(t => <button key={t.id} className={`stb ${filter === t.id ? "active" : ""}`} onClick={() => setFilter(t.id)}>{t.l}</button>)}</div><button className="btn btn-dark" onClick={() => toast("Фото добавлено")}><I.Camera className={ic4} />Добавить</button></div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">{filtered.map(ph => <div key={ph.id} className="card overflow-hidden"><div className="w-full aspect-[4/3] bg-gradient-to-br from-[#F3F4F6] to-[#E5E7EB] flex items-center justify-center relative rounded-t-xl"><I.Image className="w-10 h-10 text-[#D1D5DB]" /><div className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/85 text-[#6B7280]">{ph.zone}</div></div><div className="p-3.5"><p className="text-[13px] leading-relaxed mb-2.5">{ph.comment}</p><Bdg s={ph.status} /></div></div>)}</div>
    </div></div>;
}

/* ═══════════════════ FULL SUPPLY MODULE ═══════════════════ */

function FullSupplyModule({ project, toast }) {
  const [subTab, setSubTab] = useState("dashboard");
  const [scenario, setScenario] = useState(project.scenarioType || "block");
  const stages = scenario === "block" ? STAGES_BLOCK : STAGES_GKL;
  const items = useMemo(() => SUPPLY_ITEMS_RAW.map(i => calcSupplyItem(i, stages)), [scenario]);

  const subTabs = [
    { id: "dashboard", label: "Обзор", icon: I.Grid },
    { id: "spec", label: "Спецификация", icon: I.List },
    { id: "timeline", label: "Timeline", icon: I.Timeline },
    { id: "stages", label: "Этапы", icon: I.Layers },
    { id: "import", label: "Импорт", icon: I.Upload },
    { id: "settings", label: "Настройки", icon: I.Settings },
  ];

  return <div className="af">
    <div className="stab mb-5 w-fit">{subTabs.map(t => <button key={t.id} className={`stb ${subTab === t.id ? "active" : ""}`} onClick={() => setSubTab(t.id)}><t.icon className="w-3.5 h-3.5" />{t.label}</button>)}</div>
    {subTab === "dashboard" && <SupplyDashboard items={items} stages={stages} onNav={setSubTab} />}
    {subTab === "spec" && <SupplySpec items={items} toast={toast} />}
    {subTab === "timeline" && <SupplyTimeline items={items} />}
    {subTab === "stages" && <SupplyStages scenario={scenario} setScenario={setScenario} />}
    {subTab === "import" && <SupplyImport toast={toast} />}
    {subTab === "settings" && <SupplySettings scenario={scenario} setScenario={setScenario} toast={toast} />}
  </div>;
}

function SupplyDashboard({ items, stages, onNav }) {
  const critical = items.filter(i => i.riskCalc === "critical");
  const high = items.filter(i => i.riskCalc === "high");
  const pending = items.filter(i => i.status === "pending" || i.status === "in_review");
  const needOrder = items.filter(i => i.daysUntilDeadline !== null && i.daysUntilDeadline <= 14 && i.status !== "approved");
  return <div className="af">
    <div className="grid grid-cols-4 gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }}>
      {[{ l: "Всего позиций", v: items.length, icon: I.Box, sub: fmtP(items.reduce((a, i) => a + i.budget, 0)) }, { l: "Требуют согласования", v: pending.length, icon: I.Clock, c: pending.length > 0 ? "#D97706" : undefined }, { l: "Пора заказывать", v: needOrder.length, icon: I.Alert, c: needOrder.length > 0 ? "#EA580C" : undefined }, { l: "Критические", v: critical.length, icon: I.Alert, c: critical.length > 0 ? "#DC2626" : undefined }].map((s, i) => <div key={i} className="card p-4"><div className="flex items-center gap-2 mb-2"><s.icon className="w-4 h-4 text-[#9CA3AF]" /><span className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">{s.l}</span></div><div className="text-2xl font-bold fm" style={s.c ? { color: s.c } : {}}>{s.v}</div>{s.sub && <div className="text-[11px] text-[#9CA3AF] mt-1">{s.sub}</div>}</div>)}
    </div>
    {(critical.length > 0 || high.length > 0) && <div className="card p-5 mb-6 border-l-4 border-l-[#DC2626]"><h3 className="text-[14px] font-semibold mb-3 flex items-center gap-2 text-[#DC2626]"><I.Alert className="w-4 h-4" />Критические предупреждения</h3><div className="space-y-2">{[...critical, ...high].slice(0, 5).map(item => <div key={item.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg" style={{ background: item.riskCalc === "critical" ? "#FEF2F2" : "#FFFBEB" }}><div><div className="text-[13px] font-medium">{item.name}</div><div className="text-[11px] text-[#6B7280]">{item.riskCalc === "critical" ? `Просрочено на ${Math.abs(item.daysUntilDeadline)} дн.` : `Дедлайн через ${item.daysUntilDeadline} дн.`}</div></div><Bdg s={item.riskCalc} /></div>)}</div></div>}
    <div className="grid grid-cols-2 gap-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
      <div className="card p-5"><h3 className="text-[14px] font-semibold mb-3">Ближайшие этапы</h3>{stages.filter(s => dd(s.endDate) >= TODAY).slice(0, 4).map(s => <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-[#F3F4F6] last:border-none"><div className="w-7 h-7 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-[11px] font-bold fm text-[#6B7280]">{s.order}</div><div className="flex-1"><div className="text-[13px] font-medium">{s.name}</div><div className="text-[11px] text-[#9CA3AF] fm">{fmtS(s.startDate)} — {fmtS(s.endDate)}</div></div>{dd(s.startDate) <= TODAY && dd(s.endDate) >= TODAY && <Bdg s="planned" />}</div>)}</div>
      <div className="card p-5 flex flex-col gap-3"><h3 className="text-[14px] font-semibold mb-1">Быстрые действия</h3><button className="btn btn-dark w-full justify-center" onClick={() => onNav("spec")}><I.List className={ic4} />Спецификация</button><button className="btn btn-dark w-full justify-center" onClick={() => onNav("timeline")}><I.Timeline className={ic4} />Procurement Timeline</button><button className="btn btn-outline w-full justify-center" onClick={() => onNav("import")}><I.Upload className={ic4} />Импорт Excel</button></div>
    </div></div>;
}

function SupplySpec({ items, toast }) {
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [critOnly, setCritOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const filtered = items.filter(i => { if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false; if (statusF !== "all" && i.status !== statusF) return false; if (critOnly && i.riskCalc !== "critical" && i.riskCalc !== "high") return false; return true; });
  const overdueCount = items.filter(i => i.riskCalc === "critical").length;

  return <div className="af">
    <div className="flex gap-3 mb-4 flex-wrap">{[{ l: "Не согласовано", v: items.filter(i => i.status !== "approved").length, c: "#D97706" }, { l: "Пора заказывать", v: items.filter(i => i.daysUntilDeadline !== null && i.daysUntilDeadline <= 14).length, c: "#EA580C" }, { l: "Просрочено", v: overdueCount, c: "#DC2626" }].map((s, i) => <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB]"><span className="text-[12px] text-[#6B7280]">{s.l}</span><span className="text-[14px] font-bold fm" style={{ color: s.v > 0 ? s.c : "#9CA3AF" }}>{s.v}</span></div>)}</div>
    <div className="flex gap-2 mb-4 flex-wrap items-center">
      <div className="relative flex-1 max-w-[220px]"><I.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" /><input className="w-full pl-9" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ width: "auto" }}><option value="all">Все статусы</option><option value="approved">Согласовано</option><option value="pending">Ожидает</option><option value="in_review">На проверке</option></select>
      <label className="flex items-center gap-2 text-[12px] cursor-pointer"><input type="checkbox" checked={critOnly} onChange={e => setCritOnly(e.target.checked)} className="accent-[#111827]" style={{ width: 16, height: 16, padding: 0, border: "none" }} />Только критичные</label>
    </div>
    <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">{["Позиция", "Статус", "Поставка", "Этап", "Заказать до", "Риск", "Бюджет"].map(h => <th key={h} className="text-left text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
      <tbody>{filtered.map(item => <tr key={item.id} className="border-b border-[#F3F4F6] cursor-pointer hover:bg-[#F9FAFB] transition-colors" onClick={() => setSelected(item)} style={item.riskCalc === "critical" ? { background: "#FEF2F2" } : {}}>
        <td className="px-4 py-3"><div className="font-medium">{item.name}</div><div className="text-[11px] text-[#9CA3AF]">{item.supplier}</div></td>
        <td className="px-4 py-3"><Bdg s={item.status} /></td>
        <td className="px-4 py-3 fm text-[#6B7280]">{item.leadTimeDays} дн.</td>
        <td className="px-4 py-3 text-[#6B7280] text-[12px]">{item.stageName}</td>
        <td className="px-4 py-3 fm" style={{ color: item.riskCalc === "critical" ? "#DC2626" : "#6B7280" }}>{item.orderDeadline ? fmt(item.orderDeadline) : "—"}</td>
        <td className="px-4 py-3"><Bdg s={item.riskCalc} /></td>
        <td className="px-4 py-3 fm font-medium">{fmtP(item.budget)}</td>
      </tr>)}</tbody></table></div></div>

    {selected && <><div className="drawer-ov" onClick={() => setSelected(null)} /><div className="drawer-box"><div className="p-6">
      <div className="flex justify-between items-start mb-6"><h2 className="text-lg font-semibold flex-1">{selected.name}</h2><button className="p-1 hover:bg-[#F3F4F6] rounded-lg cursor-pointer border-none bg-transparent" onClick={() => setSelected(null)}><I.X className="w-5 h-5 text-[#6B7280]" /></button></div>
      <div className="w-full h-[160px] rounded-xl bg-gradient-to-br from-[#F3F4F6] to-[#E5E7EB] flex items-center justify-center mb-6"><I.Box className="w-12 h-12 text-[#D1D5DB]" /></div>
      <div className="flex gap-2 mb-5"><Bdg s={selected.status} /><Bdg s={selected.riskCalc} /></div>
      <div className="space-y-2 mb-5">{[{ l: "Поставщик", v: selected.supplier }, { l: "Категория", v: selected.category }, { l: "Кол-во", v: selected.quantity }, { l: "Бюджет", v: fmtP(selected.budget) }, { l: "Срок поставки", v: `${selected.leadTimeDays} дней` }, { l: "Этап монтажа", v: `${selected.stageName}${selected.stageStart ? ` (${fmtS(selected.stageStart)})` : ""}` }, { l: "Заказать до", v: selected.orderDeadline ? fmt(selected.orderDeadline) : "—" }].map((r, i) => <div key={i} className="flex justify-between text-[13px] py-2 border-b border-[#F3F4F6] last:border-none"><span className="text-[#9CA3AF]">{r.l}</span><span className="font-medium">{r.v}</span></div>)}</div>
      {selected.notes && <div className="card p-4 mb-5 bg-[#F9FAFB]"><div className="text-[11px] text-[#9CA3AF] mb-1">Примечания</div><div className="text-[13px]">{selected.notes}</div></div>}
      {(selected.riskCalc === "critical" || selected.riskCalc === "high") && <div className="p-4 rounded-xl border-l-4 mb-5" style={{ background: "#FEF2F2", borderLeftColor: "#DC2626" }}><div className="flex items-center gap-2 text-[13px] font-semibold text-[#DC2626] mb-1"><I.Alert className="w-4 h-4" />Предупреждение</div><div className="text-[12px] text-[#6B7280]">{selected.riskCalc === "critical" ? `Дедлайн заказа прошёл ${Math.abs(selected.daysUntilDeadline)} дн. назад. Этап «${selected.stageName}» может быть сдвинут.` : `До дедлайна ${selected.daysUntilDeadline} дн. Без согласования есть риск сдвига этапа «${selected.stageName}».`}</div></div>}
      <button className="btn btn-dark w-full justify-center" onClick={() => { setSelected(null); toast("Позиция согласована"); }}>Согласовать</button>
    </div></div></>}
  </div>;
}

function SupplyTimeline({ items }) {
  const [hovered, setHovered] = useState(null);
  const tlStart = dd("2026-02-01"); const tlEnd = dd("2026-08-01");
  const totalD = diffD(tlStart.toISOString(), tlEnd.toISOString());
  const toPos = (ds) => Math.max(0, Math.min(100, (diffD(tlStart.toISOString(), ds) / totalD) * 100));
  const todayPos = toPos(todayStr);
  const months = []; const cur = new Date(tlStart); while (cur < tlEnd) { months.push({ label: cur.toLocaleDateString("ru-RU", { month: "short" }), pos: toPos(cur.toISOString()) }); cur.setMonth(cur.getMonth() + 1); }
  const sorted = [...items].sort((a, b) => (a.orderDeadline || "z").localeCompare(b.orderDeadline || "z"));
  const barClr = (i) => i.riskCalc === "critical" ? { bg: "#FEE2E2", bd: "#FECACA", t: "#DC2626" } : i.riskCalc === "high" ? { bg: "#FFF7ED", bd: "#FED7AA", t: "#EA580C" } : i.riskCalc === "medium" ? { bg: "#FFFBEB", bd: "#FDE68A", t: "#D97706" } : { bg: "#F0FDF4", bd: "#BBF7D0", t: "#16A34A" };

  return <div className="af">
    <div className="flex justify-between items-center mb-4"><div><h3 className="text-[15px] font-semibold">Procurement Timeline</h3><p className="text-[12px] text-[#9CA3AF]">Сроки закупки и поставки</p></div>
      <div className="flex gap-4 text-[11px]">{[{ c: "#DC2626", l: "Просрочено" }, { c: "#D97706", l: "Скоро" }, { c: "#16A34A", l: "ОК" }].map(lg => <div key={lg.l} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: lg.c, opacity: .3 }} /><span className="text-[#6B7280]">{lg.l}</span></div>)}</div></div>
    <div className="card overflow-hidden">
      <div className="flex border-b border-[#E5E7EB]"><div className="w-[180px] flex-shrink-0 px-4 py-2 bg-[#F9FAFB] text-[10px] font-medium text-[#9CA3AF] uppercase">Позиция</div><div className="flex-1 relative bg-[#F9FAFB] border-l border-[#E5E7EB]">{months.map((m, i) => <span key={i} className="text-[10px] text-[#9CA3AF] absolute py-2 px-1" style={{ left: `${m.pos}%` }}>{m.label}</span>)}</div></div>
      <div className="relative">{sorted.map(item => { const c = barClr(item); const oP = item.orderDeadline ? toPos(item.orderDeadline) : 0; const dP = item.stageStart ? toPos(item.stageStart) : 100; const bS = Math.max(0, oP); const bW = Math.max(3, dP - bS);
        return <div key={item.id} className="flex border-b border-[#F3F4F6] hover:bg-[#FAFAFA]" style={item.riskCalc === "critical" ? { background: "#FEF2F2" } : {}}>
          <div className="w-[180px] flex-shrink-0 px-3 py-2 flex items-center gap-2 border-r border-[#F3F4F6]"><div className="flex-1 min-w-0"><div className="text-[11px] font-medium truncate">{item.name}</div><div className="text-[10px] text-[#9CA3AF]">{item.leadTimeDays}д</div></div><Bdg s={item.riskCalc} /></div>
          <div className="flex-1 relative" style={{ height: 40 }} onMouseEnter={() => setHovered(item.id)} onMouseLeave={() => setHovered(null)}>
            <div className="timeline-bar" style={{ left: `${bS}%`, width: `${bW}%`, background: c.bg, border: `1px solid ${c.bd}`, color: c.t }}>{bW > 10 && item.name}</div>
            {item.orderDeadline && <div style={{ position: "absolute", left: `${oP}%`, top: 6, width: 3, height: 28, background: c.t, borderRadius: 2, opacity: .7 }} />}
            {hovered === item.id && <div className="absolute z-10 bg-[#111827] text-white text-[11px] px-3 py-2 rounded-lg" style={{ left: `${Math.min(bS + bW / 2, 75)}%`, top: -48, transform: "translateX(-50%)", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,.3)" }}>Заказать: {item.orderDeadline ? fmt(item.orderDeadline) : "—"} → Монтаж: {item.stageStart ? fmtS(item.stageStart) : "—"}</div>}
          </div></div>; })}
        <div className="tl-today" style={{ left: `calc(180px + (100% - 180px) * ${todayPos / 100})` }} /></div>
    </div></div>;
}

function SupplyStages({ scenario, setScenario }) {
  const stages = scenario === "block" ? STAGES_BLOCK : STAGES_GKL;
  return <div className="af">
    <div className="flex justify-between items-center mb-5"><div><h3 className="text-[15px] font-semibold">Этапы стройки</h3></div>
      <div className="stab">{[{ id: "block", l: "Блок" }, { id: "gkl", l: "ГКЛ" }].map(s => <button key={s.id} className={`stb ${scenario === s.id ? "active" : ""}`} onClick={() => setScenario(s.id)}>{s.l}</button>)}</div></div>
    <div className="card p-4 mb-5 bg-[#EFF6FF] border-[#BFDBFE]"><div className="flex items-start gap-2 text-[12px] text-[#2563EB]"><I.Info className="w-4 h-4 flex-shrink-0 mt-0.5" />Тип перегородок влияет на последовательность этапов и сроки заказа позиций.</div></div>
    <div className="space-y-2">{stages.map(s => { const isActive = dd(s.startDate) <= TODAY && dd(s.endDate) >= TODAY; const isDone = dd(s.endDate) < TODAY;
      return <div key={s.id} className="card p-4 flex items-center gap-4" style={isActive ? { borderColor: "#2563EB", borderLeftWidth: 4 } : isDone ? { opacity: .6 } : {}}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-bold fm" style={{ background: isActive ? "#EFF6FF" : isDone ? "#ECFDF3" : "#F3F4F6", color: isActive ? "#2563EB" : isDone ? "#16A34A" : "#9CA3AF" }}>{s.order}</div>
        <div className="flex-1"><div className="text-[14px] font-medium">{s.name}</div><div className="text-[12px] text-[#9CA3AF] fm">{fmtS(s.startDate)} — {fmtS(s.endDate)}</div></div>
        {isDone && <Bdg s="approved" />}{isActive && <Bdg s="planned" />}
      </div>; })}</div></div>;
}

function SupplyImport({ toast }) {
  const [step, setStep] = useState(1);
  const mappings = [["Наименование", "Item name"], ["Статус", "Status"], ["Срок поставки", "Lead time"], ["Этап", "Target stage"], ["Кол-во", "Quantity"], ["Поставщик", "Supplier"]];
  return <div className="af">
    <h3 className="text-[15px] font-semibold mb-5">Импорт из Excel</h3>
    <div className="flex items-center gap-0 mb-8">{["Загрузка", "Маппинг", "Превью", "Готово"].map((l, i) => <><div key={l} className={`flex items-center gap-2 text-[13px] ${step === i + 1 ? "text-[#111827] font-semibold" : step > i + 1 ? "text-[#16A34A]" : "text-[#9CA3AF]"}`}><div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[12px] font-bold ${step === i + 1 ? "border-[#111827] bg-[#111827] text-white" : step > i + 1 ? "border-[#16A34A] bg-[#16A34A] text-white" : "border-[#E5E7EB] bg-white text-[#9CA3AF]"}`}>{step > i + 1 ? <I.Check className="w-3.5 h-3.5" /> : i + 1}</div>{l}</div>{i < 3 && <div className={`w-10 h-0.5 mx-1 ${step > i + 1 ? "bg-[#16A34A]" : "bg-[#E5E7EB]"}`} />}</>)}</div>
    {step === 1 && <div className="card p-8"><div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-12 text-center cursor-pointer hover:border-[#111827] hover:bg-[#F9FAFB] transition-all" onClick={() => setStep(2)}><I.Upload className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3" /><div className="text-[15px] font-medium mb-1">Перетащите Excel-файл сюда</div><div className="text-[13px] text-[#9CA3AF]">.xlsx, .xls</div></div></div>}
    {step === 2 && <div className="card p-6"><h4 className="text-[14px] font-semibold mb-4">Сопоставление колонок</h4><table className="w-full text-[13px] mb-6"><thead><tr className="border-b border-[#E5E7EB]"><th className="text-left py-2 text-[11px] text-[#9CA3AF] uppercase">Excel</th><th className="text-left py-2 text-[11px] text-[#9CA3AF] uppercase">Archflow</th></tr></thead><tbody>{mappings.map(([e, f]) => <tr key={e} className="border-b border-[#F3F4F6]"><td className="py-3 font-medium">{e}</td><td className="py-3"><select defaultValue={f} style={{ width: "auto" }}><option>{f}</option></select></td></tr>)}</tbody></table><div className="flex gap-2 justify-end"><button className="btn btn-outline" onClick={() => setStep(1)}>Назад</button><button className="btn btn-dark" onClick={() => setStep(3)}>Далее</button></div></div>}
    {step === 3 && <div className="card p-6"><h4 className="text-[14px] font-semibold mb-4">Превью</h4><div className="text-[13px] text-[#6B7280] mb-4">5 строк из 124</div><div className="flex gap-2 justify-end"><button className="btn btn-outline" onClick={() => setStep(2)}>Назад</button><button className="btn btn-dark" onClick={() => setStep(4)}>Импортировать</button></div></div>}
    {step === 4 && <div className="card p-8 text-center"><div className="w-16 h-16 rounded-full bg-[#ECFDF3] flex items-center justify-center mx-auto mb-4"><I.Check className="w-8 h-8 text-[#16A34A]" /></div><h4 className="text-[18px] font-semibold mb-2">Импорт завершён</h4><div className="text-[13px] text-[#6B7280] mb-6">Импортировано: <strong>124</strong> · Требуют проверки: <strong className="text-[#D97706]">8</strong></div><button className="btn btn-dark" onClick={() => { setStep(1); toast("Позиции импортированы"); }}>К спецификации</button></div>}
  </div>;
}

function SupplySettings({ scenario, setScenario, toast }) {
  return <div className="af"><h3 className="text-[15px] font-semibold mb-5">Настройки</h3><div className="card p-6 max-w-[500px]">
    <div className="mb-5"><label className="block text-[12px] font-medium text-[#6B7280] mb-2">Тип перегородок</label><div className="stab">{[{ id: "block", l: "Блок" }, { id: "gkl", l: "ГКЛ" }].map(s => <button key={s.id} className={`stb ${scenario === s.id ? "active" : ""}`} onClick={() => setScenario(s.id)}>{s.l}</button>)}</div></div>
    <div className="mb-5"><label className="block text-[12px] font-medium text-[#6B7280] mb-2">Буфер между этапами (дней)</label><input type="number" defaultValue={3} style={{ width: 120 }} /></div>
    <div className="mb-5"><label className="block text-[12px] font-medium text-[#6B7280] mb-2">Дата старта</label><input type="date" defaultValue="2026-03-01" style={{ width: 180 }} /></div>
    <div className="mb-5"><label className="block text-[12px] font-medium text-[#6B7280] mb-2">Предупреждать за</label><select defaultValue="14" style={{ width: 160 }}><option value="7">7 дней</option><option value="14">14 дней</option><option value="30">30 дней</option></select></div>
    <button className="btn btn-dark" onClick={() => toast("Сохранено")}>Сохранить</button></div></div>;
}

/* ═══════════════════ DOCS ═══════════════════ */

function DocsTab({ project, toast }) {
  const docs = PROJECT_DOCS.filter(d => d.projectId === project.id);
  const fc = { PDF: { bg: "#FEE2E2", t: "#DC2626" }, DWG: { bg: "#DBEAFE", t: "#2563EB" }, XLSX: { bg: "#D1FAE5", t: "#059669" }, PNG: { bg: "#FEF3C7", t: "#D97706" } };
  return <div className="af"><div className="flex justify-between items-center mb-5"><h3 className="text-[15px] font-semibold">Документация</h3><button className="btn btn-dark" onClick={() => toast("Загружено")}><I.Plus className={ic4} />Загрузить</button></div>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">{docs.map(d => { const c = fc[d.format] || { bg: "#F3F4F6", t: "#6B7280" }; return <div key={d.id} className="card p-4 cursor-pointer" onClick={() => toast(`Открыт: ${d.title}`)}><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold" style={{ background: c.bg, color: c.t }}>{d.format}</div><div className="flex-1 min-w-0"><h4 className="text-[13px] font-medium truncate">{d.title}</h4><div className="text-[11px] text-[#9CA3AF] mt-0.5">{d.version} · {d.uploadedBy}</div></div></div><div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F3F4F6]"><span className="text-[11px] text-[#9CA3AF] fm">{fmt(d.createdAt)}</span><Bdg s={d.status} /></div></div>; })}</div></div>;
}

/* ═══════════════════ SETTINGS (Roles + Details) ═══════════════════ */

function SettingsTab({ project, toast }) {
  const [sub, setSub] = useState("roles");
  const members = PROJECT_MEMBERS.filter(m => m.projectId === project.id);
  const roleLabels = { client: "Заказчик", contractor: "Подрядчик", supplier: "Комплектатор", assistant: "Ассистент" };

  return <div className="af">
    <div className="stab w-fit mb-6">{[{ id: "roles", l: "Роли и доступ", icon: I.Users }, { id: "details", l: "Детали проекта", icon: I.Settings }].map(t => <button key={t.id} className={`stb ${sub === t.id ? "active" : ""}`} onClick={() => setSub(t.id)}><t.icon className="w-3.5 h-3.5" />{t.l}</button>)}</div>

    {sub === "roles" && <div>
      <div className="flex justify-between items-center mb-5"><h3 className="text-[15px] font-semibold">Участники</h3><button className="btn btn-dark" onClick={() => toast("Ссылка скопирована")}><I.Link className={ic4} />Пригласить</button></div>
      <div className="space-y-3">{members.map(m => <div key={m.id} className="card p-4"><div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center flex-shrink-0 text-[13px] font-semibold text-[#6B7280]">{m.name.split(" ").map(w => w[0]).join("")}</div>
        <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-[14px] font-medium">{m.name}</span><span className="badge bg-[#F3F4F6] text-[#6B7280]">{roleLabels[m.role] || m.role}</span></div><div className="text-[12px] text-[#9CA3AF] mt-0.5">{m.email}</div></div>
        <select className="text-[12px] border border-[#E5E7EB] rounded-lg px-3 py-1.5 bg-white cursor-pointer" style={{ width: "auto", fontFamily: "var(--f)" }} defaultValue={m.access} onChange={() => toast("Доступ обновлён")}><option value="view">Только просмотр</option><option value="view_comment_photo">Просмотр + фото</option><option value="view_supply">Просмотр Supply</option><option value="full">Полный доступ</option></select>
      </div></div>)}</div>
      <div className="card p-5 mt-5"><h4 className="text-[13px] font-semibold mb-3">Шаблоны ролей</h4>{[{ r: "Заказчик", d: "Только просмотр" }, { r: "Подрядчик", d: "Просмотр + фото + комментарии в Journal" }, { r: "Комплектатор", d: "Просмотр Supply, обновление статусов" }, { r: "Ассистент", d: "По усмотрению дизайнера" }].map((r, i) => <div key={i} className="flex gap-3 py-2 border-b border-[#F3F4F6] last:border-none text-[12px]"><span className="font-medium min-w-[120px]">{r.r}</span><span className="text-[#6B7280]">{r.d}</span></div>)}</div>
    </div>}

    {sub === "details" && <div>
      <h3 className="text-[15px] font-semibold mb-5">Детали проекта</h3>
      <div className="grid grid-cols-2 gap-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
        <div className="card p-5"><h4 className="text-[13px] font-semibold mb-4 flex items-center gap-2"><I.Calendar className="w-4 h-4 text-[#9CA3AF]" />Даты и визиты</h4>
          <div className="space-y-4"><div><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Дата начала</label><input type="date" defaultValue={project.startDate} /></div><div><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Визитов по договору</label><input type="number" defaultValue={project.contractVisits} /></div></div></div>
        <div className="card p-5"><h4 className="text-[13px] font-semibold mb-4 flex items-center gap-2"><I.Receipt className="w-4 h-4 text-[#9CA3AF]" />Оплаты</h4>
          <div className="space-y-4"><div><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Авторский надзор (в мес.)</label><input defaultValue={fmtP(project.contractPayments?.supervision?.amount || 0)} /></div><div><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Следующая оплата</label><input type="date" defaultValue={project.contractPayments?.supervision?.nextDue || ""} /></div><div><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Проектирование</label><input defaultValue={fmtP(project.contractPayments?.design?.amount || 0)} /></div></div></div>
        <div className="card p-5"><h4 className="text-[13px] font-semibold mb-4 flex items-center gap-2"><I.Box className="w-4 h-4 text-[#9CA3AF]" />Комплектация</h4>
          <div className="space-y-4"><div><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Скидка (%)</label><input type="number" defaultValue={project.supplyDiscount} /></div><div><label className="block text-xs font-medium text-[#6B7280] mb-1.5">Комиссия (%)</label><input type="number" defaultValue={project.contractPayments?.supply?.commission || 0} /></div></div></div>
        <div className="card p-5 flex items-end"><button className="btn btn-dark w-full justify-center py-3" onClick={() => toast("Сохранено")}>Сохранить</button></div>
      </div></div>}
  </div>;
}

/* ═══════════════════════════════ APP ═══════════════════════════════ */

export default function App() {
  const [auth, setAuth] = useState(false);
  const [page, setPage] = useState("projects");
  const [projectId, setProjectId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toast = useCallback(msg => setToastMsg(msg), []);

  if (!auth) return <><style>{CSS}</style><LoginPage onLogin={() => setAuth(true)} /></>;

  return <><style>{CSS}</style>
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar page={page} onNav={p => { setPage(p); setProjectId(null); }} onLogout={() => { setAuth(false); setPage("projects"); setProjectId(null); }} />
      <div className="flex-1 overflow-x-hidden">
        {page === "projects" && <><Topbar title="Проекты" actions={<button className="btn btn-dark" onClick={() => toast("Проект создан")}><I.Plus className={ic4} />Новый проект</button>} /><div className="p-7"><ProjectsList onSelect={id => { setProjectId(id); setPage("project"); }} /></div></>}
        {page === "project" && projectId && <ProjectDetail projectId={projectId} onBack={() => { setProjectId(null); setPage("projects"); }} toast={toast} />}
      </div>
    </div>
    {toastMsg && <Toast msg={toastMsg} onClose={() => setToastMsg(null)} />}
  </>;
}
