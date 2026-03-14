export const PROJECTS = [
  { id: 1, title: "Квартира на Патриарших", address: "Москва, Б. Патриарший пер. 8", status: "active", visits: 12, photos: 48, lastActivity: "2 ч. назад", progress: 65, client: "Анна Козлова" },
  { id: 2, title: "Загородный дом в Барвихе", address: "Барвиха, ул. Рублёвская 15", status: "active", visits: 8, photos: 34, lastActivity: "вчера", progress: 40, client: "Сергей Петров" },
  { id: 3, title: "Офис на Белой Площади", address: "Москва, ул. Лесная 7", status: "completed", visits: 24, photos: 96, lastActivity: "2 нед. назад", progress: 100, client: "ООО Берёза" },
  { id: 4, title: "Студия на Чистых прудах", address: "Москва, Чистопрудный бул. 12", status: "active", visits: 3, photos: 11, lastActivity: "3 дня назад", progress: 15, client: "Мария Иванова" },
];

export const VISITS = [
  { id: 1, projectId: 1, date: "04.03.2026", note: "Проверка монтажа перегородок", photos: 6, issues: 2, resolved: 1, author: "Алиса Флоренс" },
  { id: 2, projectId: 1, date: "28.02.2026", note: "Приёмка электромонтажа", photos: 8, issues: 3, resolved: 3, author: "Алиса Флоренс" },
  { id: 3, projectId: 1, date: "20.02.2026", note: "Проверка разводки сантехники", photos: 5, issues: 1, resolved: 1, author: "Алиса Флоренс" },
  { id: 4, projectId: 1, date: "14.02.2026", note: "Разметка помещений", photos: 4, issues: 0, resolved: 0, author: "Алиса Флоренс" },
];

export const PHOTOS = [
  { id: 1, visitId: 1, comment: "Перегородка в спальне — отклонение от проекта на 5 см вправо", status: "issue", zone: "Спальня" },
  { id: 2, visitId: 1, comment: "Проём в гостиную — размеры соответствуют проекту", status: "approved", zone: "Гостиная" },
  { id: 3, visitId: 1, comment: "Ниша под TV — глубина недостаточна, нужно углубить на 3 см", status: "issue", zone: "Гостиная" },
  { id: 4, visitId: 1, comment: "Перегородка в ванной — OK", status: "approved", zone: "Ванная" },
  { id: 5, visitId: 1, comment: "Короб под вентиляцию на кухне — ОК", status: "approved", zone: "Кухня" },
  { id: 6, visitId: 1, comment: "Дверной проём в детскую — ОК", status: "approved", zone: "Детская" },
];

export const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  issue: { label: "Замечание", color: "#E85D3A", bg: "#FEF0EC" },
  approved: { label: "Принято", color: "#2A9D5C", bg: "#EAFAF1" },
  in_progress: { label: "В работе", color: "#D4930D", bg: "#FFF8E7" },
  new: { label: "Новое", color: "#6B7280", bg: "#F3F4F6" },
};
