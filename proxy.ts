import { NextResponse, type NextRequest } from 'next/server'

import { siteDesabilitado } from '@/lib/site-desabilitado'

/**
 * Modo "site desabilitado" — Rp 0601015-42.2026.6.25.0000 (TRE-SE).
 *
 * Com a chave ligada (lib/site-desabilitado.ts, ou a variável de ambiente
 * SITE_DESABILITADO=1), toda rota pública responde
 * 503 com a página /manutencao (sem nenhum número). Ficam acessíveis apenas:
 *   - /admin e /api/admin  → operação da CDL (suspender/retomar, anexos);
 *   - /api/divulgacao      → o pop-up de cdlaju.com.br lê `suspensa: true` dali;
 *   - arquivos estáticos (_next, imagens, ícones) usados pela própria página.
 *
 * Ligar/desligar: lib/site-desabilitado.ts (commit + push = redeploy).
 */
export function proxy(request: NextRequest) {
  if (!siteDesabilitado()) return NextResponse.next()

  const { pathname } = request.nextUrl
  if (pathname === '/manutencao') return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { erro: 'Site temporariamente indisponível.' },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '3600' } },
    )
  }

  return NextResponse.rewrite(new URL('/manutencao', request.url))
}

export const config = {
  matcher: [
    '/((?!admin|api/admin|api/divulgacao|_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|map|woff2?|txt|xml)$).*)',
  ],
}
