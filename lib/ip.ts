/**
 * Resolução do IP real do cliente, levando em conta proxies em camadas.
 *
 * Ordem de preferência:
 *   1. `cf-connecting-ip` — header injetado pelo Cloudflare proxy (laranja).
 *      Quando presente, é o IP do cliente original (Cloudflare valida).
 *   2. `x-forwarded-for` — primeiro IP da lista. Esse é o que Vercel adiciona.
 *      Pode ser falsificado SE não tiver Cloudflare na frente.
 *   3. `x-real-ip` — fallback raro, alguns proxies legados.
 *
 * Importante: quando Cloudflare está na frente, `x-forwarded-for` traz o IP
 * do edge Cloudflare (não do cliente). Por isso `cf-connecting-ip` ganha.
 *
 * Server-only.
 */
import 'server-only'

import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers'

export function obterIpCliente(h: Headers | ReadonlyHeaders): string | null {
  const cf = h.get('cf-connecting-ip')
  if (cf && cf.length > 0) return cf.trim()

  const xff = h.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first && first.length > 0) return first
  }

  const xri = h.get('x-real-ip')
  if (xri && xri.length > 0) return xri.trim()

  return null
}
