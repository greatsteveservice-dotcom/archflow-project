"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ======================== SLIDE DATA ========================

const TOTAL_SLIDES = 7;

// ======================== PREVIEW COMPONENTS ========================

function ProjectsPreview() {
  return (
    <div style={{ border: '0.5px solid var(--af-border)', background: 'var(--af-white)', fontSize: 0 }}>
      <div style={{ background: 'var(--af-white)', padding: '8px 12px', borderBottom: '0.5px solid var(--af-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 'var(--af-fs-8)', fontWeight: 900, color: 'var(--af-black)' }}>ArchFlow</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 5, color: 'var(--af-border)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Проекты</span>
      </div>
      {[
        { name: 'Квартира на Патриарших', meta: 'Москва · 2026', letter: 'К' },
        { name: 'Загородный дом', meta: 'Барвиха · 2026', letter: 'З' },
      ].map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '0.5px solid var(--af-border)' }}>
          <div style={{ width: 24, height: 24, background: 'var(--af-offwhite)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: 'var(--af-fs-9)', color: 'var(--af-border)', flexShrink: 0 }}>{p.letter}</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'var(--af-fs-9)', fontWeight: 700, color: 'var(--af-black)' }}>{p.name}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 5, color: 'var(--af-border)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{p.meta}</div>
          </div>
          <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-7)', color: 'var(--af-border)' }}>→</span>
        </div>
      ))}
      <div style={{ padding: '10px 12px', borderTop: '0.5px dashed var(--af-border)', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 6, color: 'var(--af-border)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
        + Новый проект
      </div>
    </div>
  );
}

function SectionsPreview() {
  const sections = [
    { idx: '01', name: 'Дизайн', active: true },
    { idx: '02', name: 'Авт. надзор', active: false },
    { idx: '03', name: 'Чат', active: false },
    { idx: '04', name: 'Комплектация', disabled: true, label: 'апрель' },
  ];
  return (
    <div style={{ border: '0.5px solid var(--af-border)', background: 'var(--af-white)', fontSize: 0 }}>
      {sections.map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px', borderBottom: '0.5px solid var(--af-border)',
          background: s.active ? 'var(--af-black)' : 'transparent', opacity: s.disabled ? 0.4 : 1,
        }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 5, color: s.active ? 'var(--af-black)' : 'var(--af-border)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>{s.idx} — Раздел</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'var(--af-fs-11)', fontWeight: 700, color: s.active ? 'var(--af-white)' : 'var(--af-black)' }}>{s.name}</div>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-7)', color: s.active ? 'var(--af-black)' : 'var(--af-border)' }}>
            {s.disabled ? s.label : '→'}
          </span>
        </div>
      ))}
      <div style={{ padding: '8px 12px', background: 'var(--af-black)' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 6, color: 'var(--af-border)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Настройки</span>
      </div>
    </div>
  );
}

