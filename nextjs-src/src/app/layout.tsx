import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ЖАН — Журнал авторского надзора",
  description: "Электронный журнал авторского надзора для дизайнеров интерьера и строительных компаний",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
