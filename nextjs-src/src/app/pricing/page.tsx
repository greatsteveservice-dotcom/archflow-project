// /pricing — публичная страница тарифов. Используется для подключения YuKassa.
// Без авторизации, вне catch-all [...path].

import type { CSSProperties } from "react";
import CheckoutButton from "./CheckoutButton";

export const metadata = {
  title: "Тарифы — Archflow",
  description: "Подписка на платформу Archflow для управления дизайн-проектами",
};

const S: Record<string, CSSProperties> = {
  page: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "48px 24px 80px",
    fontFamily: "var(--af-font)",
    color: "#111",
  },
  label: {
    fontFamily: "var(--af-font-mono)",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#646464",
    marginBottom: 12,
    display: "block",
  },
  h1: {
    fontFamily: "var(--af-font-display)",
    fontSize: 42,
    fontWeight: 900,
    lineHeight: 1.0,
    marginBottom: 8,
  },
  intro: {
    fontSize: 15,
    lineHeight: 1.6,
    maxWidth: 640,
    marginBottom: 48,
    color: "#111",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 2,
    marginBottom: 48,
  },
  card: {
    background: "#F6F6F4",
    padding: "28px 24px 24px",
    display: "flex",
    flexDirection: "column",
  },
  cardDark: {
    background: "#111",
    color: "#fff",
    padding: "28px 24px 24px",
    display: "flex",
    flexDirection: "column",
  },
  planName: {
    fontFamily: "var(--af-font-display)",
    fontSize: 26,
    fontWeight: 900,
    lineHeight: 1.1,
    marginBottom: 6,
  },
  planSubtitle: {
    fontFamily: "var(--af-font-mono)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    marginBottom: 24,
  },
  planSubtitleLight: { color: "#646464" },
  planSubtitleDark: { color: "#bbb" },
  price: {
    fontFamily: "var(--af-font-display)",
    fontSize: 42,
    fontWeight: 900,
    lineHeight: 1,
    marginBottom: 4,
  },
  priceUnit: {
    fontFamily: "var(--af-font-mono)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#646464",
    marginBottom: 8,
  },
  priceUnitDark: {
    fontFamily: "var(--af-font-mono)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#bbb",
    marginBottom: 8,
  },
  perMonth: {
    fontFamily: "var(--af-font-mono)",
    fontSize: 11,
    color: "#646464",
    marginBottom: 24,
  },
  perMonthDark: {
    fontFamily: "var(--af-font-mono)",
    fontSize: 11,
    color: "#bbb",
    marginBottom: 24,
  },
  savingBadge: {
    display: "inline-block",
    fontFamily: "var(--af-font-mono)",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "3px 8px",
    background: "#fff",
    color: "#111",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  savingBadgeLight: {
    display: "inline-block",
    fontFamily: "var(--af-font-mono)",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "3px 8px",
    background: "#111",
    color: "#fff",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  featuresSection: {
    marginBottom: 48,
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 24,
  },
  featureBlock: {
    paddingTop: 16,
    borderTop: "0.5px solid #EBEBEB",
  },
  featureTitle: {
    fontFamily: "var(--af-font-display)",
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 1.55,
    color: "#333",
  },
  h2: {
    fontFamily: "var(--af-font-display)",
    fontSize: 22,
    fontWeight: 700,
    marginTop: 40,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: "0.5px solid #EBEBEB",
  },
  p: {
    fontSize: 14,
    lineHeight: 1.7,
    marginBottom: 12,
  },
  footer: {
    marginTop: 48,
    paddingTop: 20,
    borderTop: "0.5px solid #EBEBEB",
    fontSize: 11,
    color: "#646464",
    display: "flex",
    gap: 18,
    flexWrap: "wrap",
  },
  link: { color: "#111", textDecoration: "underline" },
};

interface Plan {
  id: "month" | "halfyear" | "year";
  name: string;
  subtitle: string;
  priceTotal: number;
  priceMonthly: number;
  months: number;
  savingPct?: number;
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "month",
    name: "1 месяц",
    subtitle: "Попробовать",
    priceTotal: 1500,
    priceMonthly: 1500,
    months: 1,
  },
  {
    id: "halfyear",
    name: "6 месяцев",
    subtitle: "Выгодно",
    priceTotal: 6000,
    priceMonthly: 1000,
    months: 6,
    savingPct: 33,
    highlighted: true,
  },
  {
    id: "year",
    name: "12 месяцев",
    subtitle: "Максимальная скидка",
    priceTotal: 10000,
    priceMonthly: 833,
    months: 12,
    savingPct: 44,
  },
];

