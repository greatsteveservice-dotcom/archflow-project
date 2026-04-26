"use client";

import { Fragment, useState } from "react";

// ─────────────────────────────────────────────────────────
// Editorial Issue 01 — 13 numbered sections + footer.
// 80px rail-column on the left of every section, marked 01–13.
// Single-font system: Vollkorn SC (var(--af-font)).
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
          <span className="afl-logo-word">Archflow</span>
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
          <a href="/login?mode=register" className="afl-btn inverted" style={{ flex: 1, justifyContent: "center" }}>Попробовать</a>
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
          <a href="/login?mode=register" className="afl-btn inverted">Попробовать 7 дней →</a>
        </div>
        <div className="afl-micro muted reassure">Не требует обучения</div>
      </div>
    </section>
  );
}

// ── 02 · Главный экран — типографический «скриншот» ────────
const HERO_PROJECTS = [
  { ix: "01", name: "ЖК «Сетунь», 142 м²",        stage: "Стройка · этап II",        budget: "4,2 М ₽ · 62 %",  due: "28.III.2027" },
  { ix: "02", name: "Никитский, 86 м²",            stage: "Дизайн-проект · v04",     budget: "2,8 М ₽ · 18 %",  due: "14.V.2027" },
  { ix: "03", name: "Дом · Барвиха, 320 м²",      stage: "Комплектация · 142 поз.", budget: "12,4 М ₽ · 41 %", due: "10.IX.2027" },
  { ix: "04", name: "Студия · Хамовники, 38 м²",  stage: "Сдача · 2 акта",          budget: "980 К ₽ · 95 %",  due: "02.XII.2026" },
];

