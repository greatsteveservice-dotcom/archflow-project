"use client";

/**
 * Mockup нового hero-экрана лендинга.
 * Использует те же шрифты (Playfair + Inter) и сетку, что и /welcome,
 * чтобы можно было оценить новый текст «в боевой раме».
 */

import { useEffect } from "react";

const BLACK = "#111";
const OFFWHITE = "#F6F6F4";
const WHITE = "#FFFFFF";
const BORDER = "#EBEBEB";
const OCHRE = "#B8862A";
const MUTED = "#6F6F6F";
const FONT_BODY = "'Inter', -apple-system, system-ui, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";

function useGoogleFonts() {
  useEffect(() => {
    const ID = "hero-mockup-fonts";
    if (document.getElementById(ID)) return;
    const link = document.createElement("link");
    link.id = ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;700;900&display=swap";
    document.head.appendChild(link);
  }, []);
}

export default function HeroMockup() {
  useGoogleFonts();
  return (
    <div style={{ background: OFFWHITE, minHeight: "100vh", fontFamily: FONT_BODY, color: BLACK }}>
      <Topbar />
      <main>
        <Hero />
        <NextSectionPreview />
      </main>
    </div>
  );
}

function Topbar() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 40px",
        background: WHITE,
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Archflow" style={{ height: 28 }} />
      <nav style={{ display: "flex", gap: 24, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>
        <span><span style={{ color: MUTED, marginRight: 6 }}>01</span>Модули</span>
        <span><span style={{ color: MUTED, marginRight: 6 }}>02</span>Тарифы</span>
        <span><span style={{ color: MUTED, marginRight: 6 }}>03</span>Вопросы</span>
      </nav>
      <div style={{ display: "flex", gap: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", padding: "10px 14px" }}>Войти</span>
        <span
          style={{
            fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
            padding: "10px 14px", background: BLACK, color: WHITE,
          }}
        >
          Попробовать →
        </span>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section style={{ padding: "100px 40px 120px", maxWidth: 1240, margin: "0 auto" }}>
      <div style={{ maxWidth: 980 }}>
        {/* главный тезис в две строки */}
        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 900,
            fontSize: "clamp(48px, 7.2vw, 104px)",
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
            margin: 0,
            marginBottom: 32,
          }}
        >
          <span style={{ display: "block" }}>
            Дизайнер тратит на дизайн{" "}
            <span style={{ color: OCHRE }}>17%</span> времени.
          </span>
          <span style={{ display: "block" }}>
            Archflow — про остальные{" "}
            <span style={{ color: OCHRE }}>83%</span>.
          </span>
        </h1>

        {/* пояснение */}
        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: "clamp(18px, 1.6vw, 22px)",
            lineHeight: 1.45,
            color: BLACK,
            margin: 0,
            marginBottom: 40,
            maxWidth: 760,
          }}
        >
          Визиты, поставки, оплаты, согласования с клиентом — в одном пространстве.
        </p>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <a
            href="/login?mode=register"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              background: OCHRE,
              color: WHITE,
              padding: "20px 30px",
              fontFamily: FONT_BODY,
              fontSize: 13,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Завести проект <span style={{ fontSize: 18 }}>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function NextSectionPreview() {
  // Подсказка-приманка: что идёт следом — чтобы видно было, как hero встаёт в поток страницы
  return (
    <section style={{ padding: "0 40px 80px", maxWidth: 1240, margin: "0 auto" }}>
      <div
        style={{
          background: WHITE,
          border: `1px solid ${BORDER}`,
          padding: "32px 36px",
          display: "grid",
          gridTemplateColumns: "1fr 2.2fr",
          gap: 32,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: MUTED,
              marginBottom: 8,
            }}
          >
            Дальше — главный экран
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>
            Все проекты в одном списке.
          </div>
        </div>
        <div
          style={{
            height: 180,
            background: OFFWHITE,
            border: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: MUTED,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          [ Скриншот · 01 — Проекты ]
        </div>
      </div>
    </section>
  );
}
