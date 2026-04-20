// src/app/privacy/page.tsx
// Публичная страница Политики конфиденциальности.
// Доступна без авторизации — находится вне catch-all [...path],
// поэтому не проходит через AuthGate / ProtectedRoute.

import type { CSSProperties } from "react";

export const metadata = {
  title: "Политика конфиденциальности — Archflow",
  description: "Как Archflow собирает, хранит и защищает данные пользователей",
};

const S: Record<string, CSSProperties> = {
  wrap: { maxWidth: "720px", margin: "0 auto", padding: "48px 24px 80px" },
  label: {
    fontFamily: "var(--af-font)",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "var(--af-gray)",
    marginBottom: "12px",
    display: "block",
  },
  h1: {
    fontFamily: "var(--af-font)",
    fontSize: "42px",
    fontWeight: 900,
    color: "var(--af-black)",
    lineHeight: 1.0,
    marginBottom: "8px",
  },
  meta: {
    fontFamily: "var(--af-font)",
    fontSize: "11px",
    color: "var(--af-gray)",
    marginBottom: "40px",
    display: "block",
  },
  h2: {
    fontFamily: "var(--af-font)",
    fontSize: "18px",
    fontWeight: 700,
    color: "var(--af-black)",
    marginTop: "40px",
    marginBottom: "12px",
    paddingBottom: "10px",
    borderBottom: "0.5px solid var(--af-border)",
  },
  h3: {
    fontFamily: "var(--af-font)",
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--af-black)",
    marginTop: "20px",
    marginBottom: "8px",
  },
  p: {
    fontFamily: "var(--af-font)",
    fontSize: "14px",
    color: "var(--af-black)",
    lineHeight: 1.7,
    marginBottom: "12px",
  },
  pBold: {
    fontFamily: "var(--af-font)",
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--af-black)",
    lineHeight: 1.7,
    marginBottom: "12px",
  },
  ul: { paddingLeft: "0", listStyle: "none", marginBottom: "12px" },
  li: {
    fontFamily: "var(--af-font)",
    fontSize: "14px",
    color: "var(--af-black)",
    lineHeight: 1.7,
    marginBottom: "6px",
    paddingLeft: "20px",
    position: "relative",
  },
  footer: {
    marginTop: "60px",
    paddingTop: "20px",
    borderTop: "0.5px solid var(--af-border)",
    fontFamily: "var(--af-font)",
    fontSize: "11px",
    color: "var(--af-gray)",
  },
  link: { color: "var(--af-black)" },
};

