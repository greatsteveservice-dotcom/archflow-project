"use client";

import { useState } from "react";
import AuthRedirect from "./AuthRedirect";
import {
  HeroComic,
  BeforeFiles, AfterFiles,
  BeforeChats, AfterChats,
  BeforeSign, AfterSign,
  BeforeSchedule, AfterSchedule,
  ClientCabinetArt,
} from "./illustrations";

// ── Mockup (placeholder for product screenshots) ─────────────

function Mockup({
  label,
  src,
  art,
  aspect = "16/10",
}: {
  label: string;
  src?: string;
  art?: React.ReactNode;
  aspect?: string;
}) {
  const useNaturalAspect = aspect === "auto";
  return (
    <div
      className="lp-mockup"
      style={{
        aspectRatio: useNaturalAspect ? undefined : aspect,
        padding: 0,
        background: "#F6F6F4",
        maxHeight: useNaturalAspect ? "75vh" : undefined,
        overflow: useNaturalAspect ? "hidden" : undefined,
        display: useNaturalAspect ? "flex" : undefined,
        alignItems: useNaturalAspect ? "flex-start" : undefined,
        justifyContent: useNaturalAspect ? "center" : undefined,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          loading="lazy"
          style={{
            width: useNaturalAspect ? "auto" : "100%",
            height: useNaturalAspect ? "100%" : "100%",
            maxWidth: useNaturalAspect ? "100%" : undefined,
            maxHeight: useNaturalAspect ? "75vh" : undefined,
            objectFit: useNaturalAspect ? "contain" : "cover",
            objectPosition: "top center",
            display: "block",
          }}
        />
      ) : art ? (
        <div style={{ width: "100%", height: "100%", padding: "24px 32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {art}
        </div>
      ) : (
        <div className="lp-mockup-label">[ {label} ]</div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="lp-root">
      <AuthRedirect />
      <Header />
      <Hero />
      <HowItWorks />
      <Modules />
      <BeforeAfter />
      <Trust />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

// ── 0 · Header ────────────────────────────────────────────

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#fff",
        borderBottom: "0.5px solid #EBEBEB",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <a
          href="/"
          aria-label="Archflow"
          style={{
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Archflow"
            style={{ height: 32, width: "auto", display: "block" }}
          />
        </a>

        <nav className="lp-hide-mobile" style={{ display: "flex", gap: 28 }}>
          <a href="#modules" className="lp-nav-link">Модули</a>
          <a href="#pricing" className="lp-nav-link">Тарифы</a>
          <a href="#faq" className="lp-nav-link">Вопросы</a>
        </nav>

        <div className="lp-hide-mobile" style={{ display: "flex", gap: 8 }}>
          <a href="/login" className="lp-btn lp-btn-ghost">Войти</a>
          <a href="/login?mode=register" className="lp-btn lp-btn-primary">Попробовать</a>
        </div>

        <button
          className="lp-hide-desktop"
          type="button"
          aria-label="Меню"
          onClick={() => setOpen((v) => !v)}
          style={{
            background: "none",
            border: "0.5px solid #111",
            padding: "8px 14px",
            fontFamily: "var(--af-font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: "pointer",
            color: "#111",
          }}
        >
          {open ? "закрыть" : "меню"}
        </button>
      </div>

      {open && (
        <div
          className="lp-hide-desktop"
          style={{
            background: "#fff",
            borderTop: "0.5px solid #EBEBEB",
            padding: "16px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <a href="#modules" onClick={() => setOpen(false)} className="lp-nav-link">Модули</a>
          <a href="#pricing" onClick={() => setOpen(false)} className="lp-nav-link">Тарифы</a>
          <a href="#faq" onClick={() => setOpen(false)} className="lp-nav-link">Вопросы</a>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <a href="/login" className="lp-btn lp-btn-ghost" style={{ flex: 1 }}>Войти</a>
            <a href="/login?mode=register" className="lp-btn lp-btn-primary" style={{ flex: 1 }}>Попробовать</a>
          </div>
        </div>
      )}
    </header>
  );
}

// ── 1 · Hero ──────────────────────────────────────────────

function Hero() {
  return (
    <section
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "56px 24px 80px",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: 40,
      }}
    >
      <style>{`
        @media (min-width: 900px) {
          .lp-hero-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; gap: 64px !important; align-items: center; }
        }
      `}</style>
      <div className="lp-hero-grid" style={{ display: "contents" }}>
        <div>
          <blockquote
            style={{
              fontFamily: "var(--af-font-display)",
              fontSize: "clamp(28px, 5vw, 48px)",
              fontWeight: 900,
              lineHeight: 1.1,
              margin: 0,
              marginBottom: 14,
              letterSpacing: "-0.01em",
            }}
          >
            «... Да каждый день!»
          </blockquote>
          <p
            style={{
              fontSize: 14,
              color: "#333",
              lineHeight: 1.55,
              marginBottom: 40,
              maxWidth: 520,
            }}
          >
            Так отвечают 9 из 10 дизайнеров на вопрос «когда в последний раз что-то пошло не так».
          </p>

          <h1
            style={{
              fontFamily: "var(--af-font-display)",
              fontSize: "clamp(42px, 9vw, 88px)",
              fontWeight: 900,
              lineHeight: 0.95,
              margin: 0,
              marginBottom: 20,
              letterSpacing: "-0.02em",
            }}
          >
            Дизайн<br />без рутины.
          </h1>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: "#111",
              marginBottom: 28,
              maxWidth: 520,
            }}
          >
            Archflow — рабочее пространство для управления проектами и коммуникации с заказчиком.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/login?mode=register" className="lp-btn lp-btn-primary">
              Попробовать 7 дней
            </a>
          </div>
          <p
            style={{
              fontFamily: "var(--af-font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#646464",
              marginTop: 14,
            }}
          >
            Не требует обучения
          </p>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <HeroComic size={180} />
          </div>
          <Mockup label="Список проектов · стартовый экран" src="/landing/01-projects.png" aspect="auto" />
          <p
            style={{
              fontFamily: "var(--af-font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#646464",
              marginTop: 10,
              textAlign: "center",
            }}
          >
            Главный экран — все проекты в одном списке
          </p>
        </div>
      </div>
    </section>
  );
}

// ── 2 · How it works ──────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Заводите проект",
      desc: "Адрес, площадь, сроки, бюджет. Можно импортировать комплектацию из Excel — прежние таблицы не придётся переписывать.",
    },
    {
      n: "02",
      title: "Настраиваете, кто что видит",
      desc: "Дизайнер, заказчик, прораб, поставщик, ассистент. Каждый видит свою часть проекта.",
    },
    {
      n: "03",
      title: "Ведёте всё в одном месте",
      desc: "Файлы, визиты, переписка, сроки поставок, подписи актов. Telegram может остаться для дружеских чатов. Рабочее — здесь.",
    },
  ];
  return (
    <section
      style={{
        background: "#F6F6F4",
        padding: "72px 24px",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <SectionLabel>Как это работает</SectionLabel>
        <h2 style={sectionTitleStyle}>Первый проект<br />за минуту.</h2>
        <p style={{ ...sectionSubtitleStyle, marginBottom: 56 }}>
          Открываете сайт и начинаете работать. Без установки и обучения.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 2,
          }}
        >
          {steps.map((s) => (
            <div key={s.n} style={{ background: "#fff", padding: "32px 28px" }}>
              <div
                style={{
                  fontFamily: "var(--af-font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#646464",
                  marginBottom: 16,
                }}
              >
                Шаг {s.n}
              </div>
              <h3
                style={{
                  fontFamily: "var(--af-font-display)",
                  fontSize: 22,
                  fontWeight: 900,
                  lineHeight: 1.15,
                  margin: 0,
                  marginBottom: 12,
                  letterSpacing: "-0.01em",
                }}
              >
                {s.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "#333", margin: 0 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 3 · Modules ───────────────────────────────────────────

interface ModuleItem {
  n: string;
  tag: string;
  title: string;
  desc: string;
  features: string[];
  why?: string[];
  mockup: string;
  mockupSrc?: string;
  mockupArt?: "client-cabinet";
}

const MODULES: ModuleItem[] = [
  {
    n: "01",
    tag: "Модуль · Дизайн",
    title: "Документы и файлы по проекту",
    desc: "Структурированное хранилище чертежей, визуализаций, документов — в одном проекте. Плюс визуальный канвас для сбора референсов.",
    features: [
      "Электронная подпись документов по СМС (63-ФЗ)",
      "Мудборд-канвас с группировкой по зонам",
      "Файлы в шести категориях: проект, визуализации, чертежи, мебель, инженерия, документы",
      "Прежние версии сохраняются — можно откатиться",
    ],
    why: [
      "Проект дизайнера — десятки артефактов: планировки, визуализации, рабочие чертежи, спецификации мебели, инженерия, договоры и допники. У большинства всё лежит в пяти местах: часть на Яндекс.Диске, часть в почте, часть в распечатках на столе. Плюс мудборд в Pinterest или Figma.",
      "Документы, которые нужно подписывать: ТЗ уточняется, сметы меняются, допники согласовываются. Каждая подпись — распечатать, сканировать, отправить, ждать.",
      "В модуле «Дизайн» — полный архив проекта в одном месте: чертежи, визуализации, мудборды, документы по шести категориям с версионностью. Любой документ — договор, акт, допник — подписывается прямо в сервисе через СМС за минуту. Юридически значимо. Без курьеров.",
    ],
    mockup: "Структура папок + мудборд-канвас",
    mockupSrc: "/landing/02-design.png",
  },
  {
    n: "02",
    tag: "Модуль · Авторский надзор",
    title: "Фотоотчёт с объекта и задачи подрядчику",
    desc: "Каждый визит — запись, которую не получится стереть или «не получить». Фото, отчёт, задачи строителям.",
    features: [
      "Фиксация визитов с фото и геометкой",
      "Отчёты и задачи подрядчикам на месте",
      "История визитов с фильтром по статусам",
    ],
    why: [
      "Большинство дизайнеров не ведут журнал авторского надзора в живую — потому что бумажный журнал неудобно таскать, а переписка в чатах со временем теряется. Но большинство об этом жалеет, когда возникает конфликт.",
      "Разница между «слово против слова» и «вот визиты, которые вы подписали» — стоит реальных денег.",
      "Именно поэтому мы сделали журнал цифровым: фото, отчёт и подпись строителей — прямо на объекте, за минуту.",
    ],
    mockup: "Календарь визитов · фотоотчёт · задачи",
    mockupSrc: "/landing/03-supervision.png",
  },
  {
    n: "03",
    tag: "Модуль · Комплектация",
    title: "Единый список поставок со сроками и оплатами",
    desc: "Вместо таблицы в Excel — живой список позиций с датами заказа и поставки, предоплатами и постоплатами, статусами. Все суммы считаются сами.",
    features: [
      "Импорт существующей комплектации из Excel",
      "Поля предоплаты и постоплаты с дедлайнами",
      "Месячный план платежей и график поставок",
    ],
    why: [
      "Главный вопрос в комплектации — когда заказать, чтобы материал пришёл к нужному этапу стройки с учётом сроков изготовления, доставки, возможных задержек. Итальянская сантехника идёт 8 недель, кухня — 12, плитка из партии может закончиться в любой момент. Ошиблись на две недели — стройка встала, подрядчики сидят без работы, заказчик звонит каждый день.",
      "Именно поэтому комплектация у нас — живая: позиции привязаны к графику стройки, дедлайны предоплат считаются сами, о критичных датах система напоминает заранее.",
    ],
    mockup: "Список позиций · график поставок · платежи",
    mockupSrc: "/landing/04-supply.png",
  },
  {
    n: "04",
    tag: "Модуль · Кабинет заказчика",
    title: "Заказчик видит только то, что должен",
    desc: "Утверждённые сметы, графики, акты, прогресс стройки. Без доступа к вашей переписке с командой, себестоимости, внутренним заметкам.",
    features: [
      "Отдельный интерфейс для заказчика с его логином",
      "Согласования и платежи — в одном месте",
      "История решений и подписанных документов",
    ],
    why: [
      "«Бывает так, что некоторым людям, творческим натурам, неудобно говорить заказчику о том, что он должен денег. Особенно если до этого был неприятный разговор».",
      "Труд дизайнера по большей части невидимый. Заказчик не знает, сколько часов ушло на согласование поставщика, на переписку с прорабом, на выбор материалов. У него нет ощущения, что он платит за реальную работу, — а у дизайнера нет удобного способа про эту работу напомнить без звонка и неловкости.",
      "В кабинете заказчика видно, что вы делаете, на каком этапе проект и что он должен по графику оплат. Напоминания приходят от сервиса, а не от вас.",
    ],
    mockup: "Интерфейс клиента · акты на подпись · платежи",
    mockupSrc: "/landing/07-client-cabinet.png",
  },
  {
    n: "05",
    tag: "Модуль · Чат и ассистент",
    title: "Внутренний мессенджер без танцев с VPN",
    desc: "Переключайтесь между чатами в одном окне, умный ассистент найдёт нужную информацию или подсветит неназначенную задачу.",
    features: [
      "Расшифровка голосовых в текст без «эмм, нууу, как бы»",
      "Поиск по чату",
      "Сохранность переписки — заказчик не сможет удалить чат в одностороннем порядке",
    ],
    why: [
      "Telegram, WhatsApp, MAX, почта — у каждого заказчика свой любимый канал, и в какой-то момент становится невозможно вспомнить, кому куда писать. А ещё заказчик или подрядчик может в любой момент удалить чат — и вы останетесь без доказательств.",
      "Оставьте мессенджеры для дружеских разговоров. Рабочая коммуникация — в одном окне, с поиском, расшифровкой голосовых и гарантией, что переписку не сотрут задним числом.",
    ],
    mockup: "Чат по проекту · голосовые · ассистент",
    mockupSrc: "/landing/06-chat.png",
  },
];

function Modules() {
  return (
    <section id="modules" style={{ padding: "88px 24px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <SectionLabel>Что внутри</SectionLabel>
        <h2 style={{ ...sectionTitleStyle, marginBottom: 56 }}>
          Пять рабочих<br />областей.
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 80 }}>
          {MODULES.map((m) => (
            <ModuleBlock key={m.n} m={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ModuleBlock({ m }: { m: ModuleItem }) {
  const [whyOpen, setWhyOpen] = useState(false);
  return (
    <div>
      {/* Header: tag + title + description — narrow text column, centered */}
      <div style={{ maxWidth: 760, marginBottom: 28 }}>
        <div
          style={{
            fontFamily: "var(--af-font-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#646464",
            marginBottom: 14,
          }}
        >
          {m.tag}
        </div>
        <h3
          style={{
            fontFamily: "var(--af-font-display)",
            fontSize: "clamp(26px, 3.5vw, 38px)",
            fontWeight: 900,
            lineHeight: 1.1,
            margin: 0,
            marginBottom: 18,
            letterSpacing: "-0.01em",
          }}
        >
          {m.title}
        </h3>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#111", margin: 0 }}>
          {m.desc}
        </p>
      </div>

      {/* Mockup — full width for readability on big screens */}
      <div style={{ marginBottom: 28 }}>
        <Mockup
          label={m.mockup}
          src={m.mockupSrc}
          art={m.mockupArt === "client-cabinet" ? <ClientCabinetArt /> : undefined}
          aspect="auto"
        />
      </div>

      {/* Features + why — narrow column below mockup */}
      <div style={{ maxWidth: 760 }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: m.why ? 24 : 0 }}>
          {m.features.map((f, i) => (
            <li
              key={i}
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                padding: "8px 0",
                borderTop: "0.5px solid #EBEBEB",
              }}
            >
              — {f}
            </li>
          ))}
        </ul>

        {m.why && (
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className={`lp-why-btn${whyOpen ? " open" : ""}`}
              onClick={() => setWhyOpen((v) => !v)}
              aria-expanded={whyOpen}
            >
              {whyOpen ? "Свернуть" : "Почему мы это сделали"}
              <span className="lp-why-chev">↓</span>
            </button>
            {whyOpen && (
              <div className="lp-why-box">
                <div className="lp-why-label">Почему мы это сделали</div>
                {m.why.map((p, i) => (
                  <p key={i} className="lp-why-p">{p}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Before / After ─────────────────────────────────────────

interface PairItem {
  title: string;
  beforeLabel: string;
  afterLabel: string;
  Before: (p: { size?: number }) => JSX.Element;
  After: (p: { size?: number }) => JSX.Element;
}

const BEFORE_AFTER_ITEMS: PairItem[] = [
  {
    title: "Файлы проекта",
    beforeLabel: "5 мест, почта, распечатки",
    afterLabel: "Один архив с версиями",
    Before: BeforeFiles, After: AfterFiles,
  },
  {
    title: "Переписка",
    beforeLabel: "WhatsApp, Telegram, MAX, почта",
    afterLabel: "Один чат с поиском",
    Before: BeforeChats, After: AfterChats,
  },
  {
    title: "Подпись документов",
    beforeLabel: "Распечатать · сканировать · послать",
    afterLabel: "Код из СМС · 2 минуты",
    Before: BeforeSign, After: AfterSign,
  },
  {
    title: "Визиты и дедлайны",
    beforeLabel: "Пропущенные даты, забытые платежи",
    afterLabel: "Календарь с автонапоминаниями",
    Before: BeforeSchedule, After: AfterSchedule,
  },
];

function BeforeAfter() {
  return (
    <section style={{ padding: "88px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <SectionLabel>До / После</SectionLabel>
        <h2 style={sectionTitleStyle}>Жизнь дизайнера<br />меняется.</h2>
        <p style={{ ...sectionSubtitleStyle, marginBottom: 48 }}>
          Не всё сразу, но по одному пункту в неделю. Главное — хаоса становится меньше.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {BEFORE_AFTER_ITEMS.map((it, i) => (
            <BeforeAfterRow key={i} item={it} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BeforeAfterRow({ item }: { item: PairItem }) {
  const { title, beforeLabel, afterLabel, Before, After } = item;
  return (
    <div style={{ background: "#F6F6F4", padding: "24px 24px" }}>
      <style>{`
        @media (min-width: 768px) {
          .lp-ba-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) !important; align-items: center; }
        }
      `}</style>
      <div className="lp-ba-row" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 24 }}>
        <div>
          <div style={{
            fontFamily: "var(--af-font-mono)", fontSize: 10,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "#646464", marginBottom: 6,
          }}>
            ДО
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Before size={120} />
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "#111" }}>
              {beforeLabel}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{
            fontFamily: "var(--af-font-display)",
            fontSize: 20, fontWeight: 700,
            marginBottom: 4,
          }}>
            {title}
          </div>
          <div style={{
            fontFamily: "var(--af-font-mono)", fontSize: 18,
            color: "#111",
          }}>
            →
          </div>
        </div>

        <div>
          <div style={{
            fontFamily: "var(--af-font-mono)", fontSize: 10,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "#111", marginBottom: 6, fontWeight: 600,
          }}>
            ПОСЛЕ
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <After size={120} />
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "#111", fontWeight: 600 }}>
              {afterLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Trust ──────────────────────────────────────────────────

function Trust() {
  const items = [
    {
      title: "Данные в России",
      desc: "Yandex Cloud, ЦОД во Владимире. Оператор ПДн зарегистрирован в реестре РКН.",
    },
    {
      title: "Ежедневный бэкап",
      desc: "Резервные копии в 03:00 МСК. Хранение 7 дней, контроль через Telegram-оповещения.",
    },
    {
      title: "Экспорт в любой момент",
      desc: "Все файлы проекта выгружаются архивом. Переписка, документы, фотоотчёт — всё ваше.",
    },
    {
      title: "Шифрование TLS 1.3",
      desc: "Передача данных и подписи документов защищены. Доступ по ролям, Row Level Security.",
    },
  ];
  return (
    <section className="lp-trust">
      <div style={{ maxWidth: 1080, margin: "0 auto", marginBottom: 32 }}>
        <div
          style={{
            fontFamily: "var(--af-font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#888",
            marginBottom: 14,
          }}
        >
          Надёжность
        </div>
        <h2
          style={{
            fontFamily: "var(--af-font-display)",
            fontSize: "clamp(28px, 5vw, 44px)",
            fontWeight: 900,
            lineHeight: 1.05,
            margin: 0,
            marginBottom: 10,
            letterSpacing: "-0.02em",
            color: "#fff",
          }}
        >
          Ваши проекты<br />под защитой.
        </h2>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "#bbb",
            margin: 0,
            maxWidth: 560,
          }}
        >
          Инфраструктура на российских серверах с ежедневным резервным копированием.
          В любой момент можно выгрузить всё и уйти.
        </p>
      </div>
      <div className="lp-trust-grid">
        {items.map((it, i) => (
          <div key={i} className="lp-trust-cell">
            <div className="lp-trust-icon">{String(i + 1).padStart(2, "0")}</div>
            <div className="lp-trust-title">{it.title}</div>
            <p className="lp-trust-desc">{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 6 · Pricing ────────────────────────────────────────────

const PRICING = [
  { id: "month", label: "Месяц", price: 1500, monthly: 1500, save: 0, highlighted: false, btn: "Выбрать месяц" },
  { id: "halfyear", label: "Полгода", price: 6000, monthly: 1000, save: 3000, highlighted: true, btn: "Выбрать полгода" },
  { id: "year", label: "Год", price: 10000, monthly: 833, save: 8000, highlighted: false, btn: "Выбрать год" },
];

function Pricing() {
  return (
    <section id="pricing" style={{ background: "#F6F6F4", padding: "88px 24px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <SectionLabel>Тарифы</SectionLabel>
        <h2 style={sectionTitleStyle}>Одна подписка.<br />Без скрытых платежей.</h2>
        <p style={{ ...sectionSubtitleStyle, marginBottom: 56 }}>
          Все модули включены. Электронная подпись — тоже. Количество проектов,
          заказчиков и размер студии — без ограничений. Семь дней, чтобы убедиться.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 2,
            marginBottom: 24,
          }}
        >
          {PRICING.map((p) => (
            <div
              key={p.id}
              style={{
                background: p.highlighted ? "#111" : "#fff",
                color: p.highlighted ? "#fff" : "#111",
                padding: "36px 28px 28px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {p.highlighted && (
                <span
                  style={{
                    position: "absolute",
                    top: 20,
                    right: 20,
                    fontFamily: "var(--af-font-mono)",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    background: "#fff",
                    color: "#111",
                  }}
                >
                  Популярный
                </span>
              )}
              <div
                style={{
                  fontFamily: "var(--af-font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: p.highlighted ? "#bbb" : "#646464",
                  marginBottom: 14,
                }}
              >
                Тариф · {p.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--af-font-display)",
                  fontSize: 44,
                  fontWeight: 900,
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                {p.price.toLocaleString("ru-RU")} ₽
              </div>
              <div
                style={{
                  fontFamily: "var(--af-font-mono)",
                  fontSize: 11,
                  color: p.highlighted ? "#bbb" : "#646464",
                  marginBottom: 22,
                }}
              >
                {p.monthly.toLocaleString("ru-RU")} ₽/мес
                {p.save > 0 && ` · экономия ${p.save.toLocaleString("ru-RU")} ₽`}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: 24, flex: 1 }}>
                {[
                  "Все модули",
                  "Неограниченные проекты",
                  "Электронная подпись включена",
                  p.highlighted || p.id === "year" ? "Приоритетная поддержка" : "Поддержка в чате",
                ].map((f, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      padding: "8px 0",
                      borderTop: `0.5px solid ${p.highlighted ? "#333" : "#EBEBEB"}`,
                    }}
                  >
                    — {f}
                  </li>
                ))}
              </ul>
              <a
                href="/login?mode=register"
                className={p.highlighted ? "lp-btn lp-btn-ghost-invert" : "lp-btn lp-btn-primary"}
                style={{ width: "100%" }}
              >
                {p.btn}
              </a>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, color: "#646464", lineHeight: 1.6, maxWidth: 720 }}>
          Триал 7 дней — полный доступ, без платёжных данных. После триала, если
          не оплатили, данные сохраняются в режиме чтения.
        </p>
      </div>
    </section>
  );
}

// ── 7 · FAQ ────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Я уже пробовала Notion, Trello, Bitrix. Не прижилось. Почему Archflow будет другим?",
    a: "Все эти инструменты — универсальные. Archflow построен под рабочий процесс дизайнера интерьера, поэтому в нём не нужно ничего «допиливать». Вы открываете проект — и всё уже на своих местах.",
  },
  {
    q: "Где хранятся данные? Это безопасно?",
    a: "Все данные хранятся на серверах в России (Яндекс.Облако). Мы зарегистрированы в реестре операторов персональных данных РКН. Переписка и документы шифруются. Вы можете в любой момент выгрузить все данные проекта архивом.",
  },
  {
    q: "Можно ли перенести проекты из Excel?",
    a: "Да. В модуле комплектации есть импорт — вы загружаете свою таблицу, мы подхватываем позиции, сроки и цены. Переписывать заново ничего не надо.",
  },
  {
    q: "Есть мобильное приложение?",
    a: "Archflow — PWA. Открываете сайт на телефоне, нажимаете «Добавить на главный экран» — и у вас полноценное приложение. Без установки из App Store или Google Play. Работает на iOS, Android и десктопе.",
  },
  {
    q: "Что будет с данными, если я перестану пользоваться?",
    a: "После окончания подписки ваши данные переходят в режим чтения — вы можете зайти, посмотреть историю проектов, скачать документы. Ничего не удаляется автоматически. Полное удаление — только по вашему запросу.",
  },
  {
    q: "А если я работаю со студией из десяти человек?",
    a: "Цена не зависит от размера команды. Вы платите за рабочее пространство, а не за пользователей. Добавляйте ассистентов, партнёров и подрядчиков — доступы гибко настраиваются по ролям.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section id="faq" style={{ padding: "88px 24px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <SectionLabel>Вопросы, которые задают</SectionLabel>
        <h2 style={{ ...sectionTitleStyle, marginBottom: 48 }}>
          Честные ответы.
        </h2>

        <div>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="lp-faq-item">
              <button
                type="button"
                className="lp-faq-q"
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
              >
                <span className="lp-faq-q-text">{item.q}</span>
                <span className={`lp-faq-q-sign${open === i ? " open" : ""}`}>+</span>
              </button>
              {open === i && (
                <div className="lp-faq-a">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 8 · Final CTA ─────────────────────────────────────────

function FinalCTA() {
  return (
    <section
      style={{
        background: "#111",
        color: "#fff",
        padding: "100px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: "var(--af-font-display)",
            fontSize: "clamp(36px, 7vw, 64px)",
            fontWeight: 900,
            lineHeight: 1,
            margin: 0,
            marginBottom: 20,
            letterSpacing: "-0.02em",
          }}
        >
          Семь дней,<br />чтобы проверить.
        </h2>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: "#ccc",
            margin: 0,
            marginBottom: 36,
          }}
        >
          Заведите один живой проект. Пригласите заказчика. Зафиксируйте визит
          на объекте. Если через неделю не увидите разницы — просто не продлевайте
          подписку.
        </p>
        <a href="/login?mode=register" className="lp-btn lp-btn-ghost-invert">
          Попробовать 7 дней
        </a>
      </div>
    </section>
  );
}

// ── 9 · Footer ────────────────────────────────────────────

function Footer() {
  return (
    <footer
      style={{
        background: "#111",
        color: "#fff",
        padding: "56px 24px 32px",
        borderTop: "0.5px solid #333",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 40,
          marginBottom: 40,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--af-font-display)",
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: "0.02em",
              marginBottom: 12,
            }}
          >
            ARCHFLOW
          </div>
          <p
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: "#888",
              margin: 0,
              maxWidth: 260,
            }}
          >
            Рабочее пространство для проектирования, авторского надзора и
            комплектации интерьерных проектов.
          </p>
        </div>

        <FooterCol
          title="Продукт"
          links={[
            { href: "#modules", label: "Модули" },
            { href: "#pricing", label: "Тарифы" },
            { href: "#faq", label: "Вопросы" },
          ]}
        />
        <FooterCol
          title="Компания"
          links={[
            { href: "mailto:archflow.office@gmail.com", label: "Контакты" },
            { href: "/privacy", label: "Политика конфиденциальности" },
            { href: "/pricing", label: "Условия оплаты" },
          ]}
        />
        <FooterCol
          title="Поддержка"
          links={[{ href: "mailto:archflow.office@gmail.com", label: "archflow.office@gmail.com" }]}
        />
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          paddingTop: 24,
          borderTop: "0.5px solid #333",
          fontSize: 10,
          fontFamily: "var(--af-font-mono)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#666",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <span>ИП Колунов Е. Е.</span>
        <span>© 2026 Archflow</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--af-font-mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#888",
          marginBottom: 14,
        }}
      >
        {title}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              style={{ color: "#fff", fontSize: 13, textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "var(--af-font-display)",
  fontSize: "clamp(34px, 6vw, 56px)",
  fontWeight: 900,
  lineHeight: 1,
  margin: 0,
  marginBottom: 20,
  letterSpacing: "-0.02em",
};

const sectionSubtitleStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "#333",
  margin: 0,
  marginBottom: 40,
  maxWidth: 640,
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--af-font-mono)",
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "#646464",
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}
