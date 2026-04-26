// Static visual mockup of revised client cabinet — for design review.
// Implements Archflow design handoff (cabinet-preview.html) with Vollkorn SC only.
"use client";

import { useState } from "react";

// ── Tokens (CSS-in-JS for the mockup page; production should move to globals) ──
const C = {
  black: "#111111",
  white: "#FFFFFF",
  offwhite: "#F6F6F4",
  cream: "#EFEDE5",
  border: "#EBEBEB",
  inkMuted: "rgb(100,100,100)",
  inkFaint: "rgb(150,150,150)",
};

// One font: Vollkorn SC. README forbids text-transform: uppercase + Inter/JetBrains Mono
const FONT = "var(--af-font)";

const microStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: 11,
  fontWeight: 400,
  letterSpacing: "0.16em",
  color: C.inkMuted,
};

const kickerStyle: React.CSSProperties = {
  ...microStyle,
  fontSize: 10,
  letterSpacing: "0.18em",
};

const headingStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  margin: 0,
  fontVariantNumeric: "tabular-nums",
};

const numStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
};

// ── Topbar ───────────────────────────────────────────────────
function Topbar() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        padding: "18px 28px",
        borderBottom: `0.5px solid ${C.border}`,
        background: C.white,
        gap: 24,
      }}
      className="cab-top"
    >
      <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: C.black }}>
        <span style={{ width: 22, height: 22, background: C.black, display: "block" }} />
        <span style={{ ...microStyle, fontSize: 11, color: C.black, letterSpacing: "0.18em" }}>Archflow</span>
      </a>
      <div
        className="cab-crumbs"
        style={{
          display: "flex",
          gap: 10,
          alignItems: "baseline",
          ...microStyle,
          fontSize: 11,
          letterSpacing: "0.14em",
        }}
      >
        <span>Проекты</span>
        <span style={{ color: C.inkFaint }}>›</span>
        <span style={{ color: C.black, fontWeight: 600 }}>Квартира на М. Бронной</span>
        <span style={{ color: C.inkFaint }}>›</span>
        <span>Главная</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, ...microStyle, fontSize: 10 }}>
        <span style={{ display: "none" }} className="cab-name-desktop">Михаил К.</span>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: C.black,
            color: C.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 0,
          }}
        >
          МК
        </span>
      </div>
    </div>
  );
}

// ── Action card (black) ─────────────────────────────────────
function ActionCard() {
  return (
    <div
      style={{
        background: C.black,
        color: C.white,
        padding: "28px 36px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 32,
        borderBottom: `0.5px solid ${C.border}`,
      }}
      className="cab-action"
    >
      <div>
        <div
          style={{
            ...kickerStyle,
            color: "rgba(255,255,255,0.55)",
            marginBottom: 8,
            display: "flex",
            gap: 14,
            alignItems: "baseline",
          }}
        >
          <span>От вас ждут</span>
          <span style={{ color: "rgba(255,255,255,0.95)", fontWeight: 600 }}>через 2 дня · до 27 апреля</span>
        </div>
        <h2 style={{ ...headingStyle, fontSize: 32, lineHeight: 1.1, marginBottom: 6 }} className="cab-action-title">
          Допсоглашение №5 — замена люстры
        </h2>
        <div style={{ ...kickerStyle, color: "rgba(255,255,255,0.55)" }}>
          Подписание · 1 документ · 3 минуты
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }} className="cab-action-cta-wrap">
        <button
          style={{
            background: C.white,
            color: C.black,
            border: "none",
            padding: "14px 24px",
            fontFamily: FONT,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.16em",
            cursor: "pointer",
            minWidth: 220,
          }}
        >
          Подписать →
        </button>
      </div>
      <div
        style={{
          gridColumn: "1 / -1",
          marginTop: 10,
          paddingTop: 14,
          borderTop: "0.5px solid rgba(255,255,255,0.18)",
          ...kickerStyle,
          color: "rgba(255,255,255,0.65)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span>+1 задача ниже · оплатить аванс кухни до 30 апр</span>
        <a
          href="#"
          style={{
            color: C.white,
            textDecoration: "none",
            borderBottom: "0.5px solid rgba(255,255,255,0.4)",
            cursor: "pointer",
          }}
        >
          Перейти →
        </a>
      </div>
    </div>
  );
}