export default function PrivacyPage() {
  return (
    <div style={S.wrap}>
      <span style={S.label}>Archflow</span>
      <h1 style={S.h1}>
        Политика<br />конфиденциальности
      </h1>
      <span style={S.meta}>Версия 1.0 · апрель 2026 · archflow.ru</span>

      <p style={S.p}>
        Настоящая Политика конфиденциальности описывает как Archflow собирает, хранит, использует и защищает данные пользователей платформы archflow.ru.
      </p>

      {/* 1 */}
      <h2 style={S.h2}>1. Какие данные мы собираем</h2>
      <h3 style={S.h3}>Данные аккаунта</h3>
      <ul style={S.ul}>
        <li style={S.li}>— Email-адрес и пароль (в зашифрованном виде)</li>
        <li style={S.li}>— Имя, должность, тип деятельности (если указаны)</li>
        <li style={S.li}>— Дата регистрации и последнего входа</li>
      </ul>
      <h3 style={S.h3}>Данные проектов</h3>
      <ul style={S.ul}>
        <li style={S.li}>— Названия и описания проектов</li>
        <li style={S.li}>— Загруженные файлы: чертежи, визуализации, договоры, фотографии</li>
        <li style={S.li}>— Записи авторского надзора, отчёты, задачи</li>
        <li style={S.li}>— Данные комплектации: спецификации, статусы, поставщики</li>
        <li style={S.li}>— Сообщения в чате между участниками проекта</li>
        <li style={S.li}>— Голосовые сообщения и их транскрипции</li>
      </ul>
      <h3 style={S.h3}>Данные о клиентах и участниках</h3>
      <ul style={S.ul}>
        <li style={S.li}>— Имена и контактные данные заказчиков, подрядчиков, ассистентов — только те, которые внесли вы сами</li>
        <li style={S.li}>— Мы не собираем данные клиентов напрямую и не связываемся с ними</li>
      </ul>
      <h3 style={S.h3}>Технические данные</h3>
      <ul style={S.ul}>
        <li style={S.li}>— IP-адрес, тип устройства и браузера</li>
        <li style={S.li}>— Данные об использовании сервиса (страницы, время сессии)</li>
      </ul>

      {/* 2 */}
      <h2 style={S.h2}>2. Как мы используем данные</h2>
      <p style={S.p}>Мы используем данные исключительно для:</p>
      <ul style={S.ul}>
        <li style={S.li}>— обеспечения работы сервиса и его функций</li>
        <li style={S.li}>— технической поддержки пользователей</li>
        <li style={S.li}>— улучшения продукта на основе агрегированной статистики использования</li>
        <li style={S.li}>— отправки системных уведомлений (напоминания, алерты)</li>
      </ul>
      <p style={S.pBold}>
        Мы никогда не используем ваши данные или данные ваших клиентов для маркетинга, рекламы или передачи третьим лицам.
      </p>

      {/* 3 */}
      <h2 style={S.h2}>3. Хранение и безопасность</h2>
      <ul style={S.ul}>
        <li style={S.li}>— Данные хранятся на серверах в Российской Федерации (Yandex Cloud, г. Владимир) с шифрованием при передаче (TLS 1.3)</li>
        <li style={S.li}>— Доступ к данным разграничен на уровне базы данных (Row Level Security) — каждый пользователь видит только свои проекты</li>
        <li style={S.li}>— Пароли хранятся в виде хеша, оригинал пароля не доступен никому включая команду Archflow</li>
        <li style={S.li}>— Файлы хранятся в изолированных хранилищах с доступом только для авторизованных участников проекта</li>
        <li style={S.li}>— Регулярное резервное копирование данных</li>
      </ul>

      {/* 4 */}
      <h2 style={S.h2}>4. Доступ к данным</h2>
      <p style={S.p}>К вашим данным имеют доступ:</p>
      <ul style={S.ul}>
        <li style={S.li}>— Вы и участники проекта, которых вы сами пригласили с соответствующими правами</li>
        <li style={S.li}>— Технические специалисты Archflow — только при устранении инцидентов и только с соблюдением конфиденциальности</li>
      </ul>
      <p style={S.pBold}>
        Сотрудники Archflow не читают вашу переписку, не просматривают файлы проектов и не связываются с вашими клиентами.
      </p>

      {/* 5 */}
      <h2 style={S.h2}>5. Передача данных третьим лицам</h2>
      <p style={S.p}>Мы не продаём и не передаём ваши данные третьим лицам, за исключением:</p>
      <ul style={S.ul}>
        <li style={S.li}>— Инфраструктурных провайдеров (Yandex Cloud, Resend, Cloudflare) — только в объёме необходимом для работы сервиса, на условиях конфиденциальности</li>
        <li style={S.li}>— Случаев предусмотренных законодательством РФ — по требованию суда или уполномоченных органов</li>
      </ul>

      {/* 6 */}
      <h2 style={S.h2}>6. Права пользователя</h2>
      <p style={S.p}>Вы вправе в любой момент:</p>
      <ul style={S.ul}>
        <li style={S.li}>— Получить копию всех своих данных (запрос на privacy@archflow.ru)</li>
        <li style={S.li}>— Исправить или обновить данные аккаунта</li>
        <li style={S.li}>— Удалить аккаунт и все связанные данные безвозвратно</li>
        <li style={S.li}>— Отозвать согласие на обработку данных</li>
      </ul>

      {/* 7 */}
      <h2 style={S.h2}>7. Срок хранения данных</h2>
      <ul style={S.ul}>
        <li style={S.li}>— Данные активного аккаунта хранятся в течение всего срока использования сервиса</li>
        <li style={S.li}>— После удаления аккаунта данные удаляются в течение 30 дней</li>
        <li style={S.li}>— Резервные копии уничтожаются в течение 90 дней</li>
      </ul>

      {/* 8 */}
      <h2 style={S.h2}>8. Изменение политики</h2>
      <p style={S.p}>
        При существенных изменениях политики мы уведомим пользователей по email не позднее чем за 14 дней до вступления изменений в силу.
      </p>

      {/* 9 */}
      <h2 style={S.h2}>9. Оператор персональных данных</h2>
      <p style={S.p}>
        Оператором персональных данных является ИП Колунов Евгений Евгеньевич, зарегистрированный в реестре операторов персональных данных Роскомнадзора.
      </p>
      <p style={S.p}>
        Обработка персональных данных осуществляется в соответствии с Федеральным законом от 27.07.2006 N 152-ФЗ «О персональных данных».
      </p>
      <p style={S.p}>
        Персональные данные хранятся и обрабатываются на территории Российской Федерации (ЦОД Яндекс, г. Владимир).
      </p>

      {/* 10 */}
      <h2 style={S.h2}>10. Контакты</h2>
      <p style={S.p}>
        По вопросам конфиденциальности:{" "}
        <a href="mailto:privacy@archflow.ru" style={S.link}>
          privacy@archflow.ru
        </a>
      </p>
      <p style={S.p}>
        По общим вопросам:{" "}
        <a href="mailto:support@archflow.ru" style={S.link}>
          support@archflow.ru
        </a>
      </p>

      <div style={S.footer}>
        archflow.ru · Политика конфиденциальности v1.0 · апрель 2026
      </div>
    </div>
  );
}
