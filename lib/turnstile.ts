/**
 * Cloudflare Turnstile — verificacao server-side do token gerado pelo
 * widget no navegador.
 *
 * Estrategia:
 *   - DEV_MODE -> bypass (deixa passar sem validar).
 *   - Sem TURNSTILE_SECRET_KEY configurada -> bypass com aviso de log.
 *   - Caso contrario -> chamada real ao endpoint siteverify do
 *     Cloudflare e checagem do flag `success`.
 *
 * Server-only.
 */
import 'server-only'

import { DEV_MODE, SERVER_ENV } from './env'

export type TurnstileResult =
  | { ok: true }
  | { ok: false; reason: string }

const ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TIMEOUT_MS = 8_000

export async function verifyTurnstile(
  token: string | null | undefined,
  ip?: string | null,
): Promise<TurnstileResult> {
  if (DEV_MODE) {
    return { ok: true }
  }

  const secret = SERVER_ENV.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.warn(
      '[turnstile] TURNSTILE_SECRET_KEY ausente — pulando validacao. ' +
        'Configure em producao pra ativar anti-bot.',
    )
    return { ok: true }
  }

  if (!token) {
    return { ok: false, reason: 'token_ausente' }
  }

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

    const body = new URLSearchParams({ secret, response: token })
    if (ip) body.set('remoteip', ip)

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: ctrl.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)

    const data = (await res.json()) as {
      success: boolean
      'error-codes'?: string[]
    }

    if (data.success) return { ok: true }

    return {
      ok: false,
      reason: data['error-codes']?.join(',') ?? 'falha',
    }
  } catch (err) {
    console.error('[turnstile] erro de rede:', err)
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'erro_rede',
    }
  }
}
