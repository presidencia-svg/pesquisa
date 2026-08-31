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
      // geolocation=(self): o PRÓPRIO site precisa do GPS no plano B do
      // gate de localização (quando o IP não confirma Sergipe). Sem o
      // (self), o Chrome bloqueia navigator.geolocation com "disabled by
      // permissions policy" — o Safari ignora, por isso passava no iOS.
      // iframes de terceiros seguem sem geolocation (e X-Frame-Options
      // DENY já impede embed).
      'geolocation=(self)',
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
  // X-XSS-Protection: legado (era pro IE), mas alguns scanners ainda
  // checam. Browsers modernos ignoram. Posto pra reduzir ruído.
  {
    key: 'X-XSS-Protection',
    value: '0',
  },
  // Cross-Origin policies — endurece isolamento contra Spectre/scripts
  // de origem cruzada. `unsafe-none` em embedder pq Wikipedia (foto da
  // biografia) é carregada cross-origin.
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-site',
  },
  // CSP em modo Report-Only: detecta tudo que quebraria sem bloquear
  // ainda. Ative em modo enforce após observar relatórios por 7-14 dias.
  // Permite: self + Vercel + Supabase + Wikipedia (foto biografia) +
  // Cloudflare Turnstile (quando ativado). Inline-script ainda
  // permitido porque Next 16 injeta scripts inline pra hidratação —
  // remover quando migrar pra nonce-based.
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.vercel-scripts.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://upload.wikimedia.org https://*.wikipedia.org",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://pt.wikipedia.org https://challenges.cloudflare.com",
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // Source maps em produção facilitam reverse-engineering. Default do
  // Next 16 já é false, mas explicitar previne mudança acidental.
  productionBrowserSourceMaps: false,
  // Remove o header `X-Powered-By: Next.js` — não dá info útil ao
  // browser e ajuda fingerprinting de versão.
  poweredByHeader: false,
  async redirects() {
    // Hostnames que redirecionam pro canônico pesquisa.cdlaju.com.br.
    // Cobre erro de digitação comum: www e o plural "pesquisas" (marca
    // "CDL Pesquisas"). Só disparam se o host bater; exige que o domínio
    // esteja apontado pra este projeto na Vercel (DNS + domínio no
    // projeto). 308 preserva método e é cacheável.
    const hostsAlternativos = [
      'www.pesquisa.cdlaju.com.br',
      'pesquisas.cdlaju.com.br',
      'www.pesquisas.cdlaju.com.br',
    ]
    const redirectsDeHost = hostsAlternativos.map((host) => ({
      source: '/:path*',
      has: [{ type: 'host' as const, value: host }],
      destination: 'https://pesquisa.cdlaju.com.br/:path*',
      permanent: true,
    }))

    return [
      ...redirectsDeHost,
      // /patrocinio/exposicao foi aposentada (wireframes antigos que não
      // batiam com a implementação real). A /patrocinio/jornada faz o
      // mesmo papel, fiel às telas de verdade. 308 preserva links antigos.
      {
        source: '/patrocinio/exposicao',
        destination: '/patrocinio/jornada',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // /.well-known/security.txt deve ser servido como text/plain
      // (RFC 9116 §3.4) e ser cacheável publicamente.
      {
        source: '/.well-known/security.txt',
        headers: [
          { key: 'Content-Type', value: 'text/plain; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ]
  },
}

export default nextConfig
