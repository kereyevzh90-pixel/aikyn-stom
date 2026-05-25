import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Айкын Стом — Стоматология в Алматы',
  description: 'Стоматологическая клиника Айкын Стом в Алматы',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