function CalendarPreview() {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const visitDays = [3, 10, 17, 24];
  const invoiceDay = 19;
  const today = 20;
  return (
    <div style={{ border: '0.5px solid var(--af-border)', background: 'var(--af-white)', fontSize: 0 }}>
      <div style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--af-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 'var(--af-fs-8)', fontWeight: 700, color: 'var(--af-black)' }}>Апрель 2026</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 5, color: 'var(--af-border)' }}>настроено: каждый чт</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, padding: '4px 8px 8px' }}>
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 4, color: 'var(--af-border)', padding: '2px 0', textTransform: 'uppercase' }}>{d}</div>
        ))}
        {/* offset: April 2026 starts on Wednesday */}
        <div /><div />
        {days.map(d => {
          const isVisit = visitDays.includes(d);
          const isInvoice = d === invoiceDay;
          const isToday = d === today;
          return (
            <div key={d} style={{ textAlign: 'center', padding: '3px 0' }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 6,
                color: isToday ? 'var(--af-white)' : 'var(--af-black)',
                background: isToday ? 'var(--af-black)' : 'transparent',
                width: 14, height: 14, lineHeight: '14px',
                margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{d}</div>
              {isVisit && (
                <div style={{ width: 8, height: 6, margin: '1px auto 0', border: '0.5px solid var(--af-border)', display: 'flex', flexDirection: 'column', gap: 1, padding: '1px', justifyContent: 'center' }}>
                  <div style={{ height: 0.5, background: 'var(--af-border)' }} />
                  <div style={{ height: 0.5, background: 'var(--af-border)' }} />
                </div>
              )}
              {isInvoice && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--af-black)', margin: '1px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 4, color: 'var(--af-white)' }}>₽</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding: '4px 12px 8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 5, color: 'var(--af-border)', textAlign: 'center' }}>
        Визиты и напоминания о счёте появляются автоматически после настройки
      </div>
    </div>
  );
}

function AccessPreview() {
  const roles = [
    { name: 'Дизайнер', dark: true, perms: ['Всё', 'Управление доступом'], all: true },
    { name: 'Команда', dark: false, perms: ['Все разделы', 'Без финансов'], all: false },
    { name: 'Заказчик', dark: false, perms: ['Авт. надзор', 'Чат', 'Дизайн — если откроете'], all: false },
    { name: 'Подрядчик', dark: false, perms: ['Только свои задачи'], all: false },
  ];
  return (
    <div style={{ border: '0.5px solid var(--af-border)', background: 'var(--af-white)', fontSize: 0 }}>
      {roles.map((r, i) => (
        <div key={i} style={{
          padding: '8px 12px', borderBottom: '0.5px solid var(--af-border)',
          background: r.dark ? 'var(--af-black)' : 'transparent',
        }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-7)', fontWeight: 600, color: r.dark ? 'var(--af-white)' : 'var(--af-black)', marginBottom: 4 }}>{r.name}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {r.perms.map((p, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 4, height: 4, background: r.all ? (r.dark ? 'var(--af-white)' : 'var(--af-black)') : 'var(--af-border)' }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 5, color: r.dark ? 'var(--af-border)' : 'var(--af-border)' }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatPreview() {
  const msgs = [
    { text: 'Плитка переложена ✓', own: false },
    { text: 'Закрываем замечание 01', own: true },
    { text: 'Написать заказчику?', own: false },
    { text: 'Да, переключусь в его чат', own: true },
  ];
  return (
    <div style={{ border: '0.5px solid var(--af-border)', background: 'var(--af-white)', fontSize: 0 }}>
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--af-border)' }}>
        <div style={{ flex: 1, padding: '6px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 5, fontWeight: 600, color: 'var(--af-black)', borderBottom: '1.5px solid var(--af-black)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Команда</div>
        <div style={{ flex: 1, padding: '6px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 5, color: 'var(--af-border)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>С заказчиком</div>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.own ? 'flex-end' : 'flex-start' }}>
            <div style={{
              background: m.own ? 'var(--af-black)' : 'var(--af-offwhite)', color: m.own ? 'var(--af-white)' : 'var(--af-black)',
              padding: '4px 8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 6,
              maxWidth: '70%',
            }}>{m.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ======================== SLIDE CONTENT ========================

interface SlideProps {
  children: React.ReactNode;
}

function Slide({ children }: SlideProps) {
  return (
    <div style={{ flex: '0 0 100%', width: '100%', overflow: 'hidden' }}>
      {children}
    </div>
  );
}

function SlideCaption({ num, title, desc }: { num?: string; title: string; desc: string }) {
  return (
    <div style={{ padding: '20px 0 0' }}>
      {num && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-9)', color: 'var(--af-border)', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 8 }}>{num}</div>}
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: 'var(--af-black)', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-13)', color: 'var(--af-black)', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

// ======================== MAIN COMPONENT ========================

// ======================== CLIENT ONBOARDING ========================

function ClientOnboarding({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const TOTAL = 3;

  const next = useCallback(() => {
    if (current < TOTAL - 1) setCurrent(c => c + 1);
  }, [current]);

  const prev = useCallback(() => {
    if (current > 0) setCurrent(c => c - 1);
  }, [current]);

  const handleComplete = async () => {
    try {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId);
    } catch {}
    onComplete();
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.changedTouches[0].screenX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) { if (diff > 0) next(); else prev(); }
  };

  const isLast = current === TOTAL - 1;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'var(--af-white)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', transition: 'transform 0.3s ease', transform: `translateX(-${current * 100}%)`, height: '100%' }}>
          {/* CLIENT SLIDE 1 — Welcome */}
          <Slide>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: 'var(--af-black)', padding: '32px 24px 24px' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: 'var(--af-white)', marginBottom: 10 }}>ArchFlow</div>
              </div>
              <div style={{ padding: '28px 24px', flex: 1, overflowY: 'auto' }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: 'var(--af-black)', marginBottom: 12 }}>
                  Добро пожаловать
                </h2>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-13)', color: 'var(--af-black)', lineHeight: 1.6, marginBottom: 20 }}>
                  Дизайнер открыл вам доступ к проекту. Здесь вы можете следить за ходом работ.
                </p>
                <div style={{ background: 'var(--af-offwhite)', borderLeft: '2px solid var(--af-black)', padding: '14px 16px' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-9)', color: 'var(--af-black)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Что здесь можно</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-12)', color: 'var(--af-black)', lineHeight: 1.7 }}>
                    Просматривать отчёты, комментировать, общаться с дизайнером напрямую.
                  </div>
                </div>
              </div>
            </div>
          </Slide>

          {/* CLIENT SLIDE 2 — Supervision */}
          <Slide>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 24px', overflowY: 'auto' }}>
              <CalendarPreview />
              <SlideCaption num="01 / 02" title="Авторский надзор" desc="Смотрите отчёты по визитам, замечания и их статусы." />
            </div>
          </Slide>

          {/* CLIENT SLIDE 3 — Chat */}
          <Slide>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '24px 24px', flex: 1, overflowY: 'auto' }}>
                <ClientChatPreview />
                <SlideCaption num="02 / 02" title="Общайтесь с дизайнером" desc="Задавайте вопросы и комментируйте прямо в приложении." />
              </div>
            </div>
          </Slide>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '0.5px solid var(--af-border)', background: 'var(--af-white)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{ width: 14, height: 2, border: 'none', padding: 0, cursor: 'pointer', background: i === current ? 'var(--af-black)' : 'var(--af-border)', transition: 'background 0.2s' }} />
          ))}
        </div>
        <button
          onClick={isLast ? handleComplete : next}
          style={{
            background: 'var(--af-black)', color: 'var(--af-white)', border: 'none',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-7)',
            textTransform: 'uppercase', letterSpacing: '0.16em',
            padding: '8px 14px', cursor: 'pointer',
          }}
        >
          {isLast ? 'Открыть проект →' : 'Далее →'}
        </button>
      </div>
    </div>
  );
}

