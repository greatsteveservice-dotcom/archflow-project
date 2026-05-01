"use client";

import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────
// Editorial Issue 01 — 13 numbered sections + footer.
// 80px rail-column on the left of every section, marked 01–13.
// Two-font system: Playfair Display (display) + Inter (body).
// .afl-root rebinds var(--af-font) → Inter, var(--af-font-display) → Playfair.
// ─────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="afl-root">
      <Topbar />
      <main className="afl-page">
        <Hero />
        <HeroShot />
        <How />
        <Modules />
        <BeforeAfter />
        <Trust />
        <Pricing />
        <FAQ />
        <FinalCTA />
        <Footer />
      </main>
      <WhyDrawer />
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────
function Topbar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="afl-topbar">
        <a href="/welcome" className="afl-logo" aria-label="Archflow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" />
        </a>
        <nav className="afl-nav">
          <a href="#modules"><span className="num">01</span>Модули</a>
          <a href="#pricing"><span className="num">02</span>Тарифы</a>
          <a href="#faq"><span className="num">03</span>Вопросы</a>
        </nav>
        <div className="afl-topbar-right">
          <a href="/login" className="afl-topbar-trial">Войти</a>
          <a href="/login?mode=register" className="afl-btn inverted compact">Попробовать →</a>
          <button
            type="button"
            className="afl-burger"
            aria-label="Меню"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "закрыть" : "меню"}
          </button>
        </div>
      </header>
      <div className={`afl-mobile-menu${open ? " open" : ""}`}>
        <a href="#modules" onClick={() => setOpen(false)} style={navLinkStyle}>01 — Модули</a>
        <a href="#pricing" onClick={() => setOpen(false)} style={navLinkStyle}>02 — Тарифы</a>
        <a href="#faq" onClick={() => setOpen(false)} style={navLinkStyle}>03 — Вопросы</a>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <a href="/login" className="afl-btn" style={{ flex: 1, justifyContent: "center" }}>Войти</a>
          <a href="/login?mode=register" className="afl-btn inverted" style={{ flex: 1, justifyContent: "center" }}>Регистрация</a>
        </div>
      </div>
    </>
  );
}
const navLinkStyle: React.CSSProperties = {
  fontFamily: "var(--af-font)",
  fontSize: 11, letterSpacing: "0.16em",
  textTransform: "uppercase", color: "#111", textDecoration: "none",
};

// Rail removed — was rendering left-column index/label that duplicated section meaning.

// ── 01 · Hero — Манифест ──────────────────────────────────
function Hero() {
  return (
    <section className="afl-sect afl-h-hero">
      <div className="afl-body">
        <blockquote className="quote">«... Да каждый день!»</blockquote>
        <p className="credit">
          Так отвечают 9 из 10 дизайнеров на вопрос «когда в последний раз что-то пошло не так».
        </p>
        <h1>
          <span className="row">Дизайн</span>
          <span className="row">без рутины.</span>
        </h1>
        <p className="lede">
          Archflow — рабочее пространство для управления проектами и коммуникации с заказчиком.
        </p>
        <div className="ctas">
          <a href="/login?mode=register" className="afl-btn accent">Попробовать 14 дней →</a>
        </div>
        <div className="afl-micro muted reassure">Не требует обучения</div>
      </div>
    </section>
  );
}

