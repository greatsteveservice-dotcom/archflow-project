import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/auth";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#111827",
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
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