function ClientChatPreview() {
  const msgs = [
    { text: 'Добрый день! Как продвигается ремонт?', own: true },
    { text: 'Всё по графику, на этой неделе начнём плитку', own: false },
  ];
  return (
    <div style={{ border: '0.5px solid var(--af-border)', background: 'var(--af-white)', fontSize: 0 }}>
      <div style={{ padding: '6px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 5, fontWeight: 600, color: 'var(--af-black)', borderBottom: '1.5px solid var(--af-black)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>С дизайнером</div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.own ? 'flex-end' : 'flex-start' }}>
            <div style={{
              background: m.own ? 'var(--af-black)' : 'var(--af-offwhite)', color: m.own ? 'var(--af-white)' : 'var(--af-black)',
              padding: '4px 8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 6,
              maxWidth: '70%',
            }}>{m.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ======================== MAIN COMPONENT ========================

interface OnboardingFlowProps {
  userId: string;
  userRole?: string;
  userEmail?: string;
  onComplete: () => void;
}

export default function OnboardingFlow({ userId, userRole, userEmail, onComplete }: OnboardingFlowProps) {
  if (userEmail === 'supply-demo@archflow.ru') {
    return <SupplyDemoOnboarding userId={userId} onComplete={onComplete} />;
  }
  if (userRole === 'client') {
    return <ClientOnboarding userId={userId} onComplete={onComplete} />;
  }
  return <DesignerOnboarding userId={userId} onComplete={onComplete} />;
}

// ======================== SUPPLY DEMO ONBOARDING ========================

function SupplyDemoOnboarding({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const handleComplete = async () => {
    try {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId);
    } catch {}
    onComplete();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--af-white)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: 'var(--af-black)', padding: '32px 24px 24px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: 'var(--af-white)', marginBottom: 10 }}>ArchFlow</div>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-9)', color: 'var(--af-black)',
            border: '0.5px solid var(--af-black)', padding: '3px 10px',
            textTransform: 'uppercase', letterSpacing: '0.16em',
          }}>Демо</span>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 24px', flex: 1, overflowY: 'auto' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: 'var(--af-black)', marginBottom: 12 }}>
            Добро пожаловать в демо Комплектации
          </h2>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-13)', color: 'var(--af-black)', lineHeight: 1.6, marginBottom: 24 }}>
            Создайте проект, добавьте позиции и загрузите документацию.
          </p>

          {[
            { n: '01', t: 'Создайте проект' },
            { n: '02', t: 'Откройте раздел «Комплектация»' },
            { n: '03', t: 'Добавьте позиции и загрузите файлы' },
          ].map((step, i) => (
            <div key={i} style={{ background: 'var(--af-offwhite)', padding: '14px 16px', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-9)', color: 'var(--af-border)' }}>{step.n}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-13)', color: 'var(--af-black)' }}>{step.t}</span>
            </div>
          ))}

          <div style={{ background: 'var(--af-offwhite)', borderLeft: '2px solid var(--af-black)', padding: '14px 16px', marginTop: 20 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-9)', color: 'var(--af-black)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>Что доступно</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-12)', color: 'var(--af-black)', lineHeight: 1.7 }}>
              Спецификация, Timeline, Этапы, Импорт Excel, Документация и Настройки комплектации.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{
        padding: '16px 24px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        borderTop: '0.5px solid var(--af-border)', background: 'var(--af-white)', flexShrink: 0,
      }}>
        <button
          onClick={handleComplete}
          style={{
            width: '100%', background: 'var(--af-black)', color: 'var(--af-white)', border: 'none',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-9)',
            textTransform: 'uppercase', letterSpacing: '0.16em',
            padding: '14px 0', cursor: 'pointer',
          }}
        >
          Создать первый проект →
        </button>
      </div>
    </div>
  );
}

