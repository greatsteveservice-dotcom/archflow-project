// Mockup-роут для оценки нового заголовка лендинга.
// Использует .afl-root scoped стили из globals.css (Playfair Display + Inter).
// 4 варианта в сетке 2×2 — все сразу видны на одном скрине.
// Прод-Landing.tsx не трогаем.

export const metadata = {
  title: "Mockup · Hero · Защищаем Юридически, Убираем Рутину",
};

type Variant = {
  id: string;
  label: string;
  note: string;
  rows: string[];
};

const VARIANTS: Variant[] = [
  {
    id: "A",
    label: "Вариант A · 2 строки, sentence case",
    note: "Ближе к текущему ритму («Дизайн / без рутины.»). Спокойнее.",
    rows: ["Защищаем юридически,", "убираем рутину."],
  },
  {
    id: "B",
    label: "Вариант B · 4 строки, по слову",
    note: "Самый «плакатный» — крупный шрифт за счёт коротких строк.",
    rows: ["Защищаем", "юридически,", "убираем", "рутину."],
  },
  {
    id: "C",
    label: "Вариант C · инверсия порядка слов",
    note: "Глагол → наречие в первой строке для ритма.",
    rows: ["Юридически защищаем", "и убираем рутину."],
  },
  {
    id: "D",
    label: "Вариант D · Title Case (как в задании)",
    note: "Дословный текст «Защищаем Юридически, Убираем Рутину».",
    rows: ["Защищаем Юридически,", "Убираем Рутину."],
  },
];

function HeroCard({ variant }: { variant: Variant }) {
  return (
    <article
      style={{
        border: "0.5px solid #EBEBEB",
        background: "#FFF",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "0.5px solid #EBEBEB",
          background: "#F6F6F4",
        }}
      >
        <div
          className="afl-micro muted"
          style={{ marginBottom: 4, color: "#B8862A" }}
        >
          {variant.label}
        </div>
        <div
          style={{
            fontFamily: "var(--af-font)",
            fontSize: 11,
            color: "rgb(110,110,110)",
            lineHeight: 1.5,
          }}
        >
          {variant.note}
        </div>
      </header>
      <div style={{ padding: "32px 32px 36px" }}>
        <blockquote
          style={{
            fontFamily: "var(--af-font-display)",
            fontSize: 22,
            fontWeight: 600,
            lineHeight: 1.15,
            margin: 0,
            marginBottom: 8,
          }}
        >
          «... Да каждый день!»
        </blockquote>
        <p
          style={{
            fontFamily: "var(--af-font)",
            fontSize: 12,
            color: "rgb(100,100,100)",
            margin: 0,
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          Так отвечают 9 из 10 дизайнеров на вопрос «когда в последний раз
          что-то пошло не так».
        </p>
        <h1
          style={{
            fontFamily: "var(--af-font-display)",
            fontWeight: 700,
            fontSize: 64,
            lineHeight: 0.95,
            letterSpacing: "-0.01em",
            margin: 0,
            marginBottom: 20,
            overflowWrap: "anywhere",
          }}
        >
          {variant.rows.map((r, i) => (
            <span style={{ display: "block" }} key={i}>
              {r}
            </span>
          ))}
        </h1>
        <p
          style={{
            fontFamily: "var(--af-font)",
            fontSize: 14,
            lineHeight: 1.5,
            margin: 0,
            marginBottom: 18,
            color: "#111",
          }}
        >
          Archflow — рабочее пространство для управления проектами и
          коммуникации с заказчиком.
        </p>
        <div style={{ marginBottom: 10 }}>
          <a
            href="#"
            className="afl-btn accent"
            style={{ padding: "13px 22px", fontSize: 11 }}
          >
            Попробовать 14 дней →
          </a>
        </div>
        <div className="afl-micro muted">Не требует обучения</div>
      </div>
    </article>
  );
}

export default function LandingHeroMockupPage() {
  return (
    <div className="afl-root">
      <main style={{ maxWidth: 1440, margin: "0 auto", padding: 0 }}>
        <div
          style={{
            padding: "28px 40px 22px",
            borderBottom: "0.5px solid #EBEBEB",
            background: "#F6F6F4",
          }}
        >
          <div className="afl-micro muted" style={{ marginBottom: 6 }}>
            mockup · /landing-hero-mockup
          </div>
          <div
            style={{
              fontFamily: "var(--af-font-display)",
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: 6,
            }}
          >
            Hero · 4 варианта нового заголовка
          </div>
          <div
            style={{
              fontFamily: "var(--af-font)",
              fontSize: 12,
              color: "rgb(100,100,100)",
              maxWidth: 800,
              lineHeight: 1.55,
            }}
          >
            Прод <code>/welcome</code> не изменена. Шрифт h1 здесь масштабирован
            до 64px (на проде 96–120px) — так все 4 варианта влезают в один
            экран. Ритм строк, перенос, длина — оцениваются корректно.
            Скажите букву варианта — заменю в{" "}
            <code>Landing.tsx:91-92</code>.
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
          }}
        >
          {VARIANTS.map((v) => (
            <HeroCard key={v.id} variant={v} />
          ))}
        </div>
        <div
          style={{
            padding: "18px 40px 40px",
            fontFamily: "var(--af-font)",
            fontSize: 11,
            color: "rgb(150,150,150)",
            background: "#F6F6F4",
            borderTop: "0.5px solid #EBEBEB",
          }}
        >
          Хотите увидеть выбранный вариант в полный размер прод-лендинга —
          скажите букву.
        </div>
      </main>
    </div>
  );
}
