/* eslint-disable jsx-a11y/alt-text */
// ============================================================
// Generate PDF for Visit Report (Авторский Надзор).
// Layout (без обложки, согласно текущему ТЗ):
//   Page 1  — метаданные: «АВТОРСКИЙ НАДЗОР / ОТЧЕТ / Объект /
//             Дата / Общий комментарий / Список замечаний»
//   Page 2+ — каждое фото-вложение отдельной страницей с подписью.
// ============================================================

import path from 'node:path';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import type { VisitReport, VisitRemarkWithDetails, ReportAttachment, Project } from './types';

// Register Vollkorn SC for cyrillic — react-pdf default Helvetica won't render russian.
let _fontsRegistered = false;
function ensureFonts() {
  if (_fontsRegistered) return;
  const fontDir = path.join(process.cwd(), 'public', 'fonts');
  Font.register({
    family: 'VollkornSC',
    fonts: [
      { src: path.join(fontDir, 'VollkornSC-Regular.ttf') },
      { src: path.join(fontDir, 'VollkornSC-Bold.ttf'), fontWeight: 700 },
    ],
  });
  _fontsRegistered = true;
}

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: 'VollkornSC',
    fontSize: 11,
    color: '#111111',
    backgroundColor: '#FFFFFF',
  },
  // ─── Page 1 ─────────────────────────────────────────────
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 36,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#111111',
  },
  topbarKicker: {
    fontSize: 9,
    letterSpacing: 1.6,
    color: '#666666',
  },
  topbarMeta: {
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#666666',
  },
  reportTitle: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 28,
    letterSpacing: 1,
  },
  metaBlock: {
    marginBottom: 24,
  },
  metaLabel: {
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#888888',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  generalBlock: {
    marginTop: 12,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F6F6F4',
    borderLeftWidth: 2,
    borderLeftColor: '#111111',
  },
  generalLabel: {
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#666666',
    marginBottom: 6,
  },
  generalText: {
    fontSize: 12,
    lineHeight: 1.5,
    color: '#111111',
  },
  remarksHeader: {
    marginTop: 20,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#111111',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  remarksTitle: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 0.6,
  },
  remarksCount: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#666666',
  },
  remarkRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EBEBEB',
  },
  remarkNum: {
    width: 28,
    fontSize: 10,
    fontWeight: 700,
    color: '#888888',
  },
  remarkBody: {
    flex: 1,
    paddingRight: 8,
  },
  remarkText: {
    fontSize: 11,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  remarkMeta: {
    fontSize: 9,
    color: '#888888',
    letterSpacing: 0.6,
  },
  remarkStatus: {
    width: 76,
    fontSize: 9,
    letterSpacing: 1,
    textAlign: 'right',
  },
  // ─── Page 2+ (attachments) ──────────────────────────────
  attachPage: {
    padding: 48,
    fontFamily: 'VollkornSC',
    backgroundColor: '#FFFFFF',
  },
  attachHeader: {
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#111111',
    marginBottom: 24,
  },
  attachTitle: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0.6,
  },
  attachSub: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#888888',
    marginTop: 4,
  },
  attachImage: {
    width: '100%',
    maxHeight: 620,
    objectFit: 'contain',
  },
  emptyHint: {
    fontSize: 11,
    color: '#999999',
    fontStyle: 'italic',
    paddingVertical: 16,
  },
});

const STATUS_LABEL: Record<string, string> = {
  open: 'ОТКРЫТО',
  in_progress: 'В РАБОТЕ',
  resolved: 'РЕШЕНО',
};
const STATUS_COLOR: Record<string, string> = {
  open: '#B8862A',
  in_progress: '#666666',
  resolved: '#2E7D32',
};

function formatRuDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface ImageBlob {
  attachment: ReportAttachment;
  /** data: URI for inline rendering; null when fetch failed. */
  dataUri: string | null;
}

interface ReportPdfProps {
  report: VisitReport;
  remarks: VisitRemarkWithDetails[];
  project: Project;
  /** Pre-fetched image attachments (only image/* mime). */
  images: ImageBlob[];
}

function ReportPdfDocument({ report, remarks, project, images }: ReportPdfProps) {
  ensureFonts();
  const ordered = [...remarks].sort((a, b) => a.number - b.number);

  return (
    <Document
      title={`Отчёт АН — ${project.title} — ${formatRuDate(report.visit_date)}`}
      author="Archflow"
    >
      {/* ─────── Page 1: metadata + remarks list ─────── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topbar}>
          <Text style={styles.topbarKicker}>АВТОРСКИЙ НАДЗОР</Text>
          <Text style={styles.topbarMeta}>
            archflow.ru · Сформировано {formatRuDate(new Date().toISOString())}
          </Text>
        </View>

        <Text style={styles.reportTitle}>ОТЧЁТ</Text>

        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>ОБЪЕКТ</Text>
          <Text style={styles.metaValue}>
            {project.address?.trim() || project.title}
          </Text>
          {project.address ? (
            <Text style={[styles.metaValue, { fontSize: 11, fontWeight: 400, color: '#666', marginTop: 2 }]}>
              {project.title}
            </Text>
          ) : null}
        </View>

        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>ДАТА ПОСЕЩЕНИЯ</Text>
          <Text style={styles.metaValue}>{formatRuDate(report.visit_date)}</Text>
        </View>

        {report.general_comment?.trim() ? (
          <View style={styles.generalBlock}>
            <Text style={styles.generalLabel}>ОБЩИЙ КОММЕНТАРИЙ</Text>
            <Text style={styles.generalText}>{report.general_comment.trim()}</Text>
          </View>
        ) : null}

        <View style={styles.remarksHeader}>
          <Text style={styles.remarksTitle}>Замечания</Text>
          <Text style={styles.remarksCount}>{ordered.length} ШТ.</Text>
        </View>

        {ordered.length === 0 ? (
          <Text style={styles.emptyHint}>Замечаний нет.</Text>
        ) : (
          ordered.map((r) => (
            <View key={r.id} style={styles.remarkRow} wrap={false}>
              <Text style={styles.remarkNum}>{String(r.number).padStart(2, '0')}</Text>
              <View style={styles.remarkBody}>
                <Text style={styles.remarkText}>{r.text || '—'}</Text>
                {(r.deadline || r.assignee) ? (
                  <Text style={styles.remarkMeta}>
                    {r.deadline ? `Срок: ${formatRuDate(r.deadline)}` : ''}
                    {r.deadline && r.assignee ? '   ·   ' : ''}
                    {r.assignee ? `Ответственный: ${r.assignee.full_name || r.assignee.email}` : ''}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.remarkStatus, { color: STATUS_COLOR[r.status] || '#666' }]}>
                {STATUS_LABEL[r.status] || r.status.toUpperCase()}
              </Text>
            </View>
          ))
        )}
      </Page>

      {/* ─────── Page 2+: одно фото на страницу ─────── */}
      {images
        .filter((img) => img.dataUri !== null)
        .map((img, idx) => (
          <Page key={img.attachment.file_url} size="A4" style={styles.attachPage}>
            <View style={styles.attachHeader}>
              <Text style={styles.attachTitle}>ФОТО {String(idx + 1).padStart(2, '0')}</Text>
              <Text style={styles.attachSub}>{img.attachment.name}</Text>
            </View>
            <Image src={img.dataUri as string} style={styles.attachImage} />
          </Page>
        ))}
    </Document>
  );
}

export { ReportPdfDocument };
export type { ImageBlob, ReportPdfProps };