function DesignerOnboarding({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'unknown'>('unknown');

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) setPlatform('ios');
    else if (/Android/.test(ua)) setPlatform('android');
  }, []);

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < TOTAL_SLIDES) setCurrent(idx);
  }, []);

  const next = useCallback(() => {
    if (current < TOTAL_SLIDES - 1) setCurrent(c => c + 1);
  }, [current]);

  const prev = useCallback(() => {
    if (current > 0) setCurrent(c => c - 1);
  }, [current]);

  const handleComplete = async () => {
    try {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId);
    } catch {}
    onComplete();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
  };

  const isLast = current === TOTAL_SLIDES - 1;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'var(--af-white)', zIndex: 9999,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide container */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          display: 'flex', transition: 'transform 0.3s ease',
          transform: `translateX(-${current * 100}%)`,
          height: '100%',
        }}>
          {/* SLIDE 1 — Welcome */}
          <Slide>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: 'var(--af-black)', padding: '32px 24px 24px' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: 'var(--af-white)', marginBottom: 10 }}>ArchFlow</div>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-9)', color: 'var(--af-black)',
                  border: '0.5px solid var(--af-black)', padding: '3px 10px',
                  textTransform: 'uppercase', letterSpacing: '0.16em',
                }}>Early Access</span>
              </div>
              <div style={{ padding: '28px 24px', flex: 1, overflowY: 'auto' }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: 'var(--af-black)', marginBottom: 12 }}>
                  Добро пожаловать в команду
                </h2>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-13)', color: 'var(--af-black)', lineHeight: 1.6, marginBottom: 20 }}>
                  Один из первых дизайнеров на платформе. Ваш голос будет формировать продукт.
                </p>
                <div style={{ background: 'var(--af-offwhite)', borderLeft: '2px solid var(--af-black)', padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-9)', color: 'var(--af-black)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Наше обещание</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: 'var(--af-black)', lineHeight: 1.5 }}>
                    Ранние пользователи получат лучшие условия — это обещание, а не маркетинг.
                  </div>
                </div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-11)', color: 'var(--af-black)' }}>
                  За 30 секунд покажем как это работает →
                </p>
              </div>
            </div>
          </Slide>

          {/* SLIDE 2 — Projects */}
          <Slide>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 24px', overflowY: 'auto' }}>
              <ProjectsPreview />
              <SlideCaption num="01 / 06" title="Все проекты в одном месте" desc="Каждый проект — отдельное рабочее пространство с разделами, командой и заказчиком." />
            </div>
          </Slide>

          {/* SLIDE 3 — Sections */}
          <Slide>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 24px', overflowY: 'auto' }}>
              <SectionsPreview />
              <SlideCaption num="02 / 06" title="Три раздела — основа проекта" desc="Дизайн, авторский надзор и чат уже доступны. Комплектация откроется в апреле." />
            </div>
          </Slide>

          {/* SLIDE 4 — Calendar */}
          <Slide>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 24px', overflowY: 'auto' }}>
              <CalendarPreview />
              <SlideCaption num="03 / 06" title="Авторский надзор с умным календарём" desc="Настройте дни визитов и дату счёта — иконки появятся в календаре автоматически." />
            </div>
          </Slide>

          {/* SLIDE 5 — Access */}
          <Slide>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 24px', overflowY: 'auto' }}>
              <AccessPreview />
              <SlideCaption num="04 / 06" title="Вы решаете кто что видит" desc="Заказчик видит только то, что откроете. Команда работает, но не видит финансы." />
            </div>
          </Slide>

          {/* SLIDE 6 — Chat */}
          <Slide>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 24px', overflowY: 'auto' }}>
              <ChatPreview />
              <SlideCaption num="05 / 06" title="Чат с командой и заказчиком" desc="Два отдельных чата — внутренний для команды и прозрачный для заказчика." />
            </div>
          </Slide>

          {/* SLIDE 7 — CTA */}
          <Slide>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: 'var(--af-black)', padding: '32px 24px 24px' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-9)', color: 'var(--af-black)', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 10 }}>Готово</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: 'var(--af-white)' }}>
                  Создайте первый проект
                </h2>
              </div>
              <div style={{ padding: '28px 24px', flex: 1, overflowY: 'auto' }}>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-13)', color: 'var(--af-black)', lineHeight: 1.6, marginBottom: 20 }}>
                  Займёт 3 минуты. Потом пригласите заказчика — оценит прозрачность.
                </p>
                {[
                  { n: '01', t: 'Создайте проект' },
                  { n: '02', t: 'Настройте авторский надзор' },
                  { n: '03', t: 'Пригласите заказчика и команду' },
                ].map((step, i) => (
                  <div key={i} style={{ background: 'var(--af-offwhite)', padding: '12px 16px', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-9)', color: 'var(--af-border)' }}>{step.n}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-12)', color: 'var(--af-black)' }}>{step.t}</span>
                  </div>
                ))}

                {/* PWA install hint */}
                <div style={{ background: 'var(--af-offwhite)', borderLeft: '2px solid var(--af-black)', padding: '12px 16px', marginTop: 16 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-9)', color: 'var(--af-black)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Совет</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-12)', color: 'var(--af-black)', marginTop: 6 }}>Добавьте на рабочий стол</div>
                  {(platform === 'ios' || platform === 'unknown') && (
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-11)', color: 'var(--af-black)', lineHeight: 1.6, marginTop: 6 }}>
                      Safari → кнопка поделиться →{'\u00A0'}«На экран домой»
                    </div>
                  )}
                  {(platform === 'android' || platform === 'unknown') && (
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-11)', color: 'var(--af-black)', lineHeight: 1.6, marginTop: platform === 'unknown' ? 2 : 6 }}>
                      Chrome → меню →{'\u00A0'}«Добавить на главный экран»
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Slide>
        </div>
      </div>

      {/* Bottom bar: dots + button */}
      <div style={{
        padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '0.5px solid var(--af-border)', background: 'var(--af-white)', flexShrink: 0,
      }}>
        {/* Dots */}
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: 14, height: 2, border: 'none', padding: 0, cursor: 'pointer',
                background: i === current ? 'var(--af-black)' : 'var(--af-border)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Next / Finish button */}
        <button
          onClick={isLast ? handleComplete : next}
          style={{
            background: 'var(--af-black)', color: 'var(--af-white)', border: 'none',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-7)',
            textTransform: 'uppercase', letterSpacing: '0.16em',
            padding: '8px 14px', cursor: 'pointer',
          }}
        >
          {isLast ? 'Начать →' : 'Далее →'}
        </button>
      </div>
    </div>
  );
}
