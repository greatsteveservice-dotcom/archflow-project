"use client";

/**
 * Презентация Archflow — 6 слайдов.
 * Слайд 01 — кастомный (логотип, позиционирование, запрос).
 * Слайды 02–06 — транскрипция скриншотов «как есть».
 * Навигация: ←/→ клавиатура, клик по краям, кнопки внизу.
 */

import { useEffect, useState, useCallback } from "react";

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const BLACK = "#111";
const OFFWHITE = "#F6F6F4";
const WHITE = "#FFFFFF";
const BORDER = "#EBEBEB";
const OCHRE = "#B8862A";
const MUTED = "#6F6F6F";
const FAINT = "#9C9C9C";

// Грузим шрифты и print-стили через document.head, а не через JSX, —
// чтобы React не пытался удалять/перевставлять эти узлы при ре-рендерах
// (это давало NotFoundError: removeChild).
function ensureHeadAssets(printMode: boolean) {
  if (typeof document === "undefined") return;
  const FONT_ID = "deck-fonts";
  if (!document.getElementById(FONT_ID)) {
    const link = document.createElement("link");
    link.id = FONT_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap";
    document.head.appendChild(link);
  }
  const PRINT_ID = "deck-print-styles";
  const existing = document.getElementById(PRINT_ID);
  if (printMode && !existing) {
    const style = document.createElement("style");
    style.id = PRINT_ID;
    style.textContent = `
      @page { size: 1280px 800px; margin: 0; }
      html, body { margin: 0; padding: 0; background: #FFFFFF; }
      .deck-page {
        width: 1280px;
        height: 800px;
        box-sizing: border-box;
        overflow: hidden;
        page-break-after: always;
        break-after: page;
        background: #F6F6F4;
        padding: 28px 32px;
        font-family: ${FONT};
      }
      .deck-page:last-child { page-break-after: auto; }
      .deck-page .deck-content { max-width: 100%; height: 100%; }
    `;
    document.head.appendChild(style);
  } else if (!printMode && existing) {
    existing.remove();
  }
}

