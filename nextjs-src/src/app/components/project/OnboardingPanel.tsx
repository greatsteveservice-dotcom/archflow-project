'use client';

// ============================================================
// OnboardingPanel — массовая загрузка документов с AI-классификацией.
// Появляется в Дизайне когда есть pending файлы в очереди или папки пусты.
// ============================================================

import { useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useOnboardingPending } from '../../lib/hooks';
import {
  classifyOnboardingBatch,
  confirmOnboardingItem,
  rejectOnboardingItem,
} from '../../lib/queries';
import { DESIGN_FOLDERS } from '../../lib/types';
import type { DesignFolder, OnboardingUpload } from '../../lib/types';

/**
 * Per-user allowlist for the staged AI onboarding rollout.
 * Lower-cased emails. Add entries here to expand the rollout; remove to revoke.
 * When the feature graduates to general availability, replace this gate with
 * `user_module_settings.ai_onboarding_enabled` per the original spec.
 */
const ONBOARDING_ALLOWED_EMAILS = new Set<string>([
  'kolunov@stador.ru',
]);

const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB
const MAX_FILES = 100;

interface Props {
  projectId: string;
  toast: (msg: string) => void;
  /** Показывать дропзону даже если очередь пуста (например, в пустых папках). */
  forceVisible?: boolean;
  onSwitchToSupply?: () => void;
}

export default function OnboardingPanel(props: Props) {
  // Allowlist gate lives in the outer component so the inner one always runs
  // its hooks in the same order regardless of who is logged in. Returning
  // early between hook calls breaks the rules of hooks and was the cause of
  // a crash to the global error boundary mid-upload.
  const { user } = useAuth();
  const allowed = !!user?.email && ONBOARDING_ALLOWED_EMAILS.has(user.email.toLowerCase());
  if (!allowed) return null;
  return <OnboardingPanelInner {...props} />;
}

