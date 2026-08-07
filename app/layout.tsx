import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'ContaGT — Contabilidad Fiscal Automatizada Guatemala',
  description: 'Plataforma SaaS de contabilidad para Guatemala. Automatización FEL, Libro de Compras y Ventas, IVA, ISR, retenciones — todo en un solo lugar.',
  keywords: 'contabilidad Guatemala, FEL SAT, libro de compras, libro de ventas, IVA Guatemala, ISR, SaaS contable',
  openGraph: {
    title: 'ContaGT — Contabilidad Fiscal Automatizada',
    description: 'Elimina el registro manual. Importa tus facturas FEL y obtén tus libros legales listos para la SAT en segundos.',
    locale: 'es_GT',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-GT">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