export default function DeckMockup() {
  const [n, setN] = useState(1);
  const [printMode, setPrintMode] = useState(false);
  const total = 6;
  const go = useCallback((v: number) => setN((x) => Math.max(1, Math.min(total, v))), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPrintMode(params.get("print") === "1");
  }, []);

  useEffect(() => {
    ensureHeadAssets(printMode);
  }, [printMode]);

  useEffect(() => {
    if (printMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(n + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(n - 1); }
      else if (e.key === "Home") go(1);
      else if (e.key === "End") go(total);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n, go, printMode]);

  if (printMode) {
    return (
      <>
        {[Slide01, Slide02, Slide03, Slide04, Slide05, Slide06].map((Slide, i) => (
          <div key={i} className="deck-page">
            <div
              style={{
                fontFamily: FONT,
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: MUTED,
                marginBottom: 14,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Archflow · Презентация для встречи</span>
              <span>
                {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            </div>
            <div className="deck-content">
              <Slide />
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          background: OFFWHITE,
          fontFamily: FONT,
          color: BLACK,
          padding: "32px 32px 80px",
          position: "relative",
        }}
      >
        <Topbar n={n} total={total} go={go} />
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {n === 1 && <Slide01 />}
          {n === 2 && <Slide02 />}
          {n === 3 && <Slide03 />}
          {n === 4 && <Slide04 />}
          {n === 5 && <Slide05 />}
          {n === 6 && <Slide06 />}
        </div>
        <BottomBar n={n} total={total} go={go} />
      </div>
    </>
  );
}

/* ============ TOP / BOTTOM CHROME ============ */

function Topbar({ n, total, go }: { n: number; total: number; go: (v: number) => void }) {
  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: FONT,
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: MUTED,
      }}
    >
      <span>Archflow · Презентация для встречи</span>
      <span>
        {String(n).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}

function BottomBar({ n, total, go }: { n: number; total: number; go: (v: number) => void }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 18,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        gap: 8,
        zIndex: 50,
      }}
    >
      <DeckBtn onClick={() => go(n - 1)} disabled={n === 1}>← Назад</DeckBtn>
      <div
        style={{
          background: WHITE,
          border: `1px solid ${BORDER}`,
          padding: "10px 14px",
          fontFamily: FONT,
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: BLACK,
        }}
      >
        Слайд {n} · {total}
      </div>
      <DeckBtn onClick={() => go(n + 1)} disabled={n === total}>Дальше →</DeckBtn>
    </div>
  );
}

function DeckBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? OFFWHITE : WHITE,
        border: `1px solid ${BLACK}`,
        padding: "10px 18px",
        fontFamily: FONT,
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        cursor: disabled ? "default" : "pointer",
        color: disabled ? FAINT : BLACK,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function SlideShell({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <section
      style={{
        background: dark ? BLACK : WHITE,
        color: dark ? WHITE : BLACK,
        border: dark ? "none" : `1px solid ${BORDER}`,
        padding: "56px 56px 72px",
        minHeight: "75vh",
      }}
    >
      {children}
    </section>
  );
}

function MicroLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: color ?? MUTED,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

/* ============ SLIDE 01 — Кастомный интро ============ */

function Slide01() {
  return (
    <SlideShell>
      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 64, alignItems: "start" }}>
        <div>
          {/* Логотип */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Archflow" style={{ height: 56, width: "auto", marginBottom: 24 }} />
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(40px, 5vw, 64px)",
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
            }}
          >
            Archflow
          </h1>
          <p
            style={{
              fontFamily: FONT,
              fontSize: 22,
              lineHeight: 1.35,
              color: BLACK,
              margin: "14px 0 0",
              maxWidth: 480,
            }}
          >
            Платформа комплектации интерьеров.
          </p>

          <div style={{ height: 36 }} />

          <Block label="Роль в будущем">
            Мост между дизайнерами и поставщиками.
          </Block>
          <Block label="Сейчас">
            Сервис для дизайнеров по управлению проектами и коммуникации
            с заказчиком в одном пространстве.
          </Block>
        </div>

        <div style={{ borderLeft: `1px solid ${BORDER}`, paddingLeft: 32 }}>
          <MicroLabel color={OCHRE}>Запрос</MicroLabel>
          <p style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, lineHeight: 1.2, margin: "0 0 12px" }}>
            Проект бесплатный — хочется вирального развития.
          </p>
          <p style={{ fontFamily: FONT, fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.55, marginBottom: 36 }}>
            Подписка отменена. Все модули доступны без оплаты. Нужен механизм,
            чтобы продукт расходился по рынку дизайнеров сам.
          </p>

          <MicroLabel color={OCHRE}>Не нравится</MicroLabel>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            <BadItem>Позиционирование</BadItem>
            <BadItem>Название?</BadItem>
          </ul>
        </div>
      </div>
    </SlideShell>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22, maxWidth: 520 }}>
      <MicroLabel>{label}</MicroLabel>
      <p style={{ fontFamily: FONT, fontSize: 17, lineHeight: 1.45, margin: 0 }}>{children}</p>
    </div>
  );
}

function BadItem({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 22,
        fontWeight: 700,
        padding: "10px 0",
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      — {children}
    </li>
  );
}

/* ============ SLIDE 02 — Где возникает хаос ============ */

function Slide02() {
  const sources: { label: string; level: number; tag: string }[] = [
    { label: "Подрядчики и строители", level: 0.96, tag: "большинство" },
    { label: "Коммуникация с заказчиком", level: 0.86, tag: "большинство" },
    { label: "Сроки поставок и комплектация", level: 0.62, tag: "многие" },
    { label: "Срывы сроков проекта", level: 0.55, tag: "многие" },
    { label: "Юридические споры и претензии", level: 0.42, tag: "каждый второй" },
  ];
  return (
    <SlideShell>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 56, fontWeight: 900, margin: 0, letterSpacing: "-0.01em", lineHeight: 1.05 }}>
        Где возникает хаос
      </h2>
      <p style={{ fontFamily: FONT, fontSize: 18, lineHeight: 1.5, color: BLACK, marginTop: 16, marginBottom: 40, maxWidth: 820 }}>
        На вопрос «расскажи, когда последний раз что-то пошло не так» 90% ответили одинаково: «да каждый день».
      </p>

      <MicroLabel>Источники проблем — что называли чаще всего</MicroLabel>
      <div style={{ display: "grid", gap: 14, marginTop: 18, marginBottom: 40 }}>
        {sources.map((s) => (
          <div key={s.label} style={{ display: "grid", gridTemplateColumns: "1.2fr 2.2fr 0.8fr", alignItems: "center", gap: 16 }}>
            <div style={{ fontFamily: FONT, fontSize: 16 }}>{s.label}</div>
            <div style={{ position: "relative", height: 10, background: BORDER }}>
              <div style={{ position: "absolute", inset: 0, width: `${s.level * 100}%`, background: BLACK }} />
            </div>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 14, textAlign: "right" }}>{s.tag}</div>
          </div>
        ))}
      </div>

      <Quote
        text="«Бесит, что тебя выставляют крайним за не твои косяки. И бесит, что надо всех понять: и клиента, и прораба, у которого строитель накосячил, и мебельщика. Всё это нужно через себя пропустить.»"
        who="— Дизайнер, Москва"
      />
      <Quote
        text="«Прорабы бывают исключительно с организаторскими способностями — и больше ничем. Для них чертёж — терра инкогнито. Ты им всё написал в примечаниях, а они всё равно звонят и спрашивают.»"
        who="— Архитектор, Москва"
      />
    </SlideShell>
  );
}