function OnboardingPanelInner({ projectId, toast, forceVisible, onSwitchToSupply }: Props) {
  const { data: items, refetch } = useOnboardingPending(projectId);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ uploaded: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleItems: OnboardingUpload[] = items || [];
  const placed = visibleItems.filter((i) => i.status === 'auto_placed' || i.status === 'confirmed');
  // Treat unfinished `pending` rows as needing review — that way files whose
  // classification call was interrupted don't silently disappear from the UI.
  const review = visibleItems.filter((i) => i.status === 'needs_review' || i.status === 'pending');
  const supply = visibleItems.filter((i) => i.status === 'supply_suggested');
  const hasContent = placed.length + review.length + supply.length > 0;

  const handleFiles = useCallback(
    async (rawFiles: FileList | null) => {
      if (!rawFiles || rawFiles.length === 0) return;
      const files = Array.from(rawFiles);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (files.length > MAX_FILES) {
        toast(`Максимум ${MAX_FILES} файлов за раз`);
        return;
      }
      const tooLarge = files.filter((f) => f.size > MAX_SIZE);
      if (tooLarge.length > 0) {
        toast(`Файл «${tooLarge[0].name}» больше 2 ГБ`);
        return;
      }

      setBusy(true);
      setProgress({ uploaded: 0, total: files.length });

      const uploaded: { storagePath: string; name: string; size: number; mime: string }[] = [];

      let failed = 0;
      try {
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const id = crypto.randomUUID();
          const path = `_onboarding/${projectId}/${id}_${safe}`;

          const { error: upErr } = await supabase.storage
            .from('design-files')
            .upload(path, f, { contentType: f.type, upsert: false });

          if (upErr) {
            console.error('upload error', f.name, upErr);
            toast(`Не удалось загрузить «${f.name}»`);
            failed += 1;
          } else {
            uploaded.push({ storagePath: path, name: f.name, size: f.size, mime: f.type || 'application/octet-stream' });
          }
          // Progress reflects "files we tried", regardless of success — it
          // matches what the user sees in the queue (1/N → N/N) without
          // pretending failures didn't happen.
          setProgress({ uploaded: uploaded.length + failed, total: files.length });
        }

        if (uploaded.length === 0) {
          return;
        }

        await classifyOnboardingBatch(projectId, uploaded);
        await refetch();
        const okMsg = `Распознали ${uploaded.length} ${pluralFiles(uploaded.length)}`;
        toast(failed > 0 ? `${okMsg}, ${failed} не загрузилось` : okMsg);
      } catch (err) {
        console.error('onboarding error', err);
        toast(err instanceof Error ? err.message : 'Не удалось распознать');
        // Make sure the failed batch becomes reviewable instead of stuck on `pending`.
        await refetch();
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [projectId, refetch, toast],
  );

  const shouldShow = forceVisible || hasContent || busy;
  if (!shouldShow) return null;

  return (
    <div style={{ marginBottom: 24, border: '1px solid var(--af-ochre)', background: '#FFF' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #EBEBEB', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: 'var(--af-font)', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Загрузить документы разом
        </div>
        {hasContent && (
          <div style={{ fontSize: 11, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Разложили {placed.length} · проверка {review.length}
          </div>
        )}
      </div>

      {/* Drop zone */}
      <DropZone busy={busy} progress={progress} onFiles={handleFiles} fileInputRef={fileInputRef} forceVisible={!!forceVisible} hasContent={hasContent} />

      {/* Auto-placed list */}
      {placed.length > 0 && (
        <Section title="Разнесли автоматически" muted>
          {placed.map((it) => <PlacedRow key={it.id} item={it} />)}
        </Section>
      )}

      {/* Needs review */}
      {review.length > 0 && (
        <Section title="Нужна проверка" emphasis>
          {review.map((it) => (
            <ReviewRow
              key={it.id}
              item={it}
              onConfirm={async (cat) => {
                try {
                  await confirmOnboardingItem(it.id, cat);
                  toast('Файл перенесён');
                  refetch();
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Ошибка');
                }
              }}
              onReject={async () => {
                try {
                  await rejectOnboardingItem(it.id);
                  toast('Файл удалён');
                  refetch();
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Ошибка');
                }
              }}
            />
          ))}
        </Section>
      )}

      {/* Supply suggested */}
      {supply.length > 0 && (
        <Section title="Похоже на комплектацию" emphasis>
          {supply.map((it) => (
            <SupplyRow
              key={it.id}
              item={it}
              onSwitchToSupply={onSwitchToSupply}
              onReject={async () => {
                try {
                  await rejectOnboardingItem(it.id);
                  refetch();
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Ошибка');
                }
              }}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

// ── DropZone ──
function DropZone({
  busy,
  progress,
  onFiles,
  fileInputRef,
  forceVisible,
  hasContent,
}: {
  busy: boolean;
  progress: { uploaded: number; total: number } | null;
  onFiles: (files: FileList | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  forceVisible: boolean;
  hasContent: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  const compact = hasContent && !forceVisible;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (busy) return;
        onFiles(e.dataTransfer.files);
      }}
      style={{
        padding: compact ? '20px' : '48px 24px',
        margin: 12,
        border: `2px dashed ${dragOver ? 'var(--af-ochre)' : '#EBEBEB'}`,
        background: dragOver ? '#F6F6F4' : 'transparent',
        textAlign: 'center',
        cursor: busy ? 'wait' : 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onClick={() => !busy && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => onFiles(e.target.files)}
        disabled={busy}
      />
      {busy && progress ? (
        <div>
          <div style={{ fontSize: compact ? 14 : 22, fontWeight: 700, fontFamily: 'var(--af-font)', marginBottom: 8 }}>
            Загружаем {progress.uploaded} из {progress.total}
          </div>
          <div style={{ height: 2, background: '#EBEBEB', maxWidth: 320, margin: '0 auto' }}>
            <div style={{ height: '100%', background: 'var(--af-ochre)', width: `${(progress.uploaded / progress.total) * 100}%`, transition: 'width 0.2s' }} />
          </div>
        </div>
      ) : compact ? (
        <div style={{ fontSize: 13, color: '#666' }}>+ Добавить ещё файлов или перетащить сюда</div>
      ) : (
        <>
          <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--af-font)', marginBottom: 12, lineHeight: 1.1 }}>
            Перетащите все документы сюда
          </div>
          <div style={{ fontSize: 13, color: '#666', maxWidth: 480, margin: '0 auto 16px', lineHeight: 1.5 }}>
            ТЗ, чертежи, рендеры, договор, спецификации мебели, Excel — без разбора.
            Archflow распознаёт каждый файл и кладёт в нужную папку.
          </div>
          <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999' }}>
            До 100 файлов · 2 ГБ макс.
          </div>
        </>
      )}
    </div>
  );
}

// ── Section wrapper ──
function Section({ title, emphasis, muted, children }: { title: string; emphasis?: boolean; muted?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid #EBEBEB' }}>
      <div style={{ padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: emphasis ? 'var(--af-ochre)' : muted ? '#999' : '#111', fontWeight: 700 }}>
          {title}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ── PlacedRow ──
function PlacedRow({ item }: { item: OnboardingUpload }) {
  const cat = DESIGN_FOLDERS.find((f) => f.id === item.final_category);
  return (
    <div style={{ padding: '8px 18px', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, fontSize: 13, borderTop: '1px solid #F6F6F4' }}>
      <div>
        <div style={{ fontWeight: 600 }}>{item.file_name}</div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
          {cat ? `${cat.index} · ${cat.label}` : item.final_category}
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#999', alignSelf: 'center' }}>
        {item.ai_confidence != null ? `${Math.round(item.ai_confidence * 100)}%` : ''}
      </div>
      <div style={{ fontSize: 11, color: '#999', alignSelf: 'center' }}>{formatSize(item.file_size)}</div>
    </div>
  );
}

// ── ReviewRow ──
function ReviewRow({
  item,
  onConfirm,
  onReject,
}: {
  item: OnboardingUpload;
  onConfirm: (cat: DesignFolder) => void | Promise<void>;
  onReject: () => void | Promise<void>;
}) {
  const guess = useMemo(() => {
    if (item.ai_category && DESIGN_FOLDERS.some((f) => f.id === item.ai_category)) {
      return item.ai_category as DesignFolder;
    }
    return 'documents' as DesignFolder;
  }, [item.ai_category]);

  const [chosen, setChosen] = useState<DesignFolder>(guess);
  const [pending, setPending] = useState(false);
  const guessLabel = DESIGN_FOLDERS.find((f) => f.id === guess);

  return (
    <div style={{ padding: '12px 18px', borderTop: '1px solid #F6F6F4' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{item.file_name}</span>
        <span style={{ fontSize: 11, color: 'var(--af-ochre)' }}>
          {item.ai_confidence != null ? `${Math.round(item.ai_confidence * 100)}%` : ''}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
        Похоже на: <strong>{guessLabel ? `${guessLabel.index} · ${guessLabel.label}` : '—'}</strong>
        {item.ai_reasoning ? ` · ${item.ai_reasoning}` : ''}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={chosen}
          onChange={(e) => setChosen(e.target.value as DesignFolder)}
          style={{
            padding: '6px 10px', fontFamily: 'var(--af-font)', fontSize: 12,
            border: '1px solid #EBEBEB', background: '#FFF', borderRadius: 0,
          }}
        >
          {DESIGN_FOLDERS.map((f) => (
            <option key={f.id} value={f.id}>{f.index} · {f.label}</option>
          ))}
        </select>
        <button
          disabled={pending}
          onClick={async () => { setPending(true); try { await onConfirm(chosen); } finally { setPending(false); } }}
          style={btnStyle(true)}
        >
          {pending ? '…' : 'Подтвердить'}
        </button>
        <button
          disabled={pending}
          onClick={async () => { setPending(true); try { await onReject(); } finally { setPending(false); } }}
          style={btnStyle(false)}
        >
          Не нужно
        </button>
      </div>
    </div>
  );
}

// ── SupplyRow ──
function SupplyRow({
  item,
  onSwitchToSupply,
  onReject,
}: {
  item: OnboardingUpload;
  onSwitchToSupply?: () => void;
  onReject: () => void | Promise<void>;
}) {
  return (
    <div style={{ padding: '12px 18px', borderTop: '1px solid #F6F6F4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{item.file_name}</div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
          Похоже на Excel-комплектацию · {item.ai_reasoning || 'импортировать в модуль Supply'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {onSwitchToSupply && (
          <button onClick={onSwitchToSupply} style={btnStyle(true)}>Открыть Supply</button>
        )}
        <button onClick={onReject} style={btnStyle(false)}>Не нужно</button>
      </div>
    </div>
  );
}

// ── helpers ──
function btnStyle(primary: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    background: primary ? '#111' : '#FFF',
    color: primary ? '#FFF' : '#111',
    border: `1px solid ${primary ? '#111' : '#EBEBEB'}`,
    fontFamily: 'var(--af-font)',
    fontSize: 11,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderRadius: 0,
    fontWeight: 600,
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} кб`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} ГБ`;
}

function pluralFiles(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'файл';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'файла';
  return 'файлов';
}
