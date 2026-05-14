import type { NextConfig } from 'next'

/**
 * Headers de seguranca aplicados em TODAS as rotas.
 *
 * - HSTS: forca HTTPS por 2 anos (com preload eligible).
 * - X-Frame-Options DENY: bloqueia clickjacking (iframe).
 * - X-Content-Type-Options nosniff: bloqueia MIME sniffing.
 * - Referrer-Policy strict-origin-when-cross-origin: nao vaza path
 *   completo pra terceiros.
 * - Permissions-Policy: explicita o que apps podem fazer (camera,
 *   geolocation, etc — tudo bloqueado por default).
 *
 * NAO uso CSP fechada aqui ainda — Next 16 + Supabase + Turnstile
 * + Wikipedia (fotos) exigem allowlist cuidadosa que precisa de
 * pentest pra validar sem quebrar a app. Documentado como TODO.
 */
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'clipboard-read=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=(self)',
      'xr-spatial-tracking=()',
    ].join(', '),
  },
  // Robots: a pesquisa nao deve ser indexada antes do registro PesqEle
  // (Resolucao 23.747/2026 — divulgacao controlada).
  {
    key: 'X-Robots-Tag',
    value: 'noindex, nofollow',
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
