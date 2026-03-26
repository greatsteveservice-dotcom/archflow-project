/**
 * Export utilities for Archflow
 * CSV export with BOM for correct UTF-8 handling in Excel
 */

function escapeCsvField(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsvField).join(',');
  const dataLines = rows.map(row => row.map(escapeCsvField).join(','));
  return '\uFEFF' + [headerLine, ...dataLines].join('\n'); // BOM for Excel UTF-8
}

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const VISIT_STATUS_LABELS: Record<string, string> = {
  planned: 'Запланирован',
  approved: 'Принят',
  issues_found: 'Есть замечания',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  paid: 'Оплачен',
  pending: 'Ожидает',
  overdue: 'Просрочен',
};

export function exportVisitsCsv(
  visits: { title: string; date: string; status: string; author?: { full_name?: string }; photo_count?: number; issue_count?: number }[],
  projectTitle: string,
) {
  const headers = ['Название', 'Дата', 'Статус', 'Автор', 'Фото', 'Замечания'];
  const rows = visits.map(v => [
    v.title,
    v.date,
    VISIT_STATUS_LABELS[v.status] || v.status,
    v.author?.full_name || '',
    v.photo_count ?? 0,
    v.issue_count ?? 0,
  ]);
  const csv = toCsv(headers, rows);
  downloadCsv(`${projectTitle} — визиты.csv`, csv);
}

export function exportInvoicesCsv(
  invoices: { title: string; amount: number; status: string; due_date?: string | null; issued_at?: string | null }[],
  projectTitle: string,
) {
  const headers = ['Название', 'Сумма', 'Статус', 'Срок оплаты', 'Дата выставления'];
  const rows = invoices.map(i => [
    i.title,
    i.amount,
    INVOICE_STATUS_LABELS[i.status] || i.status,
    i.due_date || '',
    i.issued_at || '',
  ]);
  const csv = toCsv(headers, rows);
  downloadCsv(`${projectTitle} — счета.csv`, csv);
}

export function exportSupplyItemsCsv(
  items: { name: string; category?: string | null; status: string; supplier?: string | null; budget?: number; lead_time_days?: number; quantity?: number; stageName?: string }[],
  projectTitle: string,
) {
  const headers = ['Позиция', 'Категория', 'Этап', 'Поставщик', 'Кол-во', 'Бюджет', 'Срок поставки (дн.)', 'Статус'];
  const rows = items.map(i => [
    i.name,
    i.category || '',
    i.stageName || '',
    i.supplier || '',
    i.quantity ?? '',
    i.budget ?? '',
    i.lead_time_days ?? '',
    i.status,
  ]);
  const csv = toCsv(headers, rows);
  downloadCsv(`${projectTitle} — комплектация.csv`, csv);
}
