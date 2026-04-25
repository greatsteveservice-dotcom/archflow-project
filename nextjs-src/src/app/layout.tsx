import type { Metadata, Viewport } from "next";
import { Vollkorn_SC } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";
import YandexMetrika from "./components/YandexMetrika";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import HydrationGate from "./components/HydrationGate";

const vollkornSC = Vollkorn_SC({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-vollkorn',
  display: 'swap',
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#111111",
};

export const metadata: Metadata = {
  title: "Archflow — Управление дизайн-проектами",
  description:
    "Платформа для дизайнеров интерьера: авторский надзор, комплектация, визиты на объекты, управление проектами.",
  keywords: [
    "дизайн интерьера",
    "управление проектами",
    "авторский надзор",
    "комплектация",
    "archflow",
  ],
  authors: [{ name: "Archflow" }],
  metadataBase: new URL("https://archflow.ru"),
  openGraph: {
    title: "Archflow — Управление дизайн-проектами",
    description:
      "Платформа для дизайнеров интерьера: авторский надзор, комплектация, визиты на объекты.",
    url: "https://archflow.ru",
    siteName: "Archflow",
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Archflow — Управление дизайн-проектами",
    description: "Платформа для дизайнеров интерьера",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "ArchFlow",
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={vollkornSC.variable} suppressHydrationWarning>
      <head>
        {/* Google Fonts backup — ensures fonts render even when Next.js font
            chunks are blocked by Service Worker cache or mobile network issues.
            next/font self-hosts the same font via CSS variable (--font-vollkorn)
            which takes priority when loaded. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vollkorn+SC:wght@400;600;700;900&display=swap&subset=latin,cyrillic"
          rel="stylesheet"
        />
        {/* Manifest without crossOrigin for Safari PWA compatibility */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>

        {/*
          Server-rendered fallback screen. Placed AFTER children so that
          HTML text extractors (search engine crawlers, web_fetch summarizers)
          read the actual page content first. Visually still covers everything
          via position:fixed + z-index:9999 until HydrationGate hides it.
          If JS fails to run at all (stale cache, blocked chunks, disabled
          JS, antivirus filter, etc.), this stays visible so the user sees
          a helpful message + a link to /reset instead of a silent white page.
        */}
        <div
          id="af-fallback-screen"
          suppressHydrationWarning
          style={{
            position: "fixed",
            inset: 0,
            background: "#F6F6F4",
            color: "#111",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 9999,
            fontFamily: "'Vollkorn SC', serif",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 480, width: "100%" }}>
            <p
              style={{
                fontFamily: "'Vollkorn SC', serif",
                fontSize: 32,
                fontWeight: 700,
                margin: 0,
                marginBottom: 12,
                letterSpacing: "-0.01em",
              }}
            >
              Archflow
            </p>
            <p style={{ fontSize: 12, color: "#666", margin: 0, marginBottom: 24 }}>
              Платформа для управления дизайн-проектами
            </p>
            <p
              style={{
                fontSize: 11,
                letterSpacing: "0.05em",
                color: "#999",
                margin: 0,
              }}
            >
              Загрузка приложения…
            </p>
            <noscript>
              <p
                style={{
                  fontSize: 12,
                  color: "#c00",
                  marginTop: 24,
                  lineHeight: 1.6,
                }}
              >
                Для работы сервиса необходим JavaScript. Включите его в
                настройках браузера и обновите страницу.
              </p>
            </noscript>
            <div style={{ marginTop: 32, fontSize: 11, color: "#999", lineHeight: 1.6 }}>
              Если эта страница висит больше 10 секунд:
              <div style={{ marginTop: 12 }}>
                <a
                  href="/reset"
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    border: "1px solid #111",
                    color: "#111",
                    textDecoration: "none",
                    fontSize: 11,
                    letterSpacing: "0.04em",
                  }}
                >
                  Сбросить кеш
                </a>
              </div>
              <div style={{ marginTop: 16, fontSize: 10, color: "#aaa" }}>
                Или напишите нам:{" "}
                <a
                  href="mailto:hello@archflow.ru"
                  style={{ color: "#666", textDecoration: "underline" }}
                >
                  hello@archflow.ru
                </a>
              </div>
            </div>
          </div>
        </div>

        <YandexMetrika />
        <ServiceWorkerRegistration />
        <HydrationGate />
      </body>
    </html>
  );
}