// ── Stage strip ─────────────────────────────────────────────
const SEGMENTS = [
  { label: "Концепция", state: "done" },
  { label: "Документы", state: "done" },
  { label: "Чистовая",  state: "now" },
  { label: "Комплектация", state: "" },
  { label: "Сборка",    state: "" },
  { label: "Сдача",     state: "" },
];

function StageStrip() {
  return (
    <div style={{ background: C.white, padding: "36px 36px 28px", borderBottom: `0.5px solid ${C.border}` }} className="cab-stage">
      <div style={{ marginBottom: 22 }}>
        <div style={{ ...kickerStyle, marginBottom: 8 }}>Стадия проекта</div>
        <h1 style={{ ...headingStyle, fontSize: 56, lineHeight: 1 }} className="cab-stage-title">Чистовая отделка</h1>
        <div style={{ ...microStyle, fontSize: 11, marginTop: 8 }}>
          Этап <strong style={{ color: C.black, fontWeight: 600 }}>3 из 6</strong> · до{" "}
          <strong style={{ color: C.black, fontWeight: 600 }}>18 мая</strong> ·{" "}
          <strong style={{ color: C.black, fontWeight: 600 }}>68 %</strong>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          height: 6,
          border: `0.5px solid ${C.border}`,
          marginBottom: 8,
        }}
      >
        {SEGMENTS.map((s, i) => (
          <div
            key={i}
            style={{
              borderRight: i < 5 ? `0.5px solid ${C.border}` : "none",
              background:
                s.state === "done"
                  ? C.black
                  : s.state === "now"
                  ? `linear-gradient(to right, ${C.black} 68%, transparent 68%)`
                  : "transparent",
            }}
          />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)" }}>
        {SEGMENTS.map((s, i) => (
          <div
            key={i}
            style={{
              ...microStyle,
              fontSize: 9,
              letterSpacing: "0.14em",
              color: s.state === "now" ? C.black : s.state === "done" ? C.inkMuted : C.inkFaint,
              fontWeight: s.state === "now" ? 600 : 400,
              paddingTop: 8,
              paddingRight: 8,
            }}
          >
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Status row: Budget · Calendar · Supply ──────────────────
function StatusRow() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        background: C.white,
        borderBottom: `0.5px solid ${C.border}`,
      }}
      className="cab-status"
    >
      <BudgetCol />
      <CalendarCol />
      <SupplyCol />
    </div>
  );
}

const colStyle: React.CSSProperties = {
  padding: "28px 32px",
  borderRight: `0.5px solid ${C.border}`,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  minHeight: 220,
};

function BudgetCol() {
  return (
    <div style={colStyle} className="cab-col">
      <div style={{ ...kickerStyle, fontSize: 9, letterSpacing: "0.20em" }}>Бюджет</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ ...numStyle, fontSize: 56, lineHeight: 0.9, letterSpacing: "-0.02em" }}>
          49<span style={{ fontSize: 24 }}> %</span>
        </span>
        <span style={{ ...microStyle, fontSize: 10 }}>оплачено</span>
      </div>
      <div style={{ height: 4, background: C.cream, border: `0.5px solid ${C.border}`, position: "relative" }}>
        <i style={{ position: "absolute", left: 0, top: -1, height: 4, background: C.black, width: "49%", display: "block" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 12px", alignItems: "baseline", fontFamily: FONT, fontSize: 11 }}>
        <span style={{ ...microStyle, fontSize: 9 }}>План</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>2 450 000 ₽</span>
        <span style={{ ...microStyle, fontSize: 9 }}>Оплачено</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>1 210 000 ₽</span>
        <span style={{ ...microStyle, fontSize: 9 }}>Остаток</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>1 240 000 ₽</span>
      </div>
      <div style={{ ...kickerStyle, fontSize: 10, paddingTop: 10, borderTop: `0.5px solid ${C.border}` }}>
        Сл. платёж · <strong style={{ color: C.black, fontWeight: 500 }}>30 апр · 485 000 ₽</strong>
      </div>
    </div>
  );
}

function CalendarCol() {
  const events = [
    { when: "27 апр · пн", what: "Приёмка плитки" },
    { when: "4 мая · пн", what: "Сборка кухни" },
    { when: "17 мая · сб", what: "Финальный визит" },
  ];
  return (
    <div style={colStyle} className="cab-col">
      <div style={{ ...kickerStyle, fontSize: 9, letterSpacing: "0.20em" }}>Что впереди</div>
      {events.map((e, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 14, alignItems: "baseline" }}>
          <span style={{ ...microStyle, fontSize: 9, letterSpacing: "0.14em" }}>{e.when}</span>
          <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 600 }}>{e.what}</span>
        </div>
      ))}
      <div style={{ ...kickerStyle, fontSize: 10, marginTop: 6 }}>
        <a href="#" style={{ color: C.black, textDecoration: "none", borderBottom: `0.5px solid ${C.border}` }}>
          Календарь →
        </a>
      </div>
    </div>
  );
}