const FEATURES = [
  {
    title: "Проекты и файлы",
    desc: "Неограниченное число проектов, чертежей, визуализаций, договоров. Структурированное хранение по разделам.",
  },
  {
    title: "Авторский надзор",
    desc: "Планирование визитов на объект, фотоотчёты, замечания, акты. Автонапоминания о выставлении счетов.",
  },
  {
    title: "Комплектация",
    desc: "Спецификации по этапам, импорт из Excel, поиск поставщиков через Яндекс, трекинг закупок и отгрузок.",
  },
  {
    title: "Электронная подпись",
    desc: "Отправка договоров клиенту на подпись по СМС, полная юридическая сила согласно 63-ФЗ.",
  },
  {
    title: "Мудборды и концепции",
    desc: "Визуальные доски с коллажами, каталогом мебели, реакциями клиента. Канва с сохранением и экспортом.",
  },
  {
    title: "Чат и ассистент",
    desc: "Чат по проекту с клиентом и подрядчиком, голосовые сообщения с транскрипцией, AI-ассистент дизайнера.",
  },
];

export default function PricingPage() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={S.page}>
      <a
        href="/login"
        aria-label="Закрыть"
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          border: "0.5px solid #EBEBEB",
          color: "#111",
          textDecoration: "none",
          fontSize: 20,
          zIndex: 50,
        }}
      >
        ×
      </a>

      <span style={S.label}>Archflow · Тарифы</span>
      <h1 style={S.h1}>
        Подписка<br />на Archflow
      </h1>
      <p style={S.intro}>
        Archflow — SaaS-платформа для дизайнеров интерьеров и архитектурных бюро.
        Все функции доступны на любом тарифе. Разница только в длительности подписки —
        чем длиннее период, тем ниже стоимость месяца. Оплата разовая через ЮKassa,
        без автопродления.
      </p>

      <div style={S.grid}>
        {PLANS.map((p) => {
          const dark = !!p.highlighted;
          return (
            <div key={p.id} style={dark ? S.cardDark : S.card}>
              {p.savingPct && (
                <span style={dark ? S.savingBadge : S.savingBadgeLight}>
                  −{p.savingPct}% к месячной
                </span>
              )}
              <div style={S.planName}>{p.name}</div>
              <div style={{ ...S.planSubtitle, ...(dark ? S.planSubtitleDark : S.planSubtitleLight) }}>
                {p.subtitle}
              </div>
              <div style={S.price}>{p.priceTotal.toLocaleString("ru-RU")} ₽</div>
              <div style={dark ? S.priceUnitDark : S.priceUnit}>единоразово</div>
              <div style={dark ? S.perMonthDark : S.perMonth}>
                {p.priceMonthly.toLocaleString("ru-RU")} ₽ в месяц
              </div>
              <CheckoutButton
                tariffId={p.id}
                tariffName={p.name}
                price={p.priceTotal}
                dark={dark}
              />
            </div>
          );
        })}
      </div>

      <div style={S.featuresSection}>
        <h2 style={S.h2}>Что входит во все тарифы</h2>
        <div style={S.featuresGrid}>
          {FEATURES.map((f, i) => (
            <div key={i} style={S.featureBlock}>
              <div style={S.featureTitle}>{f.title}</div>
              <div style={S.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <h2 style={S.h2}>Условия оплаты</h2>
      <p style={S.p}>
        Оплата производится через платёжную систему ЮKassa. Поддерживаются банковские
        карты (Мир, Visa, Mastercard), SberPay, СБП. Списание — разовое за выбранный
        период подписки, без автопродления. Для продления подписки выберите тариф
        повторно в конце периода.
      </p>
      <p style={S.p}>
        Возврат средств возможен в течение 14 дней с момента оплаты при отсутствии
        активного использования сервиса. Для возврата напишите на{" "}
        <a href="mailto:archflow.office@gmail.com" style={S.link}>
          archflow.office@gmail.com
        </a>
        .
      </p>

      <h2 style={S.h2}>Триальный период</h2>
      <p style={S.p}>
        После регистрации даётся 7 дней бесплатного доступа ко всем функциям.
        По истечении триала для продолжения работы нужно оформить подписку.
      </p>

      <h2 style={S.h2}>Реквизиты</h2>
      <p style={S.p}>
        Оператор сервиса — ИП Колунов Евгений Евгеньевич. ОГРНИП и ИНН предоставляются
        по запросу. Сервис работает в соответствии с законодательством Российской
        Федерации.
      </p>

      <div style={S.footer}>
        <span>archflow.ru · {dateStr}</span>
        <a href="/privacy" style={S.link}>Политика конфиденциальности</a>
        <a href="mailto:archflow.office@gmail.com" style={S.link}>
          archflow.office@gmail.com
        </a>
      </div>
    </div>
  );
}