// ── 02 · Главный экран — реальные скриншоты ────────────────
function HeroShot() {
  return (
    <section className="afl-sect afl-shot-sect">
      <div className="afl-body">
        <div className="afl-frame">
          <div className="afl-frame-body" style={{ padding: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="afl-shot-desktop"
              src="/landing/01-projects.png"
              alt="Главный экран — все проекты в одном списке"
              style={{ display: "block", width: "100%", height: "auto" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="afl-shot-mobile"
              src="/landing/01-projects-mobile.png"
              alt="Главный экран — все проекты в одном списке"
              style={{ display: "none", width: "100%", height: "auto" }}
            />
          </div>
          <div className="afl-frame-cap afl-micro">Главный экран · все проекты в одном списке</div>
        </div>
      </div>
    </section>
  );
}

// ── 03 · Как это работает ─────────────────────────────────
const STEPS = [
  { n: "01", title: "Заводите проект", desc: "Адрес, площадь, сроки, бюджет. Можно импортировать комплектацию из Excel — прежние таблицы не придётся переписывать." },
  { n: "02", title: "Настраиваете, кто что видит", desc: "Дизайнер, заказчик, прораб, поставщик, ассистент. Каждый видит свою часть проекта." },
  { n: "03", title: "Ведёте всё в одном месте", desc: "Файлы, визиты, переписка, сроки поставок, подписи актов. Telegram оставьте для дружеских чатов. Рабочее — здесь." },
];

function How() {
  return (
    <section className="afl-sect afl-how">
      <div className="afl-body">
        <div className="head">
          <span className="afl-micro muted">Как это работает</span>
          <h2>Первый проект<br />за минуту.</h2>
          <p className="lede">Открываете сайт и начинаете работать. Без установки и обучения.</p>
        </div>
        <div className="afl-how-grid">
          {STEPS.map((s) => (
            <div key={s.n} className="afl-how-step">
              <div className="mark">{s.n}</div>
              <span className="num">Шаг {s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 04–08 · Модули ────────────────────────────────────────
type ModuleDef = {
  id: string;
  rail: string; // 04…08
  vert: string;
  kicker: string;
  name: string;
  claim: string;
  desc: string;
  bullets: string[];
  why: string[];
  whyTitle: string;   // drawer headline
  whyKicker: string;  // drawer kicker line
  shotSrc: string;          // desktop screenshot
  shotSrcMobile?: string;   // mobile screenshot — falls back to shotSrc
  shotTab: string;
  shotMeta: string;
  shotCaption: string;
  reverse: boolean; // copy left vs right
  order: number; // visual order within #modules wrapper
};

const MODULES: ModuleDef[] = [
  // DOM order = cabinet → design → supervision → supply → chat
  // Visual order via CSS order: design=1, supervision=2, supply=3, chat=4, cabinet=5
  {
    id: "cabinet", rail: "07", vert: "Кабинет заказчика", order: 5, reverse: true,
    kicker: "Заказчик в проекте",
    name: "Кабинет заказчика",
    claim: "Заказчик видит проект, а не ваши файлы.",
    desc: "Утверждённые сметы, графики, акты, прогресс стройки — со своим логином. Без доступа к вашей переписке с командой, себестоимости, внутренним заметкам.",
    bullets: [
      "Отдельный интерфейс заказчика — со своим логином, без рабочего хаоса",
      "Согласования и платежи — в одном месте, всё подписано в СМС",
      "История решений — нечего вспоминать «мы же договаривались»",
      "Делитесь только тем, что должны — себестоимость остаётся у вас",
    ],
    why: [
      "«Бывает так, что некоторым людям, творческим натурам, неудобно говорить заказчику о том, что он должен денег. Особенно если до этого был неприятный разговор».",
      "Труд дизайнера по большей части невидимый. Заказчик не знает, сколько часов ушло на согласование поставщика, на переписку с прорабом, на выбор материалов. У него нет ощущения, что он платит за реальную работу.",
      "В кабинете заказчика видно, что вы делаете, на каком этапе проект и что он должен по графику оплат. Напоминания приходят от сервиса, а не от вас.",
    ],
    whyTitle: "Прозрачность для клиента",
    whyKicker: "Модуль · Кабинет заказчика",
    shotSrc: "/landing/07-client-cabinet.png",
    shotSrcMobile: "/landing/07-client-cabinet-mobile.png",
    shotTab: "Кабинет · Иванова М.",
    shotMeta: "Issue 03",
    shotCaption: "Главный экран кабинета · вид заказчика",
  },
  {
    id: "design", rail: "04", vert: "Дизайн", order: 1, reverse: false,
    kicker: "Документы и файлы",
    name: "Дизайн",
    claim: "Все версии в одном месте.",
    desc: "Структурированное хранилище чертежей, визуализаций и документов в одном проекте.",
    bullets: [
      "Электронная подпись по СМС — 63-ФЗ, не требует ЭЦП и КриптоПро",
      "Мудборд-канвас с группировкой по зонам комнаты",
      "Файлы в шести категориях — проект, визуализации, чертежи, мебель, инженерия, документы",
      "Прежние версии сохраняются — можно откатиться",
    ],
    why: [
      "Проект дизайнера — десятки артефактов: планировки, визуализации, рабочие чертежи, спецификации мебели, инженерия и договора. И всё это в разных местах и чатах.",
      "ТЗ уточняется, сметы меняются, допники согласовываются. Каждая подпись — распечатать, сканировать, отправить, подождать.",
      "В модуле «Дизайн» — полный архив проекта в одном месте: чертежи, визуализации, мудборды, документы по шести категориям с версионностью. Любой документ — договор, акт, допник — подписывается прямо в сервисе через СМС за минуту. Юридически значимо. Без курьеров.",
    ],
    whyTitle: "Документы и файлы",
    whyKicker: "Модуль · Дизайн",
    shotSrc: "/landing/02-design.png",
    shotSrcMobile: "/landing/02-design-mobile.png",
    shotTab: "Дизайн · Файлы проекта",
    shotMeta: "v04",
    shotCaption: "Модуль «Дизайн» · структура папок",
  },
  {
    id: "supervision", rail: "05", vert: "Надзор", order: 2, reverse: true,
    kicker: "Фотоотчёт и задачи",
    name: "Авторский надзор",
    claim: "Каждый визит — фиксация.",
    desc: "Запись, которую не получится стереть или «не получить». Фото, отчёт, задачи строителям с геометкой и временем.",
    bullets: [
      "Фиксация визитов с фото и геометкой",
      "Отчёты и задачи подрядчикам прямо на месте",
      "История визитов с фильтром по статусам и датам",
      "Заказчик видит хронологию работ — без вашего участия",
    ],
    why: [
      "Большинство дизайнеров не ведут журнал авторского надзора в живую — потому что бумажный журнал неудобно таскать, а переписка в чатах со временем теряется. Но большинство об этом жалеет, когда возникает конфликт.",
      "Разница между «слово против слова» и «вот визиты, которые вы подписали» — стоит реальных денег.",
      "Именно поэтому мы сделали журнал цифровым: фото, отчёт и подпись строителей — прямо на объекте, за минуту.",
    ],
    whyTitle: "Журнал визитов и замечаний",
    whyKicker: "Модуль · Авторский надзор",
    shotSrc: "/landing/03-supervision.png",
    shotSrcMobile: "/landing/03-supervision-mobile.png",
    shotTab: "Надзор · Визиты",
    shotMeta: "Этап II",
    shotCaption: "Хроника визитов · модуль «Авторский надзор»",
  },
  {
    id: "supply", rail: "06", vert: "Комплектация", order: 3, reverse: false,
    kicker: "Список поставок",
    name: "Комплектация",
    claim: "Со сроками и оплатами — в одном месте.",
    desc: "Живой список позиций с датами заказа и поставки, предоплатами и постоплатами, статусами. Все суммы считаются сами.",
    bullets: [
      "Импорт существующей комплектации из Excel — без переписывания",
      "Поля предоплаты и постоплаты с дедлайнами и автонапоминаниями",
      "Месячный план платежей и график поставок",
      "Заказчик видит свой бюджет по своей ссылке — без вашей себестоимости",
    ],
    why: [
      "Главный вопрос в комплектации — когда заказать, чтобы материал пришёл к нужному этапу стройки с учётом сроков изготовления, доставки, возможных задержек. Итальянская сантехника идёт 8 недель, кухня — 12, плитка из партии может закончиться в любой момент. Ошиблись на две недели — стройка встала, подрядчики сидят без работы, заказчик звонит каждый день.",
      "Именно поэтому комплектация у нас живая: позиции привязаны к графику стройки, дедлайны предоплат считаются сами, о критичных датах система напоминает заранее.",
    ],
    whyTitle: "Планирование и закупки",
    whyKicker: "Модуль · Комплектация",
    shotSrc: "/landing/04-supply.png",
    shotSrcMobile: "/landing/04-supply-mobile.png",
    shotTab: "Комплектация · Список",
    shotMeta: "142 позиции",
    shotCaption: "Список поставок · модуль «Комплектация»",
  },
  {
    id: "chat", rail: "08", vert: "Чат", order: 4, reverse: false,
    kicker: "Внутренний мессенджер",
    name: "Чат и ассистент",
    claim: "Без танцев с VPN.",
    desc: "Внутренний мессенджер с поиском по истории. Умный ассистент найдёт нужную информацию или подсветит неназначенную задачу.",
    bullets: [
      "Расшифровка голосовых в текст — без «эмм, нууу, как бы»",
      "Поиск по всей переписке проекта — без выгрузки в архив",
      "Заказчик не сможет удалить чат в одностороннем порядке",
      "Ассистент подсвечивает неназначенные задачи и протухшие сроки",
    ],
    why: [
      "Telegram, WhatsApp, MAX, почта — у каждого заказчика свой любимый канал, и в какой-то момент становится невозможно вспомнить, кому куда писать. А ещё заказчик или подрядчик может в любой момент удалить чат — и вы останетесь без доказательств.",
      "Оставьте мессенджеры для дружеских разговоров. Рабочая коммуникация — в одном окне, с поиском, расшифровкой голосовых и гарантией, что переписку не сотрут задним числом.",
    ],
    whyTitle: "Коммуникация в одном окне",
    whyKicker: "Модуль · Чат и ассистент",
    shotSrc: "/landing/06-chat.png",
    shotSrcMobile: "/landing/06-chat-mobile.png",
    shotTab: "Чат · ЖК «Сетунь»",
    shotMeta: "3 участника",
    shotCaption: "Чат проекта · модуль «Чат и ассистент»",
  },
];

function Modules() {
  return (
    <div id="modules" className="afl-modules">
      {MODULES.map((m) => <ModuleSection key={m.id} m={m} />)}
    </div>
  );
}

function ModuleSection({ m }: { m: ModuleDef }) {
  return (
    <section
      className={`afl-sect afl-mod${m.reverse ? " reverse" : ""}`}
      id={m.id}
      style={{ order: m.order }}
    >
      <div className="afl-body">
        {m.reverse ? (
          <>
            <ModuleCopy m={m} />
            <ModuleShot m={m} />
          </>
        ) : (
          <>
            <ModuleShot m={m} />
            <ModuleCopy m={m} />
          </>
        )}
      </div>
    </section>
  );
}

function ModuleCopy({ m }: { m: ModuleDef }) {
  const openWhy = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("why:open", { detail: m }));
    }
  };
  return (
    <div className="copy">
      <div className="kicker">{m.kicker}</div>
      <h2>{m.name}</h2>
      <h3 className="claim">{m.claim}</h3>
      <p className="desc">{m.desc}</p>
      <ul className="bullets">
        {m.bullets.map((b, i) => (
          <li key={i}>
            <span className="ix">{String(i + 1).padStart(2, "0")}</span>
            <span className="b">{b}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="afl-why-trigger"
        aria-haspopup="dialog"
        onClick={openWhy}
      >
        <span>Почему мы это сделали</span>
        <span className="arrow" aria-hidden="true">→</span>
      </button>
    </div>
  );
}

function ModuleShot({ m }: { m: ModuleDef }) {
  // Cache-buster: bump when mobile screenshots are re-cropped so Cloudflare/SW
  // and browsers don't keep the old cached image.
  const v = "20260501";
  const mobileSrc = (m.shotSrcMobile || m.shotSrc) + `?v=${v}`;
  const desktopSrc = m.shotSrc + `?v=${v}`;
  return (
    <div className="shot">
      <div className="shot-body">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="afl-shot-desktop"
          src={desktopSrc}
          alt={m.shotCaption}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="afl-shot-mobile"
          src={mobileSrc}
          alt={m.shotCaption}
        />
      </div>
      <div className="shot-caption afl-micro muted">{m.shotCaption}</div>
    </div>
  );
}

// ── 09 · До / После ───────────────────────────────────────
const BA_ITEMS = [
  {
    title: ["Файлы", "проекта"],
    before: "5 мест · почта · распечатки · WhatsApp",
    beforeExtra: "Файлы где-то, версии где-то, версии-версий тоже где-то",
    after: "Один архив с версиями",
    afterExtra: "Шесть категорий, история ревизий, никто ничего не теряет",
  },
  {
    title: ["Переписка"],
    before: "WhatsApp · Telegram · MAX · почта",
    beforeExtra: "Что мы решили — где? «Кажется, в Telegram, но я не уверена»",
    after: "Один чат с поиском",
    afterExtra: "Расшифровки голосовых, поиск по истории, нельзя удалить в одну сторону",
  },
  {
    title: ["Подпись", "документов"],
    before: "Распечатать · сканировать · послать",
    beforeExtra: "Курьеры, нотариусы, пересланные jpg-файлы",
    after: "Код из СМС · 2 минуты",
    afterExtra: "Электронная подпись по 63-ФЗ — без ЭЦП и КриптоПро",
  },
  {
    title: ["Визиты", "и дедлайны"],
    before: "Пропущенные даты · забытые платежи",
    beforeExtra: "«А когда был аванс? Кажется, в начале месяца»",
    after: "Календарь с автонапоминаниями",
    afterExtra: "Поставки, авансы, визиты — все в одной хронологии",
  },
];

function BeforeAfter() {
  return (
    <section className="afl-sect afl-ba">
      <div className="afl-body">
        <div className="head">
          <h2>Жизнь дизайнера<br />меняется.</h2>
        </div>
        <div className="afl-ba-table">
          {BA_ITEMS.map((it, i) => (
            <div key={i} className="afl-ba-row">
              <div className="afl-ba-cell before">
                <div className="tag afl-micro">До</div>
                <div className="stuff">{it.before}</div>
                <div className="extra">{it.beforeExtra}</div>
              </div>
              <div className="afl-ba-cell label">
                <div className="label-head">{it.title.map((t, j) => <span key={j}>{t}<br /></span>)}</div>
                <div className="label-arr">→</div>
              </div>
              <div className="afl-ba-cell after">
                <div className="tag afl-micro">После</div>
                <div className="stuff">{it.after}</div>
                <div className="extra">{it.afterExtra}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 10 · Надёжность ───────────────────────────────────────
const TRUST = [
  { tag: "01 · Хранение", name: "Данные в России", desc: "Yandex Cloud, ЦОД во Владимире. Оператор персональных данных зарегистрирован в реестре РКН." },
  { tag: "02 · Резерв", name: "Ежедневный бэкап", desc: "Копии в 03:00 МСК, хранение 7 дней. Контроль через Telegram-оповещения, восстановление за час." },
  { tag: "03 · Свобода", name: "Экспорт в любой момент", desc: "Все файлы проекта выгружаются архивом. Переписка, документы, фотоотчёт — всё ваше." },
];

function Trust() {
  return (
    <section className="afl-sect afl-trust">
      <div className="afl-body">
        <div className="head">
          <h2>Ваши проекты<br />под защитой.</h2>
          <p className="lede">
            Российская инфраструктура с ежедневным резервным копированием. В любой момент можно выгрузить всё и уйти.
          </p>
        </div>
        <div className="afl-trust-grid">
          {TRUST.map((t) => (
            <div key={t.tag} className="afl-trust-cell">
              <span className="tag afl-micro">{t.tag}</span>
              <div className="name">{t.name}</div>
              <p className="desc">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 11 · Тарифы ───────────────────────────────────────────
const PRICING = [
  { id: "month",    label: "Месяц",   price: 1500,  monthly: 1500, save: 0,    featured: false, btn: "Выбрать месяц" },
  { id: "halfyear", label: "Полгода", price: 6000,  monthly: 1000, save: 3000, featured: true,  btn: "Выбрать полгода" },
  { id: "year",     label: "Год",     price: 10000, monthly: 833,  save: 8000, featured: false, btn: "Выбрать год" },
];

function Pricing() {
  return (
    <section id="pricing" className="afl-sect afl-pri">
      <div className="afl-body">
        <div className="head">
          <h2>Одна подписка.<br />Без скрытых платежей.</h2>
          <p className="lede">
            Все модули включены. Электронная подпись — тоже. Количество проектов, заказчиков и размер студии — без ограничений.
          </p>
        </div>
        <div className="trial">
          <span className="afl-micro" style={{ color: "rgba(255,255,255,0.55)" }}>Триал</span>
          <span className="b">14 дней полного доступа · без платёжных данных</span>
        </div>
        <div className="afl-pri-grid">
          {PRICING.map((p) => (
            <div key={p.id} className={`afl-pri-card${p.featured ? " featured" : ""}`}>
              {p.featured && <span className="ribbon">Популярный</span>}
              <span className="name afl-micro">Тариф · {p.label}</span>
              <div className="price">
                <span className="num">{p.price.toLocaleString("ru-RU")}</span>
                <span className="cur">₽</span>
              </div>
              <div className="month">{p.monthly.toLocaleString("ru-RU")} ₽ / месяц</div>
              {p.save > 0 && <div className="save afl-micro">экономия {p.save.toLocaleString("ru-RU")} ₽</div>}
              <ul>
                <li>Все модули</li>
                <li>Неограниченные проекты</li>
                <li>Электронная подпись включена</li>
                <li>{p.featured || p.id === "year" ? "Приоритетная поддержка" : "Поддержка в чате"}</li>
              </ul>
              <div className="cta">
                <a href="/login?mode=register" className="afl-btn">{p.btn} →</a>
              </div>
            </div>
          ))}
        </div>
        <p className="afl-micro muted" style={{ marginTop: 24 }}>
          После триала, если не оплатили, данные сохраняются в режиме чтения. Удалить — только по вашему запросу.
        </p>
      </div>
    </section>
  );
}

// ── 12 · FAQ ──────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: "Где хранятся данные? Это безопасно?", a: "На серверах Yandex Cloud в дата-центре во Владимире. Ежедневный бэкап в 03:00 МСК с хранением 7 дней. Передача — TLS 1.3, доступ — Row Level Security. Зарегистрированы как оператор персональных данных в реестре РКН." },
  { q: "Можно ли перенести проекты из Excel?", a: "Да. Импорт комплектации поддерживает .xlsx и .csv с автоматическим маппингом колонок. Старые таблицы переписывать не придётся — система сама подскажет, где какое поле." },
  { q: "Есть мобильное приложение?", a: "Веб-приложение работает в браузере телефона как отдельная иконка (PWA). Авторский надзор оптимизирован для мобильного — фото, геометка, голосовые задачи прорабу. Натив-приложения для iOS и Android в работе." },
  { q: "Что будет с данными, если я перестану пользоваться?", a: "После триала, если не оплатили — данные сохраняются в режиме чтения. После окончания платной подписки — 30 дней, чтобы выгрузить архивом. Удалить можем только по вашему запросу — не списываем без предупреждения." },
  { q: "А если я работаю со студией из десяти человек?", a: "Подписка не зависит от числа людей. Подключайте дизайнеров, ассистентов, прорабов, поставщиков — каждый видит свою часть проекта. Заказчик подключается отдельно, своим логином, в свой кабинет." },
  { q: "Я уже пробовала Notion / Trello / Bitrix — почему здесь будет иначе?", a: "Notion и Trello — пустые конструкторы: их сначала нужно настроить под себя, а потом ещё научить заказчика пользоваться. Bitrix — система для отделов продаж в офисе, а не для дизайнера на стройке. Archflow создан под конкретный workflow интерьера и работает «из коробки»: открыли — и завели первый проект." },
];

function FAQ() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section id="faq" className="afl-sect afl-faq">
      <div className="afl-body">
        <div className="head"><h2>Честные ответы.</h2></div>
        <div className="afl-faq-list">
          {FAQ_ITEMS.map((it, i) => (
            <div key={i} className="afl-faq-item">
              <button
                type="button"
                className={`afl-faq-q${open === i ? " open" : ""}`}
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? -1 : i)}
              >
                <span className="ix">Q · {String(i + 1).padStart(2, "0")}</span>
                <span className="text">{it.q}</span>
                <span className="pm">+</span>
              </button>
              {open === i && <div className="afl-faq-a">{it.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 13 · Final CTA ────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="afl-sect afl-final">
      <div className="afl-body">
        <div>
          <h2>14 дней,<br /><span className="ghost">чтобы проверить.</span></h2>
        </div>
        <div>
          <p className="body">
            Заведите один живой проект. Пригласите заказчика. Зафиксируйте визит на объекте. Если через 2 недели не увидите разницы — просто не продлевайте подписку.
          </p>
          <a href="/login?mode=register" className="afl-btn">Попробовать 14 дней →</a>
          <div className="afl-micro reassure">Без карты · полный доступ ко всем модулям</div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────
function Footer() {
  return (
    <section className="afl-sect afl-footer">
      <div className="afl-body">
        <div className="brand">
          <a href="/welcome" className="afl-logo" aria-label="Archflow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" />
            <span className="word">Archflow</span>
          </a>
          <p className="desc">
            Рабочее пространство для проектирования, авторского надзора и комплектации интерьерных проектов.
          </p>
        </div>
        <FooterCol
          title="Продукт"
          links={[
            { href: "#cabinet", label: "Кабинет заказчика" },
            { href: "#design", label: "Дизайн" },
            { href: "#supervision", label: "Авторский надзор" },
            { href: "#supply", label: "Комплектация" },
            { href: "#chat", label: "Чат и ассистент" },
            { href: "#pricing", label: "Тарифы" },
          ]}
        />
        <FooterCol
          title="Компания"
          links={[
            { href: "mailto:archflow.office@gmail.com", label: "archflow.office@gmail.com" },
            { href: "/privacy", label: "Политика конфиденциальности" },
            { href: "/pricing", label: "Условия оплаты" },
          ]}
        />
        <FooterCol
          title="Юридическое"
          links={[
            { label: "ИП Колунов Е. Е." },
            { label: "Оператор ПДн" },
          ]}
        />
        <div className="copyright">
          <span className="afl-micro">© 2026 · Archflow</span>
          <span className="afl-micro">Editorial Issue 01</span>
        </div>
      </div>
    </section>
  );
}

function FooterCol({ title, links }: { title: string; links: { href?: string; label: string }[] }) {
  return (
    <div>
      <h4>{title}</h4>
      <ul>
        {links.map((l) => (
          <li key={l.label}>
            {l.href ? <a href={l.href}>{l.label}</a> : <span>{l.label}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Why-drawer ────────────────────────────────────────────
function WhyDrawer() {
  const [m, setM] = useState<ModuleDef | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  // open via custom event
  useEffect(() => {
    const onOpen = (e: Event) => {
      const ce = e as CustomEvent<ModuleDef>;
      lastTriggerRef.current = (document.activeElement as HTMLElement) || null;
      setM(ce.detail);
    };
    window.addEventListener("why:open", onOpen);
    return () => window.removeEventListener("why:open", onOpen);
  }, []);

  // body scroll lock + focus close button + esc
  useEffect(() => {
    if (!m) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => closeBtnRef.current?.focus(), 200);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setM(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      // restore focus to trigger
      lastTriggerRef.current?.focus?.();
    };
  }, [m]);

  // touch swipe-down on mobile
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const onTouchStart: React.TouchEventHandler = (e) => {
    if (!drawerRef.current) return;
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    const rect = drawerRef.current.getBoundingClientRect();
    const y = e.touches[0].clientY;
    if (y - rect.top > 80) return;
    startYRef.current = y;
    draggingRef.current = true;
    drawerRef.current.style.transition = "none";
  };
  const onTouchMove: React.TouchEventHandler = (e) => {
    if (!draggingRef.current || !drawerRef.current || startYRef.current == null) return;
    const y = e.touches[0].clientY;
    currentYRef.current = y;
    const dy = Math.max(0, y - startYRef.current);
    drawerRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onTouchEnd: React.TouchEventHandler = () => {
    if (!draggingRef.current || !drawerRef.current) return;
    draggingRef.current = false;
    drawerRef.current.style.transition = "";
    const dy = (currentYRef.current ?? startYRef.current ?? 0) - (startYRef.current ?? 0);
    if (dy > 80) setM(null);
    else drawerRef.current.style.transform = "";
    startYRef.current = currentYRef.current = null;
  };

  const isOpen = !!m;

  return (
    <>
      <div
        className={`afl-why-overlay${isOpen ? " is-open" : ""}`}
        aria-hidden={!isOpen}
        onClick={() => setM(null)}
      />
      <aside
        ref={drawerRef}
        className={`afl-why-drawer${isOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="afl-why-title"
        aria-hidden={!isOpen}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="head">
          <div className="head-text">
            <div className="kicker">{m?.whyKicker || "Почему мы это сделали"}</div>
            <h3 id="afl-why-title">{m?.whyTitle || "Почему мы это сделали"}</h3>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="close"
            aria-label="Закрыть"
            onClick={() => setM(null)}
          >×</button>
        </div>
        <div className="body">
          {m?.why.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </aside>
    </>
  );
}