function SupplyCol() {
  const segments = [
    { lab: "Заказано", n: 5, w: 42, op: 1 },
    { lab: "В пути", n: 4, w: 33, op: 0.55 },
    { lab: "Ожидает", n: 2, w: 17, op: 0.32 },
    { lab: "Привезено", n: 1, w: 8, op: 0.12 },
  ];
  return (
    <div style={{ ...colStyle, borderRight: "none" }} className="cab-col">
      <div style={{ ...kickerStyle, fontSize: 9, letterSpacing: "0.20em" }}>Поставки</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ ...numStyle, fontSize: 56, lineHeight: 0.9 }}>12</span>
        <span style={{ ...microStyle, fontSize: 10 }}>позиций всего</span>
      </div>
      <div style={{ display: "flex", height: 8, border: `0.5px solid ${C.border}` }}>
        {segments.map((s, i) => (
          <span key={i} style={{ width: `${s.w}%`, background: `rgba(14,14,14,${s.op})`, display: "block" }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px", fontFamily: FONT, fontSize: 11 }}>
        {segments.flatMap((s, i) => [
          <span key={`l${i}`} style={{ ...microStyle, fontSize: 9, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, background: `rgba(14,14,14,${s.op})`, display: "inline-block" }} />
            {s.lab}
          </span>,
          <span key={`n${i}`} style={{ fontVariantNumeric: "tabular-nums" }}>{s.n}</span>,
        ])}
      </div>
    </div>
  );
}

// ── Mid: Activity (big) + Designer card (cream) ─────────────
function MidRow() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        background: C.white,
        borderBottom: `0.5px solid ${C.border}`,
      }}
      className="cab-mid"
    >
      <ActivityCol />
      <DesignerCol />
    </div>
  );
}

const ACTIVITY = [
  { av: "АД", sys: false, when: "24 апр · 18:42", who: "Анна Дизайн", text: "загрузила финальные визуализации (5 файлов)" },
  { av: "ИС", sys: false, when: "23 апр · 11:15", who: "Игорь Соколов", text: "закрыл замечание по штукатурке" },
  { av: "∞", sys: true, when: "22 апр · 09:30", who: "", text: "Получен отчёт о визите №4 — ", em: "12 фото, 2 замечания" },
  { av: "МК", sys: false, when: "21 апр · 14:08", who: "Вы", text: "утвердили визуализацию кухни" },
];