function HeroShot() {
  return (
    <section className="afl-sect afl-shot-sect">
      <div className="afl-body">
        <div className="afl-frame">
          <div className="afl-frame-tab">
            <span className="afl-micro muted">Иванова М. · 4 проекта · 2 архивных</span>
          </div>
          <div className="afl-frame-body" style={{ padding: 20 }}>
            <div className="afl-proj-toolbar">
              <span style={{ fontFamily: "var(--af-font)", fontSize: 22, fontWeight: 700 }}>Проекты</span>
              <span className="afl-micro muted">Активные · 4</span>
            </div>
            <div className="afl-proj-table">
              <div className="h">№</div>
              <div className="h">Адрес</div>
              <div className="h">Этап</div>
              <div className="h">Бюджет</div>
              <div className="h">Дедлайн</div>
              <div className="h" style={{ textAlign: "right" }}>—</div>
              {HERO_PROJECTS.map((p) => (
                <Fragment key={p.ix}>
                  <div className="c ix">{p.ix}</div>
                  <div className="c name">{p.name}</div>
                  <div className="c">{p.stage}</div>
                  <div className="c muted">{p.budget}</div>
                  <div className="c muted">{p.due}</div>
                  <div className="c right arr">→</div>
                </Fragment>
              ))}
            </div>
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
  shotSrc: string;
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
    shotSrc: "/landing/07-client-cabinet.png",
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
    shotSrc: "/landing/02-design.png",
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
    shotSrc: "/landing/03-supervision.png",
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
    shotSrc: "/landing/04-supply.png",
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
    shotSrc: "/landing/06-chat.png",
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
  const [whyOpen, setWhyOpen] = useState(false);
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
        className={`afl-why-toggle${whyOpen ? " open" : ""}`}
        aria-expanded={whyOpen}
        onClick={() => setWhyOpen((v) => !v)}
      >
        <span>Почему мы это сделали</span>
        <span className="pm">+</span>
      </button>
      {whyOpen && (
        <div className="why">
          {m.why.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}
    </div>
  );
}

function ModuleShot({ m }: { m: ModuleDef }) {
  return (
    <div className="shot">
      <div className="shot-tab">
        <span className="afl-micro">{m.shotTab}</span>
        <span className="afl-micro muted">{m.shotMeta}</span>
      </div>
      <div className="shot-body">
        {m.id === "design"      && <DesignShot />}
        {m.id === "supervision" && <SupervisionShot />}
        {m.id === "supply"      && <SupplyShot />}
        {m.id === "chat"        && <ChatShot />}
        {m.id === "cabinet"     && <CabinetShot />}
      </div>
      <div className="shot-caption afl-micro muted">{m.shotCaption}</div>
    </div>
  );
}

// ── Module screenshot fakes — typographic, no real PNGs ──
const DESIGN_FOLDERS = [
  { ix: "01", nm: "Проект",        sb: "12 файлов" },
  { ix: "02", nm: "Визуализации",  sb: "28 файлов" },
  { ix: "03", nm: "Чертежи",       sb: "9 файлов" },
  { ix: "04", nm: "Мебель",        sb: "14 позиций" },
  { ix: "05", nm: "Инженерия",     sb: "6 файлов" },
  { ix: "06", nm: "Документы",     sb: "7 + 2 на подпись" },
];

function DesignShot() {
  return (
    <>
      <div className="afl-plate-grid g3" style={{ flex: 1 }}>
        {DESIGN_FOLDERS.map((f) => (
          <div key={f.ix} className="afl-cell afl-folder">
            <div>
              <span className="ix">{f.ix}</span>
              <div className="nm">{f.nm}</div>
            </div>
            <div className="sb afl-micro">{f.sb}</div>
          </div>
        ))}
      </div>
      <div className="afl-plate" style={{ marginTop: 2 }}>
        <div className="afl-plate-h">
          <span className="afl-micro muted">Мудборд · кухня-гостиная</span>
          <span className="afl-micro faint">→ Развернуть</span>
        </div>
        <div className="afl-mood-swatches">
          <div className="s1" />
          <div className="s2" />
          <div className="s3" />
        </div>
      </div>
    </>
  );
}

const VISITS = [
  { date: "15.X.2026", time: "14:42", n: "04", desc: "Стяжка готова · 12 фото · 2 задачи", dark: false },
  { date: "08.X.2026", time: "11:08", n: "03", desc: "Электрика — отклонения от чертежа · 8 фото · 5 задач", dark: false },
  { date: "01.X.2026", time: "10:15", n: "02", desc: "Сан. узел — задачи закрыты · 14 фото", dark: true },
];

function SupervisionShot() {
  return (
    <div className="afl-plate-grid" style={{ gridTemplateColumns: "1fr", flex: 1 }}>
      {VISITS.map((v) => (
        <div key={v.n} className={`afl-visit${v.dark ? " dark" : ""}`}>
          <div className="when afl-micro">{v.date}<br />{v.time}</div>
          <div>
            <div className="afl-cell-name">Визит № {v.n} · Сетунь</div>
            <div className="afl-cell-sub afl-micro">{v.desc}</div>
          </div>
          <div className="afl-micro" style={{ textAlign: "right", color: v.dark ? "rgba(255,255,255,0.55)" : "rgb(150,150,150)" }}>→</div>
        </div>
      ))}
      <div className="afl-plate">
        <div className="afl-plate-h">
          <span className="afl-micro muted">Фото со стройки · 15.X.2026</span>
          <span className="afl-micro faint">12</span>
        </div>
        <div className="afl-photos">
          <div className="p1" />
          <div className="p2" />
          <div className="p3" />
        </div>
      </div>
    </div>
  );
}

const SUPPLY_ROWS = [
  { ix: "01", name: "Кухня · Schmidt",          delivery: "28.XI", pre: "оплачено",  post: "15.XII",     postMuted: true },
  { ix: "02", name: "Диван · Eichholtz",        delivery: "10.XII", pre: "15 / XI",  post: "28.XII",     postMuted: true },
  { ix: "03", name: "Сантехника · Hansgrohe",   delivery: "02.XII", pre: "оплачено", post: "по факту",   postMuted: true },
  { ix: "04", name: "Свет · Vibia × 12",        delivery: "14.I",   pre: "просрочка", post: "—",          postMuted: true, preStrike: true },
];

function SupplyShot() {
  return (
    <>
      <div className="afl-supply-grid">
        <div className="h">№</div>
        <div className="h">Позиция</div>
        <div className="h">Поставка</div>
        <div className="h">Предопл.</div>
        <div className="h">Постопл.</div>
        <div className="h"> </div>
        {SUPPLY_ROWS.map((r) => (
          <Fragment key={r.ix}>
            <div className="c ix">{r.ix}</div>
            <div className="c name">{r.name}</div>
            <div className="c muted">{r.delivery}</div>
            <div className={`c ${r.preStrike ? "strike" : "muted"}`}>{r.pre}</div>
            <div className={`c ${r.postMuted ? "muted" : ""}`}>{r.post}</div>
            <div className="c arr">→</div>
          </Fragment>
        ))}
      </div>
      <div className="afl-plate" style={{ marginTop: 2 }}>
        <div className="afl-plate-h">
          <span className="afl-micro muted">План платежей · ноябрь</span>
          <span style={{ fontFamily: "var(--af-font)", fontWeight: 900, fontSize: 18 }}>1 240 000 ₽</span>
        </div>
        <div className="afl-bar">
          <div style={{ background: "#111", width: "42%" }} />
          <div style={{ background: "rgb(200,200,200)", width: "28%" }} />
          <div style={{ background: "#F6F6F4", width: "30%" }} />
        </div>
        <div className="afl-bar-legend">
          <span className="afl-micro faint">оплачено · 520 К</span>
          <span className="afl-micro muted">в работе · 350 К</span>
          <span className="afl-micro faint">план · 370 К</span>
        </div>
      </div>
    </>
  );
}

const CHAT_MSGS = [
  { who: "Иванова М.", time: "15.X · 14:08", text: "Этап II — черновая отделка завершается на следующей неделе. По срокам идём, по бюджету — тоже.", assist: false },
  { who: "Заказчик",    time: "15.X · 14:42", text: "Спасибо! Когда будут готовы фото после стяжки?", assist: false },
  { who: "Прораб",      time: "15.X · 15:01", text: "Загружаю в надзор → визит № 04. Готово к концу дня.", assist: false },
  { who: "Ассистент Archflow", time: "", text: "Я подсветил две задачи без исполнителей: «согласовать сантехнику» и «утвердить освещение в гостиной». Хотите назначить?", assist: true },
];

function ChatShot() {
  return (
    <div className="afl-chat" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {CHAT_MSGS.map((m, i) => (
        <div key={i} className={`afl-chat-msg${m.assist ? " assist" : ""}`}>
          <div className="afl-chat-meta afl-micro muted">
            {m.assist ? m.who : `${m.time} · ${m.who}`}
          </div>
          <div className="afl-chat-text">{m.text}</div>
        </div>
      ))}
      <div className="afl-chat-input">
        <span className="afl-micro muted">Сообщение или голосовое →</span>
        <span className="afl-micro faint">⌘ + ↵</span>
      </div>
    </div>
  );
}

const CAB_CELLS = [
  { ix: "01", nm: "Дизайн-проект", sb: "согласовано · 4 раздела" },
  { ix: "02", nm: "Стройка",        sb: "этап 2 из 5" },
  { ix: "03", nm: "Документы",      sb: "2 на подпись" },
  { ix: "04", nm: "Бюджет",         sb: "62 % из плана" },
];

function CabinetShot() {
  return (
    <>
      <div className="afl-plate">
        <div className="afl-cab-head">
          <div>
            <div className="afl-plate-title">ЖК «Сетунь», 142 м²</div>
            <div className="afl-micro muted" style={{ marginTop: 6 }}>
              Дизайн-проект · этап стройки · надзор
            </div>
          </div>
          <div className="afl-cab-bignum">02</div>
        </div>
      </div>
      <div className="afl-plate-grid g2">
        {CAB_CELLS.map((c) => (
          <div key={c.ix} className="afl-cell">
            <div className="afl-cell-h">
              <span className="afl-micro muted">{c.ix}</span>
              <span className="afl-micro faint">→</span>
            </div>
            <div>
              <div className="afl-cell-name">{c.nm}</div>
              <div className="afl-cell-sub afl-micro">{c.sb}</div>
            </div>
          </div>
        ))}
        <div className="afl-cell dark" style={{ gridColumn: "1 / -1" }}>
          <div className="afl-cell-h">
            <span className="afl-micro">сейчас</span>
            <span className="afl-micro">15 / X / 2026</span>
          </div>
          <div>
            <div className="afl-cell-name">Прораб загрузил отчёт со стройки</div>
            <div className="afl-cell-sub afl-micro">Этап II — черновая отделка · 12 фото</div>
          </div>
        </div>
      </div>
    </>
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
          <span className="b">7 дней полного доступа · без платёжных данных</span>
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
          <h2>Семь дней,<br /><span className="ghost">чтобы проверить.</span></h2>
        </div>
        <div>
          <p className="body">
            Заведите один живой проект. Пригласите заказчика. Зафиксируйте визит на объекте. Если через неделю не увидите разницы — просто не продлевайте подписку.
          </p>
          <a href="/login?mode=register" className="afl-btn">Попробовать 7 дней →</a>
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