function Quote({ text, who }: { text: string; who: string }) {
  return (
    <div style={{ borderLeft: `2px solid ${BORDER}`, paddingLeft: 18, marginBottom: 22, maxWidth: 920 }}>
      <p style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 18, lineHeight: 1.5, margin: 0 }}>{text}</p>
      <div style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 8 }}>{who}</div>
    </div>
  );
}

/* ============ SLIDE 03 — Несправедливости профессии (9 карточек) ============ */

function Slide03() {
  const cards = [
    {
      tag: "Коммуникация",
      title: "Заказчик навязывает свои решения",
      body: "«Почему-то каждый второй считает, что дизайнер — это карандаш. Я хочу вот так, нарисуй». Переубеждать — время и нервы. Соглашаться — портфолио.",
    },
    {
      tag: "Деньги",
      title: "Неловко напоминать об оплате",
      body: "Особенно после неприятного разговора. Дизайнеры молчат — и ждут. Иногда неделями. «Я не умею напоминать о деньгах за свою работу».",
    },
    {
      tag: "Портфолио",
      title: "Нельзя сфотографировать результат",
      body: "«Сделала проект, который строился год. В конце заказчик передумал пускать фотографа. Просто передумал». Проекта в портфолио нет.",
    },
    {
      tag: "Труд",
      title: "Консультируют бесплатно после сдачи",
      body: "Проект сдан. Но заказчик звонит — «просто уточнить». Потом ещё раз. «Я отвечаю, потому что неловко отказать». Иногда это длится месяцами.",
    },
    {
      tag: "Подрядчики",
      title: "Переделывают чужие косяки за свой счёт",
      body: "Строитель сделал не так — заказчик претензию предъявляет дизайнеру. «Формально договор со мной, заказчика не волнует, что произошло у строителя».",
    },
    {
      tag: "Стройка",
      title: "Строители не читают чертежи",
      body: "«Написано в примечаниях дословно — всё равно звонят и спрашивают». А потом делают по-своему, и переделывать приходится за счёт дизайнера.",
    },
    {
      tag: "Сайты",
      title: "На сайте есть — в реальности нет",
      body: "«Нестандартный поддон 1400 — написано \"в наличии\". Обзвонила всю Москву. Нашла в одном месте через три дня». Стройка ждёт.",
    },
    {
      tag: "Логистика",
      title: "Курьер, который не приехал",
      body: "«Подгадываешь несколько доставок на один день. Ждёшь на объекте. Через час звонят — \"сегодня не получится\". Делаешь одну работу дважды».",
    },
    {
      tag: "Скидки",
      title: "Отдаёшь скидку ради решения",
      body: "«Хочу камень 240×120 — дорого, давайте 60×60. Ладно, даю большую скидку, лишь бы было как задумано». Зарабатываешь меньше, зато сделано правильно.",
    },
  ];
  return (
    <SlideShell>
      <p style={{ fontFamily: FONT, fontSize: 17, lineHeight: 1.55, color: BLACK, margin: 0, marginBottom: 32, maxWidth: 880 }}>
        Несправедливости профессии — то, что называли снова и снова разные люди в разных городах.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {cards.map((c) => (
          <div key={c.title} style={{ background: OFFWHITE, padding: "18px 18px 22px", border: `1px solid ${BORDER}` }}>
            <div style={{ fontFamily: FONT, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: FAINT, marginBottom: 10 }}>
              {c.tag}
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 19, lineHeight: 1.2, marginBottom: 10 }}>
              {c.title}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.55, color: BLACK }}>
              {c.body}
            </div>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}