function ActivityCol() {
  return (
    <div style={{ padding: "28px 32px", borderRight: `0.5px solid ${C.border}` }} className="cab-act-col">
      <div style={{ ...kickerStyle, fontSize: 9, letterSpacing: "0.20em", marginBottom: 18 }}>Активность по проекту</div>
      {ACTIVITY.map((r, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "28px 90px 1fr",
            gap: 14,
            alignItems: "center",
            padding: "12px 0",
            borderBottom: i < ACTIVITY.length - 1 ? `0.5px solid ${C.border}` : "none",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: r.sys ? C.black : C.cream,
              border: r.sys ? "none" : `0.5px solid ${C.border}`,
              color: r.sys ? C.white : C.black,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT,
              fontSize: 9,
              fontWeight: 600,
            }}
          >
            {r.av}
          </div>
          <div style={{ ...microStyle, fontSize: 9, letterSpacing: "0.14em" }}>{r.when}</div>
          <div style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.4, color: C.black, letterSpacing: "0.01em" }}>
            {r.who && <em style={{ fontStyle: "normal", fontWeight: 600 }}>{r.who} </em>}
            {r.text}
            {r.em && <em style={{ fontStyle: "normal", fontWeight: 600 }}>{r.em}</em>}
          </div>
        </div>
      ))}
      <div style={{ ...kickerStyle, fontSize: 10, marginTop: 14 }}>
        <a href="#" style={{ color: C.black, textDecoration: "none", borderBottom: `0.5px solid ${C.border}` }}>
          Вся активность →
        </a>
      </div>
    </div>
  );
}

