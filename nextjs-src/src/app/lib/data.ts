// ============ TYPES ============
export type ProjectStatus = "active" | "completed";
export type PhotoStatus = "issue" | "approved" | "in_progress" | "new";

export interface Project {
  id: number;
  title: string;
  address: string;
  status: ProjectStatus;
  visits: number;
  photos: number;
  lastActivity: string;
  progress: number;
  client: string;
}

export interface Visit {
  id: number;
  projectId: number;
  date: string;
  note: string;
  photos: number;
  issues: number;
  resolved: number;
  author: string;
}

export interface PhotoRecord {
  id: number;
  visitId: number;
  comment: string;
  status: PhotoStatus;
  zone: string;
}

// ============ DATA ============
export const PROJECTS: Project[] = [
  { id: 1, title: "Квартира на Патриарших", address: "Москва, Б. Патриарший пер. 8", status: "active", visits: 12, photos: 48, lastActivity: "2 ч. назад", progress: 65, client: "Анна Козлова" },
  { id: 2, title: "Загородный дом в Барвихе", address: "Барвиха, ул. Рублёвская 15", status: "active", visits: 8, photos: 34, lastActivity: "вчера", progress: 40, client: "Сергей Петров" },
  { id: 3, title: "Офис на Белой Площади", address: "Москва, ул. Лесная 7", status: "completed", visits: 24, photos: 96, lastActivity: "2 нед. назад", progress: 100, client: "ООО Берёза" },
  { id: 4, title: "Студия на Чистых прудах", address: "Москва, Чистопрудный бул. 12", status: "active", visits: 3, photos: 11, lastActivity: "3 дня назад", progress: 15, client: "Мария Иванова" },
];

export const VISITS: Visit[] = [
  { id: 1, projectId: 1, date: "04.03.2026", note: "Проверка монтажа перегородок", photos: 6, issues: 2, resolved: 1, author: "Алиса Флоренс" },
  { id: 2, projectId: 1, date: "28.02.2026", note: "Приёмка электромонтажа", photos: 8, issues: 3, resolved: 3, author: "Алиса Флоренс" },
  { id: 3, projectId: 1, date: "20.02.2026", note: "Проверка разводки сантехники", photos: 5, issues: 1, resolved: 1, author: "Алиса Флоренс" },
  { id: 4, projectId: 1, date: "14.02.2026", note: "Разметка помещений", photos: 4, issues: 0, resolved: 0, author: "Алиса Флоренс" },
];

export const PHOTOS: PhotoRecord[] = [
  { id: 1, visitId: 1, comment: "Перегородка в спальне — отклонение от проекта на 5 см вправо", status: "issue", zone: "Спальня" },
  { id: 2, visitId: 1, comment: "Проём в гостиную — размеры соответствуют проекту", status: "approved", zone: "Гостиная" },
  { id: 3, visitId: 1, comment: "Ниша под TV — глубина недостаточна, нужно углубить на 3 см", status: "issue", zone: "Гостиная" },
  { id: 4, visitId: 1, comment: "Перегородка в ванной — OK", status: "approved", zone: "Ванная" },
  { id: 5, visitId: 1, comment: "Короб под вентиляцию на кухне — ОК", status: "approved", zone: "Кухня" },
  { id: 6, visitId: 1, comment: "Дверной проём в детскую — ОК", status: "approved", zone: "Детская" },
];

export const STATUS_CONFIG: Record<PhotoStatus, { label: string; color: string; bg: string }> = {
  issue: { label: "Замечание", color: "text-zhan-danger", bg: "bg-zhan-danger-bg" },
  approved: { label: "Принято", color: "text-zhan-success", bg: "bg-zhan-success-bg" },
  in_progress: { label: "В работе", color: "text-zhan-warning", bg: "bg-zhan-warning-bg" },
  new: { label: "Новое", color: "text-zhan-text-muted", bg: "bg-gray-100" },
};

export const ACTIVITY_LOG = [
  { color: "bg-zhan-accent", text: "Вы добавили 6 фото в визит «Проверка монтажа перегородок»", time: "2 ч. назад" },
  { color: "bg-zhan-danger", text: "Замечание «Перегородка в спальне» — срок истекает завтра", time: "5 ч. назад" },
  { color: "bg-zhan-warning", text: "Анна Козлова просмотрела отчёт по визиту 28.02", time: "вчера" },
  { color: "bg-zhan-success", text: "Замечание «Разводка сантехники» — исправлено подрядчиком", time: "2 дня назад" },
  { color: "bg-zhan-accent", text: "Сергей Петров принял приглашение в проект", time: "3 дня назад" },
];
