'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { DocumentSignature, SignatureStatus } from '../../lib/types';

interface SignerDraft {
  name: string;
  last_name: string;
  second_name: string;
  phone: string;
}

interface Props {
  fileId: string;
  canSend: boolean;
  status: SignatureStatus | null;
  onStatusChange?: (s: SignatureStatus) => void;
  toast: (msg: string) => void;
}

function formatDate(s: string | null): string {
  if (!s) return '';
  return new Date(s).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABEL: Record<string, string> = {
  sent: 'Отправлен',
  viewed: 'Открыт',
  signed: 'Подписан',
  cancelled: 'Аннулирован',
};

export default function SignatureSection({ fileId, canSend, status, onStatusChange, toast }: Props) {
  const [open, setOpen] = useState(false);
  const [signers, setSigners] = useState<SignerDraft[]>([{ name: '', last_name: '', second_name: '', phone: '' }]);
  const [sending, setSending] = useState(false);
  const [signatures, setSignatures] = useState<DocumentSignature[]>([]);
  const [polling, setPolling] = useState(false);

  // Load existing signatures
  const loadSignatures = useCallback(async () => {
    const { data } = await supabase
      .from('document_signatures')
      .select('*')
      .eq('file_id', fileId)
      .order('sent_at', { ascending: true });
    setSignatures((data as any) || []);
  }, [fileId]);

  useEffect(() => { loadSignatures(); }, [loadSignatures]);

  const refresh = useCallback(async () => {
    setPolling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/sign/status/${fileId}`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fileStatus && onStatusChange) onStatusChange(data.fileStatus);
        if (Array.isArray(data.signatures)) {
          // Merge by id
          const map = new Map<string, any>();
          signatures.forEach(s => map.set(s.id, s));
          data.signatures.forEach((s: any) => map.set(s.id, { ...map.get(s.id), ...s }));
          await loadSignatures();
        }
      }
    } catch { /* silent */ }
    setPolling(false);
  }, [fileId, onStatusChange, signatures, loadSignatures]);

  const addSigner = () => setSigners(prev => [...prev, { name: '', last_name: '', second_name: '', phone: '' }]);
  const removeSigner = (i: number) => setSigners(prev => prev.filter((_, idx) => idx !== i));
  const updateSigner = (i: number, key: keyof SignerDraft, v: string) =>
    setSigners(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: v } : s));

  const canSubmit = signers.every(s => s.name.trim() && s.last_name.trim() && s.phone.trim());

  const handleSend = async () => {
    if (!canSubmit) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/sign/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          fileId,
          signers: signers.map(s => ({
            name: s.name.trim(),
            last_name: s.last_name.trim(),
            second_name: s.second_name.trim() || undefined,
            phone: s.phone.trim(),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Ошибка отправки');
      } else {
        toast('Отправлено на подпись');
        setOpen(false);
        setSigners([{ name: '', last_name: '', second_name: '', phone: '' }]);
        if (onStatusChange) onStatusChange('sent');
        await loadSignatures();
      }
    } catch (e: any) {
      toast(e?.message || 'Ошибка сети');
    }
    setSending(false);
  };

  // If already sent, show status badge + signer list + "check status" button
  if (status && status !== 'none') {
    return (
      <div style={{ border: '0.5px solid #EBEBEB', padding: 16, marginBottom: 20, background: '#FAFAFA' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--af-font)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999' }}>
              Электронная подпись
            </div>
            <div style={{ fontFamily: 'var(--af-font)', fontSize: 16, fontWeight: 700, color: status === 'signed' ? '#111' : '#333', marginTop: 4 }}>
              {status === 'signed' ? '✓ Подписан' : status === 'cancelled' ? 'Аннулирован' : status === 'viewed' ? 'Открыт' : 'Ожидает подписи'}
            </div>
          </div>
          {status !== 'signed' && status !== 'cancelled' && (
            <button
              className="af-btn-pill small"
              onClick={refresh}
              disabled={polling}
              type="button"
            >
              {polling ? '...' : 'Проверить'}
            </button>
          )}
        </div>
        {signatures.length > 0 && (
          <div style={{ borderTop: '0.5px solid #EBEBEB', paddingTop: 8 }}>
            {signatures.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontFamily: 'var(--af-font)', fontSize: 11 }}>
                <span style={{ color: '#111' }}>
                  {s.signer_last_name} {s.signer_name} · {s.signer_phone}
                </span>
                <span style={{ color: s.status === 'signed' ? '#111' : '#999' }}>
                  {STATUS_LABEL[s.status] || s.status}
                  {s.signed_at && ` · ${formatDate(s.signed_at)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Initial state — button to open signer modal
  if (!canSend) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      {!open ? (
        <button className="af-btn-pill" onClick={() => setOpen(true)} type="button">
          Отправить на подпись →
        </button>
      ) : (
        <div style={{ border: '0.5px solid #EBEBEB', padding: 16, background: '#FAFAFA' }}>
          <div style={{ fontFamily: 'var(--af-font)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999', marginBottom: 12 }}>
            Подписанты
          </div>
          {signers.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: i < signers.length - 1 ? '0.5px solid #EBEBEB' : 'none' }}>
              <input
                className="af-input"
                placeholder="Фамилия"
                value={s.last_name}
                onChange={(e) => updateSigner(i, 'last_name', e.target.value)}
              />
              <input
                className="af-input"
                placeholder="Имя"
                value={s.name}
                onChange={(e) => updateSigner(i, 'name', e.target.value)}
              />
              <input
                className="af-input"
                placeholder="Отчество (необязательно)"
                value={s.second_name}
                onChange={(e) => updateSigner(i, 'second_name', e.target.value)}
              />
              <input
                className="af-input"
                placeholder="79001234567"
                value={s.phone}
                onChange={(e) => updateSigner(i, 'phone', e.target.value)}
                inputMode="tel"
              />
              {signers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSigner(i)}
                  style={{
                    gridColumn: '1 / -1', textAlign: 'left',
                    fontFamily: 'var(--af-font)', fontSize: 10, color: '#999',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  удалить
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addSigner}
            style={{
              fontFamily: 'var(--af-font)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
              background: 'none', border: '0.5px dashed #EBEBEB', padding: '8px 12px',
              cursor: 'pointer', color: '#111', marginBottom: 12,
            }}
          >
            + подписант
          </button>
          <p style={{ fontFamily: 'var(--af-font)', fontSize: 11, color: '#999', lineHeight: 1.5, marginBottom: 12 }}>
            Каждый подписант получит SMS со ссылкой на документ и код для подписания. Регистрация не требуется.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="af-btn-pill"
              disabled={!canSubmit || sending}
              onClick={handleSend}
              type="button"
              style={{ opacity: (!canSubmit || sending) ? 0.5 : 1 }}
            >
              {sending ? 'Отправляем...' : 'Отправить →'}
            </button>
            <button
              className="af-btn-pill small"
              onClick={() => setOpen(false)}
              disabled={sending}
              type="button"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
