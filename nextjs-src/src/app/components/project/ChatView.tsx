'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useAuth } from '../../lib/auth';
import { useChatMessages, useChatRealtime, useChatMarkRead, useChatUnreadByType, sendPushNotification, useProjectMembersWithProfiles } from '../../lib/hooks';
import { sendChatMessage, deleteChatMessage, fetchChatMessages } from '../../lib/queries';
import type { ChatMessageWithAuthor, ChatType, Profile } from '../../lib/types';
import PushPermissionBanner from './PushPermissionBanner';

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
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
      letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888',
      marginBottom: 4,
    }}>
      <span>{labels[refType] || refType}</span>
      {refPreview && <span style={{ color: '#111', textTransform: 'none' }}>· {refPreview}</span>}
    </div>
  );
}

// ======================== MESSAGE BUBBLE ========================

interface MessageBubbleProps {
  msg: ChatMessageWithAuthor;
  isOwn: boolean;
  showAvatar: boolean;
  onDelete: (id: string) => void;
}

function MessageBubble({ msg, isOwn, showAvatar, onDelete }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const name = msg.author?.full_name || 'Пользователь';
  const avatarUrl = msg.author?.avatar_url;

  return (
    <div
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
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600,
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
          if (isOwn) { e.preventDefault(); setShowMenu(true); }
        }}
      >
        {/* Author name (first in group) */}
        {showAvatar && !isOwn && (
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#999', marginBottom: 2,
          }}>
            {name}
          </div>
        )}

        {/* Ref badge */}
        {msg.ref_type && <RefBadge refType={msg.ref_type} refPreview={msg.ref_preview} />}

        {/* Text */}
        <div style={{
          background: isOwn ? '#111' : '#FFFFFF',
          color: isOwn ? '#fff' : '#111',
          border: isOwn ? 'none' : '0.5px solid #EBEBEB',
          padding: '8px 12px',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          lineHeight: '1.5',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}>
          {msg.text}
          <span style={{
            display: 'inline-block', marginLeft: 8,
            fontSize: 8, color: isOwn ? 'rgba(255,255,255,0.4)' : '#BBB',
            verticalAlign: 'bottom',
          }}>
            {formatTime(msg.created_at)}
          </span>
        </div>

        {/* Context menu */}
        {showMenu && isOwn && (
          <div
            style={{
              position: 'absolute', top: -4, right: 0, zIndex: 10,
              background: '#fff', border: '0.5px solid #EBEBEB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <button
              onClick={() => { onDelete(msg.id); setShowMenu(false); }}
              style={{
                display: 'block', width: '100%', padding: '6px 16px',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                color: '#111', background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = '#F6F6F4'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              Удалить
            </button>
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
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
          letterSpacing: '0.06em', color: '#888',
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

// ======================== CHAT TAB PANEL ========================

interface ChatTabPanelProps {
  projectId: string;
  chatType: ChatType;
  userId: string;
  profile: Profile | null;
  toast: (msg: string) => void;
  isActive: boolean;
}

function ChatTabPanel({ projectId, chatType, userId, profile, toast, isActive }: ChatTabPanelProps) {
  const { messages, loading, hasMore, loadMore, appendMessage, removeMessage, refetch } = useChatMessages(projectId, chatType);

  // Mark as read on mount and when tab becomes active
  useChatMarkRead(isActive ? projectId : null, userId, chatType);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

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

  // Realtime: on new message from others, fetch full message with profile
  useChatRealtime(projectId, useCallback(async (payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newMsg = payload.new;
      // Only handle messages for this chat type
      if (newMsg.chat_type !== chatType) return;
      if (newMsg.user_id === userId) return;
      try {
        const fresh = await fetchChatMessages(projectId, 1, undefined, chatType);
        if (fresh.length > 0 && fresh[0].id === newMsg.id) {
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
    if (!trimmed || !userId) return;
    setSending(true);
    try {
      const msg = await sendChatMessage({ project_id: projectId, text: trimmed, chat_type: chatType }, userId);
      appendMessage({ ...msg, author: profile || undefined });
      setText('');
      setAutoScroll(true);
      inputRef.current?.focus();
      sendPushNotification(projectId, userId, profile?.full_name || '', trimmed);
    } catch (e: any) {
      toast('Ошибка отправки: ' + (e.message || ''));
    }
    setSending(false);
  };

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
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#999',
          }}>
            Загрузка сообщений...
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 40,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#999',
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
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
              cursor: 'pointer', color: '#888',
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
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: '#AAA',
            }}>
              {group.date}
            </div>
            {group.messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isOwn={msg.user_id === userId}
                showAvatar={shouldShowAvatar(group.messages, idx)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '8px 16px 12px',
        background: '#FFFFFF',
        borderTop: '0.5px solid #EBEBEB',
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение..."
          rows={1}
          style={{
            flex: 1, resize: 'none',
            padding: '10px 12px',
            border: '0.5px solid #EBEBEB',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
            lineHeight: '1.4', outline: 'none',
            minHeight: 40, maxHeight: 120,
            background: '#FAFAFA',
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
          disabled={sending || !text.trim()}
          style={{
            padding: '10px 20px',
            background: text.trim() ? '#111' : '#EBEBEB',
            color: text.trim() ? '#fff' : '#AAA',
            border: 'none',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            minHeight: 40, transition: 'background 0.15s',
          }}
        >
          {sending ? '...' : '→'}
        </button>
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
  const userRole = profile?.role || 'client';

  // Determine available tabs based on role
  const isClientOnly = userRole === 'client';
  const availableTabs: ChatType[] = isClientOnly ? ['client'] : ['team', 'client'];
  const defaultTab: ChatType = isClientOnly ? 'client' : 'team';

  const [activeTab, setActiveTab] = useState<ChatType>(defaultTab);

  // Unread counts for each tab
  const { count: teamUnread, refetch: refetchTeamUnread } = useChatUnreadByType(projectId, userId, 'team');
  const { count: clientUnread, refetch: refetchClientUnread } = useChatUnreadByType(projectId, userId, 'client');

  // Refetch unread counts when switching tabs
  useEffect(() => {
    if (activeTab === 'team') refetchClientUnread();
    else refetchTeamUnread();
  }, [activeTab, refetchTeamUnread, refetchClientUnread]);

  // Fetch members for pills
  const { data: membersWithProfiles } = useProjectMembersWithProfiles(projectId);

  // Filter members for each tab
  // team tab: designer + assistant (team members)
  // client tab: designer + assistant + client
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

  const tabLabels: Record<ChatType, string> = {
    team: 'Команда',
    client: 'С заказчиком',
  };

  return (
    <div style={{
      background: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
    }}>
      {/* Push notification permission banner */}
      <PushPermissionBanner />

      {/* Tab bar — always rendered unconditionally */}
      <div style={{
        display: 'flex',
        borderBottom: '0.5px solid #EBEBEB',
        background: '#FFFFFF',
        flexShrink: 0,
      }}>
        {availableTabs.map(tab => {
          const isActive = activeTab === tab;
          const unread = tab === 'team' ? teamUnread : clientUnread;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '10px 0',
                textAlign: 'center' as const,
                fontSize: 7,
                letterSpacing: '0.16em',
                textTransform: 'uppercase' as const,
                fontFamily: 'var(--font-ibm-mono), monospace',
                color: isActive ? '#111' : '#AAA',
                fontWeight: isActive ? 600 : 400,
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: isActive ? '2px solid #111' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              {tabLabels[tab]}
              {!isActive && unread > 0 && (
                <span style={{
                  display: 'inline-block',
                  width: 5, height: 5,
                  background: '#111',
                  borderRadius: '50%',
                  marginLeft: 6,
                  verticalAlign: 'middle',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* "Заказчик не видит" label */}
      {activeTab === 'team' && !isClientOnly && (
        <div style={{
          textAlign: 'right',
          padding: '4px 16px 0',
          fontFamily: 'var(--font-ibm-mono), monospace',
          fontSize: 7,
          letterSpacing: '0.08em',
          color: '#DDD',
        }}>
          Заказчик не видит
        </div>
      )}

      {/* Member pills */}
      <MemberPills members={activeTab === 'team' ? teamMembers : clientMembers} />

      {/* Chat panel per tab */}
      {availableTabs.map(tab => (
        <ChatTabPanel
          key={tab}
          projectId={projectId}
          chatType={tab}
          userId={userId}
          profile={profile}
          toast={toast}
          isActive={activeTab === tab}
        />
      ))}
    </div>
  );
}
