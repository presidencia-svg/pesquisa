/**
 * Resolução do IP real do cliente.
 *
 * A app roda no Vercel SEM proxy Cloudflare (laranja) na frente — o
 * Turnstile é só um widget no browser, não um proxy de rede. Portanto
 * headers como `cf-connecting-ip` e o primeiro IP de `x-forwarded-for`
 * são ARBITRÁRIOS: o cliente pode enviar o valor que quiser e furar todo
 * o rate limit (antifraude, brute-force de login, custo de SPC/WhatsApp).
 *
 * Fonte confiável no Vercel: `x-vercel-forwarded-for` (a plataforma
 * define, o cliente não consegue forjar). `x-real-ip` no Vercel também é
 * preenchido pela plataforma com o IP real. Só esses dois são aceitos.
 *
 * Se um dia houver Cloudflare de verdade na frente, validar
 * `cf-connecting-ip` contra a lista de IPs de edge da CF antes de confiar.
 *
 * Server-only.
 */
import 'server-only'

import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers'

export function obterIpCliente(h: Headers | ReadonlyHeaders): string | null {
  // Header confiável do Vercel — não falsificável pelo cliente.
  const vercel = h.get('x-vercel-forwarded-for')
  if (vercel) {
    const first = vercel.split(',')[0]?.trim()
    if (first && first.length > 0) return first
  }

  // Fallback: x-real-ip é preenchido pela plataforma (Vercel) com o IP real.
  const xri = h.get('x-real-ip')
  if (xri && xri.length > 0) return xri.trim()

  // NÃO confiar em cf-connecting-ip nem no leftmost de x-forwarded-for
  // sem um proxy confiável na frente — ambos são controlados pelo cliente.
  return null
}
