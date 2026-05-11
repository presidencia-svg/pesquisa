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
  title: 'Pesquisa Sergipe 2026',
  description:
    'Pesquisa de intenção de voto para Sergipe 2026. Realizada pela CDL Aracaju, com identidade verificada e voto desvinculado do eleitor.',
  applicationName: 'Pesquisa SE 2026',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Pesquisa SE',
    statusBarStyle: 'default',
  },
  // icons auto-detectado por Next.js a partir de app/icon.png +
  // app/apple-icon.png + app/favicon.ico (convencao do app router).
  robots: {
    index: false,
    follow: false,
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