/* ============ SLIDE 04 — Манифест (тёмный) ============ */

function Slide04() {
  return (
    <SlideShell dark>
      <div style={{ maxWidth: 920 }}>
        <MicroLabel color={OCHRE}>Зачем мы это делаем</MicroLabel>
        <DarkP>
          Мы провели эти интервью не для того, чтобы доказать, что дизайнерам плохо живётся. Им нормально живётся — просто значительная часть рабочего времени уходит не на дизайн.
        </DarkP>
        <DarkP>
          Уходит на то, чтобы найти информацию в пяти чатах. Напомнить заказчику о платеже, не обидев его. Доказать, что ты был на объекте. Понять, где чья ответственность — твоя, прораба или строителя.
        </DarkP>
        <DarkP>
          Все эти задачи не требуют творчества. Они требуют системы.
        </DarkP>
        <DarkP>
          Именно поэтому мы делаем Archflow — не очередной таск-менеджер с логотипом дизайнера, а инструмент, который забирает на себя рутину: фиксацию, напоминания, контроль сроков, коммуникацию с заказчиком в одном месте.
        </DarkP>
        <DarkP>
          И главное — защищает вас юридически. Вся переписка хранится, визиты зафиксированы, а акты теперь можно подписывать прямо в сервисе — электронной подписью через СМС. Без распечаток, без «я не получал», без «докажи что был».
        </DarkP>
        <DarkP>
          Чтобы вы могли заниматься тем, ради чего пришли в профессию.
        </DarkP>
      </div>
    </SlideShell>
  );
}

function DarkP({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: FONT,
        fontSize: 17,
        lineHeight: 1.6,
        color: "#E8D9B5",
        margin: 0,
        marginBottom: 18,
      }}
    >
      {children}
    </p>
  );
}

/* ============ SLIDE 05 — Hero «Защищаем юридически / Убираем рутину» ============ */

function Slide05() {
  return (
    <SlideShell>
      <blockquote
        style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: "normal",
          fontWeight: 900,
          fontSize: 26,
          margin: 0,
          marginBottom: 16,
          letterSpacing: "-0.01em",
        }}
      >
        «… Да каждый день!»
      </blockquote>
      <p style={{ fontFamily: FONT, fontSize: 16, color: MUTED, margin: 0, marginBottom: 56, maxWidth: 560, lineHeight: 1.5 }}>
        Так отвечают 9 из 10 дизайнеров на вопрос «когда в последний раз что-то пошло не так».
      </p>

      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: "clamp(72px, 11vw, 156px)",
          fontWeight: 900,
          lineHeight: 0.92,
          letterSpacing: "-0.03em",
          margin: 0,
        }}
      >
        Защищаем<br />
        юридически<br />
        Убираем<br />
        рутину
      </h1>

      <p style={{ fontFamily: FONT, fontSize: 18, lineHeight: 1.45, marginTop: 32, maxWidth: 560 }}>
        Archflow — рабочее пространство для управления проектами и коммуникации с заказчиком.
      </p>
    </SlideShell>
  );
}

/* ============ SLIDE 06 — Письмо основателя ============ */

function Slide06() {
  return (
    <SlideShell>
      <MicroLabel>Письмо основателя</MicroLabel>
      <div style={{ display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: 40, alignItems: "center", background: WHITE, border: `1px solid ${BORDER}`, padding: 28 }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/founder.jpg"
            alt="Женя Колунов"
            style={{ width: "100%", height: "auto", display: "block", filter: "grayscale(100%)" }}
          />
        </div>
        <div>
          <p
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 26,
              lineHeight: 1.35,
              margin: 0,
              marginBottom: 24,
            }}
          >
            «Привет! Меня зовут Женя. Уже 11 лет я женат на дизайнере-интерьеров.
            Всё это время её уровень и стоимость проектов росли, но… жена постоянно
            просила у меня денег. Пришлось разобраться почему. Так появился Archflow.»
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: FONT, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            <span style={{ color: BLACK, fontWeight: 600 }}>Женя Колунов</span>
            <span style={{ color: FAINT }}>·</span>
            <span style={{ color: OCHRE }}>Founder</span>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}
