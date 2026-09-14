import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { RegistrarServiceWorker } from '@/components/registrar-service-worker'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  // Base pra URLs absolutas (Open Graph, canonical, sitemap).
  metadataBase: new URL('https://pesquisa.cdlaju.com.br'),
  title: 'Pesquisa CDL Aracaju · Pesquisa Eleitoral Sergipe 2026',
  description:
    'Pesquisa eleitoral da CDL Aracaju para Sergipe 2026 (2ª edição): intenção de voto para presidente, governador, senador e deputados. Identidade verificada e voto desvinculado do eleitor.',
  keywords: [
    'Pesquisa CDL',
    'Pesquisa CDL Aracaju',
    'CDL Pesquisas',
    'pesquisa eleitoral Sergipe 2026',
    'pesquisa eleitoral Aracaju',
    'intenção de voto Sergipe',
    'eleições 2026 Sergipe',
    'segunda edição',
  ],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'CDL Pesquisas',
    title: 'Pesquisa CDL Aracaju · Sergipe 2026 · 2ª edição',
    description:
      'Participe da pesquisa eleitoral da CDL Aracaju. Vale pra todo sergipano com título de eleitor: CPF, código no WhatsApp e voto anônimo.',
    images: [{ url: '/convite-whatsapp.png', width: 1080, height: 566 }],
  },
  twitter: {
    card: 'summary_large_image',
  },
  applicationName: 'Pesquisa SE 2026',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Pesquisa SE',
    statusBarStyle: 'default',
  },
  // icons auto-detectado por Next.js a partir de app/icon.png +
  // app/apple-icon.png + app/favicon.ico (convencao do app router).
  // Indexável desde 14/09/2026 (2ª edição em coleta). Antes era noindex
  // global; hoje só admin, API, TV, resultados e o fluxo interno do voto
  // ficam fora do Google (metadata das páginas + header no next.config).
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#0a2a6e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  )
}