function DesignerCol() {
  return (
    <div
      style={{
        padding: "28px 32px",
        background: C.cream,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
      className="cab-des-col"
    >
      <div style={{ ...kickerStyle, fontSize: 9, letterSpacing: "0.20em", marginBottom: 4 }}>Ваш дизайнер</div>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: C.black,
          color: C.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        АД
      </div>
      <h3 style={{ ...headingStyle, fontSize: 22 }}>Анна Дизайн</h3>
      <div style={{ ...kickerStyle, fontSize: 10 }}>Studio · ведёт проект</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
        <button
          style={{
            background: C.black,
            color: C.white,
            border: `0.5px solid ${C.black}`,
            padding: "12px 18px",
            fontFamily: FONT,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.16em",
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          Написать в чат →
        </button>
        <button
          style={{
            background: C.white,
            color: C.black,
            border: `0.5px solid ${C.black}`,
            padding: "12px 18px",
            fontFamily: FONT,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.16em",
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          +7 (903) ··· · позвонить
        </button>
      </div>
      <div
        style={{
          ...kickerStyle,
          fontSize: 10,
          paddingTop: 14,
          borderTop: `0.5px solid ${C.border}`,
        }}
      >
        Последний контакт · <strong style={{ color: C.black, fontWeight: 500 }}>вчера, 18:42</strong>
      </div>
    </div>
  );
}

// ── Modules grid ────────────────────────────────────────────
const MODULES = [
  { num: "01", name: "Дизайн", count: "20", lab: "файлов", chat: false },
  { num: "02", name: "Комплектация", count: "12", lab: "позиций", chat: false },
  { num: "03", name: "Ход работ", count: "5", lab: "отчётов", chat: false },
  { num: "04", name: "Чат", count: "3", lab: "новых сообщения", chat: true, dot: true },
];

function ModulesGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: C.white }} className="cab-mods">
      {MODULES.map((m, i) => {
        const isChat = m.chat;
        return (
          <a
            key={m.num}
            href="#"
            style={{
              padding: "28px 24px 24px",
              borderRight: i < MODULES.length - 1 ? `0.5px solid ${C.border}` : "none",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              minHeight: 140,
              cursor: "pointer",
              background: isChat ? C.black : C.white,
              color: isChat ? C.white : C.black,
              textDecoration: "none",
            }}
            className={isChat ? "cab-mod cab-mod-chat" : "cab-mod"}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ ...microStyle, fontSize: 9, color: isChat ? "rgba(255,255,255,0.4)" : C.inkFaint }}>{m.num}</span>
              <span style={{ fontFamily: FONT, fontSize: 14 }}>→</span>
            </div>
            <div className="cab-mod-name" style={{ ...headingStyle, fontSize: 24, marginTop: "auto" }}>
              {m.name}
            </div>
            <div className="cab-mod-bot" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <span style={{ ...numStyle, fontSize: 28, lineHeight: 1, display: "flex", alignItems: "center", gap: 8 }}>
                {m.dot && (
                  <span style={{ width: 10, height: 10, minWidth: 10, borderRadius: 999, background: C.white, display: "inline-block", flexShrink: 0 }} />
                )}
                {m.count}
              </span>
              <span style={{ ...microStyle, fontSize: 9, letterSpacing: "0.16em", color: isChat ? "rgba(255,255,255,0.55)" : C.inkMuted }}>
                {m.lab}
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}

// ── Page wrapper ────────────────────────────────────────────
export default function CabinetMockupPage() {
  return (
    <div style={{ background: C.cream, minHeight: "100vh", color: C.black, fontFamily: FONT }}>
      <style>{`
        /* Sectional order on desktop matches handoff: top → action → stage → status → mid → modules.
           On mobile the action card stays second, after a compressed crumbs line. */
        .cab-frame { max-width: 1280px; margin: 0 auto; background: #fff; border: 0.5px solid ${C.border}; }

        @media (max-width: 768px) {
          .cab-top { padding: 14px 20px !important; gap: 12px !important; grid-template-columns: auto auto !important; }
          .cab-crumbs { display: none !important; }
          .cab-name-desktop { display: none !important; }

          .cab-mobile-crumbs {
            display: block !important;
            padding: 12px 20px;
            border-bottom: 0.5px solid ${C.border};
            font-family: ${FONT};
            font-size: 9px;
            letter-spacing: 0.14em;
            color: ${C.inkMuted};
            background: #fff;
          }

          .cab-stage { padding: 24px 20px !important; }
          .cab-stage-title { font-size: 36px !important; }

          .cab-action { padding: 22px 20px !important; grid-template-columns: 1fr !important; }
          .cab-action-title { font-size: 24px !important; }
          .cab-action-cta-wrap { align-items: stretch !important; }
          .cab-action-cta-wrap button { width: 100% !important; min-width: 0 !important; }

          .cab-status { grid-template-columns: 1fr !important; }
          .cab-col {
            border-right: none !important;
            border-bottom: 0.5px solid ${C.border} !important;
            padding: 22px 20px !important;
            min-height: auto !important;
          }
          .cab-col:last-child { border-bottom: none !important; }

          .cab-mid { grid-template-columns: 1fr !important; }
          .cab-act-col, .cab-des-col { padding: 22px 20px !important; }
          .cab-act-col { border-right: none !important; border-bottom: 0.5px solid ${C.border} !important; }

          .cab-mods { grid-template-columns: 1fr 1fr !important; }
          .cab-mod {
            border-right: 0.5px solid ${C.border} !important;
            border-bottom: 0.5px solid ${C.border} !important;
            min-height: 110px !important;
            padding: 18px !important;
          }
          .cab-mod:nth-child(2n) { border-right: none !important; }
        }
        @media (min-width: 769px) {
          .cab-mobile-crumbs { display: none !important; }
          .cab-name-desktop { display: inline !important; }
        }
      `}</style>

      <div className="cab-frame">
        <Topbar />
        <div className="cab-mobile-crumbs" style={{ display: "none" }}>
          Проекты <span style={{ color: C.inkFaint }}>›</span>{" "}
          <span style={{ color: C.black, fontWeight: 600 }}>Квартира на М. Бронной</span>
        </div>
        <ActionCard />
        <StageStrip />
        <StatusRow />
        <MidRow />
        <ModulesGrid />
      </div>
    </div>
  );
}
