'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useAuth } from '../../lib/auth';
import { useChatMessages, useChatRealtime, useChatMarkRead, useChatUnreadByType, sendPushNotification, useProjectMembersWithProfiles, useChatChannels } from '../../lib/hooks';
import { sendChatMessage, deleteChatMessage, fetchChatMessages, analyzeChatMessages, createReminder, createChatChannel, deleteChatChannel, uploadChatImage, toggleChatMessagePin, fetchPinnedMessages, searchChatMessages } from '../../lib/queries';
import type { ChatMessageWithAuthor, ChatType, ChatChannel, Profile, ChatAnalysisResult } from '../../lib/types';
import PushPermissionBanner from './PushPermissionBanner';
import ChatProjectPicker from './ChatProjectPicker';

// ======================== HELPERS ========================

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} ч`;
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function groupByDate(messages: ChatMessageWithAuthor[]): { date: string; messages: ChatMessageWithAuthor[] }[] {
  const groups: Map<string, ChatMessageWithAuthor[]> = new Map();
  const sorted = [...messages].reverse();
  for (const msg of sorted) {
    const d = new Date(msg.created_at);
    const key = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(msg);
  }
  return Array.from(groups.entries()).map(([date, messages]) => ({ date, messages }));
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ======================== REF BADGE ========================

function RefBadge({ refType, refPreview }: { refType: string; refPreview: string | null }) {
  const labels: Record<string, string> = {
    remark: 'Замечание',
    report: 'Отчёт',
    task: 'Задача',
  };
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 6px', background: '#F6F6F4', border: '0.5px solid #EBEBEB',
      fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-8)',
      letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111',
      marginBottom: 4,
    }}>
      <span>{labels[refType] || refType}</span>
      {refPreview && <span style={{ color: '#111', textTransform: 'none' }}>· {refPreview}</span>}
    </div>
  );
}

// ======================== VOICE BUBBLE ========================

function VoiceBubble({ msg, isOwn }: { msg: ChatMessageWithAuthor; isOwn: boolean }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const isVoice = msg.message_type === 'voice';
  const isProcessing = isVoice && msg.text?.includes('обрабатывается...');

  return (
    <div style={{
      background: isOwn ? '#111' : '#FFFFFF',
      color: isOwn ? '#fff' : '#111',
      border: isOwn ? 'none' : '0.5px solid #EBEBEB',
      padding: '8px 12px',
      fontFamily: 'var(--af-font-mono)',
      fontSize: 'var(--af-fs-12)',
      lineHeight: '1.5',
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap',
    }}>
      {isVoice && !isProcessing && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 4,
          fontSize: 'var(--af-fs-9)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          opacity: 0.6,
        }}>
          <span>{'\uD83C\uDFA4'}</span>
          {msg.voice_duration && <span>{formatDuration(msg.voice_duration)}</span>}
        </div>
      )}

      {msg.image_url && (
        <div style={{ marginBottom: msg.text ? 4 : 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={msg.image_url}
            alt=""
            style={{
              maxWidth: '100%', maxHeight: 240, display: 'block',
              border: `0.5px solid ${isOwn ? 'rgba(255,255,255,0.2)' : '#EBEBEB'}`,
              cursor: 'pointer',
            }}
            onClick={() => window.open(msg.image_url!, '_blank')}
          />
        </div>
      )}

      {msg.text}

      {isVoice && !isProcessing && msg.voice_original && (
        <button
          onClick={() => setShowOriginal(!showOriginal)}
          style={{
            display: 'block',
            marginTop: 6,
            padding: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--af-font-mono)',
            fontSize: 'var(--af-fs-8)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: isOwn ? '#EBEBEB' : '#111',
            opacity: 0.5,
          }}
        >
          {showOriginal ? 'скрыть' : 'оригинал'}
        </button>
      )}

      {showOriginal && msg.voice_original && (
        <div style={{
          marginTop: 4, paddingTop: 4,
          borderTop: `0.5px solid ${isOwn ? 'rgba(255,255,255,0.2)' : '#EBEBEB'}`,
          fontSize: 'var(--af-fs-10)',
          opacity: 0.6,
          fontStyle: 'italic',
        }}>
          {msg.voice_original}
        </div>
      )}

      <span style={{
        display: 'inline-block', marginLeft: 8,
        fontSize: 'var(--af-fs-8)', color: isOwn ? '#EBEBEB' : '#111',
        verticalAlign: 'bottom',
      }}>
        {formatTime(msg.created_at)}
      </span>
    </div>
  );
}

// ======================== MESSAGE BUBBLE ========================

interface MessageBubbleProps {
  msg: ChatMessageWithAuthor;
  isOwn: boolean;
  showAvatar: boolean;
  onDelete: (id: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
  searchHighlight?: string;
}

// Messages can only be deleted within 24h of sending (in ms)
const DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;

function MessageBubble({ msg, isOwn, showAvatar, onDelete, onTogglePin, searchHighlight }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const name = msg.author?.full_name || 'Пользователь';
  const avatarUrl = msg.author?.avatar_url;
  const canDelete = isOwn && msg.created_at && (Date.now() - new Date(msg.created_at).getTime() < DELETE_WINDOW_MS);

  return (
    <div
      id={`chat-msg-${msg.id}`}
      style={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 2,
      }}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Avatar */}
      {!isOwn && (
        <div style={{
          width: 28, height: 28, flexShrink: 0,
          visibility: showAvatar ? 'visible' : 'hidden',
        }}>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={28}
              height={28}
              style={{ objectFit: 'cover', borderRadius: 0 }}
            />
          ) : (
            <div style={{
              width: 28, height: 28, background: '#111', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-9)', fontWeight: 600,
            }}>
              {getInitials(name)}
            </div>
          )}
        </div>
      )}

      {/* Bubble */}
      <div
        style={{
          maxWidth: '75%',
          position: 'relative',
        }}
        onContextMenu={(e) => {
          e.preventDefault(); setShowMenu(true);
        }}
      >
        {/* Author name (first in group) */}
        {showAvatar && !isOwn && (
          <div style={{
            fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-8)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#111', marginBottom: 2,
          }}>
            {name}
          </div>
        )}

        {/* Ref badge */}
        {msg.ref_type && <RefBadge refType={msg.ref_type} refPreview={msg.ref_preview} />}

        {/* Text / Voice */}
        <VoiceBubble msg={msg} isOwn={isOwn} />

        {/* Pin indicator */}
        {msg.is_pinned && (
          <div style={{
            fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-7)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#111', opacity: 0.5, marginTop: 2,
          }}>
            📌 Закреплено
          </div>
        )}

        {/* Context menu */}
        {showMenu && (
          <div
            style={{
              position: 'absolute', top: -4, right: 0, zIndex: 10,
              background: '#fff', border: '0.5px solid #EBEBEB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            {onTogglePin && (
              <button
                onClick={() => { onTogglePin(msg.id, !msg.is_pinned); setShowMenu(false); }}
                style={{
                  display: 'block', width: '100%', padding: '6px 16px',
                  fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-10)',
                  color: '#111', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = '#F6F6F4'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                {msg.is_pinned ? 'Открепить' : 'Закрепить'}
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => { onDelete(msg.id); setShowMenu(false); }}
                style={{
                  display: 'block', width: '100%', padding: '6px 16px',
                  fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-10)',
                  color: '#111', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = '#F6F6F4'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                Удалить
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ======================== MEMBER PILLS ========================

function MemberPills({ members }: { members: Profile[] }) {
  if (members.length === 0) return null;
  return (
    <div style={{
      display: 'flex', gap: 4, flexWrap: 'wrap',
      padding: '8px 16px 4px',
    }}>
      {members.map(m => (
        <div key={m.id} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px',
          background: '#F6F6F4', border: '0.5px solid #EBEBEB',
          fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-8)',
          letterSpacing: '0.06em', color: '#111',
        }}>
          {m.avatar_url ? (
            <Image src={m.avatar_url} alt="" width={14} height={14} style={{ objectFit: 'cover', borderRadius: 0 }} />
          ) : (
            <span style={{ fontWeight: 600, color: '#111' }}>{getInitials(m.full_name)}</span>
          )}
          <span>{m.full_name}</span>
        </div>
      ))}
    </div>
  );
}

// ======================== VOICE RECORDER ========================

interface VoiceRecorderProps {
  projectId: string;
  userId: string;
  chatType: ChatType;
  profile: Profile | null;
  appendMessage: (msg: ChatMessageWithAuthor) => void;
  removeMessage: (id: string) => void;
  toast: (msg: string) => void;
  setAutoScroll: (v: boolean) => void;
  onRecordingChange?: (recording: boolean) => void;
}

function VoiceRecorder({ projectId, userId, chatType, profile, appendMessage, removeMessage, toast, setAutoScroll, onRecordingChange }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setRecording(false);
    setDuration(0);
    setCancelled(false);
    cancelledRef.current = false;
    onRecordingChange?.(false);
  }, [onRecordingChange]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Check supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setDuration(0);
      setCancelled(false);
      cancelledRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(250);
      setRecording(true);
      onRecordingChange?.(true);

      let sec = 0;
      timerRef.current = setInterval(() => {
        sec++;
        setDuration(sec);
      }, 1000);
    } catch (err: any) {
      toast('Нет доступа к микрофону');
    }
  }, [toast, onRecordingChange]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    setCancelled(true);
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.onstop = () => cleanup();
      mr.stop();
    } else {
      cleanup();
    }
  }, [cleanup]);

  const stopAndSend = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const finalDuration = duration;

    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = async () => {
        streamRef.current?.getTracks().forEach(t => t.stop());

        if (cancelledRef.current) {
          cleanup();
          resolve();
          return;
        }

        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecording(false);
        setDuration(0);
        onRecordingChange?.(false);

        if (blob.size < 1000 || finalDuration < 1) {
          cleanup();
          resolve();
          return;
        }

        // Step 1: Save placeholder to DB immediately
        try {
          const placeholderText = `🎤 ${formatDuration(finalDuration)} · обрабатывается...`;
          const dbMsg = await sendChatMessage({
            project_id: projectId,
            text: placeholderText,
            chat_type: chatType,
            message_type: 'voice',
            voice_duration: finalDuration,
          }, userId);

          // Show in UI
          appendMessage({ ...dbMsg, author: profile || undefined });
          setAutoScroll(true);

          // Step 2: Send audio to Edge Function with message_id for UPDATE
          const formData = new FormData();
          // Map MIME type to correct file extension (critical for iOS Safari which uses audio/mp4)
          const extMap: Record<string, string> = {
            'audio/mp4': 'mp4', 'video/mp4': 'mp4',
            'audio/webm': 'webm', 'audio/webm;codecs=opus': 'webm',
            'audio/wav': 'wav', 'audio/m4a': 'm4a', 'audio/aac': 'm4a',
          };
          const baseMime = mimeType.split(';')[0].trim();
          const ext = extMap[mimeType] || extMap[baseMime] || (mimeType.includes('mp4') ? 'mp4' : 'webm');
          formData.append('audio', blob, `voice.${ext}`);
          formData.append('project_id', projectId);
          formData.append('user_id', userId);
          formData.append('chat_type', chatType);
          formData.append('duration', String(finalDuration));
          formData.append('message_id', dbMsg.id);

          // Next.js API route on VPS — replaces legacy Edge Function on old Supabase
          // (JWT mismatch after Yandex VM migration).
          const { supabase } = await import('../../lib/supabase');
          const { data: { session: authSession } } = await supabase.auth.getSession();
          const accessToken = authSession?.access_token;
          if (!accessToken) throw new Error('Нет авторизации');

          // fetch with one retry on TypeError (Safari "Load failed" — usually
          // transient network blip when keep-alive drops between recordings).
          const sendOnce = async (): Promise<Response> => {
            return await fetch('/api/voice/transcribe', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}` },
              body: formData,
            });
          };

          let res: Response;
          try {
            res = await sendOnce();
          } catch (netErr: unknown) {
            console.warn('[voice] fetch failed once, retrying', netErr);
            await new Promise(r => setTimeout(r, 600));
            res = await sendOnce();
          }

          if (!res.ok) {
            const errText = await res.text().catch(() => '');
            let errMsg = `HTTP ${res.status}`;
            try {
              const errData = JSON.parse(errText);
              errMsg = errData.error || errData.msg || errMsg;
            } catch {
              errMsg = errText || errMsg;
            }
            console.error('[voice] transcribe error:', res.status, errMsg);
            throw new Error(errMsg);
          }

          // Edge Function succeeded — update the placeholder in UI with the processed message
          try {
            const resData = await res.json();
            if (resData.message) {
              removeMessage(dbMsg.id);
              appendMessage({ ...resData.message, author: profile || undefined });
            }
          } catch {
            // Fallback: refetch latest messages if JSON parsing fails
            const { fetchChatMessages } = await import('../../lib/queries');
            const fresh = await fetchChatMessages(projectId, 1, undefined, chatType);
            if (fresh.length > 0 && fresh[0].id === dbMsg.id) {
              removeMessage(dbMsg.id);
              appendMessage(fresh[0]);
            }
          }
        } catch (err: unknown) {
          console.error('[voice] stopAndSend failed', err);
          toast('Ошибка: ' + (err instanceof Error ? err.message : 'не удалось отправить'));
        }
        resolve();
      };
      mediaRecorder.stop();
    });
  }, [duration, projectId, userId, chatType, profile, appendMessage, toast, setAutoScroll, cleanup, onRecordingChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Recording state: show full recording bar
  if (recording) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flex: 1,
      }}>
        {/* Cancel button */}
        <button
          onClick={cancelRecording}
          style={{
            padding: '10px 12px',
            background: 'transparent',
            border: '0.5px solid #EBEBEB',
            fontFamily: 'var(--af-font-mono)',
            fontSize: 'var(--af-fs-12)',
            cursor: 'pointer',
            color: '#111',
            minHeight: 40,
            display: 'flex',
            alignItems: 'center',
          }}
          title="Отменить запись"
        >
          ✕
        </button>

        {/* Recording indicator + timer */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: '#111',
          color: '#fff',
          fontFamily: 'var(--af-font-mono)',
          fontSize: 'var(--af-fs-12)',
          minHeight: 40,
          animation: 'af-voice-pulse 1.5s ease-in-out infinite',
        }}>
          <span style={{
            width: 8, height: 8,
            background: '#ff3b30',
            display: 'inline-block',
            animation: 'af-voice-dot 1s ease-in-out infinite',
          }} />
          <span style={{ letterSpacing: '0.05em' }}>
            {formatDuration(duration)}
          </span>
          <span style={{ fontSize: 'var(--af-fs-9)', opacity: 0.6, marginLeft: 4 }}>
            ЗАПИСЬ
          </span>
        </div>

        {/* Send button */}
        <button
          onClick={stopAndSend}
          style={{
            padding: '10px 20px',
            background: '#111',
            color: '#fff',
            border: 'none',
            fontFamily: 'var(--af-font-mono)',
            fontSize: 'var(--af-fs-10)',
            fontWeight: 600,
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            minHeight: 40,
          }}
        >
          →
        </button>
      </div>
    );
  }

  // Default: mic icon button
  return (
    <button
      onClick={startRecording}
      style={{
        padding: '10px 14px',
        background: 'transparent',
        color: '#111',
        border: '0.5px solid #EBEBEB',
        fontFamily: 'var(--af-font-mono)',
        fontSize: 'var(--af-fs-10)',
        fontWeight: 600,
        cursor: 'pointer',
        minHeight: 40,
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}
      title="Голосовое сообщение"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="1" width="6" height="12" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <line x1="8" y1="21" x2="16" y2="21" />
      </svg>
    </button>
  );
}

