import type { Metadata, Viewport } from "next";
import { Playfair_Display, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";
import YandexMetrika from "./components/YandexMetrika";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";

const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700', '900'],
  variable: '--font-playfair',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400'],
  variable: '--font-ibm-mono',
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
    <html lang="ru" className={`${playfair.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Manifest without crossOrigin for Safari PWA compatibility */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <YandexMetrika />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
