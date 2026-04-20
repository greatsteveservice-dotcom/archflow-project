import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Мудборд — Archflow',
};

export default function BoardPublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vollkorn+SC:wght@400;600;700;900&display=swap&subset=latin,cyrillic"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.svg" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