// ======================== CHAT TAB PANEL ========================

interface ChatTabPanelProps {
  projectId: string;
  chatType: ChatType;
  channelId?: string;
  userId: string;
  profile: Profile | null;
  toast: (msg: string) => void;
  isActive: boolean;
}

function ChatTabPanel({ projectId, chatType, channelId, userId, profile, toast, isActive }: ChatTabPanelProps) {
  const { messages, loading, hasMore, loadMore, appendMessage, removeMessage, refetch } = useChatMessages(projectId, chatType);

  // Mark as read on mount and when tab becomes active
  useChatMarkRead(isActive ? projectId : null, userId, chatType);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessageWithAuthor[]>([]);
  const [searchIdx, setSearchIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pinned messages
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessageWithAuthor[]>([]);
  const [showPinned, setShowPinned] = useState(false);

  // Load pinned messages
  useEffect(() => {
    if (isActive && projectId) {
      fetchPinnedMessages(projectId, chatType).then(setPinnedMessages).catch(() => {});
    }
  }, [isActive, projectId, chatType]);

  // Search handler
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearchIdx(0); return; }
    const timer = setTimeout(() => {
      searchChatMessages(projectId, chatType, searchQuery).then(results => {
        setSearchResults(results);
        setSearchIdx(0);
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, projectId, chatType]);

  // Scroll to search result
  useEffect(() => {
    if (searchResults.length > 0 && searchResults[searchIdx]) {
      const el = document.getElementById(`chat-msg-${searchResults[searchIdx].id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchIdx, searchResults]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Pin/unpin handler
  const handleTogglePin = async (messageId: string, pinned: boolean) => {
    try {
      await toggleChatMessagePin(messageId, pinned);
      // Refresh pinned list
      const fresh = await fetchPinnedMessages(projectId, chatType);
      setPinnedMessages(fresh);
      // Update in message list
      refetch();
      toast(pinned ? 'Сообщение закреплено' : 'Сообщение откреплено');
    } catch {
      toast('Ошибка');
    }
  };

  // Scroll to pinned message
  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`chat-msg-${messageId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setShowPinned(false);
  };

  // Highlight search match IDs
  const searchMatchIds = useMemo(() => new Set(searchResults.map(r => r.id)), [searchResults]);
  const currentSearchId = searchResults[searchIdx]?.id;

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pastedImage, setPastedImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [suggestion, setSuggestion] = useState<ChatAnalysisResult | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [creatingSuggestion, setCreatingSuggestion] = useState(false);
  const suggestionCooldown = useRef(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isActive && autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, autoScroll, isActive]);

  // Detect scroll position
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
    setAutoScroll(isAtBottom);
    if (container.scrollTop < 50 && hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  // Realtime: on new message, fetch full message with author profile and append.
  // Own messages are already added optimistically in handleSend;
  // appendMessage deduplicates by id, so no doubles.
  useChatRealtime(projectId, useCallback(async (payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newMsg = payload.new;
      if (newMsg.chat_type !== chatType) return;
      // Skip own messages (already added optimistically via sendChatMessage)
      if (newMsg.user_id === userId) return;
      try {
        const fresh = await fetchChatMessages(projectId, 1, undefined, chatType);
        if (fresh.length > 0) {
          appendMessage(fresh[0]);
        }
      } catch {
        refetch();
      }
    } else if (payload.eventType === 'UPDATE') {
      // Voice message transcription completed — refetch to get updated text
      const updatedMsg = payload.new;
      if (updatedMsg.chat_type !== chatType) return;
      try {
        const fresh = await fetchChatMessages(projectId, 1, undefined, chatType);
        if (fresh.length > 0 && fresh[0].id === updatedMsg.id) {
          // Replace the placeholder with transcribed message
          removeMessage(updatedMsg.id);
          appendMessage(fresh[0]);
        }
      } catch {
        refetch();
      }
    } else if (payload.eventType === 'DELETE') {
      if (payload.old?.id) {
        removeMessage(payload.old.id);
      }
    }
  }, [projectId, chatType, userId, appendMessage, removeMessage, refetch]));

  // Send message
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !pastedImage) return;
    if (!userId) return;
    setSending(true);
    try {
      // Upload image if pasted
      let imageUrl: string | undefined;
      if (pastedImage) {
        imageUrl = await uploadChatImage(projectId, pastedImage.file);
        URL.revokeObjectURL(pastedImage.previewUrl);
        setPastedImage(null);
      }

      const msg = await sendChatMessage({
        project_id: projectId,
        text: trimmed || (imageUrl ? '' : ''),
        chat_type: chatType,
        channel_id: channelId,
        image_url: imageUrl,
      }, userId);
      appendMessage({ ...msg, author: profile || undefined });
      setText('');
      setAutoScroll(true);
      inputRef.current?.focus();
      sendPushNotification(projectId, userId, profile?.full_name || '', trimmed || '📎 Изображение');

      // Trigger chat analysis (debounced, every 5th message)
      if (!suggestionCooldown.current && messages.length > 5) {
        suggestionCooldown.current = true;
        setTimeout(() => { suggestionCooldown.current = false; }, 60000); // 1 min cooldown
        const last15 = messages.slice(0, 15).reverse().map(m => ({
          author: m.author?.full_name || 'unknown',
          text: m.text,
        }));
        analyzeChatMessages(projectId, chatType, last15).then(result => {
          if (result.found) setSuggestion(result);
        }).catch(() => {});
      }
    } catch (e: any) {
      toast('Ошибка отправки: ' + (e.message || ''));
    }
    setSending(false);
  };

  // Paste image handler
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) return;
        // Revoke previous preview if any
        if (pastedImage) URL.revokeObjectURL(pastedImage.previewUrl);
        const previewUrl = URL.createObjectURL(file);
        setPastedImage({ file, previewUrl });
        return;
      }
    }
  }, [pastedImage]);

  // Clean up pasted image preview on unmount
  useEffect(() => {
    return () => { if (pastedImage) URL.revokeObjectURL(pastedImage.previewUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Delete message
  const handleDelete = async (id: string) => {
    try {
      await deleteChatMessage(id);
      removeMessage(id);
    } catch {
      toast('Ошибка удаления');
    }
  };

  // Keyboard: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const groups = useMemo(() => groupByDate(messages), [messages]);

  const shouldShowAvatar = (msgs: ChatMessageWithAuthor[], idx: number) => {
    if (idx === 0) return true;
    return msgs[idx].user_id !== msgs[idx - 1].user_id;
  };

  if (!isActive) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Search bar + pinned strip */}
      <div style={{ flexShrink: 0, borderBottom: '0.5px solid #EBEBEB' }}>
        {/* Search / pin header row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', minHeight: 32,
        }}>
          {/* Search toggle */}
          <button
            onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) { setSearchQuery(''); setSearchResults([]); } }}
            style={{
              fontFamily: 'var(--af-font-mono)', fontSize: 14, color: '#111',
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
            }}
            title="Поиск по чату"
          >
            {searchOpen ? '✕' : '⌕'}
          </button>

          {/* Search input */}
          {searchOpen && (
            <>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) {
                    e.preventDefault();
                    setSearchIdx(i => Math.min(searchResults.length - 1, i + 1));
                  } else if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) {
                    e.preventDefault();
                    setSearchIdx(i => Math.max(0, i - 1));
                  } else if (e.key === 'Escape') {
                    setSearchOpen(false); setSearchQuery(''); setSearchResults([]);
                  }
                }}
                placeholder="Поиск..."
                style={{
                  flex: 1, fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-10)',
                  border: '0.5px solid #EBEBEB', padding: '4px 8px', outline: 'none',
                  background: '#F6F6F4',
                }}
              />
              {searchResults.length > 0 && (
                <span style={{
                  fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-8)',
                  color: '#111', whiteSpace: 'nowrap',
                }}>
                  {searchIdx + 1}/{searchResults.length}
                </span>
              )}
              <button
                onClick={() => setSearchIdx(i => Math.max(0, i - 1))}
                disabled={searchIdx <= 0}
                style={{
                  fontFamily: 'var(--af-font-mono)', fontSize: 12, color: '#111',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                  opacity: searchIdx <= 0 ? 0.3 : 1,
                }}
              >↑</button>
              <button
                onClick={() => setSearchIdx(i => Math.min(searchResults.length - 1, i + 1))}
                disabled={searchIdx >= searchResults.length - 1}
                style={{
                  fontFamily: 'var(--af-font-mono)', fontSize: 12, color: '#111',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                  opacity: searchIdx >= searchResults.length - 1 ? 0.3 : 1,
                }}
              >↓</button>
            </>
          )}

          {/* Pinned indicator */}
          {!searchOpen && pinnedMessages.length > 0 && (
            <button
              onClick={() => setShowPinned(!showPinned)}
              style={{
                fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-8)',
                color: '#111', background: showPinned ? '#F6F6F4' : 'none',
                border: '0.5px solid #EBEBEB', padding: '3px 8px', cursor: 'pointer',
                marginLeft: 'auto', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}
            >
              📌 {pinnedMessages.length}
            </button>
          )}
        </div>

        {/* Pinned messages dropdown */}
        {showPinned && pinnedMessages.length > 0 && (
          <div style={{
            maxHeight: 150, overflowY: 'auto',
            borderTop: '0.5px solid #EBEBEB', background: '#F6F6F4',
          }}>
            {pinnedMessages.map(pm => (
              <button
                key={pm.id}
                onClick={() => scrollToMessage(pm.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '6px 12px', background: 'none', border: 'none',
                  borderBottom: '0.5px solid #EBEBEB', cursor: 'pointer',
                  fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-9)',
                  color: '#111',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontWeight: 600, fontSize: 'var(--af-fs-8)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {pm.author?.full_name || 'Аноним'}
                </span>
                <span style={{ marginLeft: 6, opacity: 0.6 }}>
                  {pm.text.slice(0, 60)}{pm.text.length > 60 ? '…' : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
          background: '#FFFFFF',
        }}
      >
        {loading && messages.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 40,
            fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)', color: '#111',
          }}>
            Загрузка сообщений...
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 40,
            fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)', color: '#111',
          }}>
            Чат пуст. Напишите первое сообщение.
          </div>
        )}

        {hasMore && messages.length > 0 && (
          <button
            onClick={loadMore}
            style={{
              display: 'block', margin: '0 auto 16px', padding: '6px 16px',
              background: 'transparent', border: '0.5px solid #EBEBEB',
              fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-9)',
              cursor: 'pointer', color: '#111',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}
          >
            Загрузить ранние
          </button>
        )}

        {groups.map(group => (
          <div key={group.date}>
            <div style={{
              textAlign: 'center', margin: '16px 0 12px',
              fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-8)',
              letterSpacing: '0.16em', textTransform: 'uppercase', color: '#111',
            }}>
              {group.date}
            </div>
            {group.messages.map((msg, idx) => (
              <div
                key={msg.id}
                style={{
                  background: currentSearchId === msg.id ? 'rgba(17,17,17,0.06)' : searchMatchIds.has(msg.id) ? 'rgba(17,17,17,0.03)' : 'transparent',
                  transition: 'background 0.2s',
                  margin: '0 -16px',
                  padding: '0 16px',
                }}
              >
                <MessageBubble
                  msg={msg}
                  isOwn={msg.user_id === userId}
                  showAvatar={shouldShowAvatar(group.messages, idx)}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                />
              </div>
            ))}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Assistant suggestion */}
      {suggestion && suggestion.found && (
        <div style={{
          padding: '12px 16px', background: '#111', color: '#fff',
          borderTop: '0.5px solid #333',
        }}>
          <div style={{
            fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-7)',
            textTransform: 'uppercase', letterSpacing: '0.14em',
            opacity: 0.6, marginBottom: 6,
          }}>
            Ассистент
          </div>
          <div style={{
            fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-10)',
            lineHeight: 1.5, marginBottom: 10,
          }}>
            {suggestion.reminder_text || suggestion.action}
          </div>

          {showTimePicker ? (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { label: 'Сегодня 18:00', hours: (() => { const d = new Date(); d.setHours(18, 0, 0, 0); return d; })() },
                { label: 'Завтра 10:00', hours: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; })() },
                { label: 'Завтра 12:00', hours: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0); return d; })() },
              ].map(opt => (
                <button
                  key={opt.label}
                  disabled={creatingSuggestion}
                  onClick={async () => {
                    setCreatingSuggestion(true);
                    try {
                      await createReminder({
                        project_id: projectId,
                        chat_type: chatType,
                        action_text: suggestion.reminder_text || suggestion.action || '',
                        target_role: suggestion.target || 'client',
                        remind_at: opt.hours.toISOString(),
                      });
                      toast('Напоминание создано');
                      setSuggestion(null);
                      setShowTimePicker(false);
                    } catch { toast('Ошибка'); }
                    setCreatingSuggestion(false);
                  }}
                  style={{
                    padding: '4px 10px', background: '#fff', color: '#111',
                    border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-8)',
                    fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setShowTimePicker(true)}
                style={{
                  padding: '5px 12px', background: '#fff', color: '#111',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-8)',
                  fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Да, создать напоминание
              </button>
              <button
                onClick={() => setSuggestion(null)}
                style={{
                  padding: '5px 12px', background: 'transparent', color: '#fff',
                  border: '0.5px solid #555', cursor: 'pointer',
                  fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-8)',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}
              >
                Нет
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pasted image preview */}
      {pastedImage && (
        <div style={{
          padding: '6px 16px', background: '#F6F6F4', borderTop: '0.5px solid #EBEBEB',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pastedImage.previewUrl}
            alt=""
            style={{ width: 48, height: 48, objectFit: 'cover', border: '0.5px solid #EBEBEB' }}
          />
          <span style={{
            fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-9)',
            color: '#111', flex: 1,
          }}>
            {pastedImage.file.name || 'Изображение'}
          </span>
          <button
            onClick={() => { URL.revokeObjectURL(pastedImage.previewUrl); setPastedImage(null); }}
            style={{
              fontFamily: 'var(--af-font-mono)', fontSize: 12, color: '#111',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            }}
          >✕</button>
        </div>
      )}

      {/* Input area */}
      <div style={{
        padding: '8px 16px',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        background: '#FFFFFF',
        borderTop: '0.5px solid #EBEBEB',
        display: 'flex', gap: 8, alignItems: 'flex-end',
        flexShrink: 0,
      }}>
        {voiceRecording ? (
          <VoiceRecorder
            projectId={projectId}
            userId={userId}
            chatType={chatType}
            profile={profile}
            appendMessage={appendMessage}
            removeMessage={removeMessage}
            toast={toast}
            setAutoScroll={setAutoScroll}
            onRecordingChange={setVoiceRecording}
          />
        ) : (
          <>
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Сообщение..."
              rows={1}
              style={{
                flex: 1, resize: 'none',
                padding: '10px 12px',
                border: '0.5px solid #EBEBEB',
                fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-12)',
                lineHeight: '1.4', outline: 'none',
                minHeight: 40, maxHeight: 120,
                background: '#F6F6F4',
                borderRadius: 0,
              }}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || (!text.trim() && !pastedImage)}
              style={{
                padding: '10px 20px',
                background: (text.trim() || pastedImage) ? '#111' : '#EBEBEB',
                color: (text.trim() || pastedImage) ? '#fff' : '#EBEBEB',
                border: 'none',
                fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-10)',
                fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default',
                textTransform: 'uppercase', letterSpacing: '0.12em',
                minHeight: 40, transition: 'background 0.15s',
              }}
            >
              {sending ? '...' : '→'}
            </button>
            <VoiceRecorder
              projectId={projectId}
              userId={userId}
              chatType={chatType}
              profile={profile}
              appendMessage={appendMessage}
              removeMessage={removeMessage}
              toast={toast}
              setAutoScroll={setAutoScroll}
              onRecordingChange={setVoiceRecording}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ======================== CHAT VIEW ========================

interface ChatViewProps {
  projectId: string;
  toast: (msg: string) => void;
}

export default function ChatView({ projectId, toast }: ChatViewProps) {
  const { user, profile } = useAuth();
  const userId = user?.id || '';

  // Fetch members for pills and role detection
  const { data: membersWithProfiles } = useProjectMembersWithProfiles(projectId);
  const { data: channels, refetch: refetchChannels } = useChatChannels(projectId);

  // Determine role from project-level member_role (not global profile.role)
  const currentMember = membersWithProfiles?.find(m => m.user_id === userId);
  const isClientOnly = currentMember ? currentMember.member_role === 'client' : profile?.role === 'client';
  const canManageChannels = !isClientOnly;
  const availableTabs: ChatType[] = isClientOnly ? ['client'] : ['team', 'client'];
  const defaultTab: ChatType = isClientOnly ? 'client' : 'team';

  // Active selection: { chatType, channelId? }
  const [activeTab, setActiveTab] = useState<ChatType>(defaultTab);
  const [activeChannelId, setActiveChannelId] = useState<string | undefined>(undefined);

  // Sync active tab when member data loads and role is determined
  useEffect(() => {
    if (isClientOnly && activeTab === 'team') {
      setActiveTab('client');
      setActiveChannelId(undefined);
    }
  }, [isClientOnly, activeTab]);

  // Unread counts for each tab
  const { count: teamUnread, refetch: refetchTeamUnread } = useChatUnreadByType(projectId, userId, 'team');
  const { count: clientUnread, refetch: refetchClientUnread } = useChatUnreadByType(projectId, userId, 'client');

  // Refetch unread counts when switching tabs
  useEffect(() => {
    if (activeTab === 'team') refetchClientUnread();
    else refetchTeamUnread();
  }, [activeTab, refetchTeamUnread, refetchClientUnread]);

  // Filter members for each tab
  const teamMembers = useMemo(() => {
    if (!membersWithProfiles) return [];
    return membersWithProfiles
      .filter(m => m.role === 'designer' || m.role === 'assistant')
      .map(m => m.profile)
      .filter((p): p is Profile => !!p);
  }, [membersWithProfiles]);

  const clientMembers = useMemo(() => {
    if (!membersWithProfiles) return [];
    return membersWithProfiles
      .filter(m => m.role === 'designer' || m.role === 'assistant' || m.role === 'client')
      .map(m => m.profile)
      .filter((p): p is Profile => !!p);
  }, [membersWithProfiles]);

  // Group channels by type
  const teamChannels = useMemo(() => (channels || []).filter(c => c.chat_group === 'team'), [channels]);
  const clientChannels = useMemo(() => (channels || []).filter(c => c.chat_group === 'client'), [channels]);

  const handleSelectChat = (chatType: ChatType, channelId?: string) => {
    setActiveTab(chatType);
    setActiveChannelId(channelId);
  };

  const handleCreateChannel = async (chatGroup: ChatType) => {
    const name = prompt('Имя чата:');
    if (!name?.trim()) return;
    try {
      const ch = await createChatChannel(projectId, chatGroup, name.trim());
      refetchChannels();
      handleSelectChat(chatGroup, ch.id);
      toast('Чат создан');
    } catch (err: any) {
      toast(err?.message || 'Ошибка создания чата');
    }
  };

  const handleDeleteChannel = async (ch: ChatChannel) => {
    if (!confirm(`Удалить чат «${ch.name}»? Все сообщения будут удалены.`)) return;
    try {
      await deleteChatChannel(ch.id);
      refetchChannels();
      if (activeChannelId === ch.id) {
        setActiveChannelId(undefined);
      }
      toast('Чат удалён');
    } catch (err: any) {
      toast(err?.message || 'Ошибка удаления');
    }
  };

  // Default label for the main channel
  const getDefaultLabel = (tab: ChatType): string => {
    if (tab === 'team') return 'Основной';
    return isClientOnly ? 'С дизайнером' : 'Основной';
  };

  // Pill for a single channel or default chat
  const renderPill = (
    group: ChatType,
    channelId: string | undefined,
    label: string,
    unread: number,
    onDelete?: () => void,
  ) => {
    const isActive = activeTab === group && activeChannelId === channelId;
    const showUnread = !isActive && unread > 0;
    return (
      <button
        key={`${group}-${channelId || 'default'}`}
        onClick={() => handleSelectChat(group, channelId)}
        className={`af-chat-channel-pill${isActive ? ' active' : ''}`}
        type="button"
      >
        <span>{label}</span>
        {showUnread && <span className="af-chat-channel-unread">{unread > 99 ? '99+' : unread}</span>}
        {onDelete && canManageChannels && isActive && (
          <span
            role="button"
            aria-label="Удалить чат"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ marginLeft: 4, cursor: 'pointer', fontSize: 11, opacity: 0.8 }}
          >×</span>
        )}
      </button>
    );
  };

  return (
    <div style={{
      background: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100dvh - 180px)',
      maxHeight: 'calc(100dvh - 180px)',
      overflow: 'hidden',
    }}>
      {/* Push notification permission banner */}
      <PushPermissionBanner />

      {/* Project switcher — only when user has >1 project */}
      <ChatProjectPicker currentProjectId={projectId} />

      {/* Channel navigation — hidden for clients (single-thread experience) */}
      {!isClientOnly && (
        <div className="af-chat-channels">
          {availableTabs.includes('client') && (
            <>
              {renderPill('client', undefined, 'Заказчик', clientUnread)}
              {clientChannels.map(ch => renderPill('client', ch.id, ch.name, 0, () => handleDeleteChannel(ch)))}
            </>
          )}
          {availableTabs.includes('team') && (
            <>
              {renderPill('team', undefined, 'Команда', teamUnread)}
              {teamChannels.map(ch => renderPill('team', ch.id, ch.name, 0, () => handleDeleteChannel(ch)))}
            </>
          )}
          {canManageChannels && (
            <button
              className="af-chat-channel-pill af-chat-channel-pill-new"
              onClick={() => handleCreateChannel(activeTab)}
              type="button"
              title="Новый чат"
            >
              + Новый чат
            </button>
          )}
        </div>
      )}

      {/* Member pills (skip for clients — only the designer/assistant matters) */}
      {!isClientOnly && (
        <MemberPills members={activeTab === 'team' ? teamMembers : clientMembers} />
      )}

      {/* Chat panel */}
      <ChatTabPanel
        key={`${activeTab}-${activeChannelId || 'default'}`}
        projectId={projectId}
        chatType={activeTab}
        channelId={activeChannelId}
        userId={userId}
        profile={profile}
        toast={toast}
        isActive={true}
      />
    </div>
  );
}
