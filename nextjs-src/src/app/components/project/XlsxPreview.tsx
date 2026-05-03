'use client';

import { useEffect, useState } from 'react';

// ============================================================
// XlsxPreview — лёгкий inline-превью для .xlsx / .xls файлов.
// Скачивает файл через переданный URL, парсит первый лист через
// SheetJS и рендерит как HTML-таблицу. Никакие данные не уходят
// за пределы браузера (в отличие от Office Online viewer).
// Ограничение — 500 строк на лист, чтобы не уронить вкладку на
// больших комплектациях.
// ============================================================

const MAX_ROWS = 500;
const MAX_COLS = 50;

interface XlsxPreviewProps {
  fileUrl: string;
  fileName: string;
}

interface SheetData {
  name: string;
  rows: (string | number | null)[][];
  truncatedRows: boolean;
  truncatedCols: boolean;
  totalRows: number;
}

export default function XlsxPreview({ fileUrl, fileName }: XlsxPreviewProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        // Lazy-import keeps the SheetJS bundle off the main chunk.
        const XLSX = await import('xlsx');
        const wb = XLSX.read(buf, { type: 'array' });
        const parsed: SheetData[] = wb.SheetNames.map((sheetName) => {
          const sheet = wb.Sheets[sheetName];
          const all = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
            header: 1,
            defval: null,
            blankrows: false,
          });
          const totalRows = all.length;
          const trimmedRows = all.slice(0, MAX_ROWS);
          let maxCols = 0;
          for (const row of trimmedRows) maxCols = Math.max(maxCols, row.length);
          const truncatedCols = maxCols > MAX_COLS;
          const finalRows = trimmedRows.map((r) => r.slice(0, MAX_COLS));
          return {
            name: sheetName,
            rows: finalRows,
            truncatedRows: totalRows > MAX_ROWS,
            truncatedCols,
            totalRows,
          };
        });
        if (cancelled) return;
        setSheets(parsed);
        setActiveSheet(0);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Не удалось открыть файл');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fileUrl]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Открываем {fileName}…
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 12 }}>
        Не удалось открыть превью: {error}
      </div>
    );
  }
  if (sheets.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 12 }}>
        В файле нет листов
      </div>
    );
  }

  const sheet = sheets[activeSheet];

  return (
    <div style={{ border: '1px solid #EBEBEB', background: '#FFF' }}>
      {sheets.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, borderBottom: '1px solid #EBEBEB' }}>
          {sheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActiveSheet(i)}
              style={{
                padding: '8px 14px',
                fontFamily: 'var(--af-font)',
                fontSize: 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: i === activeSheet ? '#111' : '#FFF',
                color: i === activeSheet ? '#FFF' : '#111',
                border: 'none',
                borderRight: '1px solid #EBEBEB',
                cursor: 'pointer',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div style={{ overflow: 'auto', maxHeight: '70vh' }}>
        <table style={{ borderCollapse: 'collapse', fontFamily: 'var(--af-font)', fontSize: 12, width: '100%' }}>
          <tbody>
            {sheet.rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri === 0 ? '#FAFAF8' : 'transparent' }}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      border: '1px solid #EBEBEB',
                      padding: '6px 10px',
                      whiteSpace: 'nowrap',
                      fontWeight: ri === 0 ? 600 : 400,
                      color: '#111',
                    }}
                  >
                    {cell == null ? '' : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(sheet.truncatedRows || sheet.truncatedCols) && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid #EBEBEB', fontSize: 10, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {sheet.truncatedRows ? `Показано ${MAX_ROWS} из ${sheet.totalRows} строк · ` : ''}
          {sheet.truncatedCols ? `обрезано до ${MAX_COLS} колонок · ` : ''}
          скачайте файл для полного содержимого
        </div>
      )}
    </div>
  );
}
